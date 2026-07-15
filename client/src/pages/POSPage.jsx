import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { CATEGORIES_POS as CATEGORIES, PRODUCTS, ALL_PRODUCTS } from '../data/products'
import { getStock, recordSale, subscribeToStockUpdates, peekNextTicketNumber, clearPerishableStock, addRzizaDelivery, getPlateauAvailableStock, getActiveFrigoBatches, getAtelierTasks } from '../data/stockStore'
import QuantityModal from '../components/QuantityModal'
import NumericField from '../components/NumericField'
import KeyboardField from '../components/KeyboardField'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import { FiSearch, FiShoppingCart, FiPrinter, FiX, FiArrowLeft, FiCreditCard, FiDollarSign, FiSunset, FiPackage, FiPlus, FiClipboard as FiClipboardList } from 'react-icons/fi'

function formatQty(qty) {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function POSPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const mainRef = useRef(null)
  const [confirmPaymentState, setConfirmPaymentState] = useState({ open: false, method: null })
  const [paymentType, setPaymentType] = useState(null)
  const [changeGiven, setChangeGiven] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [stock, setStock] = useState({})
  const [qtyModalState, setQtyModalState] = useState({ open: false, product: null, initialValue: 1 })
  const [ticketNumber, setTicketNumber] = useState(0)
  const [frigoBatches, setFrigoBatches] = useState([])
  const { addNotification } = useNotification()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [showRzizaForm, setShowRzizaForm] = useState(false)
  const [rzizaQty, setRzizaQty] = useState('')
  const [rzizaPrixAchat, setRzizaPrixAchat] = useState('3.5')
  const [rzizaBon, setRzizaBon] = useState(null)
  const [clearReceipt, setClearReceipt] = useState(null)
  const [pendingRzizaOrders, setPendingRzizaOrders] = useState(0)

  // Dès que le reçu de vidage est prêt à l'écran, on lance l'impression automatiquement.
  useEffect(() => {
    if (clearReceipt) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [clearReceipt])

  const { order, addToOrder, setItemQuantity, removeItem, clearOrder,
    subtotal, remise, remiseAmount, total, setDiscount } = useCart()

  const refreshStock = useCallback(async () => {
    const [stockData, frigo, rzizaTasks] = await Promise.all([getStock(), getActiveFrigoBatches(), getAtelierTasks('rziza')])
    setStock(stockData)
    setFrigoBatches(frigo)
    setPendingRzizaOrders(rzizaTasks.length)
  }, [])
  useEffect(() => {
    refreshStock()
    peekNextTicketNumber().then(setTicketNumber)
    const unsubscribe = subscribeToStockUpdates(refreshStock)
    return unsubscribe
  }, [refreshStock])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeCategory, searchQuery])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return ALL_PRODUCTS.filter(p =>
      !p.excludeFromCaisse &&
      (p.name.toLowerCase().includes(q) ||
      CATEGORIES.find(c => c.id === p.category)?.label.toLowerCase().includes(q))
    ).slice(0, 12)
  }, [searchQuery])

  // Ouvre le clavier numérique pour saisir/éditer une quantité (au lieu d'ajouter +1 directement)
  const openQuantityModal = (product, initialValue) => {
    setQtyModalState({ open: true, product, initialValue })
  }

  const displayStock = (product) => {
    const virtual = getPlateauAvailableStock(stock, product.id)
    return virtual !== null ? virtual : (stock[product.id] ?? 0)
  }

  const handleProductClick = (product) => {
    const available = displayStock(product)
    if (available <= 0) {
      addNotification(`Rupture de stock : "${product.name}" n'est plus disponible`, 'error')
      return
    }
    // Frigo Entremet : chaque lot est UN gâteau entier et unique (stock max = 1), pas la
    // peine de demander une quantité — on l'ajoute directement au panier avec qty = 1.
    if (product.frigoEntremet) {
      setItemQuantity(product, 1)
      addNotification(`${product.name} ajouté`, 'success')
      return
    }
    const existing = order.find((i) => i.id === product.id)
    openQuantityModal(product, existing ? existing.qty : 1)
  }

  const handleEditOrderQty = (item) => {
    openQuantityModal(item, item.qty)
  }

  const confirmQuantity = (qty) => {
    const product = qtyModalState.product
    setQtyModalState({ open: false, product: null, initialValue: 1 })
    setItemQuantity(product, qty)
    addNotification(`${product.name} : ${formatQty(qty)} ${product.unit === 'kg' ? 'kg' : 'pièce(s)'}`, 'success')
  }

  const cancelQuantity = () => setQtyModalState({ open: false, product: null, initialValue: 1 })

  // Ouvre directement la confirmation de paiement (méthode déjà choisie via le bouton cliqué)
  const openConfirmPayment = (method) => {
    if (order.length === 0) return
    setConfirmPaymentState({ open: true, method })
  }
  const cancelConfirmPayment = () => setConfirmPaymentState({ open: false, method: null })

  const handlePayment = async ({ change }) => {
    const type = confirmPaymentState.method
    setConfirmPaymentState({ open: false, method: null })
    setPaymentType(type)
    setChangeGiven(change || 0)
    setShowReceipt(true)
    const sale = await recordSale(order, type)
    setTicketNumber(sale.ticketNumber)
    refreshStock()
    addNotification(`Paiement ${type === 'cash' ? 'espèces' : 'TPE'} effectué`, 'success')
  }


  const handleNewOrder = async () => {
    clearOrder()
    setShowReceipt(false)
    setPaymentType(null)
    setChangeGiven(0)
    setActiveCategory(null)
    setSearchQuery('')
    setTicketNumber(await peekNextTicketNumber())
    addNotification('Nouvelle commande prête', 'success')
  }

  const handlePrint = () => {
    window.print()
    setTimeout(async () => {
      setShowReceipt(false)
      clearOrder()
      setPaymentType(null)
      setChangeGiven(0)
      setActiveCategory(null)
      setTicketNumber(await peekNextTicketNumber())
      addNotification('Reçu imprimé', 'success')
    }, 500)
  }

  const applyDiscount = () => {
    const val = parseFloat(discountInput)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setDiscount(val)
      addNotification(`Remise de ${val}% appliquée`, 'success')
      setDiscountInput('')
    }
  }

  const handleClearPerishables = async () => {
    if (!window.confirm("Vider le stock invendu de Pain, Viennoiserie (croissants inclus), Salé et Millefeuille ? Cette action remet ces stocks à 0, à la caisse comme chez les préparateurs concernés.")) return
    const result = await clearPerishableStock()
    refreshStock()
    addNotification(`Stock vidé pour ${result.count} produits (valeur: ${result.totalValue.toFixed(2)} DH)`, 'success')
    if (result.entries?.length > 0) setClearReceipt({ ...result, label: 'Vidage du stock (fin de journée)' })
  }

  const handleAddRziza = async (e) => {
    e.preventDefault()
    const qty = parseFloat(rzizaQty)
    if (isNaN(qty) || qty <= 0) {
      addNotification('Quantité invalide', 'error')
      return
    }
    const entry = await addRzizaDelivery({ quantity: qty, prixAchat: parseFloat(rzizaPrixAchat) || 3.5, prixVente: 5.5 })
    setRzizaQty('')
    setShowRzizaForm(false)
    refreshStock()
    setRzizaBon(entry)
    addNotification(`Rziza : +${qty} ajouté au stock de la caisse`, 'success')
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* LEFT: Order Panel */}
      <aside className="w-full lg:w-[360px] bg-[#FFE8D6] text-diana-brownDark flex flex-col relative shrink-0 lg:h-full order-2 lg:order-1">
        <div className="absolute right-0 top-0 bottom-0 w-px perforated-edge hidden lg:block" />
        <div className="p-4 sm:p-6 pb-4">
          <p className="font-fraunces text-xl font-medium text-diana-brownDark mb-1">Commande</p>
          <p className="text-xs text-[#8B6A3A]">Ticket n°{String(ticketNumber).padStart(3, '0')} · {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="flex-1 lg:overflow-y-auto px-4 sm:px-5 pb-4 min-h-0 max-h-[40vh] lg:max-h-none overflow-y-auto">
          <div className="border-t border-dashed border-[#D9A86C] pt-3">
            {order.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 lg:py-16 text-[#B68C6C]">
                <FiShoppingCart size={40} className="mb-3 opacity-40" />
                <p className="text-sm italic">Aucun article sélectionné</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {order.map((item) => (
                  <motion.div key={item.id} layout
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center justify-between py-3 border-b border-[#E7CCB4]">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-semibold text-diana-brownDark truncate">{item.name}</p>
                      <p className="text-xs text-[#8B6A3A]">{item.price.toFixed(2)} DH × {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleEditOrderQty(item)}
                        className="min-w-[44px] px-2.5 h-8 rounded-lg border border-[#C89A5C] bg-transparent text-diana-brownDark text-sm font-semibold flex items-center justify-center hover:bg-[#C89A5C] hover:text-white transition-colors"
                        title="Modifier la quantité">
                        {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''}
                      </button>
                      <button onClick={() => removeItem(item.id)} className="text-diana-danger hover:text-red-700 transition-colors" aria-label="Retirer">
                        <FiX size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
        <div className="p-5 pt-4 border-t border-dashed border-[#D9A86C] bg-[#FFE8D6]">
          <div className="flex items-center gap-2 mb-3">
            <NumericField value={discountInput} onChange={setDiscountInput} placeholder="Remise %"
              title="Remise %" unit="%" allowDecimal={false}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E7CCB4] rounded-lg text-diana-brownDark text-left focus:outline-none focus:border-[#C89A5C]" />
            <button onClick={applyDiscount}
              className="px-3 py-1.5 text-xs bg-[#C89A5C]/15 text-[#8B6A3A] border border-[#C89A5C]/40 rounded-lg hover:bg-[#C89A5C]/25 transition-colors">
              Appliquer
            </button>
          </div>
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs text-diana-brownDark"><span>Sous-total</span><span>{subtotal.toFixed(2)} DH</span></div>
            {remise > 0 && <div className="flex justify-between text-xs text-diana-danger"><span>Remise ({remise}%)</span><span>-{remiseAmount.toFixed(2)} DH</span></div>}
            <div className="flex justify-between items-baseline pt-2 border-t border-[#E7CCB4]">
              <span className="font-fraunces text-sm text-diana-brownDark">Total</span>
              <span className="font-fraunces text-3xl font-semibold text-diana-brownDark">{total.toFixed(2)} <span className="text-base font-normal">DH</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => openConfirmPayment('card')} disabled={order.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-diana-brownDark text-white py-3.5 rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              <FiCreditCard size={16} /> Paiement par carte (TPE)
            </button>
            <button onClick={() => openConfirmPayment('cash')} disabled={order.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-[#C89A5C] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#B88443] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              <FiDollarSign size={16} /> Paiement en espèces
            </button>
          </div>
        </div>
      </aside>

      {/* CENTER: Products */}
      <main ref={mainRef} className="flex-1 p-4 sm:p-8 overflow-y-auto lg:h-full order-1 lg:order-2">
        <div className="mb-4 flex justify-end gap-2">
          <button onClick={() => setShowRzizaForm(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-card border border-diana-border text-diana-brown text-xs font-medium hover:border-diana-gold/40 hover:text-diana-gold transition-colors">
            <FiPackage size={14} /> Achat Rziza
          </button>
          <button onClick={() => navigate('/commande-rziza')}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-card border border-diana-border text-diana-brown text-xs font-medium hover:border-diana-gold/40 hover:text-diana-gold transition-colors">
            <FiClipboardList size={14} /> Commande Rziza
            {pendingRzizaOrders > 0 && (
              <span className="ml-0.5 bg-diana-accent/20 text-diana-accentLight text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingRzizaOrders}</span>
            )}
          </button>
          {isAdmin && (
            <button onClick={handleClearPerishables}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-card border border-diana-border text-diana-brown text-xs font-medium hover:border-diana-danger/40 hover:text-diana-danger transition-colors">
              <FiSunset size={14} /> Vider stock du soir (Pain, Viennoiserie, Salé, Millefeuille)
            </button>
          )}
        </div>
        <div className="mb-6">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={18} />
            <KeyboardField placeholder="Rechercher un produit..." value={searchQuery} onChange={setSearchQuery}
              subtitle="Recherche produit"
              className="w-full pl-12 pr-4 py-3 bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors" />
          </div>
        </div>
        <AnimatePresence mode="wait">
          {searchQuery.trim() ? (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-2">Résultats de recherche</p>
              <h2 className="font-fraunces text-2xl font-medium mb-6 text-diana-cream">"{searchQuery}"</h2>
              {filteredProducts.length === 0 ? (
                <p className="text-diana-brownLight italic">Aucun produit trouvé</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-4">
                  {filteredProducts.map((prod) => <ProductCard key={prod.id} product={prod} stock={displayStock(prod)} onAdd={handleProductClick} />)}
                </div>
              )}
            </motion.div>
          ) : !activeCategory ? (
            <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-2">Notre carte</p>
              <h2 className="font-fraunces text-3xl font-medium mb-8 text-diana-cream">Choisissez une catégorie</h2>
              <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 sm:gap-5">
                {CATEGORIES.map((cat, index) => (
                  <motion.button key={cat.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                    onClick={() => setActiveCategory(cat.id)}
                    className="cat-card bg-diana-card border border-diana-border rounded-2xl overflow-hidden text-left cursor-pointer text-diana-cream hover:border-diana-gold/30">
                    {cat.image && (
                      <div className="w-full h-28 sm:h-32 overflow-hidden bg-diana-darker">
                        <img src={cat.image} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-4 sm:p-5">
                      <p className="font-fraunces text-base sm:text-lg font-medium mb-1">{cat.label}</p>
                      <p className="text-xs text-diana-brown">
                        {cat.id === 'frigo_entremet'
                          ? frigoBatches.length
                          : (PRODUCTS[cat.id]?.length || 0)} produits
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key={activeCategory} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <button onClick={() => setActiveCategory(null)}
                className="flex items-center gap-2 text-diana-gold text-sm mb-6 hover:text-diana-goldLight transition-colors">
                <FiArrowLeft size={16} /> Retour à la carte
              </button>
              <h2 className="font-fraunces text-2xl font-medium mb-6 text-diana-cream">
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 sm:gap-4">
                {(activeCategory === 'frigo_entremet'
                  ? frigoBatches.map((b) => ({ ...b, frigoEntremet: true }))
                  : PRODUCTS[activeCategory]?.filter((p) => !p.excludeFromCaisse)
                )?.map((prod) => <ProductCard key={prod.id} product={{ ...prod, category: prod.category || activeCategory }} stock={displayStock({ ...prod, category: prod.category || activeCategory })} onAdd={handleProductClick} />)}
                {activeCategory === 'frigo_entremet' && frigoBatches.length === 0 && (
                  <p className="col-span-full text-sm italic text-diana-brown text-center py-10">
                    Aucun gâteau au kg produit pour l'instant — il apparaîtra ici dès que le préparateur l'aura ajouté.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* QUANTITY MODAL */}
      <QuantityModal open={qtyModalState.open} product={qtyModalState.product} initialValue={qtyModalState.initialValue}
        onConfirm={confirmQuantity} onCancel={cancelQuantity} />



      {/* CONFIRMATION DE PAIEMENT (Montant reçu / Monnaie à rendre) */}
      <ConfirmPaymentModal open={confirmPaymentState.open} method={confirmPaymentState.method}
        amountDue={total} onConfirm={handlePayment} onCancel={cancelConfirmPayment} />

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-diana-cream text-diana-dark rounded-2xl p-8 max-w-sm w-full mx-4 shadow-gold-lg">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><span className="text-2xl">✓</span></div>
                <h3 className="font-fraunces text-xl font-medium">Paiement réussi !</h3>
                <p className="text-sm text-diana-brown mt-1">{paymentType === 'cash' ? 'Paiement en espèces' : 'Paiement par carte'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 mb-6 text-xs border border-diana-creamDark">
                <div className="text-center border-b border-dashed border-diana-creamDark pb-3 mb-3">
                  <p className="font-fraunces text-sm font-medium">Pâtisserie Dianna</p>
                  <p className="text-diana-brown">{new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</p>
                  <p className="text-diana-brown">Ticket n°{String(ticketNumber).padStart(3, '0')}</p>
                </div>
                {order.map((item) => (
                  <div key={item.id} className="flex justify-between py-1">
                    <span>{item.name} × {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''}</span>
                    <span>{(item.price * item.qty).toFixed(2)} DH</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-diana-creamDark pt-2 mt-2">
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{total.toFixed(2)} DH</span></div>
                  {paymentType === 'cash' && changeGiven > 0 && (
                    <div className="flex justify-between text-emerald-700 mt-1"><span>Monnaie rendue</span><span>{changeGiven.toFixed(2)} DH</span></div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={handlePrint}
                  className="flex items-center justify-center gap-2 bg-diana-dark text-diana-cream py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiPrinter size={16} /> Imprimer le reçu
                </button>
                <button onClick={handleNewOrder}
                  className="flex items-center justify-center gap-2 bg-diana-gold text-diana-dark py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiShoppingCart size={16} /> Nouvelle commande
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ACHAT RZIZA — accessible à tous, sans code, ajoute directement au stock caisse */}
      <AnimatePresence>
        {showRzizaForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowRzizaForm(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#FFF6EC] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#E7CCB4]" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-fraunces text-lg font-bold text-center text-[#3A2A18] mb-1">Achat Rziza</h3>
              <p className="text-xs text-center text-[#8B6A3A] mb-4">Ajouté directement au stock de la caisse · Vente 5.50 DH</p>
              <form onSubmit={handleAddRziza} className="space-y-3">
                <div>
                  <label className="text-xs text-[#5C4326] mb-1 block">Quantité livrée</label>
                  <NumericField value={rzizaQty} onChange={setRzizaQty} title="Quantité livrée" unit="pièce(s)" autoFocus
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#D9A86C] rounded-lg text-[#3A2A18] text-left focus:outline-none focus:border-[#C89A5C]" />
                </div>
                <div>
                  <label className="text-xs text-[#5C4326] mb-1 block">Prix d'achat / unité (DH)</label>
                  <NumericField value={rzizaPrixAchat} onChange={setRzizaPrixAchat} title="Prix d'achat / unité" unit="DH"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#D9A86C] rounded-lg text-[#3A2A18] text-left focus:outline-none focus:border-[#C89A5C]" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button type="submit" className="py-3 rounded-xl bg-[#8B5A2B] text-white font-bold hover:brightness-110 transition-all active:scale-[0.98]">
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => setShowRzizaForm(false)}
                    className="py-3 rounded-xl bg-white text-[#8B5A2B] font-bold border-2 border-[#8B5A2B]/50 hover:bg-[#8B5A2B]/10 transition-all">
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BON RZIZA — reçu "Non payé" */}
      <AnimatePresence>
        {rzizaBon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={() => setRzizaBon(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-diana-cream text-diana-dark rounded-2xl p-6 max-w-xs w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl p-4 mb-5 text-xs border border-diana-creamDark">
                <div className="text-center border-b border-dashed border-diana-creamDark pb-3 mb-3">
                  <p className="font-fraunces text-sm font-medium">Pâtisserie Dianna</p>
                  <p className="text-diana-brown">Bon de livraison — Rziza</p>
                  <p className="text-diana-brown">{new Date(rzizaBon.timestamp).toLocaleDateString('fr-FR')} à {new Date(rzizaBon.timestamp).toLocaleTimeString('fr-FR')}</p>
                </div>
                <div className="flex justify-between py-1"><span>Quantité livrée</span><span>{rzizaBon.quantity}</span></div>
                <div className="flex justify-between py-1"><span>Prix d'achat / unité</span><span>{rzizaBon.prixAchat.toFixed(2)} DH</span></div>
                <div className="border-t border-dashed border-diana-creamDark pt-2 mt-2">
                  <div className="flex justify-between font-semibold"><span>Montant dû</span><span>{rzizaBon.montantDu.toFixed(2)} DH</span></div>
                  <div className="flex justify-between text-diana-accentLight font-semibold mt-1"><span>Statut</span><span>NON PAYÉ</span></div>
                </div>
                <p className="text-diana-brown italic mt-3 text-center">Réglé personnellement — sans lien avec la caisse</p>
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

      {/* Reçu imprimable du vidage de stock — s'affiche et s'imprime automatiquement */}
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

function ProductCard({ product, stock = 0, onAdd }) {
  const isOut = stock <= 0
  return (
    <motion.button layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: isOut ? 0 : -3 }} whileTap={{ scale: isOut ? 1 : 0.97 }}
      onClick={() => onAdd(product)}
      className={`prod-card bg-diana-card border rounded-xl p-3 sm:p-5 text-left cursor-pointer relative
        ${isOut ? 'border-diana-border/40 opacity-50' : 'border-diana-border text-diana-cream hover:border-diana-gold/50'}`}>
      {isOut && (
        <span className="absolute top-2 right-2 z-10 text-[9px] font-bold uppercase tracking-wide bg-diana-danger text-white px-2 py-1 rounded-full">
          Rupture
        </span>
      )}
      {product.image && (
        <div className="w-full h-20 sm:h-28 mb-2 sm:mb-3 rounded-lg overflow-hidden bg-diana-dark">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
        </div>
      )}
      <p className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 leading-snug line-clamp-2">{product.name}</p>
      <p className="font-fraunces text-base sm:text-lg text-diana-gold mb-1">
        {product.price > 0 ? `${product.price.toFixed(2)} DH` : 'Prix sur devis'}{product.unit === 'kg' ? ' / kg' : ''}
      </p>
      <p className={`text-[10px] sm:text-xs font-medium ${isOut ? 'text-diana-danger' : 'text-diana-brown'}`}>Stock: {stock}</p>
    </motion.button>
  )
}
