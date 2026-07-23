import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiTrash2, FiShoppingBag, FiPrinter, FiPackage, FiCalendar } from 'react-icons/fi'
import { getPurchases, addPurchase, removePurchase, subscribeToStockUpdates, getRzizaDeliveries, addRzizaDelivery, removeRzizaDelivery, sameDay } from '../data/stockStore'
import NumericField from '../components/NumericField'
import KeyboardField from '../components/KeyboardField'
import ReceiptHeader from '../components/ReceiptHeader'
import { useNotification } from '../context/NotificationContext'

export default function AchatsPage() {
  const { addNotification } = useNotification()
  const [purchases, setPurchases] = useState([])
  const [rziza, setRziza] = useState([])
  const [rzizaBon, setRzizaBon] = useState(null)
  const [rzizaDate, setRzizaDate] = useState('')
  const refresh = useCallback(async () => {
    const [purchasesData, rzizaData] = await Promise.all([getPurchases(), getRzizaDeliveries()])
    setPurchases(purchasesData)
    setRziza(rzizaData)
  }, [])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const [label, setLabel] = useState('')
  const [supplier, setSupplier] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const [rzizaQty, setRzizaQty] = useState('')
  const [rzizaPrixAchat, setRzizaPrixAchat] = useState('3.5')

  const handleAddRziza = async (e) => {
    e.preventDefault()
    const qty = parseFloat(rzizaQty)
    if (isNaN(qty) || qty <= 0) {
      addNotification('Quantité invalide', 'error')
      return
    }
    const entry = await addRzizaDelivery({ quantity: qty, prixAchat: parseFloat(rzizaPrixAchat) || 3.5, prixVente: 5.5 })
    setRzizaQty('')
    refresh()
    setRzizaBon(entry)
    addNotification('Livraison Rziza enregistrée', 'success')
  }

  const handleRemoveRziza = async (id) => {
    await removeRzizaDelivery(id)
    refresh()
    addNotification('Livraison Rziza supprimée', 'success')
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!label.trim() || isNaN(amt) || amt <= 0) {
      addNotification('Renseignez au moins une désignation et un montant valide', 'error')
      return
    }
    await addPurchase({ label: label.trim(), supplier: supplier.trim(), amount: amt, date, note: note.trim() })
    addNotification('Achat enregistré', 'success')
    setLabel(''); setSupplier(''); setAmount(''); setNote('')
    refresh()
  }

  const handleRemove = async (id) => {
    await removePurchase(id)
    refresh()
    addNotification('Achat supprimé', 'success')
  }

  const total = purchases.reduce((sum, p) => sum + p.amount, 0)
  const totalToday = purchases.filter((p) => p.date === new Date().toISOString().slice(0, 10)).reduce((sum, p) => sum + p.amount, 0)

  const filteredRziza = useMemo(() => {
    if (!rzizaDate) return rziza
    return rziza.filter((r) => sameDay(r.timestamp, rzizaDate))
  }, [rziza, rzizaDate])
  const rzizaTotalDu = filteredRziza.reduce((s, r) => s + r.montantDu, 0)

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Admin</p>
          <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Gestion des achats</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-diana-card border border-diana-border rounded-2xl p-5">
            <p className="text-xs text-diana-brown mb-1">Total des achats (tout historique)</p>
            <p className="font-fraunces text-2xl text-diana-cream">{total.toFixed(2)} DH</p>
          </div>
          <div className="bg-diana-card border border-diana-border rounded-2xl p-5">
            <p className="text-xs text-diana-brown mb-1">Achats aujourd'hui</p>
            <p className="font-fraunces text-2xl text-diana-accentLight">{totalToday.toFixed(2)} DH</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="bg-diana-card border border-diana-border rounded-2xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <KeyboardField value={label} onChange={setLabel} placeholder="Désignation (ex: Farine 25kg)"
            className="px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          <KeyboardField value={supplier} onChange={setSupplier} placeholder="Fournisseur (facultatif)"
            className="px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          <NumericField value={amount} onChange={setAmount} placeholder="Montant (DH)" title="Montant" unit="DH"
            className="px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream text-left focus:outline-none focus:border-diana-gold/50" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50" />
          <KeyboardField value={note} onChange={setNote} placeholder="Note (facultatif)"
            className="sm:col-span-2 px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          <button type="submit"
            className="sm:col-span-2 flex items-center justify-center gap-2 bg-diana-gold text-diana-dark py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
            <FiPlus size={16} /> Ajouter l'achat
          </button>
        </form>

        {/* RZIZA — fournisseur externe : la personne vient vendre son Rziza chez nous.
            L'achat est payé par l'admin personnellement, jamais par la caisse : aucune
            influence sur le solde net ni sur les achats généraux ci-dessous. */}
        <div className="bg-diana-card border border-diana-gold/30 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <FiPackage className="text-diana-gold" size={16} />
            <h3 className="font-fraunces text-lg text-diana-cream">Rziza — fournisseur externe</h3>
          </div>
          <p className="text-xs text-diana-brownLight mb-4">
            Achat payé personnellement par l'admin, hors caisse — n'affecte ni le solde net ni les achats généraux. Vente en caisse : 5.50 DH. La quantité livrée est ajoutée directement au stock de la caisse (accessible aussi côté caissier, sans code).
          </p>
          <form onSubmit={handleAddRziza} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <NumericField value={rzizaQty} onChange={setRzizaQty} placeholder="Quantité livrée" title="Quantité livrée" unit="pièce(s)"
              className="px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream text-left focus:outline-none focus:border-diana-gold/50" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-diana-brown shrink-0">Prix d'achat/u.</label>
              <NumericField value={rzizaPrixAchat} onChange={setRzizaPrixAchat} title="Prix d'achat / unité" unit="DH"
                className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream text-left focus:outline-none focus:border-diana-gold/50" />
            </div>
            <button type="submit"
              className="flex items-center justify-center gap-2 bg-diana-gold text-diana-dark py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
              <FiPlus size={15} /> Enregistrer + Bon
            </button>
          </form>

          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-diana-brown" size={14} />
              <input type="date" value={rzizaDate} onChange={(e) => setRzizaDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50" />
              {rzizaDate && (
                <button onClick={() => setRzizaDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Toutes les dates</button>
              )}
            </div>
            <p className="text-xs text-diana-brown">Total dû {rzizaDate ? 'ce jour-là' : '(tout historique)'} : <span className="font-semibold text-diana-cream">{rzizaTotalDu.toFixed(2)} DH</span></p>
          </div>

          {filteredRziza.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredRziza.map((r) => (
                  <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between bg-diana-dark/20 border border-diana-border/50 rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-diana-cream">{r.quantity} unité(s) × {r.prixAchat.toFixed(2)} DH</p>
                      <p className="text-xs text-diana-brown">
                        {new Date(r.timestamp).toLocaleDateString('fr-FR')} à {new Date(r.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}<span className="text-diana-accentLight font-medium">Non payé</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pl-3">
                      <span className="text-sm font-semibold text-diana-brown">{r.montantDu.toFixed(2)} DH dû</span>
                      <button onClick={() => setRzizaBon(r)} className="text-diana-gold hover:text-diana-goldLight" title="Voir / imprimer le bon"><FiPrinter size={14} /></button>
                      <button onClick={() => handleRemoveRziza(r.id)} className="text-diana-danger hover:text-red-700"><FiTrash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* BON RZIZA — reçu imprimable marqué "Non payé" */}
        <AnimatePresence>
          {rzizaBon && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 print:bg-white" onClick={() => setRzizaBon(null)}>
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                className="bg-diana-cream text-diana-dark rounded-2xl p-6 max-w-xs w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="receipt-print bg-white rounded-xl p-4 mb-5 text-xs border border-black text-black">
                  <ReceiptHeader subtitle="Bon de livraison — Rziza">
                    <p className="text-black text-[10.5px] mt-1.5">{new Date(rzizaBon.timestamp).toLocaleDateString('fr-FR')} à {new Date(rzizaBon.timestamp).toLocaleTimeString('fr-FR')}</p>
                  </ReceiptHeader>
                  <div className="receipt-line flex justify-between py-1"><span>Quantité livrée</span><span className="value font-semibold">{rzizaBon.quantity}</span></div>
                  <div className="receipt-line flex justify-between py-1"><span>Prix d'achat / unité</span><span className="value font-semibold">{rzizaBon.prixAchat.toFixed(2)} DH</span></div>
                  <div className="border-t border-dashed border-black pt-2 mt-2">
                    <div className="total flex justify-between font-semibold"><span>Montant dû</span><span>{rzizaBon.montantDu.toFixed(2)} DH</span></div>
                    <div className="flex justify-between text-black font-semibold mt-1"><span>Statut</span><span>NON PAYÉ</span></div>
                  </div>
                  <p className="footer text-black italic mt-3 text-center">Réglé personnellement — sans lien avec la caisse</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2 bg-diana-dark text-diana-cream py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all print:hidden">
                    <FiPrinter size={15} /> Imprimer
                  </button>
                  <button onClick={() => setRzizaBon(null)}
                    className="flex-1 bg-white text-diana-brown border border-diana-border py-2.5 rounded-xl text-sm font-semibold print:hidden">
                    Fermer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-3">Achats généraux (hors Rziza)</p>
        {purchases.length === 0 ? (
          <p className="text-sm italic text-diana-brownLight flex items-center gap-2"><FiShoppingBag /> Aucun achat enregistré</p>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {purchases.map((p) => (
                <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between bg-diana-card border border-diana-border rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-diana-cream font-medium">{p.label}</p>
                    <p className="text-xs text-diana-brown">{p.supplier && `${p.supplier} · `}{new Date(p.date).toLocaleDateString('fr-FR')}{p.note && ` · ${p.note}`}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 pl-3">
                    <span className="text-sm font-semibold text-diana-accentLight">-{p.amount.toFixed(2)} DH</span>
                    <button onClick={() => handleRemove(p.id)} className="text-diana-danger hover:text-red-700"><FiTrash2 size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
