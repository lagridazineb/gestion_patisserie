import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCalendar, FiDollarSign, FiPlus, FiTrash2, FiFileText, FiInbox } from 'react-icons/fi'
import apiClient from '../api/client'
import { useNotification } from '../context/NotificationContext'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(timestamp, dateStr) {
  const d = new Date(timestamp)
  const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return t === dateStr
}

export default function CafeBilanPage() {
  const { addNotification } = useNotification()
  const [date, setDate] = useState(todayStr())
  const [sales, setSales] = useState([])
  const [deposits, setDeposits] = useState([])
  const [fonds, setFonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [cashAmount, setCashAmount] = useState('')
  const [receiptRef, setReceiptRef] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [fondAmount, setFondAmount] = useState('')
  const [fondNote, setFondNote] = useState('')
  const [savingFond, setSavingFond] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [salesRes, depositsRes, fondsRes] = await Promise.all([
        apiClient.get('/cafe/sales', { params: { date } }),
        apiClient.get('/cafe/deposits', { params: { date } }),
        apiClient.get('/fonds-caisse'),
      ])
      setSales(salesRes.data.sales)
      setDeposits(depositsRes.data.deposits)
      setFonds(fondsRes.data.fonds)
    } catch (e) {
      addNotification('Erreur lors du chargement du bilan', 'error')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const cashSales = sales.reduce((sum, s) => sum + s.total, 0)
  const totalSales = cashSales
  const totalDeposited = deposits.reduce((sum, d) => sum + d.cashAmount, 0)
  const dateFonds = fonds.filter((f) => sameDay(f.timestamp, date))
  const totalFonds = dateFonds.reduce((sum, f) => sum + f.amount, 0)

  const handleAddDeposit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(String(cashAmount).replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { addNotification('Montant invalide', 'error'); return }
    setSaving(true)
    try {
      await apiClient.post('/cafe/deposits', { date, cashAmount: amount, receiptRef, note })
      setCashAmount(''); setReceiptRef(''); setNote('')
      addNotification('Dépôt enregistré', 'success')
      load()
    } catch (e) {
      addNotification(e.response?.data?.error || "Erreur lors de l'enregistrement du dépôt", 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDeposit = async (id) => {
    try {
      await apiClient.delete(`/cafe/deposits/${id}`)
      addNotification('Dépôt supprimé', 'success')
      load()
    } catch (e) {
      addNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleAddFond = async (e) => {
    e.preventDefault()
    const amount = parseFloat(String(fondAmount).replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { addNotification('Montant invalide', 'error'); return }
    setSavingFond(true)
    try {
      await apiClient.post('/fonds-caisse', { amount, note: fondNote })
      setFondAmount(''); setFondNote('')
      addNotification('Fonds de caisse enregistré', 'success')
      load()
    } catch (e) {
      addNotification(e.response?.data?.error || "Erreur lors de l'enregistrement", 'error')
    } finally {
      setSavingFond(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-cafe-bg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[2px] text-cafe-espressoLight/50 mb-1">Administration · Café</p>
            <h2 className="font-display text-2xl font-bold text-cafe-espresso">Bilan, Dépôts &amp; Fonds de caisse</h2>
          </div>
          <div className="relative">
            <FiCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cafe-espressoLight/50" size={15} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-cafe-card border border-cafe-border rounded-xl text-cafe-espresso text-sm focus:outline-none focus:border-cafe-terracotta/60" />
          </div>
        </div>

        {loading ? (
          <p className="text-cafe-espressoLight/60 text-sm">Chargement...</p>
        ) : (
          <>
            {/* Résumé des ventes du jour */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-cafe-card border border-cafe-border rounded-2xl p-5">
                <p className="text-xs text-cafe-espressoLight/60 mb-1 flex items-center gap-1.5"><FiDollarSign size={13} /> Espèces encaissées</p>
                <p className="font-display text-2xl font-bold text-cafe-espresso">{cashSales.toFixed(2)} DH</p>
              </div>
              <div className="bg-cafe-terracotta rounded-2xl p-5">
                <p className="text-xs text-white/80 mb-1">Total ventes ({sales.length} ticket{sales.length > 1 ? 's' : ''})</p>
                <p className="font-display text-2xl font-bold text-white">{totalSales.toFixed(2)} DH</p>
              </div>
            </div>

            {/* Fonds de caisse (dépôt rapide : montant + note, façon Pâtisserie Dianna) */}
            <div className="bg-cafe-card border border-cafe-border rounded-2xl p-5 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-cafe-espresso flex items-center gap-2"><FiInbox size={16} /> Fonds de caisse</h3>
                <span className="text-sm font-semibold text-cafe-olive">{totalFonds.toFixed(2)} DH ce jour</span>
              </div>
              <form onSubmit={handleAddFond} className="grid grid-cols-1 sm:grid-cols-[1fr,1.6fr,auto] gap-2.5 mb-5">
                <input type="text" inputMode="decimal" value={fondAmount} onChange={(e) => setFondAmount(e.target.value)}
                  placeholder="Montant (DH)"
                  className="px-3 py-2.5 bg-cafe-cream border border-cafe-border rounded-lg text-sm text-cafe-espresso focus:outline-none focus:border-cafe-terracotta/60" />
                <input type="text" value={fondNote} onChange={(e) => setFondNote(e.target.value)}
                  placeholder="Note (optionnel)"
                  className="px-3 py-2.5 bg-cafe-cream border border-cafe-border rounded-lg text-sm text-cafe-espresso focus:outline-none focus:border-cafe-terracotta/60" />
                <button type="submit" disabled={savingFond}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-cafe-espresso text-white hover:brightness-110 transition-all disabled:opacity-50">
                  <FiPlus size={14} /> Ajouter
                </button>
              </form>
              {dateFonds.length === 0 ? (
                <p className="text-sm italic text-cafe-espressoLight/50 text-center py-3">Aucun fonds de caisse pour cette date</p>
              ) : (
                <div className="space-y-1.5">
                  {dateFonds.map((f) => (
                    <p key={f.id} className="text-xs text-cafe-espressoLight/70">
                      💰 {f.amount.toFixed(2)} DH à {new Date(f.timestamp).toLocaleTimeString('fr-FR')}{f.note && ` — ${f.note}`}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Dépôts (espèces + reçu) */}
            <div className="bg-cafe-card border border-cafe-border rounded-2xl p-5 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-cafe-espresso">Dépôts du jour (avec reçu)</h3>
                <span className="text-sm font-semibold text-cafe-olive">{totalDeposited.toFixed(2)} DH déposés</span>
              </div>

              <form onSubmit={handleAddDeposit} className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,1.4fr,auto] gap-2.5 mb-5">
                <input type="text" inputMode="decimal" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Montant espèces (DH)"
                  className="px-3 py-2.5 bg-cafe-cream border border-cafe-border rounded-lg text-sm text-cafe-espresso focus:outline-none focus:border-cafe-terracotta/60" />
                <input type="text" value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="N° de reçu"
                  className="px-3 py-2.5 bg-cafe-cream border border-cafe-border rounded-lg text-sm text-cafe-espresso focus:outline-none focus:border-cafe-terracotta/60" />
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optionnel)"
                  className="px-3 py-2.5 bg-cafe-cream border border-cafe-border rounded-lg text-sm text-cafe-espresso focus:outline-none focus:border-cafe-terracotta/60" />
                <button type="submit" disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-cafe-terracotta text-white hover:brightness-110 transition-all disabled:opacity-50">
                  <FiPlus size={14} /> Ajouter
                </button>
              </form>

              {deposits.length === 0 ? (
                <p className="text-sm italic text-cafe-espressoLight/50 text-center py-4">Aucun dépôt pour cette date</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {deposits.map((d) => (
                      <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center justify-between gap-3 bg-cafe-cream border border-cafe-border rounded-xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-cafe-espresso">{d.cashAmount.toFixed(2)} DH</p>
                          <p className="text-[11px] text-cafe-espressoLight/60 flex items-center gap-1 truncate">
                            {d.receiptRef && <><FiFileText size={11} /> Reçu {d.receiptRef}</>}
                            {d.note && <span className="italic ml-1">— {d.note}</span>}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteDeposit(d.id)} className="text-cafe-danger shrink-0"><FiTrash2 size={14} /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Liste des tickets du jour */}
            <div className="bg-cafe-card border border-cafe-border rounded-2xl p-5 sm:p-6">
              <h3 className="font-display font-semibold text-cafe-espresso mb-4">Tickets du jour</h3>
              {sales.length === 0 ? (
                <p className="text-sm italic text-cafe-espressoLight/50 text-center py-4">Aucune vente pour cette date</p>
              ) : (
                <div className="space-y-2">
                  {sales.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-cafe-border/50 pb-2">
                      <span className="text-cafe-espressoLight/70">Ticket n°{String(s.ticketNumber).padStart(4, '0')}</span>
                      <span className="font-semibold text-cafe-espresso">{s.total.toFixed(2)} DH</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
