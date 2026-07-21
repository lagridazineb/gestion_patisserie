import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiDollarSign, FiCalendar, FiTrendingUp, FiPrinter, FiUsers, FiBox, FiChevronDown, FiPackage, FiRotateCcw } from 'react-icons/fi'
import { ATELIERS, mergeProductOverlay } from '../data/products'
import { getProductOverlay } from '../api/products'
import {
  getProductionLog, getSalesLog, getRefunds, getCommandesBilan, subscribeToStockUpdates, sameDay,
} from '../data/stockStore'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function VentesPage() {
  const [date, setDate] = useState(todayStr())
  const [productionLog, setProductionLog] = useState([])
  const [salesLog, setSalesLog] = useState([])
  const [refunds, setRefunds] = useState([])
  const [commandesBilan, setCommandesBilan] = useState(null)
  const [expandedAtelier, setExpandedAtelier] = useState(null)
  const [productOverlay, setProductOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })

  useEffect(() => {
    getProductOverlay().then(setProductOverlay).catch(() => {})
  }, [])
  const ALL_PRODUCTS = useMemo(() => mergeProductOverlay(productOverlay), [productOverlay])

  const refresh = useCallback(async () => {
    const commandesDate = date || todayStr()
    const [productionData, salesData, refundsData, bilan] = await Promise.all([
      getProductionLog(), getSalesLog(), getRefunds(), getCommandesBilan(commandesDate),
    ])
    setProductionLog(productionData)
    setSalesLog(salesData)
    setRefunds(refundsData)
    setCommandesBilan(bilan)
  }, [date])

  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  // Map productId -> catégorie, pour croiser ventes/retours avec l'atelier concerné
  const productCategoryMap = useMemo(() => {
    const map = {}
    ALL_PRODUCTS.forEach((p) => { map[p.id] = p.category })
    return map
  }, [ALL_PRODUCTS])

  // Récapitulatif par atelier, pour la date choisie (ou tout l'historique si aucune date) :
  // production (qté produite × prix), vendu, et retour (remboursements) à déduire.
  const atelierSummary = useMemo(() => {
    const filteredProduction = date ? productionLog.filter((e) => sameDay(e.timestamp, date)) : productionLog
    const filteredSales = date ? salesLog.filter((s) => sameDay(s.timestamp, date)) : salesLog
    const filteredRefunds = date ? refunds.filter((r) => sameDay(r.timestamp, date)) : refunds

    const summary = {}
    ATELIERS.forEach((a) => {
      summary[a.id] = { atelier: a.id, label: a.label, totalProducedQty: 0, totalProducedValue: 0, totalSoldQty: 0, totalSoldValue: 0, totalRefundValue: 0, products: {} }
    })
    const ensure = (atelierId) => {
      if (!summary[atelierId]) summary[atelierId] = { atelier: atelierId, label: atelierId, totalProducedQty: 0, totalProducedValue: 0, totalSoldQty: 0, totalSoldValue: 0, totalRefundValue: 0, products: {} }
      return summary[atelierId]
    }

    filteredProduction.forEach((entry) => {
      const s = ensure(entry.atelier)
      const value = entry.price !== null ? entry.price * entry.quantity : 0
      s.totalProducedQty += entry.quantity
      s.totalProducedValue += value
      if (!s.products[entry.product]) s.products[entry.product] = { name: entry.product, qty: 0, value: 0, price: entry.price }
      s.products[entry.product].qty += entry.quantity
      s.products[entry.product].value += value
    })

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = productCategoryMap[item.id]
        if (!cat) return
        const s = ensure(cat)
        s.totalSoldQty += item.qty
        s.totalSoldValue += item.qty * item.price
      })
    })

    filteredRefunds.forEach((refund) => {
      (refund.items || []).forEach((item) => {
        const cat = productCategoryMap[item.id]
        if (!cat) return
        ensure(cat).totalRefundValue += item.qty * item.price
      })
    })

    return Object.values(summary).map((s) => ({
      ...s,
      netRevenue: s.totalSoldValue - s.totalRefundValue,
      products: Object.values(s.products).sort((a, b) => b.value - a.value),
    }))
  }, [productionLog, salesLog, refunds, productCategoryMap, date])

  const totalProductionValue = atelierSummary.reduce((sum, a) => sum + a.totalProducedValue, 0)
  const totalVentesNet = atelierSummary.reduce((sum, a) => sum + a.netRevenue, 0)
  const totalRefunds = atelierSummary.reduce((sum, a) => sum + a.totalRefundValue, 0)
  const totalCommandes = commandesBilan ? commandesBilan.totalAvances + commandesBilan.totalRestes : 0
  const totalGeneral = totalVentesNet + totalCommandes

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Rapport</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Ventes</h2>
            <p className="text-sm text-diana-brown mt-1">Production par préparateur, ventes nettes et commandes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FiCalendar className="text-diana-brown" size={15} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
            {date && (
              <button onClick={() => setDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Toutes les dates</button>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-diana-dark text-diana-cream border border-diana-border text-xs font-semibold hover:border-diana-gold/40 transition-colors">
              <FiPrinter size={13} /> Imprimer
            </button>
          </div>
        </motion.div>

        {/* Totaux généraux du jour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total production', value: `${totalProductionValue.toFixed(2)} DH`, icon: FiBox, color: 'bg-blue-500/10 text-blue-400' },
            { label: 'Ventes nettes (retours déduits)', value: `${totalVentesNet.toFixed(2)} DH`, icon: FiTrendingUp, color: 'bg-diana-gold/10 text-diana-gold' },
            { label: "Chiffre d'affaires commandes", value: `${totalCommandes.toFixed(2)} DH`, icon: FiCalendar, color: 'bg-emerald-500/10 text-emerald-400' },
            { label: 'Total général (ventes + commandes)', value: `${totalGeneral.toFixed(2)} DH`, icon: FiDollarSign, color: 'bg-orange-400/10 text-orange-400' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}><stat.icon size={18} /></div>
              <p className="font-fraunces text-2xl font-semibold text-diana-cream mb-1">{stat.value}</p>
              <p className="text-xs text-diana-brown">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        {totalRefunds > 0 && (
          <p className="text-xs text-diana-brown mb-6 -mt-4 flex items-center gap-1.5"><FiRotateCcw size={12} /> Dont {totalRefunds.toFixed(2)} DH de retours déjà déduits des ventes ci-dessus.</p>
        )}

        {/* Détail par atelier / préparateur */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h3 className="font-fraunces text-lg text-diana-cream mb-4">Production &amp; ventes par préparateur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {atelierSummary.map((a) => {
              const isOpen = expandedAtelier === a.atelier
              return (
                <div key={a.atelier} className="bg-diana-card border border-diana-border rounded-2xl p-5">
                  <button onClick={() => setExpandedAtelier(isOpen ? null : a.atelier)} className="w-full text-left">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-diana-gold/15 flex items-center justify-center"><FiUsers className="text-diana-gold" size={18} /></div>
                      <h3 className="font-fraunces text-base text-diana-cream flex-1">{a.label}</h3>
                      <FiChevronDown className={`text-diana-brown transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} />
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-diana-brown flex items-center gap-1.5"><FiBox size={13} /> Produit</span>
                        <span className="font-semibold text-diana-cream">{a.totalProducedQty} <span className="text-diana-brown font-normal">({a.totalProducedValue.toFixed(2)} DH)</span></span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-diana-brown flex items-center gap-1.5"><FiTrendingUp size={13} /> Vendu</span>
                        <span className="font-semibold text-diana-cream">{a.totalSoldQty}</span>
                      </div>
                      {a.totalRefundValue > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-diana-brown flex items-center gap-1.5"><FiRotateCcw size={13} /> Retour</span>
                          <span className="font-semibold text-diana-danger">-{a.totalRefundValue.toFixed(2)} DH</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-diana-border/40">
                        <span className="text-diana-brown">Chiffre d'affaires net</span>
                        <span className="font-semibold text-diana-gold">{a.netRevenue.toFixed(2)} DH</span>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-diana-border/40">
                      <p className="text-[11px] uppercase tracking-wide text-diana-brown mb-2">Détail production par produit</p>
                      {a.products.length === 0 ? (
                        <p className="text-xs italic text-diana-brownLight">Aucune production enregistrée</p>
                      ) : (
                        <div className="space-y-1.5">
                          {a.products.map((p) => (
                            <div key={p.name} className="flex justify-between text-xs gap-2">
                              <span className="text-diana-cream truncate flex items-center gap-1.5"><FiPackage size={11} className="text-diana-brown shrink-0" /> {p.name} × {p.qty}</span>
                              <span className="text-diana-gold font-medium shrink-0">{p.value.toFixed(2)} DH</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Commandes du jour : avance / reste */}
        {commandesBilan && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-6">
            <h3 className="font-fraunces text-lg text-diana-cream mb-4">Commandes — {date || todayStr()} {!date && <span className="text-xs font-sans font-normal text-diana-brown">(les commandes ne peuvent être consultées que jour par jour)</span>}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-diana-dark/30 rounded-xl p-4">
                <p className="text-xs text-diana-brown mb-1.5">Avances reçues</p>
                <p className="font-semibold text-diana-cream">{commandesBilan.totalAvances.toFixed(2)} DH</p>
              </div>
              <div className="bg-diana-dark/30 rounded-xl p-4">
                <p className="text-xs text-diana-brown mb-1.5">Restes récupérés (livraison)</p>
                <p className="font-semibold text-diana-cream">{commandesBilan.totalRestes.toFixed(2)} DH</p>
              </div>
              <div className="bg-diana-dark/30 rounded-xl p-4 border border-diana-gold/30">
                <p className="text-xs text-diana-brown mb-1.5">Chiffre d'affaires commandes</p>
                <p className="font-semibold text-diana-gold">{totalCommandes.toFixed(2)} DH</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
