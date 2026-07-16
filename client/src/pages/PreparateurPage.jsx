import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { ATELIERS, getAtelierCategories, mergeProductsByCategory } from '../data/products'
import { getProductOverlay } from '../api/products'
import { getStock, addProduction, getProductionLog, subscribeToStockUpdates, getAtelierTasks, getAtelierDoneTasks, markAtelierDone, getActiveFrigoBatches } from '../data/stockStore'
import { FiBox, FiPlus, FiCheck, FiClock, FiCalendar, FiPackage, FiClipboard, FiUser, FiPhone, FiEye, FiCheckCircle, FiXCircle, FiScissors, FiGrid } from 'react-icons/fi'
import NumericField from '../components/NumericField'

export default function PreparateurPage() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [stock, setStock] = useState({})
  const [productions, setProductions] = useState([])
  const [tasks, setTasks] = useState([])
  const [doneTasks, setDoneTasks] = useState([])
  const [patisserieTasks, setPatisserieTasks] = useState([])
  const [patisserieDoneTasks, setPatisserieDoneTasks] = useState([])
  const [frigoBatches, setFrigoBatches] = useState([])
  const [revealedStatus, setRevealedStatus] = useState({}) // { [reservationId]: true } — statut affiché après clic sur "Prête"
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  // Pour le préparateur Pâtisserie uniquement : 3 sections séparées.
  const [prepTab, setPrepTab] = useState('tranche') // 'tranche' | 'entremets' | 'kg'
  const isPatisserie = user?.atelier === 'patisserie'

  const [productOverlay, setProductOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })
  useEffect(() => {
    const refreshOverlay = () => { getProductOverlay().then(setProductOverlay).catch(() => {}) }
    refreshOverlay()
    return subscribeToStockUpdates(refreshOverlay, 15000)
  }, [])
  const PRODUCTS = useMemo(() => mergeProductsByCategory(productOverlay), [productOverlay])

  const atelierCategories = user?.atelier ? getAtelierCategories(user.atelier) : []
  const atelierProducts = atelierCategories.flatMap((c) => (PRODUCTS[c] || []).map((p) => ({ ...p, category: c })))
  // Sous-ensembles utilisés uniquement par les 3 sections de la Pâtisserie
  const entremetProducts = PRODUCTS['entremet'] || []
  const activeCategoryFilter = !isPatisserie ? null : prepTab === 'tranche' ? 'patisserie' : prepTab === 'entremets' ? 'entremet' : 'gateaux_kg'
  const visibleProducts = isPatisserie
    ? (activeCategoryFilter ? (PRODUCTS[activeCategoryFilter] || []).map((p) => ({ ...p, category: activeCategoryFilter })) : [])
    : atelierProducts

  const refresh = useCallback(async () => {
    const [stockData, allProd, frigo] = await Promise.all([
      getStock(), getProductionLog(), getActiveFrigoBatches(),
    ])
    setStock(stockData)
    setFrigoBatches(frigo)
    const todayStr = new Date().toISOString().split('T')[0]
    setProductions(allProd.filter((p) => p.atelier === user?.atelier && p.date === todayStr))
    // Regroupe les tâches de toutes les catégories gérées par cet atelier (sans doublons)
    const taskLists = await Promise.all(atelierCategories.map((c) => getAtelierTasks(c)))
    const taskMap = new Map()
    taskLists.forEach((list) => list.forEach((t) => taskMap.set(t.id, t)))
    setTasks([...taskMap.values()])
    const doneLists = await Promise.all(atelierCategories.map((c) => getAtelierDoneTasks(c)))
    const doneMap = new Map()
    doneLists.forEach((list) => list.forEach((t) => doneMap.set(t.id, t)))
    setDoneTasks([...doneMap.values()])
    // Pâtisserie : une SEULE liste de commandes regroupant les 3 sous-catégories (Tranche,
    // Entremets circulaires, Gâteau par kg) — les onglets ne filtrent que la grille "Nouvelle
    // production", plus les commandes.
    const patisserieCats = ['patisserie', 'entremet', 'gateaux_kg']
    const [pTaskLists, pDoneLists] = await Promise.all([
      Promise.all(patisserieCats.map((c) => getAtelierTasks(c))),
      Promise.all(patisserieCats.map((c) => getAtelierDoneTasks(c))),
    ])
    const pTaskMap = new Map()
    pTaskLists.forEach((list) => list.forEach((t) => pTaskMap.set(t.id, t)))
    setPatisserieTasks([...pTaskMap.values()])
    const pDoneMap = new Map()
    pDoneLists.forEach((list) => list.forEach((t) => pDoneMap.set(t.id, t)))
    setPatisserieDoneTasks([...pDoneMap.values()])
  }, [user?.atelier, atelierCategories.join(',')])

  const getTodayProduction = (productId) => {
    return productions
      .filter((p) => p.productId === productId)
      .reduce((sum, p) => sum + p.quantity, 0)
  }

  useEffect(() => {
    refresh()
    const unsubscribe = subscribeToStockUpdates(refresh)
    return unsubscribe
  }, [refresh])

  const handleMarkDone = async (reservationId) => {
    const task = tasks.find((t) => t.id === reservationId)
    const categoriesInTask = task ? [...new Set(task.items.map((i) => i.category))] : []
    const relevant = atelierCategories.filter((c) => categoriesInTask.includes(c))
    for (const c of relevant) {
      await markAtelierDone(reservationId, c)
    }
    addNotification('Préparation marquée comme terminée', 'success')
    refresh()
  }

  // Affiche le statut (encaissée / non encaissée) d'une commande déjà terminée, sans jamais montrer son prix.
  const toggleStatus = (reservationId) => {
    setRevealedStatus((prev) => ({ ...prev, [reservationId]: !prev[reservationId] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Accepte la virgule comme séparateur décimal (clavier français) en plus du point,
    // sinon parseFloat("1,5") ne lit que "1" et le reste de la saisie est perdu.
    const qty = parseFloat(String(quantity).replace(',', '.'))
    if (!selectedProduct || isNaN(qty) || qty <= 0) return
    const product = (isPatisserie ? visibleProducts : atelierProducts).find(p => p.id === selectedProduct)
    if (!product) return
    await addProduction({
      productId: product.id, product: product.name, quantity: qty, date, time,
      category: product.category, price: product.price,
      atelier: user?.atelier, user: user?.name,
    })
    setSelectedProduct('')
    setQuantity('')
    addNotification(`Production enregistrée: ${product.name} +${qty}`, 'success')
    refresh()
  }

  const atelierLabel = ATELIERS.find(a => a.id === user?.atelier)?.label || user?.atelier

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Atelier</p>
          <h2 className="font-fraunces text-2xl sm:text-3xl font-medium text-diana-cream">{atelierLabel}</h2>
          <p className="text-sm text-diana-brown mt-1">Bienvenue, {user?.name}. Enregistrez votre production ci-dessous.</p>
        </motion.div>

        {(() => {
          const displayTasks = isPatisserie ? patisserieTasks : tasks
          const displayDoneTasks = isPatisserie ? patisserieDoneTasks : doneTasks
          const itemCategoryFilter = isPatisserie ? ['patisserie', 'entremet', 'gateaux_kg'] : atelierCategories
          return (
        <>
        {/* Commandes à préparer (réservations passées via la page Commande) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-diana-accent/10 flex items-center justify-center"><FiClipboard className="text-diana-accentLight" size={20} /></div>
            <div>
              <h3 className="font-fraunces text-lg text-diana-cream">Commandes à préparer</h3>
              <p className="text-xs text-diana-brown">Articles réservés par un client, à préparer pour votre atelier</p>
            </div>
            {displayTasks.length > 0 && <span className="ml-auto bg-diana-accent/15 text-diana-accentLight text-xs font-semibold px-2.5 py-1 rounded-full">{displayTasks.length}</span>}
          </div>
          {displayTasks.length === 0 ? (
            <p className="text-sm italic text-diana-brownLight text-center py-6">Aucune commande en attente pour votre atelier</p>
          ) : (
            <div className="space-y-3">
              {displayTasks.map((task) => {
                const atelierItems = task.items.filter((i) => itemCategoryFilter.includes(i.category))
                return (
                  <div key={task.id} className="bg-diana-dark/40 border border-diana-border/40 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-diana-cream flex items-center gap-1.5"><FiUser size={13} /> {task.clientName}</p>
                        <p className="text-xs text-diana-brown flex items-center gap-2 mt-0.5">
                          {task.clientPhone && <span className="flex items-center gap-1"><FiPhone size={11} /> {task.clientPhone}</span>}
                          <span className="flex items-center gap-1"><FiCalendar size={11} /> {task.deliveryDate || '—'} {task.deliveryTime || ''}</span>
                        </p>
                      </div>
                      <button onClick={() => handleMarkDone(task.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98] shrink-0">
                        <FiCheck size={13} /> Terminé
                      </button>
                    </div>
                    <ul className="text-sm text-diana-brownLight space-y-2 mb-2">
                      {atelierItems.map((i) => (
                        <li key={i.id}>
                          <div>• {i.name} × {Number.isInteger(i.qty) ? i.qty : i.qty.toFixed(2)}{i.unit === 'kg' ? ' kg' : ''}</div>
                          {(i.customNote || i.customImage) && (
                            <div className="ml-3 mt-1.5 p-2.5 rounded-lg bg-diana-accent/10 border border-diana-accent/20">
                              {i.customNote && <p className="text-xs text-diana-accentLight font-medium">✍️ "{i.customNote}"</p>}
                              {i.customImage && (
                                <img src={i.customImage} alt="Référence gâteau" className="mt-2 w-full max-w-[180px] h-24 object-cover rounded-md border border-diana-border" />
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {task.note && <p className="text-xs text-diana-brown italic">Note : {task.note}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Commandes que vous avez terminées : cliquer sur "Prête" pour voir si elle a été
            encaissée ou non, sans jamais afficher le prix de la commande. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><FiCheck className="text-emerald-400" size={20} /></div>
            <div>
              <h3 className="font-fraunces text-lg text-diana-cream">Commandes terminées</h3>
              <p className="text-xs text-diana-brown">Cliquez sur "Prête" pour voir si le client a déjà réglé, sans afficher le prix</p>
            </div>
            {displayDoneTasks.length > 0 && <span className="ml-auto bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">{displayDoneTasks.length}</span>}
          </div>
          {displayDoneTasks.length === 0 ? (
            <p className="text-sm italic text-diana-brownLight text-center py-6">Aucune commande terminée pour le moment</p>
          ) : (
            <div className="space-y-2.5">
              {displayDoneTasks.map((t) => {
                const revealed = !!revealedStatus[t.id]
                return (
                  <div key={t.id} className="bg-diana-dark/40 border border-diana-border/40 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-diana-cream flex items-center gap-1.5"><FiUser size={13} /> {t.clientName}</p>
                      <p className="text-xs text-diana-brown mt-0.5">Ticket n°{String(t.ticketNumber).padStart(3, '0')}</p>
                    </div>
                    {revealed ? (
                      t.soldePaid ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                          <FiCheckCircle size={13} /> Encaissée
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-diana-accentLight bg-diana-accent/10 px-3 py-1.5 rounded-lg">
                          <FiXCircle size={13} /> Non encaissée
                        </span>
                      )
                    ) : (
                      <button onClick={() => toggleStatus(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diana-gold/15 text-diana-gold border border-diana-gold/30 text-xs font-semibold hover:bg-diana-gold/25 transition-colors">
                        <FiEye size={13} /> Prête
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
        </>
          )
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-diana-gold/10 flex items-center justify-center"><FiBox className="text-diana-gold" size={20} /></div>
              <h3 className="font-fraunces text-lg text-diana-cream">Nouvelle production</h3>
            </div>
            {isPatisserie && (
              <div className="flex bg-diana-dark/30 border border-diana-border rounded-xl p-1 mb-5 w-fit flex-wrap">
                <button type="button" onClick={() => setPrepTab('tranche')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${prepTab === 'tranche' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
                  <FiScissors size={12} /> Tranche
                </button>
                <button type="button" onClick={() => setPrepTab('entremets')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${prepTab === 'entremets' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
                  <FiGrid size={12} /> Entremets circulaires <span className="opacity-70">({entremetProducts.length})</span>
                </button>
                <button type="button" onClick={() => setPrepTab('kg')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${prepTab === 'kg' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
                  <FiClipboard size={12} /> Gâteau par kg
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-diana-brown mb-1.5 font-bold uppercase tracking-wide">Produit (Cliquer pour sélectionner)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 max-h-[320px] overflow-y-auto p-1.5 bg-diana-dark/20 border border-diana-border/30 rounded-xl">
                  {visibleProducts.map((p) => {
                    const todayQty = getTodayProduction(p.id)
                    const isSelected = selectedProduct === p.id
                    return (
                      <button key={p.id} type="button" onClick={() => setSelectedProduct(p.id)}
                        className={`prod-card bg-diana-card border rounded-xl p-2.5 text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${isSelected ? 'border-diana-gold bg-diana-gold/15 ring-2 ring-diana-gold/40' : 'border-diana-border/40 hover:border-diana-gold/30'}`}>
                        {p.image && (
                          <div className="w-full h-12 mb-1.5 rounded-lg overflow-hidden bg-diana-dark shrink-0">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                          </div>
                        )}
                        <p className="text-[11px] font-bold text-diana-cream leading-tight line-clamp-2 mb-1">{p.name}</p>
                        <p className="text-[9px] font-bold text-diana-gold uppercase tracking-wider">Fait: {todayQty} {p.unit === 'kg' ? 'kg' : 'pc'}</p>
                      </button>
                    )
                  })}
                </div>
                {!selectedProduct && <p className="text-[11px] text-diana-danger font-semibold mb-2">⚠️ Veuillez sélectionner un produit dans la grille ci-dessus.</p>}
              </div>
              <div>
                <label className="block text-xs text-diana-brown mb-1.5">Quantité fabriquée</label>
                <NumericField value={quantity} onChange={setQuantity} placeholder="Ex: 400 ou 1,5"
                  title={ (isPatisserie ? visibleProducts : atelierProducts).find(p => p.id === selectedProduct)?.name || 'Quantité' }
                  unit={ (isPatisserie ? visibleProducts : atelierProducts).find(p => p.id === selectedProduct)?.unit === 'kg' ? 'kg' : 'pièce(s)' }
                  className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream text-left focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-xs text-diana-brown mb-1.5">Date</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-diana-brown" size={14} />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      className="w-full min-w-0 pl-10 pr-2 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" required />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs text-diana-brown mb-1.5">Heure</label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-diana-brown" size={14} />
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                      className="w-full min-w-0 pl-10 pr-2 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" required />
                  </div>
                </div>
              </div>
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 bg-diana-gold text-diana-dark py-3.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98] mt-2">
                <FiPlus size={16} /> Enregistrer la production
              </button>
            </form>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><FiCheck className="text-blue-400" size={20} /></div>
              <h3 className="font-fraunces text-lg text-diana-cream">Historique de production</h3>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              <AnimatePresence>
                {productions.length === 0 ? (
                  <div className="text-center py-10 text-diana-brownLight">
                    <FiBox size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm italic">Aucune production enregistrée</p>
                  </div>
                ) : (
                  productions.map((prod) => (
                    <motion.div key={prod.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-diana-dark/50 rounded-xl p-4 border border-diana-border/30">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-diana-cream">{prod.product}</p>
                        <span className="text-xs text-diana-gold font-medium">+{prod.quantity}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-diana-brown">
                        <span>{prod.date}</span><span>{prod.time}</span><span className="text-diana-brownLight">{prod.user}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-5 sm:p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-diana-gold/10 flex items-center justify-center"><FiPackage className="text-diana-gold" size={20} /></div>
            <h3 className="font-fraunces text-lg text-diana-cream">Stock actuel en magasin (Global) — {isPatisserie ? (prepTab === 'tranche' ? 'Tranche' : prepTab === 'entremets' ? 'Entremets circulaires' : 'Gâteau par kg') : atelierLabel}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleProducts.map((p) => {
              // "Gâteau par kg" : chaque production est un lot (batch) isolé, pas un stock
              // mutualisé sur le produit de base — stock[p.id] n'est donc jamais mis à jour
              // (ni à la production, ni à la vente) et affichait toujours 0. On compte ici le
              // nombre réel de lots encore en stock (invendus) pour ce produit de base.
              const qty = (prepTab === 'kg' || prepTab === 'entremets')
                ? frigoBatches.filter((b) => b.baseProductId === p.id).length
                : (stock[p.id] ?? 0)
              const isLow = qty <= 5
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-diana-dark/50 border border-diana-border/30 rounded-xl px-4 py-3">
                  <span className="text-sm text-diana-cream truncate pr-2">{p.name}</span>
                  <span className={`text-sm font-semibold shrink-0 ${isLow ? 'text-diana-danger' : 'text-diana-gold'}`}>{qty} {(prepTab === 'kg' || prepTab === 'entremets') ? (qty > 1 ? 'gâteaux' : 'gâteau') : (p.unit === 'kg' ? 'kg' : '')}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
