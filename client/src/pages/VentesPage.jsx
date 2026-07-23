import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiDollarSign, FiCalendar, FiTrendingUp, FiPrinter, FiUsers, FiBox, FiChevronDown, FiPackage, FiRotateCcw } from 'react-icons/fi'
import { ATELIERS, mergeProductOverlay } from '../data/products'
import { getProductOverlay } from '../api/products'
import {
  getProductionLog, getSalesLog, getRefunds, getCommandesBilan, subscribeToStockUpdates, sameDay, getRzizaDeliveries, getRetours,
} from '../data/stockStore'

// Catégories retirées de la page Ventes : elles sont désormais gérées via le "Frigo
// d'entremet" (prix saisi directement par le préparateur) et n'ont plus leur place ici en
// tant que production/vente classique par quantité.
const EXCLUDED_CATEGORIES = ['entremet', 'melange', 'cake_design', 'gateaux_kg']

// Catégories affichées en plus des ATELIERS "classiques" (préparateurs) dans la section
// Production & ventes : Millefeuille et Rziza n'ont pas de préparateur dédié dans ATELIERS
// (products.js), mais doivent quand même apparaître en permanence ici, même à 0.
const EXTRA_VENTES_CATEGORIES = [
  { id: 'millefeuille', label: 'Millefeuille / Cake' },
  { id: 'rziza', label: 'Rziza' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function VentesPage() {
  const [date, setDate] = useState(todayStr())
  const [productionLog, setProductionLog] = useState([])
  const [salesLog, setSalesLog] = useState([])
  const [refunds, setRefunds] = useState([])
  const [rzizaDeliveries, setRzizaDeliveries] = useState([])
  const [retours, setRetours] = useState({ current: null, previous: null })
  const [commandesBilan, setCommandesBilan] = useState(null)
  const [expandedAtelier, setExpandedAtelier] = useState(null)
  const [retourTab, setRetourTab] = useState('previous') // 'previous' | 'current'
  const [ventesTab, setVentesTab] = useState('production') // 'production' | 'vente'
  const [productOverlay, setProductOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })

  useEffect(() => {
    getProductOverlay().then(setProductOverlay).catch(() => {})
  }, [])
  const ALL_PRODUCTS = useMemo(() => mergeProductOverlay(productOverlay), [productOverlay])

  const refresh = useCallback(async () => {
    const commandesDate = date || todayStr()
    const [productionData, salesData, refundsData, bilan, rziza, retoursData] = await Promise.all([
      getProductionLog(), getSalesLog(), getRefunds(), getCommandesBilan(commandesDate), getRzizaDeliveries(), getRetours(commandesDate),
    ])
    setProductionLog(productionData)
    setSalesLog(salesData)
    setRefunds(refundsData)
    setCommandesBilan(bilan)
    setRzizaDeliveries(rziza)
    setRetours(retoursData)
  }, [date])

  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  // Map productId -> catégorie / nom, pour croiser ventes/retours avec l'atelier concerné
  const productCategoryMap = useMemo(() => {
    const map = {}
    ALL_PRODUCTS.forEach((p) => { map[p.id] = p.category })
    return map
  }, [ALL_PRODUCTS])

  const productNameMap = useMemo(() => {
    const map = {}
    ALL_PRODUCTS.forEach((p) => { map[p.id] = p.name })
    return map
  }, [ALL_PRODUCTS])

  // Récapitulatif par atelier, pour la date choisie (ou tout l'historique si aucune date) :
  // production (qté produite × prix) d'un côté, vendu (net des retours) de l'autre — avec
  // le détail produit par produit pour chacun des deux.
  const atelierSummary = useMemo(() => {
    const filteredProduction = (date ? productionLog.filter((e) => sameDay(e.timestamp, date)) : productionLog)
      .filter((e) => !EXCLUDED_CATEGORIES.includes(e.category))
    const filteredSales = date ? salesLog.filter((s) => sameDay(s.timestamp, date)) : salesLog
    const filteredRefunds = date ? refunds.filter((r) => sameDay(r.timestamp, date)) : refunds
    const filteredRziza = date ? rzizaDeliveries.filter((r) => sameDay(r.timestamp, date)) : rzizaDeliveries

    const summary = {}
    ;[...ATELIERS.filter((a) => !EXCLUDED_CATEGORIES.includes(a.id)), ...EXTRA_VENTES_CATEGORIES].forEach((a) => {
      summary[a.id] = {
        atelier: a.id, label: a.label,
        totalProducedQty: 0, totalProducedValue: 0,
        totalSoldQty: 0, totalSoldValue: 0, totalRefundValue: 0,
        productionProducts: {}, soldProducts: {},
      }
    })
    const ensure = (atelierId) => {
      if (EXCLUDED_CATEGORIES.includes(atelierId)) return null
      if (!summary[atelierId]) {
        summary[atelierId] = {
          atelier: atelierId, label: atelierId,
          totalProducedQty: 0, totalProducedValue: 0,
          totalSoldQty: 0, totalSoldValue: 0, totalRefundValue: 0,
          productionProducts: {}, soldProducts: {},
        }
      }
      return summary[atelierId]
    }

    filteredProduction.forEach((entry) => {
      const s = ensure(entry.atelier)
      if (!s) return
      const value = entry.price !== null ? entry.price * entry.quantity : 0
      s.totalProducedQty += entry.quantity
      s.totalProducedValue += value
      if (!s.productionProducts[entry.product]) s.productionProducts[entry.product] = { name: entry.product, qty: 0, value: 0, price: entry.price }
      s.productionProducts[entry.product].qty += entry.quantity
      s.productionProducts[entry.product].value += value
    })

    // Rziza n'a pas de "production" à proprement parler (pas de préparateur) : chaque achat
    // livré doit néanmoins apparaître ici comme production, à la valeur de vente prévue.
    filteredRziza.forEach((delivery) => {
      const s = ensure('rziza')
      if (!s) return
      const value = delivery.quantity * delivery.prixVente
      s.totalProducedQty += delivery.quantity
      s.totalProducedValue += value
      if (!s.productionProducts['Rziza']) s.productionProducts['Rziza'] = { name: 'Rziza', qty: 0, value: 0, price: delivery.prixVente }
      s.productionProducts['Rziza'].qty += delivery.quantity
      s.productionProducts['Rziza'].value += value
    })

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = productCategoryMap[item.id]
        if (!cat || EXCLUDED_CATEGORIES.includes(cat)) return
        const s = ensure(cat)
        if (!s) return
        const value = item.qty * item.price
        s.totalSoldQty += item.qty
        s.totalSoldValue += value
        const name = productNameMap[item.id] || item.name || item.id
        if (!s.soldProducts[item.id]) s.soldProducts[item.id] = { name, qty: 0, value: 0, price: item.price }
        s.soldProducts[item.id].qty += item.qty
        s.soldProducts[item.id].value += value
      })
    })

    filteredRefunds.forEach((refund) => {
      (refund.items || []).forEach((item) => {
        const cat = productCategoryMap[item.id]
        if (!cat || EXCLUDED_CATEGORIES.includes(cat)) return
        const s = ensure(cat)
        if (s) s.totalRefundValue += item.qty * item.price
      })
    })

    return Object.values(summary).map((s) => ({
      ...s,
      netRevenue: s.totalSoldValue - s.totalRefundValue,
      productionProducts: Object.values(s.productionProducts).sort((a, b) => b.value - a.value),
      soldProducts: Object.values(s.soldProducts).sort((a, b) => b.value - a.value),
    }))
  }, [productionLog, salesLog, refunds, rzizaDeliveries, productCategoryMap, productNameMap, date])

  const totalProductionValue = atelierSummary.reduce((sum, a) => sum + a.totalProducedValue, 0)
  const totalVentesNet = atelierSummary.reduce((sum, a) => sum + a.netRevenue, 0)
  const totalRefunds = atelierSummary.reduce((sum, a) => sum + a.totalRefundValue, 0)
  const totalCommandes = commandesBilan ? commandesBilan.totalAvances + commandesBilan.totalRestes : 0
  // Case 4 : total production + CA commandes + retour du jour précédent (récupéré, vendable
  // aujourd'hui) - retour de fermeture du jour (invendu du jour, pas encore récupéré).
  const retourPrecedentValue = retours.previous?.totalValue || 0
  const retourFermetureValue = retours.current?.totalValue || 0
  const bilanAvecRetours = totalProductionValue + totalCommandes + retourPrecedentValue - retourFermetureValue

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Rapport</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Ventes</h2>
            <p className="text-sm text-diana-brown mt-1">Production par préparateur, retours de caisse et commandes</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {[
            { label: 'Total production', value: `${totalProductionValue.toFixed(2)} DH`, icon: FiBox, color: 'bg-blue-500/10 text-blue-400' },
            { label: "Chiffre d'affaires commandes", value: `${totalCommandes.toFixed(2)} DH`, icon: FiCalendar, color: 'bg-emerald-500/10 text-emerald-400' },
            { label: 'Retour du jour précédent', value: `${retourPrecedentValue.toFixed(2)} DH`, icon: FiRotateCcw, color: 'bg-purple-500/10 text-purple-400' },
            { label: 'Retours de fermeture', value: `${retourFermetureValue.toFixed(2)} DH`, icon: FiRotateCcw, color: 'bg-orange-400/10 text-orange-400' },
            { label: 'Bilan avec retours (production + commandes + retour précédent - retour du jour)', value: `${bilanAvecRetours.toFixed(2)} DH`, icon: FiDollarSign, color: 'bg-diana-gold/10 text-diana-gold' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}><stat.icon size={18} /></div>
              <p className="font-fraunces text-2xl font-semibold text-diana-cream mb-1">{stat.value}</p>
              <p className="text-xs text-diana-brown">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Retours : même principe de séparation par onglet que Production/Vente. Le détail
            produit par produit du cas sélectionné est toujours affiché en dessous, sans avoir
            besoin de déplier quoi que ce soit. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="font-fraunces text-lg text-diana-cream">Retours de caisse</h3>
            <div className="inline-flex bg-diana-card border border-diana-border rounded-xl p-1">
              <button onClick={() => setRetourTab('previous')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${retourTab === 'previous' ? 'bg-purple-500 text-white' : 'text-diana-brown hover:text-diana-cream'}`}>
                Jour précédent
              </button>
              <button onClick={() => setRetourTab('current')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${retourTab === 'current' ? 'bg-diana-gold text-diana-dark' : 'text-diana-brown hover:text-diana-cream'}`}>
                Fermeture du jour
              </button>
            </div>
          </div>

          {(() => {
            const isPrevious = retourTab === 'previous'
            const data = isPrevious ? retours.previous : retours.current
            const color = isPrevious ? 'bg-purple-500/10 text-purple-400' : 'bg-diana-gold/10 text-diana-gold'
            const emptyLabel = isPrevious
              ? "Pas encore de retour enregistré pour le jour précédent."
              : "Pas encore calculé : se fait automatiquement au vidage de fin de journée (page Stock)."
            const filledLabel = data
              ? (isPrevious
                  ? `Calculé le ${data.date} — réutilisé comme fond de caisse aujourd'hui.`
                  : "Stock invendu d'entremet/gâteau/cake/pâtisserie au vidage de ce soir-là — servira de fond de caisse demain.")
              : null
            const entries = data?.entries || []
            return (
              <div className="bg-diana-card border border-diana-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}><FiRotateCcw size={18} /></div>
                  <div>
                    <p className="font-fraunces text-2xl font-semibold text-diana-cream">{data ? `${data.totalValue.toFixed(2)} DH` : '—'}</p>
                    <p className="text-[11px] text-diana-brownLight">{data ? filledLabel : emptyLabel}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-diana-border/40">
                  <p className="text-[11px] uppercase tracking-wide text-diana-brown mb-2">Détail produit par produit</p>
                  {entries.length === 0 ? (
                    <p className="text-xs italic text-diana-brownLight">
                      {data ? 'Aucun produit dans ce retour' : "Rien à afficher — aucune clôture de fin de journée n'a encore été enregistrée pour ce cas."}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {entries.map((e, idx) => (
                        <div key={`${e.productId || e.name}-${idx}`} className="flex justify-between text-xs gap-2">
                          <span className="text-diana-cream truncate flex items-center gap-1.5">
                            <FiPackage size={11} className="text-diana-brown shrink-0" /> {e.name} × {e.qty}
                            {e.price ? <span className="text-diana-brownLight"> ({Number(e.price).toFixed(2)} DH/u)</span> : null}
                          </span>
                          <span className="text-diana-gold font-medium shrink-0">{Number(e.value).toFixed(2)} DH</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs gap-2 pt-2 border-t border-diana-border/40 font-semibold">
                        <span className="text-diana-brown">Total ({entries.length} produit{entries.length > 1 ? 's' : ''})</span>
                        <span className="text-diana-gold">{data.totalValue.toFixed(2)} DH</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </motion.div>

        {/* Détail par atelier / préparateur — séparé en 2 onglets Production / Vente */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="font-fraunces text-lg text-diana-cream">Production &amp; ventes par préparateur</h3>
            <div className="inline-flex bg-diana-card border border-diana-border rounded-xl p-1">
              <button onClick={() => setVentesTab('production')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${ventesTab === 'production' ? 'bg-emerald-600 text-white' : 'text-diana-brown hover:text-diana-cream'}`}>
                Production
              </button>
              <button onClick={() => setVentesTab('vente')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${ventesTab === 'vente' ? 'bg-diana-gold text-diana-dark' : 'text-diana-brown hover:text-diana-cream'}`}>
                Vente
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {atelierSummary.map((a) => {
              const isOpen = expandedAtelier === a.atelier
              const products = ventesTab === 'production' ? a.productionProducts : a.soldProducts
              return (
                <div key={a.atelier} className="bg-diana-card border border-diana-border rounded-2xl p-5">
                  <button onClick={() => setExpandedAtelier(isOpen ? null : a.atelier)} className="w-full text-left">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-diana-gold/15 flex items-center justify-center"><FiUsers className="text-diana-gold" size={18} /></div>
                      <h3 className="font-fraunces text-base text-diana-cream flex-1">{a.label}</h3>
                      <FiChevronDown className={`text-diana-brown transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} />
                    </div>

                    {ventesTab === 'production' ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-diana-brown flex items-center gap-1.5"><FiBox size={13} /> Produit</span>
                          <span className="font-semibold text-diana-cream">{a.totalProducedQty} <span className="text-diana-brown font-normal">({a.totalProducedValue.toFixed(2)} DH)</span></span>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-diana-border/40">
                          <span className="text-diana-brown">Valeur produite</span>
                          <span className="font-semibold text-diana-gold">{a.totalProducedValue.toFixed(2)} DH</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-diana-brown flex items-center gap-1.5"><FiTrendingUp size={13} /> Vendu</span>
                          <span className="font-semibold text-diana-cream">{a.totalSoldQty} <span className="text-diana-brown font-normal">({a.totalSoldValue.toFixed(2)} DH)</span></span>
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
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-diana-border/40">
                      <p className="text-[11px] uppercase tracking-wide text-diana-brown mb-2">
                        {ventesTab === 'production' ? 'Détail production par produit' : 'Détail vente par produit'}
                      </p>
                      {products.length === 0 ? (
                        <p className="text-xs italic text-diana-brownLight">
                          {ventesTab === 'production' ? 'Aucune production enregistrée' : 'Aucune vente enregistrée'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {products.map((p) => (
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
