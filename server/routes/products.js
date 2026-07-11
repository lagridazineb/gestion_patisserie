const express = require('express')
const router = express.Router()
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get all products', products: [] })
})

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: 'Create product' })
})

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: 'Update product' })
})

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: 'Delete product' })
})

module.exports = router