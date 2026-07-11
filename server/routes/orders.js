const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get all orders', orders: [] })
})

router.post('/', authMiddleware, (req, res) => {
  res.json({ message: 'Create order' })
})

module.exports = router