const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchases ORDER BY created_at DESC')
    res.json({
      purchases: rows.map((p) => ({
        id: p.id, date: p.purchase_date, label: p.label, supplier: p.supplier,
        amount: Number(p.amount), note: p.note, createdAt: p.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/purchases :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date, label, supplier, amount, note } = req.body
    const id = Date.now()
    const purchaseDate = date || new Date().toISOString().slice(0, 10)
    await pool.query(
      `INSERT INTO purchases (id, purchase_date, label, supplier, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, purchaseDate, label || '', supplier || '', Number(amount) || 0, note || '']
    )
    res.json({ id, date: purchaseDate, label, supplier, amount: Number(amount) || 0, note })
  } catch (error) {
    console.error('Erreur POST /api/purchases :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM purchases WHERE id = ?', [Number(req.params.id)])
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/purchases/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
