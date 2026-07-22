const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { adjustStock, setStock, getStockMap, performClear } = require('../utils/stockHelpers')

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

// Ajoute la même quantité (delta) au stock d'une liste de produits en une seule fois —
// utilisé par le bouton "Stock" de l'admin dans la Caisse pour réapprovisionner en masse
// (ex : +1000 pièces sur toutes les catégories d'un coup).
router.post('/bulk-add', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { productIds, delta } = req.body
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds requis' })
    }
    const amount = Number(delta)
    if (isNaN(amount)) return res.status(400).json({ error: 'delta invalide' })

    for (const id of productIds) {
      if (id) await adjustStock(id, amount)
    }
    const stock = await getStockMap()
    res.json({ success: true, count: productIds.length, delta: amount, stock })
  } catch (error) {
    console.error('Erreur POST /api/stock/bulk-add :', error)
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

// Vide le stock des produits demandés (périssables ou tout), en gardant un historique de ce
// qui a été vidé. Ouvert aux caissiers pour le "type=soir" (fin de journée) ; le "complet"
// (tout remettre à 0) reste réservé à l'admin, vérifié plus bas.
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    const { type, affectedProducts, fullCatalog } = req.body // affectedProducts: [{id, name, category, price}]
    if (type === 'complet' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Administrateur requis' })
    }
    if (!Array.isArray(affectedProducts)) return res.status(400).json({ error: 'affectedProducts requis' })

    const result = await performClear({ type, affectedProducts, fullCatalog })
    res.json(result)
  } catch (error) {
    console.error('Erreur POST /api/stock/clear :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

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
