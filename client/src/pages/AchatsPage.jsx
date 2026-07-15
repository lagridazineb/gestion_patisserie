import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiRotateCcw, FiCheckCircle, FiAlertCircle, FiCalendar, FiShoppingBag, FiPackage } from 'react-icons/fi'
import {
  findSaleByTicket, getRefundableQty, processRefund,
  findReservationByTicket, getCommandeRefundableQty, processCommandeRefund,
  getReservations, getRefunds, getSalesLog, subscribeToStockUpdates, sameDay,
} from '../data/stockStore'
import NumericField from '../components/NumericField'
import KeyboardField from '../components/KeyboardField'
import { useNotification } from '../context/NotificationContext'

function formatQty(qty) {
  const n = Number(qty) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function RemboursementPage() {
  const { addNotification } = useNotification()
  const [tab, setTab] = useState('vente') // 'vente' | 'commande'
  const [ticketInput, setTicketInput] = useState('')
  const [sale, setSale] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [refundQtys, setRefundQtys] = useState({}) // { itemId: qty à rembourser }
  const [calDate, setCalDate] = useState('')

  const [refunds, setRefunds] = useState([])
  const [reservations, setReservations] = useState([])
  const [sales, setSales] = useState([])
  const refresh = useCallback(async () => {
    const [refundsData, reservationsData, salesData] = await Promise.all([getRefunds(), getReservations(), getSalesLog()])
    setRefunds(refundsData)
    setReservations(reservationsData)
    setSales(salesData)
  }, [])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const current = tab === 'vente' ? sale : reservation

  const switchTab = (t) => {
    setTab(t); setSale(null); setReservation(null); setNotFound(false); setRefundQtys({}); setTicketInput('')
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (tab === 'vente') {
      const found = await findSaleByTicket(ticketInput)
      setSale(found); setReservation(null)
      setNotFound(!found)
    } else {
      const found = await findReservationByTicket(ticketInput)
      setReservation(found); setSale(null)
      setNotFound(!found)
    }
    setRefundQtys({})
  }

  const pickReservation = (r) => {
    setReservation(r); setSale(null); setNotFound(false); setRefundQtys({})
    setTicketInput(String(r.ticketNumber))
  }

  const pickSale = (s) => {
    setSale(s); setReservation(null); setNotFound(false); setRefundQtys({})
    setTicketInput(String(s.ticketNumber))
  }

  const setQtyFor = (itemId, value, max) => {
    let v = parseFloat(value)
    if (isNaN(v) || v < 0) v = 0
    if (v > max) v = max
    setRefundQtys((prev) => ({ ...prev, [itemId]: v }))
  }

  const setMaxFor = (itemId, max) => setRefundQtys((prev) => ({ ...prev, [itemId]: max }))

  const refundEntries = current ? current.items.map((item) => {
    const remaining = tab === 'vente' ? getRefundableQty(current, item.id) : getCommandeRefundableQty(current, item.id)
    return { item, remaining, qty: refundQtys[item.id] || 0 }
  }) : []

  const totalRefund = refundEntries.reduce((sum, r) => sum + (r.qty || 0) * (Number(r.item.price) || 0), 0)
  const hasSelection = refundEntries.some((r) => r.qty > 0)

  const handleConfirmRefund = async () => {
    const items = refundEntries.filter((r) => r.qty > 0).map((r) => ({ id: r.item.id, qty: r.qty }))
    const result = tab === 'vente' ? await processRefund(sale.ticketNumber, items) : await processCommandeRefund(reservation.ticketNumber, items)
    if (result.success) {
      addNotification(`Remboursement de ${result.amount.toFixed(2)} DH effectué`, 'success')
      if (tab === 'vente') setSale(result.sale)
      else setReservation(result.reservation)
      setRefundQtys({})
      refresh()
    } else {
      addNotification(result.error || 'Erreur lors du remboursement', 'error')
    }
  }

  // Toutes les commandes ayant reçu une avance, filtrables par date — pour retrouver un
  // "ticket d'avance" sans connaître son numéro par cœur.
  const avanceTickets = useMemo(() => {
    const list = reservations.filter((r) => (r.avanceInitiale ?? r.avance ?? 0) > 0)
    if (!calDate) return list
    return list.filter((r) => sameDay(r.createdAt, calDate))
  }, [reservations, calDate])

  // Tous les tickets de caisse, filtrables par date — pour retrouver un ticket sans en
  // connaître le numéro par cœur.
  const dateSales = useMemo(() => {
    if (!calDate) return sales
    return sales.filter((s) => sameDay(s.timestamp, calDate))
  }, [sales, calDate])

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Caisse</p>
          <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Remboursement</h2>
        </motion.div>

        <div className="flex bg-diana-card border border-diana-border rounded-xl p-1 mb-6 w-fit">
          <button onClick={() => switchTab('vente')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === 'vente' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
            <FiShoppingBag size={12} /> Vente (ticket caisse)
          </button>
          <button onClick={() => switchTab('commande')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === 'commande' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
            <FiPackage size={12} /> Commande
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4 max-w-md">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={18} />
            <KeyboardField value={ticketInput} onChange={setTicketInput}
              placeholder={tab === 'vente' ? 'Numéro de ticket (ex: 12)' : 'Numéro de commande (ex: 30)'}
              subtitle="Numéro"
              className="w-full pl-11 pr-4 py-3 bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          </div>
          <button type="submit"
            className="px-5 py-3 bg-diana-gold text-diana-dark rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
            Rechercher
          </button>
        </form>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <FiCalendar className="text-diana-brown" size={15} />
            <input type="date" value={calDate} onChange={(e) => setCalDate(e.target.value)}
              className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
            {calDate && (
              <button onClick={() => setCalDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Toutes les dates</button>
            )}
            <span className="text-xs text-diana-brown ml-1">
              {tab === 'vente'
                ? `Tous les tickets de caisse ${calDate ? 'de ce jour-là' : ''} (${dateSales.length})`
                : `Tous les tickets d'avance ${calDate ? 'de ce jour-là' : ''} (${avanceTickets.length})`}
            </span>
          </div>
          {tab === 'vente' ? (
            dateSales.length > 0 && (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {dateSales.map((s) => (
                  <button key={s.id} onClick={() => pickSale(s)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-colors ${sale?.id === s.id ? 'border-diana-gold bg-diana-gold/10' : 'border-diana-border bg-diana-card hover:border-diana-gold/40'}`}>
                    <span className="text-sm text-diana-cream">Ticket n°{String(s.ticketNumber).padStart(3, '0')}</span>
                    <span className="text-xs text-diana-brown">{(Number(s.total) || 0).toFixed(2)} DH · {new Date(s.timestamp).toLocaleDateString('fr-FR')} {new Date(s.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            avanceTickets.length > 0 && (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {avanceTickets.map((r) => (
                  <button key={r.id} onClick={() => pickReservation(r)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-colors ${reservation?.id === r.id ? 'border-diana-gold bg-diana-gold/10' : 'border-diana-border bg-diana-card hover:border-diana-gold/40'}`}>
                    <span className="text-sm text-diana-cream">#{r.ticketNumber} · {r.clientName}</span>
                    <span className="text-xs text-diana-brown">Avance {(Number(r.avanceInitiale ?? r.avance) || 0).toFixed(2)} DH · {new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {notFound && (
          <div className="flex items-center gap-2 text-diana-danger text-sm mb-6">
            <FiAlertCircle size={16} /> {tab === 'vente' ? 'Aucune vente trouvée pour ce numéro de ticket.' : 'Aucune commande trouvée pour ce numéro.'}
          </div>
        )}

        <AnimatePresence mode="wait">
          {current && (
            <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="font-fraunces text-lg text-diana-cream">
                    {tab === 'vente' ? `Ticket n°${String(current.ticketNumber).padStart(3, '0')}` : `Commande #${current.ticketNumber} · ${current.clientName}`}
                  </p>
                  <p className="text-xs text-diana-brown">
                    {new Date(tab === 'vente' ? current.timestamp : current.createdAt).toLocaleDateString('fr-FR')} {new Date(tab === 'vente' ? current.timestamp : current.createdAt).toLocaleTimeString('fr-FR')}
                    {tab === 'vente' && <> · {current.paymentType === 'cash' ? 'Espèces' : current.paymentType === 'card' ? 'TPE' : 'Paiement non précisé'}</>}
                  </p>
                </div>
                <span className="text-sm text-diana-gold font-semibold">Total {(Number(current.total) || 0).toFixed(2)} DH</span>
              </div>

              <div className="space-y-3 mb-6">
                {refundEntries.map(({ item, remaining, qty }) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-diana-border/60 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-diana-cream truncate">{item.name}</p>
                      <p className="text-xs text-diana-brown">
                        {tab === 'vente' ? 'Vendu' : 'Commandé'} : {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''} à {(Number(item.price) || 0).toFixed(2)} DH
                        {remaining < item.qty && <span className="text-diana-danger"> · déjà remboursé : {formatQty(item.qty - remaining)}</span>}
                      </p>
                    </div>
                    {remaining <= 0 ? (
                      <span className="text-xs text-diana-brownLight italic">Entièrement remboursé</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <NumericField value={qty || ''} onChange={(v) => setQtyFor(item.id, v, remaining)} placeholder="0"
                          title={item.name} unit={item.unit === 'kg' ? 'kg' : 'pièce(s)'} allowDecimal={item.unit === 'kg'}
                          className="w-20 px-2 py-1.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream text-right focus:outline-none focus:border-diana-gold/50" />
                        <button onClick={() => setMaxFor(item.id, remaining)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-diana-gold/10 text-diana-gold border border-diana-gold/30 hover:bg-diana-gold/20 transition-colors">
                          Tout ({formatQty(remaining)}{item.unit === 'kg' ? ' kg' : ''})
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-diana-border">
                <span className="text-sm text-diana-brown">Montant à rembourser</span>
                <span className="font-fraunces text-2xl text-diana-danger font-semibold">{totalRefund.toFixed(2)} DH</span>
              </div>
              {tab === 'commande' && (
                <p className="text-[11px] text-diana-brownLight mt-2">
                  Rembourser une catégorie retire son montant du total de la commande{!current.soldePaid && ' et du reste à payer'}, et l'argent est déduit du solde net de la caisse.
                </p>
              )}

              <button onClick={handleConfirmRefund} disabled={!hasSelection}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-diana-danger text-white py-3.5 rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                <FiRotateCcw size={16} /> Confirmer le remboursement
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-3">Remboursements récents</p>
          {refunds.length === 0 ? (
            <p className="text-sm italic text-diana-brownLight">Aucun remboursement enregistré</p>
          ) : (
            <div className="space-y-2.5">
              {refunds.slice(0, 20).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-diana-card border border-diana-border rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-diana-cream flex items-center gap-1.5">
                      <FiCheckCircle size={13} className="text-diana-danger" />
                      {r.type === 'commande' ? 'Commande' : 'Ticket'} n°{String(r.ticketNumber).padStart(3, '0')}
                    </p>
                    <p className="text-xs text-diana-brown truncate">{r.items.map((i) => `${i.name} ×${formatQty(i.qty)}`).join(', ')}</p>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <p className="text-sm font-semibold text-diana-danger">-{(Number(r.amount) || 0).toFixed(2)} DH</p>
                    <p className="text-[10px] text-diana-brownLight">{new Date(r.timestamp).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
