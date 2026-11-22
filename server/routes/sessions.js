const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

function mapSession(s) {
  return {
    id: s.id,
    userId: s.user_id,
    userName: s.user_name,
    userRole: s.user_role,
    openingAmount: Number(s.opening_amount),
    openedAt: s.opened_at,
    closedAt: s.closed_at,
    closingSalesTotal: s.closing_sales_total !== null ? Number(s.closing_sales_total) : null,
    closingSalesCount: s.closing_sales_count,
    closingCommandesTotal: s.closing_commandes_total !== null ? Number(s.closing_commandes_total) : null,
    closingCommandesCount: s.closing_commandes_count,
    status: s.status,
  }
}

function safeItems(raw) {
  if (!raw) return []
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch (e) { return [] }
}

async function verifyPassword(userId, password) {
  const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId])
  if (!rows[0]) return false
  return bcrypt.compare(password || '', rows[0].password)
}

// Les totaux d'une session sont toujours bornés à la journée (calendaire) où elle a été
// ouverte — même si la session reste ouverte plus longtemps (oubli de déconnexion, session
// "fantôme" qui traîne). Sans cette borne, une session ouverte à 23h50 puis refermée le
// lendemain soir agrégerait par erreur les ventes de 2 jours différents dans un seul total.
// IMPORTANT (base MySQL gratuite à petite mémoire) : on évite `SELECT *` + `ORDER BY` sur
// `sales`/`reservations`. Ces lignes contiennent de gros champs JSON (articles, photos) et le tri
// côté MySQL plantait avec "Out of sort memory" (ER_OUT_OF_SORTMEMORY), ce qui faisait tomber la
// page Utilisateurs. Donc : pas d'ORDER BY en SQL (tri fait ici, en JS), et en mode léger on ne lit
// que id/total/created_at. `withDetail` (reçu "Vider la caisse") lit les colonnes complètes.
async function computeSessionTotals(userId, sinceDate, withDetail = false) {
  const cols = withDetail ? '*' : 'id, total, created_at'
  const byDate = (a, b) => String(a.created_at).localeCompare(String(b.created_at))
  const [salesRows] = await pool.query(
    `SELECT ${cols} FROM sales WHERE created_by = ? AND created_at >= ?
     AND created_at < DATE_ADD(DATE(?), INTERVAL 1 DAY)`,
    [userId, sinceDate, sinceDate]
  )
  const [reservationRows] = await pool.query(
    `SELECT ${cols} FROM reservations WHERE created_by = ? AND created_at >= ?
     AND created_at < DATE_ADD(DATE(?), INTERVAL 1 DAY)`,
    [userId, sinceDate, sinceDate]
  )
  salesRows.sort(byDate)
  reservationRows.sort(byDate)
  const salesTotal = salesRows.reduce((s, r) => s + Number(r.total), 0)
  const commandesTotal = reservationRows.reduce((s, r) => s + Number(r.total), 0)
  return { salesRows, reservationRows, salesTotal, commandesTotal }
}

// Totaux "en direct" d'une session ouverte, via COUNT/SUM : une seule ligne résultat par table,
// aucune ligne lourde lue, aucun tri. Utilisé par /history (appelé en boucle par la page admin).
async function computeSessionAggregates(userId, sinceDate) {
  const range = `created_by = ? AND created_at >= ? AND created_at < DATE_ADD(DATE(?), INTERVAL 1 DAY)`
  const [[s]] = await pool.query(`SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS t, MAX(created_at) AS last FROM sales WHERE ${range}`, [userId, sinceDate, sinceDate])
  const [[r]] = await pool.query(`SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS t, MAX(created_at) AS last FROM reservations WHERE ${range}`, [userId, sinceDate, sinceDate])
  const lasts = [s.last, r.last].filter(Boolean).map(String).sort()
  return {
    salesCount: Number(s.n), salesTotal: Number(s.t),
    commandesCount: Number(r.n), commandesTotal: Number(r.t),
    lastAt: lasts.length ? lasts[lasts.length - 1] : null,
  }
}

// Clôture une session restée "ouverte" sans vidage (oubli, jour précédent, doublon). L'heure de
// sortie enregistrée est celle de la dernière vente/commande de cette session (sinon son heure
// d'ouverture), pas l'heure du nettoyage — pour que "Sortie" reste crédible.
async function autoCloseSession(s, withTotals) {
  let closedAt = s.opened_at
  let sales = 0, salesN = 0, cmd = 0, cmdN = 0
  if (withTotals) {
    const agg = await computeSessionAggregates(s.user_id, s.opened_at)
    sales = agg.salesTotal; salesN = agg.salesCount; cmd = agg.commandesTotal; cmdN = agg.commandesCount
    if (agg.lastAt) closedAt = agg.lastAt
  }
  await pool.query(
    `UPDATE cashier_sessions SET closed_at = ?, status = 'closed',
     closing_sales_total = ?, closing_sales_count = ?, closing_commandes_total = ?, closing_commandes_count = ?
     WHERE id = ?`,
    [closedAt, sales, salesN, cmd, cmdN, s.id]
  )
}

// Applique les règles de session à TOUTES les sessions encore ouvertes (pas seulement à la
// prochaine connexion d'un utilisateur) : une session ouverte un jour précédent est clôturée
// (sortie = heure de sa dernière vente), et il ne reste qu'UNE session ouverte par utilisateur
// pour aujourd'hui. Appelé au chargement de l'historique admin ; sans effet s'il n'y a rien à faire.
async function cleanupStaleSessions() {
  const [rows] = await pool.query(
    `SELECT *, (DATE(opened_at) = CURDATE()) AS is_today FROM cashier_sessions WHERE status = 'open'`
  )
  rows.sort((a, b) => String(b.opened_at).localeCompare(String(a.opened_at))) // plus récentes d'abord
  const keptToday = new Set()
  for (const s of rows) {
    if (Number(s.is_today) === 1) {
      if (!keptToday.has(s.user_id)) { keptToday.add(s.user_id); continue }
      await autoCloseSession(s, false) // doublon du jour : ses ventes sont déjà comptées dans la session gardée
    } else {
      await autoCloseSession(s, true)
    }
  }
}

// Retourne la session "en cours" à reprendre pour cet utilisateur : la plus récente ouverte
// AUJOURD'HUI. Tout le reste (sessions ouvertes un jour précédent, doublons) est clôturé
// automatiquement. Ainsi, si la caisse/le PC s'éteint, la reconnexion REPREND la même session
// (même heure d'entrée, même dépôt) au lieu d'en créer une nouvelle.
async function resolveCurrentSession(userId) {
  const [rows] = await pool.query(
    `SELECT *, (DATE(opened_at) = CURDATE()) AS is_today FROM cashier_sessions
     WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC`,
    [userId]
  )
  let current = null
  for (const s of rows) {
    if (!current && Number(s.is_today) === 1) { current = s; continue }
    // jour précédent : ses ventes lui appartiennent ; doublon du jour : déjà comptées dans `current`
    await autoCloseSession(s, Number(s.is_today) !== 1)
  }
  return current
}

// Y a-t-il une session à reprendre ? Utilisé par la page de connexion : si oui, pas de nouveau
// dépôt à saisir ; si non, c'est la première connexion après un vidage → dépôt demandé.
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const current = await resolveCurrentSession(req.user.id)
    res.json({ session: current ? mapSession(current) : null })
  } catch (error) {
    console.error('Erreur GET /api/sessions/current :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Ouvre une session au login. Si une session est déjà en cours aujourd'hui (coupure de courant,
// PC éteint...), on la REPREND telle quelle — jamais de deuxième session ni de nouveau dépôt.
// Le dépôt d'ouverture n'est pris en compte que pour la première connexion après un vidage.
router.post('/open', authMiddleware, async (req, res) => {
  try {
    const openingAmount = Number(req.body.openingAmount) || 0
    const [users] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [req.user.id])
    const user = users[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const current = await resolveCurrentSession(user.id)
    if (current) return res.json({ session: mapSession(current), resumed: true })

    const id = Date.now()
    await pool.query(
      `INSERT INTO cashier_sessions (id, user_id, user_name, user_role, opening_amount, opened_at, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 'open')`,
      [id, user.id, user.name, user.role, openingAmount]
    )

    // On relie ce dépôt d'ouverture de caisse à la table fonds_caisse, utilisée par
    // l'admin dans la page "Bilan du jour & Dépôts".
    if (openingAmount > 0) {
      const fondId = id + 1
      await pool.query(
        'INSERT INTO fonds_caisse (id, amount, note, created_at) VALUES (?, ?, ?, NOW())',
        [fondId, openingAmount, `Dépôt d'ouverture — ${user.name}`]
      )
    }

    const [rows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [id])
    res.json({ session: mapSession(rows[0]), resumed: false })
  } catch (error) {
    console.error('Erreur POST /api/sessions/open :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Déconnexion : le code (mot de passe du compte) doit être correct avant de clôturer la
// session — enregistre l'heure de sortie + les totaux, sans imprimer de reçu.
router.post('/close', authMiddleware, async (req, res) => {
  try {
    const ok = await verifyPassword(req.user.id, req.body.password)
    if (!ok) return res.status(400).json({ error: 'Code incorrect' })

    const [openRows] = await pool.query(
      "SELECT * FROM cashier_sessions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [req.user.id]
    )
    const session = openRows[0]
    if (!session) return res.json({ session: null })

    const { salesRows, reservationRows, salesTotal, commandesTotal } = await computeSessionTotals(req.user.id, session.opened_at)
    await pool.query(
      `UPDATE cashier_sessions SET closed_at = NOW(), status = 'closed',
       closing_sales_total = ?, closing_sales_count = ?, closing_commandes_total = ?, closing_commandes_count = ?
       WHERE id = ?`,
      [salesTotal, salesRows.length, commandesTotal, reservationRows.length, session.id]
    )
    const [rows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [session.id])
    res.json({ session: mapSession(rows[0]) })
  } catch (error) {
    console.error('Erreur POST /api/sessions/close :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Clôture forcée par un admin — sans code, en dernier recours pour fermer une session restée
// "ouverte" (appareil perdu/cassé, navigateur planté...). Les totaux sont calculés normalement
// (bornés à la journée d'ouverture).
router.post('/:id/force-close', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [req.params.id])
    const session = rows[0]
    if (!session) return res.status(404).json({ error: 'Session introuvable' })
    if (session.status !== 'open') return res.status(400).json({ error: 'Cette session est déjà clôturée' })

    const { salesRows, reservationRows, salesTotal, commandesTotal } = await computeSessionTotals(session.user_id, session.opened_at)
    await pool.query(
      `UPDATE cashier_sessions SET closed_at = NOW(), status = 'closed',
       closing_sales_total = ?, closing_sales_count = ?, closing_commandes_total = ?, closing_commandes_count = ?
       WHERE id = ?`,
      [salesTotal, salesRows.length, commandesTotal, reservationRows.length, session.id]
    )
    // On invalide aussi le jeton de connexion de cet utilisateur, pour que l'ancien appareil
    // (s'il est encore ouvert quelque part) soit proprement déconnecté lui aussi.
    await pool.query('UPDATE users SET session_token = NULL WHERE id = ?', [session.user_id])

    const [updated] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [session.id])
    res.json({ session: mapSession(updated[0]) })
  } catch (error) {
    console.error('Erreur POST /api/sessions/:id/force-close :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// "Vider la caisse" : le code est requis, puis on clôture la session en cours avec le détail
// COMPLET de toutes les ventes/commandes faites depuis l'ouverture (pour le reçu imprimé),
// SANS rouvrir de session : la prochaine ouverture sera la première connexion après ce vidage
// (avec son propre dépôt). L'heure de sortie de ce caissier est donc l'heure du vidage.
router.post('/vider', authMiddleware, async (req, res) => {
  try {
    const ok = await verifyPassword(req.user.id, req.body.password)
    if (!ok) return res.status(400).json({ error: 'Code incorrect' })

    const [users] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [req.user.id])
    const user = users[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    let [openRows] = await pool.query(
      "SELECT * FROM cashier_sessions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [req.user.id]
    )
    let session = openRows[0]
    if (!session) {
      const id = Date.now()
      await pool.query(
        `INSERT INTO cashier_sessions (id, user_id, user_name, user_role, opening_amount, opened_at, status)
         VALUES (?, ?, ?, ?, 0, NOW(), 'open')`,
        [id, user.id, user.name, user.role]
      )
      const [rows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [id])
      session = rows[0]
    }

    const { salesRows, reservationRows, salesTotal, commandesTotal } = await computeSessionTotals(req.user.id, session.opened_at, true)

    // Si "Fin de journée" a été fait aujourd'hui (Pain, Viennoiserie, Salé, Millefeuille), on
    // inclut ce récapitulatif dans le reçu de clôture de caisse, pour que le caissier n'ait
    // qu'UN SEUL ticket avec ventes + commandes + retours du jour — au lieu de devoir imprimer
    // deux reçus séparés. Il faut donc avoir cliqué "Fin de journée" AVANT "Vider la caisse"
    // pour que cette section apparaisse.
    const [clearLogRows] = await pool.query(
      "SELECT * FROM stock_clear_log WHERE type = 'soir' AND DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 1"
    )
    const clearLogRow = clearLogRows[0]
    const clearLog = clearLogRow ? {
      entries: typeof clearLogRow.entries === 'string' ? JSON.parse(clearLogRow.entries) : clearLogRow.entries,
      totalQuantity: Number(clearLogRow.total_quantity),
      totalValue: Number(clearLogRow.total_value),
      createdAt: clearLogRow.created_at,
    } : null

    await pool.query(
      `UPDATE cashier_sessions SET closed_at = NOW(), status = 'closed',
       closing_sales_total = ?, closing_sales_count = ?, closing_commandes_total = ?, closing_commandes_count = ?
       WHERE id = ?`,
      [salesTotal, salesRows.length, commandesTotal, reservationRows.length, session.id]
    )

    const [closedRows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [session.id])

    res.json({
      closedSession: mapSession(closedRows[0]),
      newSession: null,
      clearLog,
      sales: salesRows.map((s) => ({
        id: s.id, ticketNumber: s.ticket_number, items: safeItems(s.items),
        total: Number(s.total), paymentType: s.payment_type, createdAt: s.created_at,
      })),
      reservations: reservationRows.map((r) => ({
        id: r.id, ticketNumber: r.ticket_number, items: safeItems(r.items),
        total: Number(r.total), clientName: r.client_name, createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur POST /api/sessions/vider :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Historique de toutes les sessions (connexions/déconnexions) — admin uniquement, page Utilisateurs.
// Robuste : une erreur sur le calcul "en direct" d'UNE session ouverte ne fait plus tomber toute
// la page (avant : un seul échec = erreur 500 et page Utilisateurs vide).
router.get('/history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    try { await cleanupStaleSessions() } catch (e) { console.error('history: nettoyage des sessions impossible :', e.message) }
    const [rows] = await pool.query(
      'SELECT *, (DATE(opened_at) < CURDATE()) AS is_stale FROM cashier_sessions ORDER BY opened_at DESC LIMIT 300'
    )
    const mapped = []
    for (const s of rows) {
      const base = mapSession(s)
      if (s.status !== 'open') { mapped.push(base); continue }
      try {
        const agg = await computeSessionAggregates(s.user_id, s.opened_at)
        mapped.push({
          ...base,
          closingSalesTotal: agg.salesTotal,
          closingSalesCount: agg.salesCount,
          closingCommandesTotal: agg.commandesTotal,
          closingCommandesCount: agg.commandesCount,
          isLive: true,
          stale: Number(s.is_stale) === 1,
        })
      } catch (e) {
        console.error('history: totaux en direct impossibles pour la session', s.id, e.message)
        mapped.push({ ...base, isLive: true, stale: Number(s.is_stale) === 1 })
      }
    }
    res.json({ sessions: mapped })
  } catch (error) {
    console.error('Erreur GET /api/sessions/history :', error)
    res.status(500).json({ error: 'Erreur serveur', detail: error.message })
  }
})

module.exports = router
