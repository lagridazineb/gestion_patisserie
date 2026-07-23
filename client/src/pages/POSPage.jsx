import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { CATEGORIES_POS as CATEGORIES, mergeProductOverlay, mergeProductsByCategory, findCategory } from '../data/products'
import { getProductOverlay } from '../api/products'
import { getStock, recordSale, subscribeToStockUpdates, peekNextTicketNumber, clearPerishableStock, addRzizaDelivery, getPlateauAvailableStock, getActiveFrigoBatches, getAtelierTasks, addStockToProducts, resetAllStock } from '../data/stockStore'
import QuantityModal from '../components/QuantityModal'
import ReceiptHeader from '../components/ReceiptHeader'
import CodeConfirmModal from '../components/CodeConfirmModal'
import NumericField from '../components/NumericField'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import { useLanguage } from '../context/LanguageContext'
import { getProductDisplayName, getCategoryLabel } from '../i18n/productNames'
import { viderCaisse } from '../data/sessionsStore'
import { FiSearch, FiShoppingCart, FiPrinter, FiX, FiArrowLeft, FiCreditCard, FiDollarSign, FiSunset, FiPackage, FiPlus, FiTrash2, FiClipboard as FiClipboardList } from 'react-icons/fi'

function formatQty(qty) {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function clearReceiptCategoryLabel(catId, lang) {
  const cat = findCategory(catId)
  return cat ? getCategoryLabel(cat, lang) : catId
}

export default function POSPage() {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const [activeCategory, setActiveCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const mainRef = useRef(null)
  const [confirmPaymentState, setConfirmPaymentState] = useState({ open: false, method: null })
  const [paymentType, setPaymentType] = useState(null)
  const [changeGiven, setChangeGiven] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [stock, setStock] = useState({})
  const [qtyModalState, setQtyModalState] = useState({ open: false, product: null, initialValue: 1, mode: 'add' })
  const [ticketNumber, setTicketNumber] = useState(0)
  const [frigoBatches, setFrigoBatches] = useState([])
  const { addNotification } = useNotification()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isCaissierOrAdmin = user?.role === 'admin' || user?.role === 'caissier'
  const [showViderCode, setShowViderCode] = useState(false)
  const [viderReceipt, setViderReceipt] = useState(null)
  const [showRzizaForm, setShowRzizaForm] = useState(false)
  const [rzizaQty, setRzizaQty] = useState('')
  const [rzizaPrixAchat, setRzizaPrixAchat] = useState('3.5')
  const [rzizaBon, setRzizaBon] = useState(null)
  const [clearReceipt, setClearReceipt] = useState(null)
  const [pendingRzizaOrders, setPendingRzizaOrders] = useState(0)
  const [productOverlay, setProductOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })

  // Recharge la surcouche (produits ajoutés/modifiés/masqués depuis la page Produits) au
  // chargement, puis régulièrement — pour voir sans recharger un produit ajouté par l'admin
  // depuis un autre appareil.
  useEffect(() => {
    const refreshOverlay = () => { getProductOverlay().then(setProductOverlay).catch(() => {}) }
    refreshOverlay()
    const unsubscribe = subscribeToStockUpdates(refreshOverlay, 15000)
    return unsubscribe
  }, [])
  // Catalogue réellement à jour = catalogue de base + surcouche serveur. Ombrage volontaire des
  // noms PRODUCTS / ALL_PRODUCTS pour que tout le reste du fichier continue à fonctionner tel quel.
  const ALL_PRODUCTS = useMemo(() => mergeProductOverlay(productOverlay), [productOverlay])
  const PRODUCTS = useMemo(() => mergeProductsByCategory(productOverlay), [productOverlay])

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
      getProductDisplayName(p, lang).toLowerCase().includes(q) ||
      CATEGORIES.find(c => c.id === p.category)?.label.toLowerCase().includes(q))
    ).slice(0, 12)
  }, [searchQuery, lang])

  // Ouvre le clavier numérique pour saisir une quantité. `mode: 'add'` (depuis un clic sur un
  // produit) additionne la quantité saisie à celle déjà présente dans la commande ; `mode: 'edit'`
  // (depuis le crayon dans le récap de commande) remplace la quantité de la ligne existante.
  const openQuantityModal = (product, initialValue, mode = 'add') => {
    setQtyModalState({ open: true, product, initialValue, mode })
  }

  const displayStock = (product) => {
    const virtual = getPlateauAvailableStock(stock, product.id)
    return virtual !== null ? virtual : (stock[product.id] ?? 0)
  }

  const handleProductClick = (product) => {
    const available = displayStock(product)
    if (available <= 0) {
      addNotification(lang === 'ar' ? `نفذ المخزون: "${getProductDisplayName(product, lang)}" غير متوفر حالياً` : `Rupture de stock : "${product.name}" n'est plus disponible`, 'error')
      return
    }
    // Frigo Entremet : chaque lot est UN gâteau entier et unique (stock max = 1), pas la
    // peine de demander une quantité — on l'ajoute directement au panier avec qty = 1.
    if (product.frigoEntremet) {
      setItemQuantity(product, 1)
      addNotification(lang === 'ar' ? `تمت إضافة ${getProductDisplayName(product, lang)}` : `${product.name} ajouté`, 'success')
      return
    }
    const existing = order.find((i) => i.id === product.id)
    openQuantityModal(product, existing ? existing.qty : 1, 'add')
  }

  const handleEditOrderQty = (item) => {
    openQuantityModal(item, item.qty, 'edit')
  }

  const confirmQuantity = (qty) => {
    const product = qtyModalState.product
    const mode = qtyModalState.mode
    setQtyModalState({ open: false, product: null, initialValue: 1, mode: 'add' })
    if (mode === 'edit') {
      // Édition d'une ligne déjà dans la commande : la quantité saisie remplace l'ancienne.
      setItemQuantity(product, qty)
    } else {
      // Nouvel ajout depuis le catalogue : la quantité saisie s'ajoute à ce qui est déjà commandé
      // (au lieu d'écraser la ligne existante).
      addToOrder(product, qty)
    }
    const existing = order.find((i) => i.id === product.id)
    const newTotalQty = mode === 'edit' ? qty : (existing ? existing.qty + qty : qty)
    addNotification(`${getProductDisplayName(product, lang)} : ${formatQty(newTotalQty)} ${product.unit === 'kg' ? (lang === 'ar' ? 'كغ' : 'kg') : (lang === 'ar' ? 'قطعة' : 'pièce(s)')}`, 'success')
  }

  const cancelQuantity = () => setQtyModalState({ open: false, product: null, initialValue: 1, mode: 'add' })

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
    if (result.entries?.length > 0 || result.carryover?.length > 0 || result.productionSummary?.length > 0) {
      setClearReceipt({ ...result, label: 'Fin de journée' })
    }
  }

  // Bouton "Stock" (admin) : ajoute +1000 pièces d'un coup au stock de TOUS les produits de
  // TOUTES les catégories (utile pour réapprovisionner rapidement, ex : "Entremet Dh").
  const handleBulkAddStock = async () => {
    if (!window.confirm('Ajouter 1000 pièces au stock de tous les produits, dans toutes les catégories ?')) return
    const productIds = ALL_PRODUCTS.map((p) => p.id).filter(Boolean)
    await addStockToProducts(productIds, 1000)
    refreshStock()
    addNotification(`Stock rechargé : +1000 sur ${productIds.length} produits`, 'success')
  }

  // Bouton "Rupture" (admin) : remet TOUT le stock (toutes catégories) à 0 d'un coup.
  // Génère aussi un reçu récapitulatif de ce qui a été vidé (comme la clôture du soir).
  const handleResetAllStock = async () => {
    if (!window.confirm("Remettre TOUT le stock (toutes les catégories) à 0 (rupture) ? Cette action est irréversible.")) return
    const result = await resetAllStock()
    refreshStock()
    addNotification(`Stock remis à 0 pour ${result.count} produits — valeur ${result.totalValue.toFixed(2)} DH`, 'success')
    if (result.entries?.length > 0) setClearReceipt({ ...result, label: 'Remise à zéro complète du stock (rupture)' })
  }

  // "Vider la caisse" : après vérification du code, récupère le détail complet (ventes +
  // commandes de la session en cours) pour afficher/imprimer le reçu de clôture.
  const handleViderCaisse = async (password) => {
    const result = await viderCaisse(password) // lève une erreur si le code est incorrect
    setShowViderCode(false)
    setViderReceipt(result)
  }

  // Impression du reçu de clôture + déconnexion automatique juste après (le caissier ne peut
  // plus se déconnecter autrement que via "Vider la caisse" — voir Layout.jsx).
  const handlePrintViderCaisseAndLogout = () => {
    window.print()
    setViderReceipt(null)
    if (user?.role === 'caissier') {
      logout()
      navigate('/login')
    }
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
                      <p className="text-sm font-semibold text-diana-brownDark truncate">{getProductDisplayName(item, lang)}</p>
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
          {isCaissierOrAdmin && (
            <button onClick={() => setShowViderCode(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-card border border-diana-border text-diana-brown text-xs font-medium hover:border-diana-accent/40 hover:text-diana-accent transition-colors">
              <FiDollarSign size={14} /> Vider la caisse
            </button>
          )}
          {isAdmin && (
            <button onClick={handleBulkAddStock}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-card border border-diana-border text-diana-brown text-xs font-medium hover:border-diana-gold/40 hover:text-diana-gold transition-colors">
              <FiPlus size={14} /> Stock (+1000 partout)
            </button>
          )}
          {isCaissierOrAdmin && (
            <button onClick={handleClearPerishables}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-card border border-diana-border text-diana-brown text-xs font-medium hover:border-diana-danger/40 hover:text-diana-danger transition-colors">
              <FiSunset size={14} /> Fin de journée (Pain, Viennoiserie, Salé, Millefeuille)
            </button>
          )}
          {isAdmin && (
            <button onClick={handleResetAllStock}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-diana-danger/10 border border-diana-danger/30 text-diana-danger text-xs font-semibold hover:bg-diana-danger/20 transition-colors">
              <FiTrash2 size={14} /> Tout en rupture (0 partout)
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          {searchQuery.trim() ? (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-2">Résultats de recherche</p>
              <h2 className="font-fraunces text-2xl font-medium mb-6 text-diana-cream">"{searchQuery}"</h2>
              {filteredProducts.length === 0 ? (
                <p className="text-diana-brownLight italic">Aucun produit trouvé</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 sm:gap-3">
                  {filteredProducts.map((prod) => <ProductCard key={prod.id} product={prod} stock={displayStock(prod)} onAdd={handleProductClick} />)}
                </div>
              )}
            </motion.div>
          ) : !activeCategory ? (
            <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-2">Notre carte</p>
              <h2 className="font-fraunces text-3xl font-medium mb-8 text-diana-cream">{lang === 'ar' ? 'اختر فئة' : 'Choisissez une catégorie'}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 sm:gap-3">
                {CATEGORIES.map((cat, index) => (
                  <motion.button key={cat.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                    onClick={() => setActiveCategory(cat.id)}
                    className="cat-card bg-diana-card border border-diana-border rounded-2xl overflow-hidden text-left cursor-pointer text-diana-cream hover:border-diana-gold/30">
                    {cat.image && (
                      <div className="w-full h-16 sm:h-20 overflow-hidden bg-diana-darker">
                        <img src={cat.image} alt={getCategoryLabel(cat, lang)} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-2.5 sm:p-3">
                      <p className="font-fraunces text-xs sm:text-sm font-medium mb-0.5 leading-tight">{getCategoryLabel(cat, lang)}</p>
                      <p className="text-[10px] text-diana-brown">
                        {cat.id === 'frigo_entremet'
                          ? frigoBatches.length
                          : (PRODUCTS[cat.id]?.length || 0)} {lang === 'ar' ? 'منتج' : 'produits'}
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
                <FiArrowLeft size={16} /> {lang === 'ar' ? 'الرجوع إلى القائمة' : 'Retour à la carte'}
              </button>
              <h2 className="font-fraunces text-2xl font-medium mb-6 text-diana-cream">
                {getCategoryLabel(CATEGORIES.find((c) => c.id === activeCategory), lang)}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 sm:gap-3">
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
      <QuantityModal open={qtyModalState.open} product={qtyModalState.product} initialValue={qtyModalState.initialValue} mode={qtyModalState.mode}
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
              <div className="receipt-print bg-white rounded-xl p-4 mb-6 text-xs border border-black text-black">
                <ReceiptHeader>
                  <div className="flex justify-between items-baseline mt-2 text-[10.5px] text-black">
                    <span>{new Date().toLocaleDateString('fr-FR')} — {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-semibold text-black">Ticket n°{String(ticketNumber).padStart(3, '0')}</span>
                  </div>
                </ReceiptHeader>
                <div className="space-y-2 mb-1">
                  {order.map((item) => (
                    <div key={item.id} className="receipt-line flex items-baseline justify-between gap-3">
                      <span className="name text-black font-medium">
                        {getProductDisplayName(item, lang)}
                        <span className="text-black font-normal"> × {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''}</span>
                      </span>
                      <span className="value shrink-0 font-semibold text-black">{(item.price * item.qty).toFixed(2)} DH</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-black pt-2 mt-2 space-y-1">
                  {remise > 0 && (
                    <>
                      <div className="flex justify-between text-black"><span>Sous-total</span><span>{subtotal.toFixed(2)} DH</span></div>
                      <div className="flex justify-between text-black"><span>Remise ({remise}%)</span><span>-{remiseAmount.toFixed(2)} DH</span></div>
                    </>
                  )}
                </div>
                <div className="border-t border-black pt-2 mt-2">
                  <div className="total flex justify-between items-baseline font-bold text-sm text-black"><span>TOTAL</span><span>{total.toFixed(2)} DH</span></div>
                </div>
                <div className="border-t border-dashed border-black pt-2 mt-2 space-y-1 text-black">
                  <div className="flex justify-between"><span>Règlement</span><span>{paymentType === 'cash' ? 'Espèces' : 'Carte'}</span></div>
                  {paymentType === 'cash' && changeGiven > 0 && (
                    <div className="flex justify-between"><span>Monnaie rendue</span><span>{changeGiven.toFixed(2)} DH</span></div>
                  )}
                </div>
                <p className="footer text-center text-black text-[11px] italic mt-3">Merci de votre visite !</p>
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

      {/* Reçu imprimable du vidage de stock — s'affiche et s'imprime automatiquement */}
      <AnimatePresence>
        {clearReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 print:bg-white" onClick={() => setClearReceipt(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-diana-cream text-diana-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="receipt-print bg-white rounded-xl p-4 mb-5 text-xs border border-black text-black">
                <ReceiptHeader subtitle={clearReceipt.label}>
                  <p className="text-black text-[10.5px] mt-1.5">{new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
                </ReceiptHeader>

                {clearReceipt.productionSummary?.length > 0 && (
                  <div className="mb-3">
                    <p className="font-bold text-black border-b border-dashed border-black pb-1 mb-1.5">Production du jour</p>
                    {clearReceipt.productionSummary.map((p) => (
                      <div key={p.category} className="receipt-line flex justify-between py-0.5">
                        <span className="name pr-2">{clearReceiptCategoryLabel(p.category, lang)} × {formatQty(p.qty)}</span>
                        <span className="value shrink-0 font-semibold">{p.value.toFixed(2)} DH</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="font-bold text-black border-b border-dashed border-black pb-1 mb-1.5">Vidé ce soir (invendu)</p>
                <div className="space-y-1.5 mb-2">
                  {clearReceipt.entries.length === 0 && (
                    <p className="italic text-black text-center py-1">Rien à vider</p>
                  )}
                  {clearReceipt.entries.map((e) => (
                    <div key={e.productId} className="receipt-line flex justify-between py-0.5">
                      <span className="name pr-2">{getProductDisplayName(e, lang)} × {e.qty}</span>
                      <span className="value shrink-0 font-semibold">{e.value.toFixed(2)} DH</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-black pt-2 mt-2">
                  <div className="flex justify-between py-0.5"><span>Quantité totale</span><span>{clearReceipt.totalQuantity}</span></div>
                  <div className="total flex justify-between font-semibold"><span>Valeur totale (perte)</span><span>{clearReceipt.totalValue.toFixed(2)} DH</span></div>
                </div>

                {clearReceipt.carryover?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-black">
                    <p className="font-bold text-black pb-1 mb-1.5">Retour — vendable un autre jour</p>
                    {clearReceipt.carryover.map((e) => (
                      <div key={e.productId} className="receipt-line flex justify-between py-0.5">
                        <span className="name pr-2">{getProductDisplayName(e, lang)} × {formatQty(e.qty)}</span>
                        <span className="value shrink-0 font-semibold">{e.value.toFixed(2)} DH</span>
                      </div>
                    ))}
                    <div className="total flex justify-between font-semibold mt-1.5 pt-1.5 border-t border-dashed border-black">
                      <span>Valeur totale du retour</span>
                      <span>{clearReceipt.carryover.reduce((s, e) => s + e.value, 0).toFixed(2)} DH</span>
                    </div>
                  </div>
                )}
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

      {/* Code de confirmation avant de vider la caisse */}
      <CodeConfirmModal
        open={showViderCode}
        title="Vider la caisse"
        description="Entrez votre code pour clôturer la caisse et générer le reçu de toutes les transactions de la session."
        confirmLabel="Vider la caisse"
        onConfirm={handleViderCaisse}
        onCancel={() => setShowViderCode(false)}
      />

      {/* Reçu de clôture de caisse — détail complet des ventes et commandes de la session */}
      <AnimatePresence>
        {viderReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 print:bg-white" onClick={() => setViderReceipt(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-diana-cream text-diana-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="receipt-print bg-white rounded-xl p-4 mb-5 text-xs border border-black text-black">
                <ReceiptHeader subtitle="Clôture de caisse">
                  <p className="text-black text-[11px] font-semibold mt-1.5">{viderReceipt.closedSession.userName}</p>
                  <p className="text-black text-[10.5px] mt-1">Entrée : {new Date(viderReceipt.closedSession.openedAt).toLocaleString('fr-FR')}</p>
                  <p className="text-black text-[10.5px]">Sortie : {new Date(viderReceipt.closedSession.closedAt).toLocaleString('fr-FR')}</p>
                  <p className="text-black text-[10.5px]">Dépôt initial : {viderReceipt.closedSession.openingAmount.toFixed(2)} DH</p>
                </ReceiptHeader>

                {viderReceipt.sales.length > 0 && (
                  <div className="mb-3">
                    <p className="font-bold text-black border-b border-dashed border-black pb-1 mb-1.5">Ventes ({viderReceipt.sales.length})</p>
                    {viderReceipt.sales.map((sale) => (
                      <div key={sale.id} className="mb-2">
                        <div className="flex justify-between text-[10.5px] text-black font-semibold">
                          <span>Ticket n°{String(sale.ticketNumber).padStart(3, '0')}</span>
                          <span>{new Date(sale.createdAt).toLocaleTimeString('fr-FR')}</span>
                        </div>
                        {sale.items.map((it, idx) => (
                          <div key={idx} className="receipt-line flex justify-between pl-2">
                            <span className="name">{it.name} × {formatQty(it.qty)}</span>
                            <span className="value">{(it.price * it.qty).toFixed(2)} DH</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-semibold pl-2 pt-0.5"><span>Total ticket</span><span>{sale.total.toFixed(2)} DH</span></div>
                      </div>
                    ))}
                  </div>
                )}

                {viderReceipt.reservations.length > 0 && (
                  <div className="mb-3">
                    <p className="font-bold text-black border-b border-dashed border-black pb-1 mb-1.5">Commandes ({viderReceipt.reservations.length})</p>
                    {viderReceipt.reservations.map((r) => (
                      <div key={r.id} className="mb-2">
                        <div className="flex justify-between text-[10.5px] text-black font-semibold">
                          <span>{r.clientName}</span>
                          <span>{new Date(r.createdAt).toLocaleTimeString('fr-FR')}</span>
                        </div>
                        {r.items.map((it, idx) => (
                          <div key={idx} className="receipt-line flex justify-between pl-2">
                            <span className="name">{it.name} × {formatQty(it.qty)}</span>
                            <span className="value">{(it.price * it.qty).toFixed(2)} DH</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-semibold pl-2 pt-0.5"><span>Total commande</span><span>{r.total.toFixed(2)} DH</span></div>
                      </div>
                    ))}
                  </div>
                )}

                {viderReceipt.sales.length === 0 && viderReceipt.reservations.length === 0 && (
                  <p className="text-center italic text-black mb-2">Aucune transaction sur cette session.</p>
                )}

                <div className="border-t border-dashed border-black pt-2 mt-2">
                  <div className="flex justify-between"><span>Total ventes</span><span>{viderReceipt.closedSession.closingSalesTotal.toFixed(2)} DH</span></div>
                  <div className="flex justify-between"><span>Total commandes</span><span>{viderReceipt.closedSession.closingCommandesTotal.toFixed(2)} DH</span></div>
                  <div className="total flex justify-between font-bold text-sm mt-1.5">
                    <span>TOTAL GÉNÉRAL</span>
                    <span>{(viderReceipt.closedSession.closingSalesTotal + viderReceipt.closedSession.closingCommandesTotal).toFixed(2)} DH</span>
                  </div>
                </div>
                <p className="footer text-center text-black italic mt-3">Caisse vidée avec succès</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={handlePrintViderCaisseAndLogout}
                  className="flex-1 flex items-center justify-center gap-2 bg-diana-dark text-diana-cream py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiPrinter size={15} /> Imprimer{user?.role === 'caissier' ? ' et me déconnecter' : ''}
                </button>
                {user?.role !== 'caissier' && (
                  <button onClick={() => setViderReceipt(null)}
                    className="flex-1 bg-white text-diana-brown border border-diana-border py-2.5 rounded-xl text-sm font-semibold">
                    Fermer
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProductCard({ product, stock = 0, onAdd }) {
  const { lang } = useLanguage()
  const isOut = stock <= 0
  const displayName = getProductDisplayName(product, lang)
  return (
    <motion.button layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: isOut ? 0 : -3 }} whileTap={{ scale: isOut ? 1 : 0.97 }}
      onClick={() => onAdd(product)}
      className={`prod-card bg-diana-card border rounded-xl p-2 sm:p-2.5 text-left cursor-pointer relative
        ${isOut ? 'border-diana-border/40 opacity-50' : 'border-diana-border text-diana-cream hover:border-diana-gold/50'}`}>
      {isOut && (
        <span className="absolute top-1.5 right-1.5 z-10 text-[8px] font-bold uppercase tracking-wide bg-diana-danger text-white px-1.5 py-0.5 rounded-full">
          {lang === 'ar' ? 'نفذ' : 'Rupture'}
        </span>
      )}
      {product.image && (
        <div className="w-full h-14 sm:h-20 mb-1.5 sm:mb-2 rounded-lg overflow-hidden bg-diana-dark">
          <img src={product.image} alt={displayName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
        </div>
      )}
      <p className="text-[11px] sm:text-xs font-semibold mb-1 leading-snug line-clamp-2">{displayName}</p>
      <p className="font-fraunces text-sm sm:text-base text-diana-gold mb-0.5">
        {product.price > 0 ? `${product.price.toFixed(2)} DH` : (lang === 'ar' ? 'الثمن حسب الطلب' : 'Prix sur devis')}{product.unit === 'kg' ? ' / kg' : ''}
      </p>
      <p className={`text-[9px] sm:text-[10px] font-medium ${isOut ? 'text-diana-danger' : 'text-diana-brown'}`}>{lang === 'ar' ? 'المخزون' : 'Stock'}: {stock}</p>
    </motion.button>
  )
}
