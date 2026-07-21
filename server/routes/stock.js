const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { adjustStock, setStock, getStockMap } = require('../utils/stockHelpers')

// Tous les rôles connectés peuvent lire le stock
router.get('/', authMiddleware, async (req, res) => {
  try {
    const stock = await getStockMap()
    res.json({ stock })
  } catch (error) {
    console.error('Erreur GET /api/stock :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Fixe le stock d'un produit à une valeur précise (édition manuelle par l'admin)
router.put('/:productId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { value } = req.body
    await setStock(req.params.productId, value)
    res.json({ productId: req.params.productId, value })
  } catch (error) {
    console.error('Erreur PUT /api/stock/:productId :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Ajuste le stock d'un produit (incrément/décrément)
router.post('/:productId/adjust', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { delta } = req.body
    await adjustStock(req.params.productId, delta)
    const stock = await getStockMap()
    res.json({ productId: req.params.productId, value: stock[req.params.productId] || 0 })
  } catch (error) {
    console.error('Erreur POST /api/stock/:productId/adjust :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ✅ ADMIN : Modifier le stock du jour d'un atelier (préparateur)
router.put('/daily/:atelier', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { atelier } = req.params
    const { stockData } = req.body // { productId: quantity, ... }

    if (!stockData || typeof stockData !== 'object') {
      return res.status(400).json({ error: 'Données de stock invalides' })
    }

    for (const [productId, quantity] of Object.entries(stockData)) {
      await setStock(productId, quantity)
    }

    res.json({ success: true, message: 'Stock du jour mis à jour', atelier })
  } catch (error) {
    console.error('Erreur PUT /api/stock/daily/:atelier :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
