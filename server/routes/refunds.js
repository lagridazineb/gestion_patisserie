const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM refunds ORDER BY created_at DESC')
    res.json({
      refunds: rows.map((r) => ({
        id: r.id, type: r.type, ticketNumber: r.ticket_number, refId: r.ref_id,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
        amount: Number(r.amount), timestamp: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/refunds :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
