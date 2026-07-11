import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiTrendingUp, FiDollarSign, FiCreditCard, FiPackage, FiPlus, FiArrowRight, FiCalendar } from 'react-icons/fi'
import { getDailyBilan, getFondsCaisse, addFondCaisse, subscribeToStockUpdates, sameDay } from '../data/stockStore'
import { useNotification } from '../context/NotificationContext'

export default function BilanPage() {
  const { addNotification } = useNotification()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [bilan, setBilan] = useState(null)
  const [fondAmount, setFondAmount] = useState('')
  const [dateFonds, setDateFonds] = useState([])

  const isToday = date === new Date().toISOString().slice(0, 10)

  const refresh = useCallback(async () => {
    const [bilanData, fonds] = await Promise.all([getDailyBilan(date), getFondsCaisse()])
    setBilan(bilanData)
    setDateFonds(fonds.filter((f) => sameDay(f.timestamp, date)))
  }, [date])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const totalDepotsDuJour = dateFonds.reduce((s, f) => s + f.amount, 0)

  const handleAddFond = async (e) => {
    e.preventDefault()
    const amt = parseFloat(fondAmount)
    if (isNaN(amt) || amt <= 0) {
      addNotification('Montant invalide', 'error')
      return
    }
    await addFondCaisse(amt)
    addNotification('Dépôt enregistré', 'success')
    setFondAmount('')
    refresh()
  }

  const filteredReservations = useMemo(() => {
    if (!bilan) return []
    return bilan.reservations.filter((r) => r.avance > 0)
  }, [bilan])

  const filteredSales = useMemo(() => {
    if (!bilan) return []
    return bilan.sales
  }, [bilan])

  if (!bilan) return null

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Admin</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Bilan du jour & Dépôts</h2>
            <p className="text-sm text-diana-brown mt-1">{new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <Link to="/bilan-caisse"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-diana-gold text-diana-dark text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
            Commandes du jour <FiArrowRight size={15} />
          </Link>
        </motion.div>

        <div className="flex items-center gap-2 mb-6">
          <FiCalendar className="text-diana-brown" size={15} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
          {!isToday && (
            <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} className="text-xs text-diana-brown hover:text-diana-gold underline">Aujourd'hui</button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 items-stretch">
          <div className="bg-diana-card border border-diana-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-diana-brown"><FiTrendingUp size={15} /><p className="text-xs">Ventes caisse</p></div>
            <div className="flex justify-between text-sm text-diana-brownLight mb-1.5">
              <span className="flex items-center gap-1.5"><FiDollarSign size={12} /> Espèces</span>
              <span className="text-diana-cream font-medium">{bilan.especes.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-sm text-diana-brownLight mb-3">
              <span className="flex items-center gap-1.5"><FiCreditCard size={12} /> TPE</span>
              <span className="text-diana-cream font-medium">{bilan.tpe.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-diana-border">
              <span className="text-xs font-semibold text-diana-brown">Total ventes caisse</span>
              <span className="font-fraunces text-2xl font-bold text-emerald-500">{bilan.ventesCaisse.toFixed(2)} DH</span>
            </div>
          </div>

          {/* Commandes : Avance (nouvelles commandes du jour) + Soldes encaissés ce jour-là,
              Reste = total encore dû sur toutes les commandes en cours */}
          <div className="bg-diana-card border border-diana-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-diana-brown"><FiPackage size={15} /><p className="text-xs">Commandes</p></div>
            <div className="flex justify-between text-sm text-diana-brownLight mb-1.5">
              <span>Avance (nouvelles)</span>
              <span className="text-diana-cream font-medium">{bilan.avanceCommandes.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-sm text-diana-brownLight mb-3">
              <span>Soldes encaissés</span>
              <span className="text-diana-cream font-medium">{bilan.soldesEncaissesJour.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-diana-border">
              <span className="text-xs font-semibold text-diana-brown">Total commandes du jour</span>
              <span className="font-fraunces text-2xl font-bold text-emerald-500">{bilan.totalCommandes.toFixed(2)} DH</span>
            </div>
          </div>

          {/* Dépôt — le total du jour est affiché en évidence, comme les 2 autres cases.
              L'ajout n'est possible que sur le jour même (on ne peut pas antidater un dépôt). */}
          <div className="bg-diana-card border border-diana-border rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3 text-diana-brown"><FiPlus size={15} /><p className="text-xs">Dépôt</p></div>
            {isToday ? (
              <form onSubmit={handleAddFond} className="mb-3">
                <label className="text-xs text-diana-brown mb-1 block">Montant à déposer</label>
                <div className="flex gap-2">
                  <input type="number" min="0" step="0.01" value={fondAmount}
                    onChange={(e) => setFondAmount(e.target.value)} placeholder="Ex: 1000"
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
                  <button type="submit"
                    className="shrink-0 flex items-center justify-center gap-1.5 bg-diana-gold text-diana-dark py-2.5 px-4 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
                    <FiPlus size={15} /> Déposer
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-diana-brownLight italic mb-3">Consultation d'un jour passé — dépôt non modifiable ici.</p>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-diana-border">
              <span className="text-xs font-semibold text-diana-brown">Total dépôts {isToday ? 'du jour' : 'ce jour-là'}</span>
              <span className="font-fraunces text-2xl font-bold text-emerald-500">{totalDepotsDuJour.toFixed(2)} DH</span>
            </div>
          </div>
        </div>

        {dateFonds.length > 0 && (
          <div className="mb-8 space-y-1.5">
            {dateFonds.map((f) => (
              <p key={f.id} className="text-xs text-diana-brown">
                💰 {f.amount.toFixed(2)} DH déposés à {new Date(f.timestamp).toLocaleTimeString('fr-FR')}{f.note && ` — ${f.note}`}
              </p>
            ))}
          </div>
        )}

        <div className="bg-diana-card border border-diana-gold/30 rounded-2xl p-6 mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-diana-brown mb-1">Solde net {isToday ? 'du jour' : 'de ce jour-là'}</p>
            <p className="text-[11px] text-diana-brownLight">Ventes caisse + avances de commande + soldes encaissés + dépôts − remboursements</p>
          </div>
          <p className="font-fraunces text-4xl font-semibold text-diana-gold">{bilan.solde.toFixed(2)} DH</p>
        </div>

        <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-3">Avances de commande {isToday ? 'du jour' : 'de ce jour-là'}</p>
        {filteredReservations.length === 0 ? (
          <p className="text-sm italic text-diana-brownLight mb-8">Aucune avance</p>
        ) : (
          <div className="space-y-2.5 mb-8">
            {filteredReservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-diana-card border border-diana-border rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-diana-cream font-medium">{r.clientName}</p>
                  <p className="text-xs text-diana-brown">Livraison {r.deliveryDate} · Total {(r.total || 0).toFixed(2)} DH</p>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <p className="text-sm font-semibold text-emerald-500">+{(r.avanceInitiale ?? r.avance ?? 0).toFixed(2)} DH</p>
                  <p className="text-[10px] text-diana-brownLight">Reste {(r.resteAPayer || 0).toFixed(2)} DH</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-3">Ventes caisse {isToday ? 'du jour' : 'de ce jour-là'} ({filteredSales.length})</p>
        {filteredSales.length === 0 ? (
          <p className="text-sm italic text-diana-brownLight">Aucune vente</p>
        ) : (
          <div className="space-y-2.5">
            {filteredSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-diana-card border border-diana-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-diana-cream">Ticket n°{String(s.ticketNumber).padStart(3, '0')}</p>
                  <p className="text-xs text-diana-brown">{new Date(s.timestamp).toLocaleTimeString('fr-FR')} · {s.paymentType === 'cash' ? 'Espèces' : 'TPE'}</p>
                </div>
                <p className="text-sm font-semibold text-diana-cream">{(s.total || 0).toFixed(2)} DH</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
