import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiClock, FiSearch, FiCalendar, FiPrinter, FiX, FiUser, FiPhone, FiShoppingBag, FiPackage } from 'react-icons/fi'
import { getSalesLog, getReservations, subscribeToStockUpdates, sameDay } from '../data/stockStore'
import ReceiptHeader from '../components/ReceiptHeader'

function formatQty(qty) {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// Historique réel (tickets de caisse + commandes), filtrable par date précise et par recherche,
// avec le détail complet de chaque ticket/commande et une impression directe.
export default function HistoriquePage() {
  const [tab, setTab] = useState('tickets') // 'tickets' | 'commandes'
  const [date, setDate] = useState('') // vide = toutes les dates
  const [search, setSearch] = useState('')
  const [sales, setSales] = useState([])
  const [reservations, setReservations] = useState([])
  const [selected, setSelected] = useState(null) // { type: 'ticket'|'commande', data }

  const refresh = useCallback(async () => {
    const [salesData, reservationsData] = await Promise.all([getSalesLog(), getReservations()])
    setSales(salesData)
    setReservations(reservationsData)
  }, [])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales.filter((s) => {
      if (date && !sameDay(s.timestamp, date)) return false
      if (!q) return true
      return String(s.ticketNumber).includes(q) || (s.items || []).some((i) => i.name.toLowerCase().includes(q))
    })
  }, [sales, date, search])

  const filteredReservations = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reservations.filter((r) => {
      if (date && !sameDay(r.createdAt, date)) return false
      if (!q) return true
      return String(r.ticketNumber).includes(q) ||
        (r.clientName || '').toLowerCase().includes(q) ||
        (r.clientPhone || '').includes(q) ||
        (r.items || []).some((i) => i.name.toLowerCase().includes(q))
    })
  }, [reservations, date, search])

  const handlePrint = () => window.print()

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Journal</p>
          <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Historique</h2>
          <p className="text-sm text-diana-brown mt-1">Tous les tickets de caisse et toutes les commandes, jour par jour</p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-diana-card border border-diana-border rounded-xl p-1">
            <button onClick={() => setTab('tickets')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === 'tickets' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiShoppingBag size={12} /> Tickets caisse
            </button>
            <button onClick={() => setTab('commandes')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === 'commandes' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiPackage size={12} /> Commandes
            </button>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-diana-brown" size={15} />
            <input type="text" placeholder="Rechercher (n° ticket, client, produit...)" value={search} dir="auto" lang="fr"
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          </div>
          <div className="flex items-center gap-2">
            <FiCalendar className="text-diana-brown" size={15} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
            {date && (
              <button onClick={() => setDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Toutes les dates</button>
            )}
          </div>
        </div>

        {tab === 'tickets' ? (
          filteredSales.length === 0 ? (
            <p className="text-sm italic text-diana-brownLight text-center py-16">Aucun ticket trouvé</p>
          ) : (
            <div className="space-y-2.5">
              {filteredSales.map((s) => (
                <button key={s.id} onClick={() => setSelected({ type: 'ticket', data: s })}
                  className="w-full flex items-center justify-between bg-diana-card border border-diana-border rounded-xl px-4 py-3.5 text-left hover:border-diana-gold/40 transition-colors">
                  <div>
                    <p className="text-sm text-diana-cream font-medium">Ticket n°{String(s.ticketNumber).padStart(3, '0')}</p>
                    <p className="text-xs text-diana-brown mt-0.5">
                      {new Date(s.timestamp).toLocaleDateString('fr-FR')} à {new Date(s.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{s.paymentType === 'cash' ? 'Espèces' : 'TPE'} · {(s.items || []).length} article(s)
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-diana-gold shrink-0 pl-3">{(s.total || 0).toFixed(2)} DH</p>
                </button>
              ))}
            </div>
          )
        ) : (
          filteredReservations.length === 0 ? (
            <p className="text-sm italic text-diana-brownLight text-center py-16">Aucune commande trouvée</p>
          ) : (
            <div className="space-y-2.5">
              {filteredReservations.map((r) => (
                <button key={r.id} onClick={() => setSelected({ type: 'commande', data: r })}
                  className="w-full flex items-center justify-between bg-diana-card border border-diana-border rounded-xl px-4 py-3.5 text-left hover:border-diana-gold/40 transition-colors">
                  <div>
                    <p className="text-sm text-diana-cream font-medium">#{r.ticketNumber} · {r.clientName}</p>
                    <p className="text-xs text-diana-brown mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR')} · Livraison {r.deliveryDate} {r.deliveryTime}
                      {' · '}{r.soldePaid ? 'Soldée' : 'Reste à payer'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-diana-gold shrink-0 pl-3">{(r.total || 0).toFixed(2)} DH</p>
                </button>
              ))}
            </div>
          )
        )}

        {/* DÉTAIL + IMPRESSION */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                className="bg-diana-cream text-diana-dark rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl print:shadow-none"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4 print:hidden">
                  <p className="font-fraunces text-lg font-medium">
                    {selected.type === 'ticket' ? `Ticket n°${String(selected.data.ticketNumber).padStart(3, '0')}` : `Commande #${selected.data.ticketNumber}`}
                  </p>
                  <button onClick={() => setSelected(null)} className="text-diana-brown hover:text-diana-dark"><FiX size={18} /></button>
                </div>

                <div className="receipt-print bg-white rounded-xl p-4 mb-5 text-xs border border-diana-creamDark">
                  <ReceiptHeader>
                    <p className="text-diana-brown text-[10.5px] mt-1.5">
                      {new Date(selected.type === 'ticket' ? selected.data.timestamp : selected.data.createdAt).toLocaleDateString('fr-FR')}
                      {' '}
                      {new Date(selected.type === 'ticket' ? selected.data.timestamp : selected.data.createdAt).toLocaleTimeString('fr-FR')}
                    </p>
                    <p className="text-diana-dark text-[11px] font-semibold">
                      {selected.type === 'ticket' ? `Ticket n°${String(selected.data.ticketNumber).padStart(3, '0')}` : `Commande n°${selected.data.ticketNumber}`}
                    </p>
                  </ReceiptHeader>

                  {selected.type === 'commande' && (
                    <div className="mb-3 space-y-0.5">
                      <p className="flex items-center gap-1.5"><FiUser size={11} /> {selected.data.clientName}</p>
                      {selected.data.clientPhone && <p className="flex items-center gap-1.5"><FiPhone size={11} /> {selected.data.clientPhone}</p>}
                      <p className="text-diana-brown">Livraison : {selected.data.deliveryDate} à {selected.data.deliveryTime}</p>
                    </div>
                  )}

                  {(selected.data.items || []).map((item, i) => (
                    <div key={i} className="receipt-line flex justify-between py-1">
                      <span className="name">{item.name} × {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''}</span>
                      <span className="value font-semibold">{(item.price * item.qty + (item.personPhotoSurcharge || 0)).toFixed(2)} DH</span>
                    </div>
                  ))}

                  <div className="border-t border-dashed border-diana-creamDark pt-2 mt-2">
                    {selected.type === 'ticket' ? (
                      <>
                        <div className="flex justify-between font-semibold"><span>Total</span><span>{(selected.data.total || 0).toFixed(2)} DH</span></div>
                        <div className="flex justify-between text-diana-brown mt-1"><span>Paiement</span><span>{selected.data.paymentType === 'cash' ? 'Espèces' : 'TPE'}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between font-semibold"><span>Total</span><span>{(selected.data.total || 0).toFixed(2)} DH</span></div>
                        <div className="flex justify-between text-emerald-700 mt-1"><span>Avance versée</span><span>{(selected.data.avanceInitiale ?? selected.data.avance ?? 0).toFixed(2)} DH</span></div>
                        <div className="flex justify-between mt-1"><span>Reste</span><span>{selected.data.soldePaid ? '0.00 DH (soldée)' : `${(selected.data.resteAPayer || 0).toFixed(2)} DH`}</span></div>
                      </>
                    )}
                  </div>
                </div>

                <button onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 bg-diana-dark text-diana-cream py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all print:hidden">
                  <FiPrinter size={16} /> Imprimer
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
