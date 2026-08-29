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
async function computeSessionTotals(userId, sinceDate) {
  const [salesRows] = await pool.query(
    `SELECT * FROM sales WHERE created_by = ? AND created_at >= ?
     AND created_at < DATE_ADD(DATE(?), INTERVAL 1 DAY) ORDER BY created_at ASC`,
    [userId, sinceDate, sinceDate]
  )
  const [reservationRows] = await pool.query(
    `SELECT * FROM reservations WHERE created_by = ? AND created_at >= ?
     AND created_at < DATE_ADD(DATE(?), INTERVAL 1 DAY) ORDER BY created_at ASC`,
    [userId, sinceDate, sinceDate]
  )
  const salesTotal = salesRows.reduce((s, r) => s + Number(r.total), 0)
  const commandesTotal = reservationRows.reduce((s, r) => s + Number(r.total), 0)
  return { salesRows, reservationRows, salesTotal, commandesTotal }
}

// Ouvre une nouvelle session au login. Le dépôt d'ouverture (`openingAmount`) est pris en
// compte à chaque connexion : comme /auth/login interdit désormais d'avoir deux sessions
// ouvertes en même temps pour un caissier, chaque connexion correspond forcément à une vraie
// reprise de caisse (la précédente a été proprement clôturée), donc on redemande le dépôt à
// chaque fois plutôt que de deviner s'il s'agit du "premier" login du jour.
router.post('/open', authMiddleware, async (req, res) => {
  try {
    const openingAmount = Number(req.body.openingAmount) || 0
    const [users] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [req.user.id])
    const user = users[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const id = Date.now()
    await pool.query(
      `INSERT INTO cashier_sessions (id, user_id, user_name, user_role, opening_amount, opened_at, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 'open')`,
      [id, user.id, user.name, user.role, openingAmount]
    )

    // On relie ce dépôt d'ouverture de caisse à la table fonds_caisse, utilisée par
    // l'admin dans la page "Bilan du jour & Dépôts", pour que le dépôt saisi par le
    // caissier (caissier1, caissier2, ...) apparaisse automatiquement là-bas, avec le
    // nom du caissier en note, sans que l'admin ait besoin de le ressaisir manuellement.
    if (openingAmount > 0) {
      const fondId = id + 1
      await pool.query(
        'INSERT INTO fonds_caisse (id, amount, note, created_at) VALUES (?, ?, ?, NOW())',
        [fondId, openingAmount, `Dépôt d'ouverture — ${user.name}`]
      )
    }

    const [rows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [id])
    res.json({ session: mapSession(rows[0]) })
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

// Clôture forcée par un admin — sans code, pour débloquer un caissier resté coincé avec une
// session "ouverte" alors qu'il ne peut plus s'y reconnecter (appareil perdu/cassé, navigateur
// planté, onglet fermé...). Comme /auth/login interdit désormais une deuxième connexion tant
// qu'une session est ouverte, cette porte de secours est nécessaire pour que le caissier
// puisse retravailler. Les totaux sont calculés normalement (bornés à la journée d'ouverture).
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
// et on rouvre aussitôt une nouvelle session (dépôt 0) pour continuer à travailler.
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

    const { salesRows, reservationRows, salesTotal, commandesTotal } = await computeSessionTotals(req.user.id, session.opened_at)

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

    const newId = Date.now() + 1
    await pool.query(
      `INSERT INTO cashier_sessions (id, user_id, user_name, user_role, opening_amount, opened_at, status)
       VALUES (?, ?, ?, ?, 0, NOW(), 'open')`,
      [newId, user.id, user.name, user.role]
    )

    const [closedRows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [session.id])
    const [newRows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [newId])

    res.json({
      closedSession: mapSession(closedRows[0]),
      newSession: mapSession(newRows[0]),
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

// Historique de toutes les sessions (connexions/déconnexions) — admin uniquement, page Utilisateurs
router.get('/history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cashier_sessions ORDER BY opened_at DESC LIMIT 300')
    const mapped = await Promise.all(rows.map(async (s) => {
      const base = mapSession(s)
      if (s.status !== 'open') return base
      // Session encore ouverte ("Session en cours") : on calcule quand même les ventes /
      // commandes déjà faites depuis son ouverture (bornées à sa journée), pour que l'admin
      // voie un montant même avant la clôture, au lieu de rester vide jusqu'à la déconnexion.
      const { salesRows, reservationRows, salesTotal, commandesTotal } = await computeSessionTotals(s.user_id, s.opened_at)
      const openedDay = new Date(s.opened_at).toISOString().slice(0, 10)
      const todayDay = new Date().toISOString().slice(0, 10)
      return {
        ...base,
        closingSalesTotal: salesTotal,
        closingSalesCount: salesRows.length,
        closingCommandesTotal: commandesTotal,
        closingCommandesCount: reservationRows.length,
        isLive: true,
        // Ouverte un jour précédent et jamais refermée depuis = très probablement oubliée
        // (app/onglet fermé sans cliquer sur Déconnexion, ou jeton expiré silencieusement).
        stale: openedDay !== todayDay,
      }
    }))
    res.json({ sessions: mapped })
  } catch (error) {
    console.error('Erreur GET /api/sessions/history :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
