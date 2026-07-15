const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// Renvoie tout ce qu'il faut pour reconstruire le catalogue à jour côté client, en plus du
// catalogue de base figé dans le code (client/src/data/products.js) :
// - customProducts : produits ajoutés par l'admin (n'existent pas dans le code)
// - edits : modifications appliquées à des produits du catalogue de base
// - deletedIds : produits (de base ou custom) masqués partout
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [customProducts] = await pool.query('SELECT * FROM custom_products ORDER BY created_at DESC')
    const [edits] = await pool.query('SELECT * FROM product_edits')
    const [deleted] = await pool.query('SELECT product_id FROM deleted_products')
    res.json({
      customProducts: customProducts.map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), category: p.category, image: p.image, isCustom: true,
      })),
      edits: edits.map((e) => ({
        productId: e.product_id, name: e.name, price: e.price === null ? null : Number(e.price),
        category: e.category, image: e.image,
      })),
      deletedIds: deleted.map((d) => d.product_id),
    })
  } catch (error) {
    console.error('Erreur GET /api/products :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Crée un nouveau produit (n'existe pas dans le catalogue de base).
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, price, category, image } = req.body
    if (!name || !category || isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Nom, prix et catégorie requis' })
    }
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await pool.query(
      'INSERT INTO custom_products (id, name, price, category, image) VALUES (?, ?, ?, ?, ?)',
      [id, name, Number(price), category, image || null]
    )
    res.json({ product: { id, name, price: Number(price), category, image: image || null, isCustom: true } })
  } catch (error) {
    console.error('Erreur POST /api/products :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Modifie un produit — qu'il s'agisse d'un produit ajouté (custom_products) ou d'un produit
// du catalogue de base (product_edits, en "surcouche").
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { name, price, category, image } = req.body
    if (!name || !category || isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Nom, prix et catégorie requis' })
    }
    const [existingCustom] = await pool.query('SELECT id FROM custom_products WHERE id = ?', [id])
    if (existingCustom.length > 0) {
      await pool.query(
        'UPDATE custom_products SET name = ?, price = ?, category = ?, image = ? WHERE id = ?',
        [name, Number(price), category, image || null, id]
      )
      return res.json({ product: { id, name, price: Number(price), category, image: image || null, isCustom: true } })
    }
    await pool.query(
      `INSERT INTO product_edits (product_id, name, price, category, image) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), category = VALUES(category), image = VALUES(image)`,
      [id, name, Number(price), category, image || null]
    )
    res.json({ product: { id, name, price: Number(price), category, image: image || null, isCustom: false } })
  } catch (error) {
    console.error('Erreur PUT /api/products/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Supprime un produit ajouté (suppression définitive), ou masque un produit du catalogue de
// base partout (Caisse, Commandes, Préparateurs, Stock) — réversible via /restore.
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const [existingCustom] = await pool.query('SELECT id FROM custom_products WHERE id = ?', [id])
    if (existingCustom.length > 0) {
      await pool.query('DELETE FROM custom_products WHERE id = ?', [id])
      await pool.query('DELETE FROM product_edits WHERE product_id = ?', [id])
    } else {
      await pool.query('INSERT IGNORE INTO deleted_products (product_id) VALUES (?)', [id])
    }
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/products/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Ré-affiche un produit du catalogue de base précédemment supprimé.
router.post('/:id/restore', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM deleted_products WHERE product_id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/products/:id/restore :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
