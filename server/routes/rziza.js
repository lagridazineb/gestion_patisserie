const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { adjustStock } = require('../utils/stockHelpers')

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rziza_deliveries ORDER BY created_at DESC')
    res.json({
      deliveries: rows.map((d) => ({
        id: d.id, quantity: Number(d.quantity), prixAchat: Number(d.prix_achat), prixVente: Number(d.prix_vente),
        montantDu: Number(d.montant_du), statut: d.statut, timestamp: d.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/rziza :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { quantity, prixAchat = 3.5, prixVente = 5.5 } = req.body
    const id = Date.now()
    const q = Number(quantity) || 0
    const montantDu = q * (Number(prixAchat) || 0)
    await pool.query(
      `INSERT INTO rziza_deliveries (id, quantity, prix_achat, prix_vente, montant_du, statut, created_at)
       VALUES (?, ?, ?, ?, ?, 'non_paye', NOW())`,
      [id, q, prixAchat, prixVente, montantDu]
    )
    await adjustStock('r1', q)
    res.json({ id, quantity: q, prixAchat, prixVente, montantDu, statut: 'non_paye' })
  } catch (error) {
    console.error('Erreur POST /api/rziza :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await pool.query('SELECT * FROM rziza_deliveries WHERE id = ?', [id])
    const entry = rows[0]
    await pool.query('DELETE FROM rziza_deliveries WHERE id = ?', [id])
    if (entry) await adjustStock('r1', -Number(entry.quantity))
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/rziza/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
