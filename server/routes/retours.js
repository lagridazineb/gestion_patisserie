const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// Renvoie, pour une date donnée (par défaut aujourd'hui) :
//  - current  : le retour calculé CE jour-là (clôture de caisse de ce jour), ou null si la
//                clôture du soir n'a pas encore eu lieu pour cette date.
//  - previous : le retour du jour précédent le plus récent (celui qu'on réutilise comme fond
//                de caisse du jour).
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const [currentRows] = await pool.query('SELECT * FROM retours_caisse WHERE retour_date = ? LIMIT 1', [date])
    const [previousRows] = await pool.query(
      'SELECT * FROM retours_caisse WHERE retour_date < ? ORDER BY retour_date DESC LIMIT 1',
      [date]
    )
    const format = (r) => r ? ({
      id: r.id, date: r.retour_date, totalValue: Number(r.total_value),
      entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries,
      createdAt: r.created_at,
    }) : null
    res.json({ current: format(currentRows[0]), previous: format(previousRows[0]) })
  } catch (error) {
    console.error('Erreur GET /api/retours :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
