const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware } = require('../middleware/auth')
const { nextTicketNumber, adjustStock, safeJsonParse } = require('../utils/stockHelpers')

const AMANDE_KG_ID = 'g2'
const SABLE_KG_ID = 'g3'
const PLATEAU_COMPOSITION = {
  g8: { amandeKg: 0.773, sableKg: 0 },
  g9: { amandeKg: 0, sableKg: 0.613 },
  g10: { amandeKg: 0.703, sableKg: 0.688 },
  g12: { amandeKg: 1.013, sableKg: 0.416 },
  g13: { amandeKg: 0.513, sableKg: 0.813 },
  g15: { amandeKg: 0.430, sableKg: 0.340 },
  g18: { amandeKg: 1.445, sableKg: 0 },
  g19: { amandeKg: 0, sableKg: 1.145 },
}

function mapRow(r) {
  return {
    id: r.id,
    ticketNumber: r.ticket_number,
    items: safeJsonParse(r.items, []),
    paymentType: r.payment_type,
    total: Number(r.total),
    refundedQty: safeJsonParse(r.refunded_qty, {}),
    timestamp: r.created_at,
  }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sales ORDER BY created_at DESC')
    res.json({ sales: rows.map(mapRow) })
  } catch (error) {
    console.error('Erreur GET /api/sales :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/next-ticket-number', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT value FROM ticket_counter WHERE id = 1')
    res.json({ nextTicketNumber: (rows[0]?.value || 0) + 1 })
  } catch (error) {
    console.error('Erreur GET /api/sales/next-ticket-number :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/by-ticket/:ticketNumber', authMiddleware, async (req, res) => {
  try {
    const n = parseInt(req.params.ticketNumber, 10)
    const [rows] = await pool.query('SELECT * FROM sales WHERE ticket_number = ? LIMIT 1', [n])
    if (!rows[0]) return res.status(404).json({ error: 'Ticket introuvable' })
    res.json({ sale: mapRow(rows[0]) })
  } catch (error) {
    console.error('Erreur GET /api/sales/by-ticket :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, paymentType } = req.body
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Panier vide' })

    const id = Date.now()
    const ticketNumber = await nextTicketNumber()
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

    await pool.query(
      `INSERT INTO sales (id, ticket_number, items, payment_type, total, refunded_qty, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, ticketNumber, JSON.stringify(items), paymentType || null, total, JSON.stringify({})]
    )

    for (const item of items) {
      const composition = PLATEAU_COMPOSITION[item.id]
      if (composition) {
        if (composition.amandeKg > 0) await adjustStock(AMANDE_KG_ID, -(composition.amandeKg * item.qty))
        if (composition.sableKg > 0) await adjustStock(SABLE_KG_ID, -(composition.sableKg * item.qty))
      } else {
        await adjustStock(item.id, -item.qty)
      }
    }

    const [rows] = await pool.query('SELECT * FROM sales WHERE id = ?', [id])
    res.json({ sale: mapRow(rows[0]) })
  } catch (error) {
    console.error('Erreur POST /api/sales :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/:ticketNumber/refund', authMiddleware, async (req, res) => {
  try {
    const ticketNumber = parseInt(req.params.ticketNumber, 10)
    const { items: refundItems } = req.body
    const [rows] = await pool.query('SELECT * FROM sales WHERE ticket_number = ? LIMIT 1', [ticketNumber])
    const sale = rows[0]
    if (!sale) return res.status(404).json({ error: 'Ticket introuvable' })

    const items = safeJsonParse(sale.items, [])
    const refundedQty = { ...safeJsonParse(sale.refunded_qty, {}) }
    let amount = 0
    const appliedItems = []

    for (const ri of refundItems || []) {
      if (!ri.qty || ri.qty <= 0) continue
      const item = items.find((i) => i.id === ri.id)
      if (!item) continue
      const already = refundedQty[ri.id] || 0
      const remaining = Math.max(0, item.qty - already)
      const qty = Math.min(ri.qty, remaining)
      if (qty <= 0) continue
      refundedQty[ri.id] = already + qty
      amount += qty * item.price
      appliedItems.push({ id: item.id, name: item.name, price: item.price, qty, unit: item.unit })
      await adjustStock(item.id, qty)
    }

    if (appliedItems.length === 0) return res.status(400).json({ error: 'Aucun article valide à rembourser' })

    await pool.query('UPDATE sales SET refunded_qty = ? WHERE id = ?', [JSON.stringify(refundedQty), sale.id])

    const refundId = Date.now()
    await pool.query(
      `INSERT INTO refunds (id, type, ticket_number, ref_id, items, amount, created_at) VALUES (?, 'sale', ?, ?, ?, ?, NOW())`,
      [refundId, ticketNumber, sale.id, JSON.stringify(appliedItems), amount]
    )

    const [updated] = await pool.query('SELECT * FROM sales WHERE id = ?', [sale.id])
    res.json({ success: true, amount, sale: mapRow(updated[0]) })
  } catch (error) {
    console.error('Erreur POST /api/sales/:ticketNumber/refund :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
