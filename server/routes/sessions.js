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

async function computeSessionTotals(userId, sinceDate) {
  const [salesRows] = await pool.query(
    'SELECT * FROM sales WHERE created_by = ? AND created_at >= ? ORDER BY created_at ASC',
    [userId, sinceDate]
  )
  const [reservationRows] = await pool.query(
    'SELECT * FROM reservations WHERE created_by = ? AND created_at >= ? ORDER BY created_at ASC',
    [userId, sinceDate]
  )
  const salesTotal = salesRows.reduce((s, r) => s + Number(r.total), 0)
  const commandesTotal = reservationRows.reduce((s, r) => s + Number(r.total), 0)
  return { salesRows, reservationRows, salesTotal, commandesTotal }
}

// Ouvre une nouvelle session au login. `openingAmount` (le "dépôt") est obligatoire côté
// interface pour les caissiers ; pour les autres rôles, on envoie 0 par défaut sans popup.
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
    res.json({ sessions: rows.map(mapSession) })
  } catch (error) {
    console.error('Erreur GET /api/sessions/history :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
