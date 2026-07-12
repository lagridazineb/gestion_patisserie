const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware } = require('../middleware/auth')
const { nextTicketNumber, safeJsonParse } = require('../utils/stockHelpers')

// Convertit une ligne SQL (colonnes JSON en TEXT/JSON) vers l'objet utilisé par le frontend.
function mapRow(r) {
  return {
    id: r.id,
    ticketNumber: r.ticket_number,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    deliveryDate: r.delivery_date,
    deliveryTime: r.delivery_time,
    note: r.note,
    items: safeJsonParse(r.items, []),
    total: Number(r.total),
    avance: Number(r.avance),
    avanceInitiale: Number(r.avance_initiale),
    resteAPayer: Number(r.reste_a_payer),
    paymentMode: r.payment_mode,
    ready: !!r.ready,
    doneByAtelier: safeJsonParse(r.done_by_atelier, {}),
    refundedQty: safeJsonParse(r.refunded_qty, {}),
    soldePaid: !!r.solde_paid,
    soldePaymentMode: r.solde_payment_mode,
    soldePaidAt: r.solde_paid_at,
    soldeAmount: r.solde_amount !== null ? Number(r.solde_amount) : null,
    createdAt: r.created_at,
  }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reservations ORDER BY created_at DESC')
    res.json({ reservations: rows.map(mapRow) })
  } catch (error) {
    console.error('Erreur GET /api/reservations :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/by-ticket/:ticketNumber', authMiddleware, async (req, res) => {
  try {
    const n = parseInt(req.params.ticketNumber, 10)
    const [rows] = await pool.query('SELECT * FROM reservations WHERE ticket_number = ? LIMIT 1', [n])
    if (!rows[0]) return res.status(404).json({ error: 'Commande introuvable' })
    res.json({ reservation: mapRow(rows[0]) })
  } catch (error) {
    console.error('Erreur GET /api/reservations/by-ticket :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { clientName, clientPhone, deliveryDate, deliveryTime, note, items, total, avance, resteAPayer, paymentMode } = req.body
    const id = Date.now()
    const ticketNumber = await nextTicketNumber()
    const avanceValue = Number(avance) || 0
    await pool.query(
      `INSERT INTO reservations
        (id, ticket_number, client_name, client_phone, delivery_date, delivery_time, note, items, total,
         avance, avance_initiale, reste_a_payer, payment_mode, ready, done_by_atelier, refunded_qty,
         solde_paid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, NOW())`,
      [id, ticketNumber, clientName, clientPhone || null, deliveryDate || null, deliveryTime || null, note || null,
       JSON.stringify(items || []), total, avanceValue, avanceValue, resteAPayer, paymentMode || null,
       JSON.stringify({}), JSON.stringify({})]
    )
    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id])
    res.json({ reservation: mapRow(rows[0]) })
  } catch (error) {
    console.error('Erreur POST /api/reservations :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Le préparateur marque sa partie (un atelier) comme terminée
router.patch('/:id/atelier', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { atelier } = req.body
    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id])
    const r = rows[0]
    if (!r) return res.status(404).json({ error: 'Commande introuvable' })

    const doneByAtelier = { ...safeJsonParse(r.done_by_atelier, {}) }
    if (atelier) doneByAtelier[atelier] = true

    const items = safeJsonParse(r.items, [])
    const allAteliers = [...new Set(items.map((i) => i.category).filter(Boolean))]
    const fullyReady = allAteliers.length > 0 && allAteliers.every((a) => doneByAtelier[a])
    const ready = r.ready || fullyReady

    await pool.query('UPDATE reservations SET done_by_atelier = ?, ready = ? WHERE id = ?',
      [JSON.stringify(doneByAtelier), ready ? 1 : 0, id])

    const [updated] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id])
    res.json({ reservation: mapRow(updated[0]) })
  } catch (error) {
    console.error('Erreur PATCH /api/reservations/:id/atelier :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Bascule manuelle "prête" par l'admin/caissier
router.patch('/:id/ready', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await pool.query('SELECT ready FROM reservations WHERE id = ?', [id])
    if (!rows[0]) return res.status(404).json({ error: 'Commande introuvable' })
    const next = rows[0].ready ? 0 : 1
    await pool.query('UPDATE reservations SET ready = ? WHERE id = ?', [next, id])
    res.json({ success: true, ready: !!next })
  } catch (error) {
    console.error('Erreur PATCH /api/reservations/:id/ready :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Encaisse le reste à payer (solde) au retrait par le client
router.post('/:id/solde', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { paymentMode } = req.body
    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id])
    const r = rows[0]
    if (!r) return res.status(404).json({ error: 'Commande introuvable' })

    const soldeAmount = Number(r.reste_a_payer)
    await pool.query(
      `UPDATE reservations SET avance = total, reste_a_payer = 0, solde_paid = 1,
       solde_payment_mode = ?, solde_paid_at = NOW(), solde_amount = ? WHERE id = ?`,
      [paymentMode, soldeAmount, id]
    )
    const [updated] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id])
    res.json({ success: true, reservation: mapRow(updated[0]) })
  } catch (error) {
    console.error('Erreur POST /api/reservations/:id/solde :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM reservations WHERE id = ?', [Number(req.params.id)])
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/reservations/:id :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Remboursement (partiel ou total) d'une commande déjà encaissée
router.post('/:ticketNumber/refund', authMiddleware, async (req, res) => {
  try {
    const ticketNumber = parseInt(req.params.ticketNumber, 10)
    const { items: refundItems } = req.body
    const [rows] = await pool.query('SELECT * FROM reservations WHERE ticket_number = ? LIMIT 1', [ticketNumber])
    const r = rows[0]
    if (!r) return res.status(404).json({ error: 'Commande introuvable' })

    const items = safeJsonParse(r.items, [])
    const refundedQty = { ...safeJsonParse(r.refunded_qty, {}) }
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
    }

    if (appliedItems.length === 0) return res.status(400).json({ error: 'Aucun article valide à rembourser' })

    const newTotal = Math.max(0, Number(r.total) - amount)
    const newReste = r.solde_paid ? Number(r.reste_a_payer) : Math.max(0, Number(r.reste_a_payer) - amount)

    await pool.query('UPDATE reservations SET refunded_qty = ?, total = ?, reste_a_payer = ? WHERE id = ?',
      [JSON.stringify(refundedQty), newTotal, newReste, r.id])

    const refundId = Date.now()
    await pool.query(
      `INSERT INTO refunds (id, type, ticket_number, ref_id, items, amount, created_at) VALUES (?, 'commande', ?, ?, ?, ?, NOW())`,
      [refundId, ticketNumber, r.id, JSON.stringify(appliedItems), amount]
    )

    const [updated] = await pool.query('SELECT * FROM reservations WHERE id = ?', [r.id])
    res.json({ success: true, amount, reservation: mapRow(updated[0]) })
  } catch (error) {
    console.error('Erreur POST /api/reservations/:ticketNumber/refund :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
