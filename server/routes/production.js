const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, preparateurMiddleware } = require('../middleware/auth')
const { adjustStock } = require('../utils/stockHelpers')

// Journal de production, filtrable par atelier + date
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { atelier, date } = req.query
    let sql = 'SELECT * FROM production_entries'
    const params = []
    const conditions = []
    if (atelier) { conditions.push('atelier = ?'); params.push(atelier) }
    if (date) { conditions.push('production_date = ?'); params.push(date) }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json({ productions: rows })
  } catch (error) {
    console.error('Erreur GET /api/production :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Enregistre une production. Pour les gâteaux au kg, le préparateur entre le PRIX (pas la quantité en kg).
// Pour Trifil et Ganage, ils restent séparés même si même prix.
router.post('/', authMiddleware, preparateurMiddleware, async (req, res) => {
  try {
    const { productId, product, quantity, category, price, atelier, date, time, image, user } = req.body
    const id = Date.now()

    // Pour gâteaux_kg, la "quantity" est en fait le PRIX saisi par le préparateur
    let actualQuantity = quantity
    let actualPrice = price

    if (category === 'gateaux_kg') {
      // Le préparateur entre le prix du gâteau, pas la quantité en kg
      actualPrice = Number(quantity) || 0
      actualQuantity = 1 // Un gâteau = 1 unité
    }

    await pool.query(
      `INSERT INTO production_entries
        (id, product_id, product_name, quantity, category, price, atelier, user_name, production_date, production_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, productId, product, actualQuantity, category, actualPrice, atelier, user || req.user.email, date, time]
    )

    let frigoBatch = null
    let frigoBatches = null

    if (category === 'gateaux_kg' && actualPrice > 0) {
      // Gâteau au kg : le prix est saisi par le préparateur
      const batchId = `frigobatch_${id}_${Math.random().toString(36).slice(2, 8)}`
      const batchName = `${product} — ${actualPrice} DH`
      await pool.query(
        `INSERT INTO frigo_batches (id, production_entry_id, base_product_id, name, price, weight_kg, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [batchId, id, productId, batchName, actualPrice, 1, image || null]
      )
      await adjustStock(batchId, 1)
      frigoBatch = { id: batchId, name: batchName, price: actualPrice, weightKg: 1 }
    } else if (category === 'entremet' && actualPrice > 0) {
      // Entremet circulaire : chaque gâteau est une pièce vendable indépendante
      const unitCount = Math.max(1, Math.round(actualQuantity))
      frigoBatches = []
      for (let i = 0; i < unitCount; i++) {
        const batchId = `frigobatch_${id}_${i}_${Math.random().toString(36).slice(2, 8)}`
        const batchName = `${product} — ${actualPrice} DH`
        await pool.query(
          `INSERT INTO frigo_batches (id, production_entry_id, base_product_id, name, price, weight_kg, image, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [batchId, id, productId, batchName, actualPrice, 1, image || null]
        )
        await adjustStock(batchId, 1)
        frigoBatches.push({ id: batchId, name: batchName, price: actualPrice, weightKg: 1 })
      }
    } else if (category === 'trifil' || category === 'ganage') {
      // Trifil et Ganage restent séparés même si même prix
      const batchId = `frigobatch_${id}_${Math.random().toString(36).slice(2, 8)}`
      const batchName = `${product} — ${actualPrice} DH`
      await pool.query(
        `INSERT INTO frigo_batches (id, production_entry_id, base_product_id, name, price, weight_kg, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [batchId, id, productId, batchName, actualPrice, actualQuantity, image || null]
      )
      await adjustStock(batchId, actualQuantity)
      frigoBatch = { id: batchId, name: batchName, price: actualPrice, weightKg: actualQuantity }
    }

    res.json({ success: true, id, frigoBatch, frigoBatches })
  } catch (error) {
    console.error('Erreur POST /api/production :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
