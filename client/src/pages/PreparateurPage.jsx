import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { PRODUCTS, ATELIERS, getAtelierCategories } from '../data/products'
import { getStock, addProduction, getProductionLog, subscribeToStockUpdates, getAtelierTasks, getAtelierDoneTasks, markAtelierDone, getActiveFrigoBatches } from '../data/stockStore'
import { FiBox, FiPlus, FiCheck, FiClock, FiCalendar, FiPackage, FiClipboard, FiUser, FiPhone, FiEye, FiCheckCircle, FiXCircle, FiScissors, FiGrid } from 'react-icons/fi'

export default function PreparateurPage() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [stock, setStock] = useState({})
  const [productions, setProductions] = useState([])
  const [tasks, setTasks] = useState([])
  const [doneTasks, setDoneTasks] = useState([])
  const [kgTasks, setKgTasks] = useState([])
  const [kgDoneTasks, setKgDoneTasks] = useState([])
  const [frigoBatches, setFrigoBatches] = useState([])
  const [revealedStatus, setRevealedStatus] = useState({})
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  const [prepTab, setPrepTab] = useState('tranche') // 'tranche' | 'entremets' | 'kg'
  const isPatisserie = user?.atelier === 'patisserie'

  const atelierCategories = user?.atelier ? getAtelierCategories(user.atelier) : []
  const atelierProducts = atelierCategories.flatMap((c) => (PRODUCTS[c] || []).map((p) => ({ ...p, category: c })))
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
    const taskLists = await Promise.all(atelierCategories.map((c) => getAtelierTasks(c)))
    const taskMap = new Map()
    taskLists.forEach((list) => list.forEach((t) => taskMap.set(t.id, t)))
    setTasks([...taskMap.values()])
    const doneLists = await Promise.all(atelierCategories.map((c) => getAtelierDoneTasks(c)))
    const doneMap = new Map()
    doneLists.forEach((list) => list.forEach((t) => doneMap.set(t.id, t)))
    setDoneTasks([...doneMap.values()])
    setKgTasks(await getAtelierTasks('gateaux_kg'))
    setKgDoneTasks(await getAtelierDoneTasks('gateaux_kg'))
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

  const toggleStatus = (reservationId) => {
    setRevealedStatus((prev) => ({ ...prev, [reservationId]: !prev[reservationId] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

        {isPatisserie && (
          <div className="flex bg-diana-card border border-diana-border rounded-xl p-1 mb-6 w-fit flex-wrap">
            <button onClick={() => setPrepTab('tranche')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${prepTab === 'tranche' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiScissors size={12} /> Tranche
            </button>
            <button onClick={() => setPrepTab('entremets')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${prepTab === 'entremets' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiGrid size={12} /> Entremets circulaires <span className="opacity-70">({entremetProducts.length})</span>
            </button>
            <button onClick={() => setPrepTab('kg')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${prepTab === 'kg' ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
              <FiClipboard size={12} /> Gâteau par kg — voir commande
              {kgTasks.length > 0 && <span className="ml-1 bg-diana-accent/20 text-diana-accentLight text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{kgTasks.length}</span>}
            </button>
          </div>
        )}

        {(!isPatisserie || prepTab === 'kg') && (
        <>
        {(() => {
          const displayTasks = isPatisserie ? kgTasks : tasks
          const displayDoneTasks = isPatisserie ? kgDoneTasks : doneTasks
          const itemCategoryFilter = isPatisserie ? ['gateaux_kg'] : atelierCategories
          return (
        <>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-diana-accent/10 flex items-center justify-center"><FiClipboard className="text-diana-accentLight" size={20} /></div>
            <div>
              <h3 className="font-fraunces text-lg text-diana-cream">{isPatisserie ? 'Commandes de gâteau par kg à préparer' : 'Commandes à préparer'}</h3>
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
                        <p className="text-xs
