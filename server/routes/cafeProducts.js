const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

function mapProduct(r) {
  return {
    id: r.id,
    name: r.name,
    price: Number(r.price),
    image: r.image,
    waterOption: !!r.water_option,
    sortOrder: r.sort_order,
  }
}

// Carte du café — accessible à tout utilisateur connecté côté café (caisse + admin).
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM cafe_products WHERE active = 1 ORDER BY sort_order ASC, created_at ASC'
    )
    res.json({ products: rows.map(mapProduct) })
  } catch (error) {
    console.error('Erreur GET /api/cafe/products :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Création d'un produit café — admin uniquement.
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, price, image, waterOption } = req.body
    if (!name || typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Nom et prix valides requis' })
    }
    const id = name
      .toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') + '_' + Date.now().toString(36)

    const [[{ maxOrder } = { maxOrder: 0 }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM cafe_products'
    )

    await pool.query(
      'INSERT INTO cafe_products (id, name, price, image, water_option, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, price, image || null, waterOption === false ? 0 : 1, maxOrder + 1]
    )
    const [rows] = await pool.query('SELECT * FROM cafe_products WHERE id = ?', [id])
    res.json({ product: mapProduct(rows[0]) })
  } catch (error) {
    console.error('Erreur POST /api/cafe/products :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Modification d'un produit café — admin uniquement.
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { name, price, image, waterOption } = req.body
    const [existingRows] = await pool.query('SELECT * FROM cafe_products WHERE id = ?', [id])
    if (!existingRows[0]) return res.status(404).json({ error: 'Produit introuvable' })

    const next = {
      name: name ?? existingRows[0].name,
      price: typeof price === 'number' ? price : existingRows[0].price,
      image: image !== undefined ? image : existingRows[0].image,
      water_option: typeof waterOption === 'boolean' ? (waterOption ? 1 : 0) : existingRows[0].water_option,
    }
    await pool.query(
      'UPDATE cafe_products SET name = ?, price = ?, image = ?, water_option = ? WHERE id = ?',
      [next.name, next.price, next.image, next.water_option, id]
    )
    const [rows] = await pool.query('SELECT * FROM cafe_products WHERE id = ?', [id])
    res.json({ product: mapProduct(rows[0]) })
  } catch (error) {
    console.error('Erreur PUT /api/cafe/products/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Suppression douce (active = 0) pour ne pas casser l'historique des ventes — admin uniquement.
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE cafe_products SET active = 0 WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (error) {
    console.error('Erreur DELETE /api/cafe/products/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
