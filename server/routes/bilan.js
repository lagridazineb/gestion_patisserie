const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

function todayStr() { return new Date().toISOString().slice(0, 10) }

// --- Bilan du jour : ventes caisse, avances/soldes commandes, remboursements, achats, fonds de caisse ---
router.get('/daily', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const date = req.query.date || todayStr()

    const [salesRows] = await pool.query('SELECT * FROM sales WHERE DATE(created_at) = ?', [date])
    const [allReservationsRows] = await pool.query('SELECT * FROM reservations')
    const [reservationsTodayRows] = await pool.query('SELECT * FROM reservations WHERE DATE(created_at) = ?', [date])
    const [refundsRows] = await pool.query('SELECT * FROM refunds WHERE DATE(created_at) = ?', [date])
    const [purchasesRows] = await pool.query('SELECT * FROM purchases WHERE DATE(created_at) = ?', [date])
    const [fondsRows] = await pool.query('SELECT * FROM fonds_caisse WHERE DATE(created_at) = ?', [date])

    const sales = salesRows.map((s) => ({ ...s, total: Number(s.total), paymentType: s.payment_type }))
    const reservations = reservationsTodayRows.map((r) => ({
      ...r, total: Number(r.total), avance: Number(r.avance), avanceInitiale: Number(r.avance_initiale),
    }))
    const allReservations = allReservationsRows

    const ventesCaisse = sales.reduce((sum, s) => sum + s.total, 0)
    const especes = sales.filter((s) => s.paymentType === 'cash').reduce((sum, s) => sum + s.total, 0)
    const tpe = sales.filter((s) => s.paymentType === 'card').reduce((sum, s) => sum + s.total, 0)
    const remboursements = refundsRows.reduce((sum, r) => sum + Number(r.amount), 0)
    const achats = purchasesRows.reduce((sum, p) => sum + Number(p.amount), 0)
    const fondsCaisseTotal = fondsRows.reduce((s, f) => s + Number(f.amount), 0)

    const avanceNouvellesCommandes = reservations.reduce((sum, r) => sum + (r.avance_initiale !== null ? Number(r.avance_initiale) : Number(r.avance)), 0)
    const soldesEncaissesJour = allReservations
      .filter((r) => r.solde_paid && r.solde_paid_at && new Date(r.solde_paid_at).toISOString().slice(0, 10) === date)
      .reduce((sum, r) => sum + (Number(r.solde_amount) || 0), 0)
    const depots = avanceNouvellesCommandes + soldesEncaissesJour
    const solde = ventesCaisse + depots + fondsCaisseTotal - remboursements

    const resteCommandes = allReservations.filter((r) => !r.solde_paid).reduce((sum, r) => sum + Number(r.reste_a_payer), 0)
    const totalCommandes = avanceNouvellesCommandes + soldesEncaissesJour

    res.json({
      date, ventesCaisse, especes, tpe, depots, remboursements, achats, solde, fondsCaisseTotal, soldesEncaissesJour,
      avanceCommandes: avanceNouvellesCommandes, resteCommandes, totalCommandes,
      nbVentes: sales.length, nbReservations: reservations.length,
      sales: sales.map((s) => ({
        id: s.id, ticketNumber: s.ticket_number, items: typeof s.items === 'string' ? JSON.parse(s.items) : s.items,
        paymentType: s.payment_type, total: Number(s.total), timestamp: s.created_at,
      })),
      reservations: reservations.map((r) => ({
        id: r.id, ticketNumber: r.ticket_number, clientName: r.client_name, deliveryDate: r.delivery_date,
        total: Number(r.total), avance: Number(r.avance), avanceInitiale: Number(r.avance_initiale),
        resteAPayer: Number(r.reste_a_payer), soldePaid: !!r.solde_paid, createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/bilan/daily :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// --- Bilan de caisse "Commandes" (avances / soldes ventilés par mode de paiement) ---
router.get('/commandes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const date = req.query.date || todayStr()
    const [nouvellesRows] = await pool.query(
      `SELECT * FROM reservations WHERE DATE(created_at) = ? AND (avance_initiale > 0 OR avance > 0)`, [date]
    )
    const [livreesRows] = await pool.query(
      `SELECT * FROM reservations WHERE solde_paid = 1 AND DATE(solde_paid_at) = ?`, [date]
    )
    const [fondsRows] = await pool.query('SELECT * FROM fonds_caisse WHERE DATE(created_at) = ?', [date])

    const avancesEspeces = nouvellesRows.filter((r) => r.payment_mode === 'cash').reduce((s, r) => s + Number(r.avance_initiale ?? r.avance), 0)
    const avancesTpe = nouvellesRows.filter((r) => r.payment_mode === 'card').reduce((s, r) => s + Number(r.avance_initiale ?? r.avance), 0)
    const totalAvances = avancesEspeces + avancesTpe

    const restesEspeces = livreesRows.filter((r) => r.solde_payment_mode === 'cash').reduce((s, r) => s + Number(r.solde_amount || 0), 0)
    const restesTpe = livreesRows.filter((r) => r.solde_payment_mode === 'card').reduce((s, r) => s + Number(r.solde_amount || 0), 0)
    const totalRestes = restesEspeces + restesTpe

    const totalEspeces = avancesEspeces + restesEspeces
    const totalTpe = avancesTpe + restesTpe
    const chiffreAffaireJour = totalEspeces + totalTpe
    const totalFondsCaisse = fondsRows.reduce((s, f) => s + Number(f.amount), 0)

    res.json({
      date, avancesEspeces, avancesTpe, totalAvances, restesEspeces, restesTpe, totalRestes,
      totalEspeces, totalTpe, chiffreAffaireJour, totalFondsCaisse,
      nouvellesCommandes: nouvellesRows.map((r) => ({
        id: r.id, ticketNumber: r.ticket_number, clientName: r.client_name,
        paymentMode: r.payment_mode, avance: Number(r.avance_initiale ?? r.avance),
      })),
      commandesLivrees: livreesRows.map((r) => ({
        id: r.id, ticketNumber: r.ticket_number, clientName: r.client_name,
        soldePaymentMode: r.solde_payment_mode, soldeAmount: r.solde_amount !== null ? Number(r.solde_amount) : 0,
      })),
      fondsCaisse: fondsRows.map((f) => ({ id: f.id, amount: Number(f.amount), note: f.note, timestamp: f.created_at })),
    })
  } catch (error) {
    console.error('Erreur GET /api/bilan/commandes :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// --- Tendance des ventes sur N jours (graphique du Bilan) ---
router.get('/sales-trend', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7
    const out = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const [salesRows] = await pool.query('SELECT total FROM sales WHERE DATE(created_at) = ?', [dateStr])
      const [resRows] = await pool.query('SELECT avance FROM reservations WHERE DATE(created_at) = ?', [dateStr])
      const ventes = salesRows.reduce((sum, s) => sum + Number(s.total), 0)
      const avances = resRows.reduce((sum, r) => sum + Number(r.avance || 0), 0)
      out.push({
        date: dateStr,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        ventes: Math.round(ventes * 100) / 100,
        total: Math.round((ventes + avances) * 100) / 100,
      })
    }
    res.json({ trend: out })
  } catch (error) {
    console.error('Erreur GET /api/bilan/sales-trend :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
