const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, preparateurMiddleware } = require('../middleware/auth')
const { adjustStock } = require('../utils/stockHelpers')

// Journal de production, filtrable par atelier + date (ex: ?atelier=pain&date=2026-07-11)
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

// Enregistre une production. Pour les gâteaux au kg et les entremets circulaires, crée un ou
// plusieurs lots "Frigo Entremet" individuels au lieu de créditer un stock mutualisé.
router.post('/', authMiddleware, preparateurMiddleware, async (req, res) => {
  try {
    const { productId, product, quantity, category, price, atelier, date, time, image, user } = req.body
    const id = Date.now()
    await pool.query(
      `INSERT INTO production_entries
        (id, product_id, product_name, quantity, category, price, atelier, user_name, production_date, production_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, productId, product, quantity, category, price, atelier, user || req.user.email, date, time]
    )

    let frigoBatch = null
    let frigoBatches = null
    if (category === 'gateaux_kg' && price) {
      // Gâteau au kg : le préparateur saisit désormais directement le PRIX du gâteau (quantity
      // vaut toujours 1 ici, envoyé par le front). Le lot créé porte ce prix tel quel, affiché
      // ensuite dans le frigo d'entremet.
      const batchId = `frigobatch_${id}_${Math.random().toString(36).slice(2, 8)}`
      const batchPrice = Math.round(price * quantity * 100) / 100
      const batchName = `${product} — ${batchPrice.toFixed(2)} DH`
      await pool.query(
        `INSERT INTO frigo_batches (id, production_entry_id, base_product_id, name, price, weight_kg, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [batchId, id, productId, batchName, batchPrice, null, image || null]
      )
      await adjustStock(batchId, 1)
      frigoBatch = { id: batchId, name: batchName, price: batchPrice }
    } else if (category === 'entremet' && price) {
      // Entremet circulaire : chaque gâteau produit est une pièce vendable indépendante
      // (prix fixe, pas de poids) — on crée un lot par unité produite, comme pour le kg.
      const unitCount = Math.max(1, Math.round(quantity))
      frigoBatches = []
      for (let i = 0; i < unitCount; i++) {
        const batchId = `frigobatch_${id}_${i}_${Math.random().toString(36).slice(2, 8)}`
        await pool.query(
          `INSERT INTO frigo_batches (id, production_entry_id, base_product_id, name, price, weight_kg, image, created_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?, NOW())`,
          [batchId, id, productId, product, price, image || null]
        )
        await adjustStock(batchId, 1)
        frigoBatches.push({ id: batchId, name: product, price })
      }
    } else {
      await adjustStock(productId, quantity)
    }

    res.json({ id, productId, product, quantity, category, price, atelier, frigoBatch, frigoBatches })
  } catch (error) {
    console.error('Erreur POST /api/production :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Supprime une entrée de production (erreur de saisie) et annule son effet sur le stock.
router.delete('/:id', authMiddleware, preparateurMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await pool.query('SELECT * FROM production_entries WHERE id = ?', [id])
    const entry = rows[0]
    if (!entry) return res.status(404).json({ error: 'Entrée introuvable' })

    await pool.query('DELETE FROM production_entries WHERE id = ?', [id])

    if (entry.category === 'gateaux_kg' || entry.category === 'entremet') {
      const [batches] = await pool.query('SELECT * FROM frigo_batches WHERE production_entry_id = ?', [id])
      for (const batch of batches) {
        await adjustStock(batch.id, -1)
        await pool.query('DELETE FROM frigo_batches WHERE id = ?', [batch.id])
      }
    } else if (entry.product_id) {
      await adjustStock(entry.product_id, -Number(entry.quantity))
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/production/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Lots "Frigo Entremet" encore en stock (donc encore vendables en caisse)
router.get('/frigo-batches', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fb.* FROM frigo_batches fb
       JOIN stock_quantities sq ON sq.product_id = fb.id
       WHERE sq.quantity > 0 ORDER BY fb.created_at DESC`
    )
    res.json({ batches: rows })
  } catch (error) {
    console.error('Erreur GET /api/production/frigo-batches :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
