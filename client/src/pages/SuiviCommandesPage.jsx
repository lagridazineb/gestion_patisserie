import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ATELIERS } from '../data/products'
import {
  getReservations, subscribeToStockUpdates, getReservationAteliers, isReservationFullyReady,
  removeReservation, paySoldeReservation,
} from '../data/stockStore'
import { useNotification } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import KeyboardField from '../components/KeyboardField'
import {
  FiArrowLeft, FiSearch, FiCheckCircle, FiTrash2, FiDollarSign, FiCreditCard, FiPrinter,
} from 'react-icons/fi'

function formatQty(qty) {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function SuiviCommandesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [tab, setTab] = useState('pretes') // 'pretes' | 'non-pretes'
  const [reservations, setReservations] = useState([])
  const [search, setSearch] = useState('')
  const [payingReservation, setPayingReservation] = useState(null)
  const [paymentMode, setPaymentMode] = useState(null)
  const [showConfirmSolde, setShowConfirmSolde] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const refresh = useCallback(async () => setReservations(await getReservations()), [])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const isReady = (r) => r.ready || isReservationFullyReady(r)

  // Une commande prête et déjà encaissée (soldePaid) disparaît directement de la liste
  // "Prêtes" : elle n'a plus rien à y faire, plutôt que de rester affichée avec un badge "Soldée".
  const baseList = useMemo(
    () => reservations.filter((r) => (tab === 'pretes' ? isReady(r) && !r.soldePaid : !isReady(r))),
    [reservations, tab]
  )

  const searchResults = useMemo(() => {
    if (tab !== 'pretes' || !search.trim()) return baseList
    const q = search.trim().toLowerCase()
    return baseList.filter((r) =>
      String(r.ticketNumber).includes(q) ||
      (r.clientName || '').toLowerCase().includes(q) ||
      (r.clientPhone || '').includes(q)
    )
  }, [baseList, search, tab])

  const handleRemove = async (id) => {
    if (!window.confirm('Supprimer définitivement cette commande ?')) return
    await removeReservation(id)
    refresh()
    addNotification('Commande supprimée', 'success')
  }

  const openPayment = (r) => { setPayingReservation(r); setPaymentMode(null); setShowConfirmSolde(false) }
  const closePayment = () => { setPayingReservation(null); setPaymentMode(null); setShowConfirmSolde(false) }

  // Étape 1 : choix du mode de paiement, puis on ouvre l'écran "Confirmer le paiement"
  // (montant reçu / monnaie à rendre) — identique à celui de la caisse.
  const confirmSolde = () => {
    if (!paymentMode) {
      addNotification('Choisissez un mode de paiement', 'error')
      return
    }
    setShowConfirmSolde(true)
  }

  // Étape 2 : appelée depuis ConfirmPaymentModal une fois le montant reçu validé.
  const handleConfirmSoldePayment = async () => {
    const result = await paySoldeReservation(payingReservation.id, paymentMode)
    setShowConfirmSolde(false)
    if (result.success) {
      addNotification('Solde encaissé, commande soldée', 'success')
      setReceipt(result.reservation)
      setPayingReservation(null)
      setPaymentMode(null)
      refresh()
    } else {
      addNotification(result.error || 'Erreur', 'error')
    }
  }

  const handlePrintReceipt = () => {
    window.print()
    setTimeout(() => setReceipt(null), 400)
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(user?.role === 'admin' ? '/bilan-caisse' : '/commandes')}
          className="flex items-center gap-2 text-diana-gold text-sm mb-6 hover:text-diana-goldLight transition-colors">
          <FiArrowLeft size={16} /> Retour à la commande
        </button>

        <div className="mb-6">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Suivi</p>
          <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Commandes</h2>
        </div>

        <div className="inline-flex bg-diana-card border border-diana-border rounded-xl p-1 mb-6">
          <button onClick={() => setTab('pretes')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'pretes' ? 'bg-emerald-600 text-white' : 'text-diana-brown hover:text-diana-cream'}`}>
            Prêtes
          </button>
          <button onClick={() => setTab('non-pretes')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === 'non-pretes' ? 'bg-diana-gold text-diana-dark' : 'text-diana-brown hover:text-diana-cream'}`}>
            Non prêtes
          </button>
        </div>

        {tab === 'pretes' && (
          <div className="relative max-w-md mb-6">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={18} />
            <KeyboardField value={search} onChange={setSearch}
              placeholder="Rechercher par n° de ticket, nom ou téléphone..." subtitle="Recherche"
              className="w-full pl-11 pr-4 py-3 bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          </div>
        )}

        <div className="space-y-3">
          {searchResults.length === 0 ? (
            <p className="text-sm italic text-diana-brown text-center py-10">
              {tab === 'pretes' ? 'Aucune commande prête' : 'Aucune commande en préparation'}
            </p>
          ) : searchResults.map((r) => {
            const ateliers = getReservationAteliers(r)
            const ready = isReady(r)
            return (
              <div key={r.id} className={`rounded-xl border p-4 ${ready ? 'border-emerald-600/40 bg-emerald-600/5' : 'border-diana-border bg-diana-card'}`}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-diana-cream">#{r.ticketNumber} · {r.clientName}</p>
                    <p className="text-xs text-diana-brown">{r.clientPhone || '—'} · Livraison : {r.deliveryDate || '—'} {r.deliveryTime || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ready && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold bg-emerald-600 text-white">
                        <FiCheckCircle size={12} /> Prête
                      </span>
                    )}
                    <button onClick={() => handleRemove(r.id)} className="text-diana-danger hover:text-red-700">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-diana-brownLight mb-2">{r.items.map((i) => `${i.name} ×${formatQty(i.qty)}`).join(', ')}</p>

                {ateliers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ateliers.map((a) => {
                      const done = r.doneByAtelier && r.doneByAtelier[a]
                      const label = ATELIERS.find((at) => at.id === a)?.label || a
                      return (
                        <span key={a} className={`text-[10px] px-2 py-1 rounded-full font-medium ${done ? 'bg-emerald-600/15 text-emerald-400' : 'bg-diana-border/40 text-diana-brownLight'}`}>
                          {done ? '✓' : '⏳'} {label}
                        </span>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-diana-border/40">
                  <span className="text-diana-brown">Total {r.total.toFixed(2)} DH · Avance {r.avance.toFixed(2)} DH</span>
                  {r.soldePaid ? (
                    <span className="font-semibold text-emerald-400 flex items-center gap-1"><FiCheckCircle size={12} /> Soldée ({r.soldePaymentMode === 'cash' ? 'Espèces' : 'TPE'})</span>
                  ) : (
                    <span className="font-semibold text-diana-danger">Reste {r.resteAPayer.toFixed(2)} DH</span>
                  )}
                </div>

                {ready && !r.soldePaid && r.resteAPayer > 0 && (
                  <button onClick={() => openPayment(r)}
                    className="w-full mt-3 flex items-center justify-center gap-2 bg-diana-brownDark text-white py-2.5 rounded-lg text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
                    <FiDollarSign size={14} /> Encaisser le reste ({r.resteAPayer.toFixed(2)} DH)
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* PAIEMENT DU SOLDE */}
      <AnimatePresence>
        {payingReservation && !showConfirmSolde && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closePayment}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-diana-card border border-diana-border rounded-2xl w-full max-w-sm shadow-gold-lg p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-fraunces text-xl text-diana-cream mb-1">Encaisser le solde</h3>
              <p className="text-sm text-diana-brown mb-5">{payingReservation.clientName} · Reste à payer : <span className="text-diana-gold font-semibold">{payingReservation.resteAPayer.toFixed(2)} DH</span></p>
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <button onClick={() => setPaymentMode('cash')}
                  className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all ${paymentMode === 'cash' ? 'bg-diana-gold text-diana-dark' : 'bg-diana-gold/15 text-diana-gold border border-diana-gold/30'}`}>
                  <FiDollarSign size={15} /> Espèces
                </button>
                <button onClick={() => setPaymentMode('card')}
                  className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all ${paymentMode === 'card' ? 'bg-diana-brownDark text-white' : 'bg-diana-brownDark/10 text-diana-brownDark border border-diana-brownDark/20'}`}>
                  <FiCreditCard size={15} /> TPE
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={confirmSolde} disabled={!paymentMode}
                  className="py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                  Confirmer l'encaissement
                </button>
                <button onClick={closePayment} className="py-2.5 text-sm text-diana-brown hover:text-diana-cream transition-colors">Annuler</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DE PAIEMENT (Montant reçu / Monnaie à rendre) — même écran qu'à la caisse */}
      <ConfirmPaymentModal open={showConfirmSolde} method={paymentMode}
        amountDue={payingReservation?.resteAPayer || 0}
        onConfirm={handleConfirmSoldePayment} onCancel={() => setShowConfirmSolde(false)} />

      {/* REÇU DE SOLDE */}
      <AnimatePresence>
        {receipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#FFE8D6] text-diana-brownDark rounded-2xl p-8 max-w-sm w-full mx-4 shadow-gold-lg max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><span className="text-2xl">✓</span></div>
                <h3 className="font-fraunces text-xl font-medium">Solde encaissé</h3>
              </div>
              <div className="bg-white rounded-xl p-4 mb-6 text-xs border border-[#E7CCB4]">
                <div className="text-center border-b border-dashed border-[#E7CCB4] pb-3 mb-3">
                  <p className="font-fraunces text-sm font-medium">Pâtisserie Dianna</p>
                  <p className="text-[#8B6A3A]">Ticket n°{receipt.ticketNumber}</p>
                </div>
                <p><span className="text-[#8B6A3A]">Client :</span> <span className="font-semibold">{receipt.clientName}</span></p>
                <div className="border-t border-dashed border-[#E7CCB4] pt-2 mt-2 space-y-1">
                  <div className="flex justify-between"><span>Total commande</span><span>{receipt.total.toFixed(2)} DH</span></div>
                  <div className="flex justify-between text-emerald-700"><span>Déjà versé (avance)</span><span>{(receipt.total - (receipt.soldeAmount || 0)).toFixed(2)} DH</span></div>
                  <div className="flex justify-between font-semibold"><span>Solde encaissé aujourd'hui</span><span>{(receipt.soldeAmount || 0).toFixed(2)} DH</span></div>
                  <div className="flex justify-between text-[11px] text-[#8B6A3A]"><span>Mode</span><span>{receipt.soldePaymentMode === 'cash' ? 'Espèces' : 'TPE'}</span></div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={handlePrintReceipt}
                  className="flex items-center justify-center gap-2 bg-diana-brownDark text-white py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiPrinter size={16} /> Imprimer le reçu
                </button>
                <button onClick={() => setReceipt(null)}
                  className="flex items-center justify-center gap-2 bg-[#C89A5C] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#B88443] transition-all">
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
