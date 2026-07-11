const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { adjustStock, setStock, getStockMap } = require('../utils/stockHelpers')

// Tous les rôles connectés peuvent lire le stock (caissier, préparateur, admin en ont besoin)
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
    res.json({ success: true, productId: req.params.productId, value: Math.max(0, Number(value) || 0) })
  } catch (error) {
    console.error('Erreur PUT /api/stock/:productId :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Ajuste le stock d'un produit (utilisé en interne par production/ventes/remboursements,
// mais aussi exposé pour d'éventuels ajustements manuels ponctuels)
router.post('/:productId/adjust', authMiddleware, async (req, res) => {
  try {
    const { delta } = req.body
    await adjustStock(req.params.productId, Number(delta) || 0)
    const stock = await getStockMap()
    res.json({ success: true, value: stock[req.params.productId] ?? 0 })
  } catch (error) {
    console.error('Erreur POST /api/stock/:productId/adjust :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Historique des clôtures (vidanges de stock)
router.get('/clear-log', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stock_clear_log ORDER BY created_at DESC LIMIT 200')
    res.json({ log: rows })
  } catch (error) {
    console.error('Erreur GET /api/stock/clear-log :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Vide le stock des produits demandés (périssables ou tout), en gardant un historique
// de ce qui a été vidé (quantité + valeur), pour affichage côté Admin.
router.post('/clear', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type, affectedProducts } = req.body // affectedProducts: [{id, name, category, price}]
    if (!Array.isArray(affectedProducts)) return res.status(400).json({ error: 'affectedProducts requis' })

    const stock = await getStockMap()
    const entries = affectedProducts
      .map((p) => {
        const qty = stock[p.id] ?? 0
        return { productId: p.id, name: p.name, category: p.category, qty, price: p.price || 0, value: qty * (p.price || 0) }
      })
      .filter((e) => e.qty > 0)
    const totalQuantity = entries.reduce((s, e) => s + e.qty, 0)
    const totalValue = entries.reduce((s, e) => s + e.value, 0)

    for (const p of affectedProducts) {
      await setStock(p.id, 0)
    }

    const id = Date.now()
    await pool.query(
      `INSERT INTO stock_clear_log (id, type, entries, total_quantity, total_value, product_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, type, JSON.stringify(entries), totalQuantity, totalValue, entries.length]
    )

    if (type === 'soir') {
      const today = new Date().toISOString().slice(0, 10)
      await pool.query('UPDATE eod_settings SET last_cleared_date = ? WHERE id = 1', [today])
    }

    res.json({ success: true, id, type, entries, totalQuantity, totalValue, count: affectedProducts.length })
  } catch (error) {
    console.error('Erreur POST /api/stock/clear :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// --- Réglages de clôture automatique (heure + dernière date de clôture) ---
router.get('/eod-settings', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT clear_time, last_cleared_date FROM eod_settings WHERE id = 1')
    const row = rows[0] || { clear_time: '22:00', last_cleared_date: null }
    res.json({ time: row.clear_time, lastClearedDate: row.last_cleared_date })
  } catch (error) {
    console.error('Erreur GET /api/stock/eod-settings :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.put('/eod-settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { time } = req.body
    await pool.query('UPDATE eod_settings SET clear_time = ? WHERE id = 1', [time])
    res.json({ success: true, time })
  } catch (error) {
    console.error('Erreur PUT /api/stock/eod-settings :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
