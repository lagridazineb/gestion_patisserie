const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// Dépôts (espèces + reçu) pour une date donnée — page Bilan & Dépôts (calendrier) du café,
// admin uniquement. C'est la "Dépôt de la caisse" côté café.
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date } = req.query
    let rows
    if (date) {
      [rows] = await pool.query('SELECT * FROM cafe_deposits WHERE deposit_date = ? ORDER BY created_at DESC', [date])
    } else {
      [rows] = await pool.query('SELECT * FROM cafe_deposits ORDER BY deposit_date DESC LIMIT 200')
    }
    res.json({
      deposits: rows.map((r) => ({
        id: r.id, date: r.deposit_date, cashAmount: Number(r.cash_amount),
        receiptRef: r.receipt_ref, note: r.note, createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/cafe/deposits :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date, cashAmount, receiptRef, note } = req.body
    if (!date || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) {
      return res.status(400).json({ error: 'Date et montant en espèces requis' })
    }
    const id = Date.now()
    await pool.query(
      'INSERT INTO cafe_deposits (id, deposit_date, cash_amount, receipt_ref, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, date, Number(cashAmount), receiptRef || null, note || null, req.user.id]
    )
    res.json({ deposit: { id, date, cashAmount: Number(cashAmount), receiptRef: receiptRef || null, note: note || null } })
  } catch (error) {
    console.error('Erreur POST /api/cafe/deposits :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM cafe_deposits WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/cafe/deposits/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
