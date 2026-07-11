const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fonds_caisse ORDER BY created_at DESC')
    res.json({ fonds: rows.map((f) => ({ id: f.id, amount: Number(f.amount), note: f.note, timestamp: f.created_at })) })
  } catch (error) {
    console.error('Erreur GET /api/fonds-caisse :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { amount, note } = req.body
    const id = Date.now()
    await pool.query('INSERT INTO fonds_caisse (id, amount, note, created_at) VALUES (?, ?, ?, NOW())',
      [id, Number(amount) || 0, note || ''])
    res.json({ id, amount: Number(amount) || 0, note })
  } catch (error) {
    console.error('Erreur POST /api/fonds-caisse :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
