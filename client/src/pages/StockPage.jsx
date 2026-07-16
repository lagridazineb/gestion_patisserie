import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiMinus, FiEdit3, FiPackage, FiAlertTriangle, FiUsers, FiTrendingUp, FiBox, FiSunset, FiTrash2, FiX, FiCalendar, FiChevronDown, FiPrinter } from 'react-icons/fi'
import { ATELIERS, mergeProductOverlay } from '../data/products'
import { getProductOverlay } from '../api/products'
import { useNotification } from '../context/NotificationContext'
import {
  getStock, setProductStock, adjustStock, getProductionLog, getSalesLog, subscribeToStockUpdates,
  getEodSettings, setEodTime, clearPerishableStock, checkAutoClosing, PERISHABLE_CATEGORIES, resetAllStock,
  removeProductionEntry, sameDay, getRzizaDeliveries,
} from '../data/stockStore'
import NumericField from '../components/NumericField'

export default function StockPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stocks, setStocks] = useState({})
  const [productionLog, setProductionLog] = useState([])
  const [salesLog, setSalesLog] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [view, setView] = useState('stock') // 'stock' | 'production' | 'preparateurs'
  const [eodSettings, setEodSettingsState] = useState({ time: '22:00', lastClearedDate: null })
  const [rzizaDeliveries, setRzizaDeliveries] = useState([])
  const [expandedAtelier, setExpandedAtelier] = useState(null)
  const [productionSearch, setProductionSearch] = useState('')
  const [productionDate, setProductionDate] = useState('')
  const [preparateurDate, setPreparateurDate] = useState('')
  const [clearReceipt, setClearReceipt] = useState(null)
  const [productOverlay, setProductOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })
  const { addNotification } = useNotification()

  useEffect(() => {
    const refreshOverlay = () => { getProductOverlay().then(setProductOverlay).catch(() => {}) }
    refreshOverlay()
    const unsubscribe = subscribeToStockUpdates(refreshOverlay, 15000)
    return unsubscribe
  }, [])
  const ALL_PRODUCTS = useMemo(() => mergeProductOverlay(productOverlay), [productOverlay])

  // Dès que le reçu de vidage est prêt à l'écran, on lance l'impression automatiquement.
  useEffect(() => {
    if (clearReceipt) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [clearReceipt])

  // Vérifie toutes les minutes si l'heure de clôture est dépassée (tant que la page est ouverte)
  useEffect(() => {
    const check = async () => {
      const triggered = await checkAutoClosing()
      if (triggered) {
        setEodSettingsState(await getEodSettings())
        addNotification('Clôture automatique du soir effectuée (Pain, Viennoiserie, Salé, Millefeuille)', 'success')
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [addNotification])

  const refresh = useCallback(async () => {
    const [stockData, productionData, salesData, eodData, rziza] = await Promise.all([
      getStock(), getProductionLog(), getSalesLog(), getEodSettings(), getRzizaDeliveries(),
    ])
    setStocks(stockData)
    setProductionLog(productionData)
    setSalesLog(salesData)
    setEodSettingsState(eodData)
    setRzizaDeliveries(rziza)
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = subscribeToStockUpdates(refresh)
    return unsubscribe
  }, [refresh])

  const filteredProducts = ALL_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const lowStockItems = filteredProducts.filter(p => (stocks[p.id] ?? 0) <= 5)

  // Map productId -> category (atelier) pour croiser les ventes avec les ateliers
  const productCategoryMap = useMemo(() => {
    const map = {}
    ALL_PRODUCTS.forEach((p) => { map[p.id] = p.category })
    return map
  }, [])

  // Récapitulatif par atelier : total produit (production) et total vendu (caisse),
  // filtrable par date précise pour consulter un jour précédent.
  const atelierSummary = useMemo(() => {
    const filteredProduction = preparateurDate ? productionLog.filter((e) => sameDay(e.timestamp, preparateurDate)) : productionLog
    const filteredSales = preparateurDate ? salesLog.filter((s) => sameDay(s.timestamp, preparateurDate)) : salesLog
    const summary = {}
    ATELIERS.forEach((a) => { summary[a.id] = { atelier: a.id, label: a.label, totalProduced: 0, totalSold: 0, totalRevenue: 0, entries: 0 } })
    filteredProduction.forEach((entry) => {
      if (!summary[entry.atelier]) summary[entry.atelier] = { atelier: entry.atelier, label: entry.atelier, totalProduced: 0, totalSold: 0, totalRevenue: 0, entries: 0 }
      summary[entry.atelier].totalProduced += entry.quantity
      summary[entry.atelier].entries += 1
    })
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = productCategoryMap[item.id]
        if (!cat) return
        if (!summary[cat]) summary[cat] = { atelier: cat, label: cat, totalProduced: 0, totalSold: 0, totalRevenue: 0, entries: 0 }
        summary[cat].totalSold += item.qty
        summary[cat].totalRevenue += item.qty * item.price
      })
    })
    // Rziza n'a pas de préparateur : pas de "production", seulement des livraisons (Achats)
    // et des ventes en caisse. On affiche la quantité livrée à la place de "Produit".
    if (summary.rziza) {
      const deliveries = preparateurDate
        ? rzizaDeliveries.filter((r) => sameDay(r.timestamp, preparateurDate))
        : rzizaDeliveries
      summary.rziza.totalProduced = deliveries.reduce((s, r) => s + r.quantity, 0)
      summary.rziza.noProduction = true
    }
    return Object.values(summary)
  }, [productionLog, salesLog, productCategoryMap, preparateurDate, rzizaDeliveries])

  // Détail produit par produit de la production, pour chaque atelier (ce qui a été fait, et combien)
  const atelierProductBreakdown = useMemo(() => {
    const filteredProduction = preparateurDate ? productionLog.filter((e) => sameDay(e.timestamp, preparateurDate)) : productionLog
    const map = {}
    filteredProduction.forEach((entry) => {
      if (!map[entry.atelier]) map[entry.atelier] = {}
      const key = entry.product
      if (!map[entry.atelier][key]) map[entry.atelier][key] = 0
      map[entry.atelier][key] += entry.quantity
    })
    return map
  }, [productionLog, preparateurDate])

  const handleDeleteProduction = async (entry) => {
    if (!window.confirm(`Supprimer cette production (${entry.product} +${entry.quantity}) ? Le stock correspondant sera retiré.`)) return
    await removeProductionEntry(entry.id)
    refresh()
    addNotification('Entrée de production supprimée', 'success')
  }

  const filteredProductionLog = useMemo(() => {
    const q = productionSearch.trim().toLowerCase()
    return productionLog.filter((entry) => {
      if (productionDate && entry.date !== productionDate) return false
      if (q && !entry.product.toLowerCase().includes(q) && !(entry.user || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [productionLog, productionSearch, productionDate])

  const handleAdjust = async (id, delta) => {
    await adjustStock(id, delta)
    refresh()
    const product = ALL_PRODUCTS.find(p => p.id === id)
    addNotification(`${product.name}: stock ${delta > 0 ? '+' : ''}${delta}`, 'success')
  }

  const handleEdit = (id) => { setEditingId(id); setEditValue(String(stocks[id] ?? 0)) }

  const handleSaveEdit = async (id) => {
    const val = parseFloat(String(editValue).replace(',', '.'))
    if (!isNaN(val)) {
      await setProductStock(id, val)
      refresh()
      const product = ALL_PRODUCTS.find(p => p.id === id)
      addNotification(`Stock de ${product.name} mis à jour: ${val}`, 'success')
    }
    setEditingId(null)
  }

  const atelierLabel = (id) => ATELIERS.find(a => a.id === id)?.label || id

  const handleManualClear = async () => {
    const result = await clearPerishableStock()
    refresh()
    addNotification(`Stock vidé pour ${result.count} produits (Pain, Viennoiserie, Salé, Millefeuille) — valeur ${result.totalValue.toFixed(2)} DH`, 'success')
    if (result.entries?.length > 0) setClearReceipt({ ...result, label: 'Vidage du stock (fin de journée)' })
  }

  const handleResetAllStock = async () => {
    if (!window.confirm('Remettre TOUT le stock (toutes catégories) à 0 ? Cette action est irréversible.')) return
    const result = await resetAllStock()
    refresh()
    addNotification(`Stock remis à 0 pour ${result.count} produits — valeur ${result.totalValue.toFixed(2)} DH`, 'success')
    if (result.entries?.length > 0) setClearReceipt({ ...result, label: 'Remise à zéro complète du stock' })
  }

  const handleTimeChange = async (time) => {
    const updated = await setEodTime(time)
    setEodSettingsState((prev) => ({ ...prev, time: updated.time }))
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Gestion</p>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-medium text-diana-cream">Stock</h2>
          </div>
          <div className="flex bg-diana-card border border-diana-border rounded-xl p-1 self-start flex-wrap">
            <button onClick={() => setView('stock')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${view === 'stock' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              Stock par produit
            </button>
            <button onClick={() => setView('preparateurs')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${view === 'preparateurs' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiTrendingUp size={12} /> Par préparateur
            </button>
            <button onClick={() => setView('production')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${view === 'production' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiUsers size={12} /> Détail production
            </button>
            <Link to="/stock-vide"
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 text-diana-brown hover:text-diana-cream">
              <FiTrash2 size={12} /> Vidanges de stock
            </Link>
          </div>
        </motion.div>

        {view === 'stock' ? (
          <>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-diana-accent/10 flex items-center justify-center shrink-0"><FiSunset className="text-diana-accentLight" size={18} /></div>
                <div>
                  <p className="font-fraunces text-base text-diana-cream">Clôture du soir</p>
                  <p className="text-xs text-diana-brown mt-0.5">Vide automatiquement le stock invendu de Pain, Viennoiserie, Salé et Millefeuille (produits périssables uniquement).</p>
                  {eodSettings.lastClearedDate === new Date().toISOString().slice(0, 10) && (
                    <p className="text-[11px] text-emerald-400 mt-1">✓ Déjà effectuée aujourd'hui</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-diana-brown">Heure :</label>
                <input type="time" value={eodSettings.time} onChange={(e) => handleTimeChange(e.target.value)}
                  className="px-2 py-1.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50" />
                <button onClick={handleManualClear}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diana-danger/10 text-diana-danger border border-diana-danger/30 text-xs font-semibold hover:bg-diana-danger/20 transition-colors">
                  <FiTrash2 size={13} /> Vider maintenant
                </button>
                <button onClick={handleResetAllStock}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diana-danger/20 text-diana-danger border border-diana-danger/40 text-xs font-semibold hover:bg-diana-danger/30 transition-colors">
                  <FiTrash2 size={13} /> Vider tout le stock
                </button>
              </div>
            </motion.div>

            {lowStockItems.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-diana-accent/10 border border-diana-accent/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                <FiAlertTriangle className="text-diana-accentLight shrink-0" size={20} />
                <p className="text-sm text-diana-accentLight">{lowStockItems.length} produit{lowStockItems.length > 1 ? 's' : ''} en stock faible</p>
              </motion.div>
            )}
            <div className="relative max-w-md mb-6">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={18} />
              <input type="text" placeholder="Rechercher un produit..." value={searchQuery} dir="auto" lang="fr"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors" />
            </div>

            {/* Vue desktop : tableau */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="hidden md:block bg-diana-card border border-diana-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-diana-border">
                      <th className="text-left px-6 py-4 text-xs font-medium text-diana-brown uppercase tracking-wider">Produit</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-diana-brown uppercase tracking-wider">Catégorie</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-diana-brown uppercase tracking-wider">Prix</th>
                      <th className="text-center px-6 py-4 text-xs font-medium text-diana-brown uppercase tracking-wider">Stock</th>
                      <th className="text-center px-6 py-4 text-xs font-medium text-diana-brown uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredProducts.map((product, i) => {
                        const stock = stocks[product.id] ?? 0
                        const isLow = stock <= 5
                        return (
                          <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                            className="border-b border-diana-border/30 last:border-0 hover:bg-diana-dark/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-diana-dark flex items-center justify-center text-diana-gold overflow-hidden shrink-0">
                                  {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <FiPackage size={14} />}
                                </div>
                                <span className="text-sm text-diana-cream">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><span className="text-xs text-diana-brown capitalize">{product.category}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-sm text-diana-gold font-medium">{product.price.toFixed(2)} DH</span></td>
                            <td className="px-6 py-4 text-center">
                              {editingId === product.id ? (
                                <div className="flex items-center justify-center gap-2">
                                  <NumericField value={editValue} onChange={setEditValue} title={product.name} unit={product.unit === 'kg' ? 'kg' : 'pièce(s)'}
                                    className="w-20 px-2 py-1 text-center bg-diana-dark border border-diana-gold/30 rounded-lg text-sm text-diana-cream focus:outline-none" autoFocus />
                                  <button onClick={() => handleSaveEdit(product.id)} className="text-green-400 text-xs">✓</button>
                                </div>
                              ) : (
                                <span className={`text-sm font-semibold ${isLow ? 'text-diana-danger' : 'text-diana-cream'}`}>{stock}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleAdjust(product.id, -1)}
                                  className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-cream hover:border-diana-gold/30 transition-colors"><FiMinus size={12} /></button>
                                <button onClick={() => handleAdjust(product.id, 1)}
                                  className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-cream hover:border-diana-gold/30 transition-colors"><FiPlus size={12} /></button>
                                <button onClick={() => handleEdit(product.id)}
                                  className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-cream hover:border-diana-gold/30 transition-colors ml-1"><FiEdit3 size={12} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Vue mobile : cartes */}
            <div className="md:hidden space-y-3">
              <AnimatePresence>
                {filteredProducts.map((product) => {
                  const stock = stocks[product.id] ?? 0
                  const isLow = stock <= 5
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-diana-card border border-diana-border rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-diana-dark flex items-center justify-center text-diana-gold overflow-hidden shrink-0">
                          {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <FiPackage size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-diana-cream truncate">{product.name}</p>
                          <p className="text-xs text-diana-brown capitalize">{product.category} · {product.price.toFixed(2)} DH</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {editingId === product.id ? (
                          <div className="flex items-center gap-2">
                            <NumericField value={editValue} onChange={setEditValue} title={product.name} unit={product.unit === 'kg' ? 'kg' : 'pièce(s)'}
                              className="w-20 px-2 py-1.5 text-center bg-diana-dark border border-diana-gold/30 rounded-lg text-sm text-diana-cream focus:outline-none" autoFocus />
                            <button onClick={() => handleSaveEdit(product.id)} className="text-green-400 text-sm px-2">✓</button>
                          </div>
                        ) : (
                          <span className={`text-base font-semibold ${isLow ? 'text-diana-danger' : 'text-diana-cream'}`}>{stock}</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleAdjust(product.id, -1)}
                            className="w-9 h-9 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown active:scale-95 transition-transform"><FiMinus size={14} /></button>
                          <button onClick={() => handleAdjust(product.id, 1)}
                            className="w-9 h-9 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown active:scale-95 transition-transform"><FiPlus size={14} /></button>
                          <button onClick={() => handleEdit(product.id)}
                            className="w-9 h-9 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown active:scale-95 transition-transform"><FiEdit3 size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </>
        ) : view === 'preparateurs' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-5">
              <FiCalendar className="text-diana-brown" size={15} />
              <input type="date" value={preparateurDate} onChange={(e) => setPreparateurDate(e.target.value)}
                className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
              {preparateurDate && (
                <button onClick={() => setPreparateurDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Toutes les dates</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {atelierSummary.map((a) => {
              const isOpen = expandedAtelier === a.atelier
              const breakdown = Object.entries(atelierProductBreakdown[a.atelier] || {}).sort((x, y) => y[1] - x[1])
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
                        <span className="text-diana-brown flex items-center gap-1.5"><FiBox size={13} /> {a.noProduction ? 'Livré' : 'Produit'}</span>
                        <span className="font-semibold text-diana-cream">{a.totalProduced}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-diana-brown flex items-center gap-1.5"><FiTrendingUp size={13} /> Vendu</span>
                        <span className="font-semibold text-diana-cream">{a.totalSold}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-diana-border/40">
                        <span className="text-diana-brown">Chiffre d'affaires</span>
                        <span className="font-semibold text-diana-gold">{a.totalRevenue.toFixed(2)} DH</span>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-diana-border/40">
                      <p className="text-[11px] uppercase tracking-wide text-diana-brown mb-2">Détail par produit</p>
                      {breakdown.length === 0 ? (
                        <p className="text-xs italic text-diana-brownLight">Aucune production enregistrée</p>
                      ) : (
                        <div className="space-y-1.5">
                          {breakdown.map(([name, qty]) => (
                            <div key={name} className="flex justify-between text-xs">
                              <span className="text-diana-cream">{name}</span>
                              <span className="text-diana-gold font-medium">+{qty}</span>
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
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-diana-brown" size={15} />
                <input type="text" placeholder="Rechercher (produit, préparateur...)" value={productionSearch} dir="auto" lang="fr"
                  onChange={(e) => setProductionSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
              </div>
              <div className="flex items-center gap-2">
                <FiCalendar className="text-diana-brown" size={15} />
                <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)}
                  className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
                {productionDate && (
                  <button onClick={() => setProductionDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Effacer</button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {filteredProductionLog.length === 0 ? (
                <div className="text-center py-16 text-diana-brownLight bg-diana-card border border-diana-border rounded-2xl">
                  <FiUsers size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm italic">Aucune production enregistrée par les préparateurs</p>
                </div>
              ) : (
                filteredProductionLog.map((entry) => (
                  <div key={entry.id} className="bg-diana-card border border-diana-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm text-diana-cream font-medium">{entry.product}</p>
                      <p className="text-xs text-diana-brown mt-0.5">{atelierLabel(entry.atelier)} · {entry.user} · {entry.date} {entry.time}</p>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <span className="text-sm font-semibold text-diana-gold">+{entry.quantity}</span>
                      <button onClick={() => handleDeleteProduction(entry)} className="text-diana-danger hover:text-red-700"><FiX size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Reçu imprimable du vidage de stock — s'affiche et s'imprime automatiquement dès le vidage */}
      <AnimatePresence>
        {clearReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 print:bg-white" onClick={() => setClearReceipt(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-diana-cream text-diana-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl p-4 mb-5 text-xs border border-diana-creamDark">
                <div className="text-center border-b border-dashed border-diana-creamDark pb-3 mb-3">
                  <p className="font-fraunces text-sm font-medium">Pâtisserie Dianna</p>
                  <p className="text-diana-brown">{clearReceipt.label}</p>
                  <p className="text-diana-brown">{new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
                </div>
                <div className="space-y-1 mb-2">
                  {clearReceipt.entries.map((e) => (
                    <div key={e.productId} className="flex justify-between py-0.5">
                      <span className="pr-2">{e.name} × {e.qty}</span>
                      <span className="shrink-0">{e.value.toFixed(2)} DH</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-diana-creamDark pt-2 mt-2">
                  <div className="flex justify-between py-0.5"><span>Quantité totale</span><span>{clearReceipt.totalQuantity}</span></div>
                  <div className="flex justify-between font-semibold"><span>Valeur totale</span><span>{clearReceipt.totalValue.toFixed(2)} DH</span></div>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 bg-diana-dark text-diana-cream py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiPrinter size={15} /> Imprimer
                </button>
                <button onClick={() => setClearReceipt(null)}
                  className="flex-1 bg-white text-diana-brown border border-diana-border py-2.5 rounded-xl text-sm font-semibold">
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
