const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// Table partagée entre pâtisserie et café ; chaque ligne est rattachée au `business`
// de l'utilisateur qui l'a créée, pour que l'admin café ait son propre historique de
// "Fonds de caisse", séparé de celui de la pâtisserie.
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const business = req.user.business || 'patisserie'
    const [rows] = await pool.query(
      'SELECT * FROM fonds_caisse WHERE business = ? ORDER BY created_at DESC',
      [business]
    )
    res.json({ fonds: rows.map((f) => ({ id: f.id, amount: Number(f.amount), note: f.note, timestamp: f.created_at })) })
  } catch (error) {
    console.error('Erreur GET /api/fonds-caisse :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const business = req.user.business || 'patisserie'
    const { amount, note } = req.body
    const id = Date.now()
    await pool.query(
      'INSERT INTO fonds_caisse (id, amount, business, note, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, Number(amount) || 0, business, note || '']
    )
    res.json({ id, amount: Number(amount) || 0, note })
  } catch (error) {
    console.error('Erreur POST /api/fonds-caisse :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
