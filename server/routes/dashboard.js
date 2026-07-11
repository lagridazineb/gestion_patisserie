const express = require('express')
const router = express.Router()
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

router.get('/stats', authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    sales: { today: 5240, week: 28900, month: 125000 },
    transactions: 142,
    topProducts: [],
    lowStock: []
  })
})

router.get('/sales', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ sales: [] })
})

module.exports = router