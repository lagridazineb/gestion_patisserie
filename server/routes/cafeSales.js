const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

async function nextTicketNumber() {
  await pool.query('UPDATE cafe_ticket_counter SET value = value + 1 WHERE id = 1')
  const [rows] = await pool.query('SELECT value FROM cafe_ticket_counter WHERE id = 1')
  return rows[0].value
}

// Numéro de ticket à venir (affiché avant encaissement, sans le consommer).
router.get('/next-ticket', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT value FROM cafe_ticket_counter WHERE id = 1')
    res.json({ nextTicket: (rows[0]?.value || 0) + 1 })
  } catch (error) {
    console.error('Erreur GET /api/cafe/sales/next-ticket :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, paymentType, total } = req.body
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Panier vide' })
    if (!paymentType || typeof total !== 'number') return res.status(400).json({ error: 'Mode de paiement et total requis' })
    const id = Date.now()
    const ticketNumber = await nextTicketNumber()
    await pool.query(
      'INSERT INTO cafe_sales (id, ticket_number, items, payment_type, total, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, ticketNumber, JSON.stringify(items), paymentType, total, req.user.id]
    )
    res.json({ sale: { id, ticketNumber, items, paymentType, total, createdAt: new Date().toISOString() } })
  } catch (error) {
    console.error('Erreur POST /api/cafe/sales :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Liste des ventes d'une date (YYYY-MM-DD) — utilisé par le Bilan café (admin).
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query
    let rows
    if (date) {
      [rows] = await pool.query('SELECT * FROM cafe_sales WHERE DATE(created_at) = ? ORDER BY created_at DESC', [date])
    } else {
      [rows] = await pool.query('SELECT * FROM cafe_sales ORDER BY created_at DESC LIMIT 200')
    }
    res.json({
      sales: rows.map((r) => ({
        id: r.id, ticketNumber: r.ticket_number, items: r.items, paymentType: r.payment_type,
        total: Number(r.total), createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/cafe/sales :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
