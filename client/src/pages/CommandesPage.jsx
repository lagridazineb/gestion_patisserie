import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { CATEGORIES_COMMANDE as CATEGORIES, findCategory, CUSTOMIZABLE_CATEGORIES, SALE_PLATEAU_COMPOSITIONS, SALE_PLATEAU_COMPONENTS, getLayerVariants, mergeProductsByCategory, ATELIER_CATEGORY_GROUPS, ATELIERS } from '../data/products'
import { getProductOverlay } from '../api/products'
import {
  getStock, subscribeToStockUpdates, getReservations, addReservation,
  isReservationFullyReady,
} from '../data/stockStore'
import NumericField from '../components/NumericField'
import ReceiptHeader from '../components/ReceiptHeader'
import QuantityModal from '../components/QuantityModal'
import CakeCustomizationModal from '../components/CakeCustomizationModal'
import MoroccanCakeModal from '../components/MoroccanCakeModal'
import SalePlateauModal from '../components/SalePlateauModal'
import LayerModal from '../components/LayerModal'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import KeyboardField from '../components/KeyboardField'
import KeyboardTextarea from '../components/KeyboardTextarea'
import { useLanguage } from '../context/LanguageContext'
import { getProductDisplayName, getCategoryLabel } from '../i18n/productNames'
import {
  FiTruck, FiUser, FiPhone, FiCalendar, FiClock, FiFileText,
  FiArrowLeft, FiCreditCard, FiDollarSign, FiLogOut, FiLogIn, FiX, FiAlertCircle, FiPrinter
} from 'react-icons/fi'

function formatQty(qty) {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// Résout l'atelier (préparateur) responsable d'une catégorie de produit. Certains ateliers
// regroupent plusieurs catégories (ex: "patisserie" gère aussi entremet + gateaux_kg) — on
// s'appuie sur ATELIER_CATEGORY_GROUPS pour rester cohérent avec ce que voit le préparateur.
function getAtelierIdForCategory(category) {
  for (const [atelierId, cats] of Object.entries(ATELIER_CATEGORY_GROUPS)) {
    if (cats.includes(category)) return atelierId
  }
  return category
}

// Regroupe les articles d'une commande par atelier, dans l'ordre où ils apparaissent.
function groupItemsByAtelier(items) {
  const groups = {}
  const order = []
  items.forEach((item) => {
    const atelierId = getAtelierIdForCategory(item.category)
    if (!groups[atelierId]) { groups[atelierId] = []; order.push(atelierId) }
    groups[atelierId].push(item)
  })
  return { groups, order }
}

// Liste des lignes d'articles d'un reçu. `withPrices` masque le prix (bon de préparation).
function ReceiptItemsList({ items, withPrices, lang, itemTotal }) {
  return (
    <div className="border-t border-dashed border-gray-300 pt-2">
      {items.map((item) => (
        <div key={item.id} className="receipt-line flex justify-between py-1 text-black">
          <span className="name">{getProductDisplayName(item, lang)} × {formatQty(item.qty)}{item.unit === 'kg' ? ' kg' : ''}{item.customNote ? ' *' : ''}</span>
          {withPrices && <span className="value font-semibold">{itemTotal(item).toFixed(2)} DH</span>}
        </div>
      ))}
      {items.some((i) => i.customNote) && (
        <p className="text-[10px] text-gray-500 italic mt-1">
          {items.filter((i) => i.customNote).map((i) => `* ${getProductDisplayName(i, lang)} : "${i.customNote}"`).join(' — ')}
        </p>
      )}
    </div>
  )
}

export default function CommandesPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { addNotification } = useNotification()
  const { lang } = useLanguage()

  // --- Panier de la réservation (indépendant de la caisse) ---
  const [order, setOrder] = useState([])
  const [stock, setStock] = useState({})
  const refreshStock = useCallback(async () => setStock(await getStock()), [])
  useEffect(() => {
    refreshStock()
    return subscribeToStockUpdates(refreshStock)
  }, [refreshStock])

  const [productOverlay, setProductOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })
  useEffect(() => {
    const refreshOverlay = () => { getProductOverlay().then(setProductOverlay).catch(() => {}) }
    refreshOverlay()
    return subscribeToStockUpdates(refreshOverlay, 15000)
  }, [])
  const PRODUCTS = useMemo(() => mergeProductsByCategory(productOverlay), [productOverlay])

  const [activeCategory, setActiveCategory] = useState(null)
  const [activeSubcategory, setActiveSubcategory] = useState(null)
  const [qtyModalState, setQtyModalState] = useState({ open: false, product: null, initialValue: 1, mode: 'add' })
  const [customModalState, setCustomModalState] = useState({ open: false, product: null, qty: 1, mode: 'add' })
  const [moroccanModalState, setMoroccanModalState] = useState({ open: false, product: null, qty: 1, mode: 'add' })
  const [salePlateauState, setSalePlateauState] = useState({ open: false, product: null, qty: 1, mode: 'add' })
  const [layerModalState, setLayerModalState] = useState({ open: false, product: null, qty: 1, mode: 'add' })

  const currentCategory = activeCategory ? CATEGORIES.find((c) => c.id === activeCategory) : null
  const hasChildren = currentCategory?.children?.length > 0
  const leafCategoryId = hasChildren ? activeSubcategory : activeCategory
  const leafCategory = leafCategoryId ? findCategory(leafCategoryId) : null

  // `mode: 'add'` (clic sur un produit du catalogue) additionne la quantité saisie à celle déjà
  // présente dans la commande ; `mode: 'edit'` (crayon sur une ligne déjà commandée) remplace la
  // quantité de cette ligne.
  const openQuantityModal = (product, initialValue, mode = 'add') => setQtyModalState({ open: true, product, initialValue, mode })

  const handleProductClick = (product) => {
    const existing = order.find((i) => i.id === product.id)
    openQuantityModal(product, existing ? existing.qty : 1, 'add')
  }
  const handleEditOrderQty = (item) => openQuantityModal(item, item.qty, 'edit')

  // mode 'add' additionne à la quantité déjà présente pour ce produit (au lieu de l'écraser) ;
  // mode 'edit' remplace la quantité de la ligne existante.
  const addOrUpdateItem = (product, qty, extra = {}, mode = 'add') => {
    setOrder((prev) => {
      if (qty <= 0) return prev.filter((i) => i.id !== product.id)
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        const newQty = mode === 'add' ? existing.qty + qty : qty
        return prev.map((i) => i.id === product.id ? { ...i, qty: newQty, ...extra } : i)
      }
      return [...prev, { ...product, qty, ...extra }]
    })
  }

  // Chaque taille de Layer cochée devient sa propre ligne (prix indépendant), avec la quantité
  // choisie à l'étape précédente ; si elle est déjà dans la commande, on l'additionne.
  const confirmLayerSelection = (chosenVariants) => {
    const qty = layerModalState.qty || 1
    setOrder((prev) => {
      let next = [...prev]
      chosenVariants.forEach((v) => {
        const existing = next.find((i) => i.id === v.id)
        if (existing) {
          next = next.map((i) => i.id === v.id ? { ...i, qty: i.qty + qty } : i)
        } else {
          next = [...next, { id: v.id, name: v.name, price: v.price, unit: 'piece', category: 'cake_design', qty }]
        }
      })
      return next
    })
    setLayerModalState({ open: false, product: null, qty: 1 })
  }
  const cancelLayerSelection = () => setLayerModalState({ open: false, product: null, qty: 1 })

  const confirmQuantity = (qty) => {
    const product = qtyModalState.product
    const mode = qtyModalState.mode
    setQtyModalState({ open: false, product: null, initialValue: 1, mode: 'add' })

    if (qty > 0 && product.isLayerType) {
      setLayerModalState({ open: true, product, qty, mode })
      return
    }
    if (qty > 0 && product.category === 'gateau_maroc') {
      setMoroccanModalState({ open: true, product, qty, mode })
      return
    }
    if (qty > 0 && product.id in SALE_PLATEAU_COMPOSITIONS) {
      setSalePlateauState({ open: true, product, qty, mode })
      return
    }
    // Pour les catégories de gâteaux, on propose une personnalisation facultative
    // (texte à écrire + photo de référence) avant d'ajouter au panier.
    if (qty > 0 && CUSTOMIZABLE_CATEGORIES.includes(product.category)) {
      setCustomModalState({ open: true, product, qty, mode })
      return
    }
    addOrUpdateItem(product, qty, {}, mode)
  }
  const cancelQuantity = () => setQtyModalState({ open: false, product: null, initialValue: 1, mode: 'add' })

  const confirmCustomization = ({ customNote, customImage, personPhotoSurcharge, price }) => {
    addOrUpdateItem(customModalState.product, customModalState.qty, { customNote, customImage, personPhotoSurcharge, price }, customModalState.mode)
    setCustomModalState({ open: false, product: null, qty: 1, mode: 'add' })
  }
  const skipCustomization = () => {
    addOrUpdateItem(customModalState.product, customModalState.qty, {}, customModalState.mode)
    setCustomModalState({ open: false, product: null, qty: 1, mode: 'add' })
  }

  const confirmMoroccanCustomization = ({ customNote }, finalQty) => {
    const { product, mode } = moroccanModalState
    const qty = finalQty !== undefined ? finalQty : moroccanModalState.qty
    addOrUpdateItem(product, qty, { customNote }, mode)
    setMoroccanModalState({ open: false, product: null, qty: 1, mode: 'add' })
  }
  const cancelMoroccanCustomization = () => {
    setMoroccanModalState({ open: false, product: null, qty: 1, mode: 'add' })
  }

  const confirmSalePlateau = (customNote) => {
    const { product, qty, mode } = salePlateauState
    addOrUpdateItem(product, qty, { customNote }, mode)
    setSalePlateauState({ open: false, product: null, qty: 1, mode: 'add' })
  }
  const cancelSalePlateau = () => setSalePlateauState({ open: false, product: null, qty: 1, mode: 'add' })

  const removeItem = (id) => setOrder((prev) => prev.filter((i) => i.id !== id))

  // Le supplément photo (fixe, non multiplié par le kg) s'ajoute une seule fois par article.
  const itemTotal = (i) => i.price * i.qty + (i.personPhotoSurcharge || 0)
  const subtotal = order.reduce((sum, i) => sum + itemTotal(i), 0)

  // --- Formulaire client / réservation ---
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [note, setNote] = useState('')

  // --- Paiement ---
  const [avance, setAvance] = useState('')
  const [paymentMode, setPaymentMode] = useState(null)
  const avanceValue = parseFloat(avance) || 0
  const resteAPayer = Math.max(0, subtotal - avanceValue)

  const resetForm = () => {
    setOrder([])
    setClientName(''); setClientPhone(''); setDeliveryDate(''); setDeliveryTime(''); setNote('')
    setAvance(''); setPaymentMode(null)
    setActiveCategory(null); setActiveSubcategory(null)
  }

  const handleCancelOrder = () => {
    resetForm()
    addNotification('Commande annulée', 'success')
  }

  const isFormComplete = clientName.trim() !== '' && deliveryDate !== '' && deliveryTime !== ''
  const canValidate = order.length > 0 && isFormComplete

  const [showReceipt, setShowReceipt] = useState(false)
  const [lastReservation, setLastReservation] = useState(null)
  const [showConfirmPayment, setShowConfirmPayment] = useState(false)

  const { groups: atelierGroups, order: atelierOrder } = useMemo(
    () => lastReservation ? groupItemsByAtelier(lastReservation.items) : { groups: {}, order: [] },
    [lastReservation]
  )

  const finalizeReservation = async () => {
    try {
      const reservation = await addReservation({
        clientName: clientName.trim(),
        clientPhone, deliveryDate, deliveryTime, note,
        items: order, total: subtotal, avance: avanceValue, resteAPayer,
        paymentMode,
      })
      addNotification('Commande enregistrée et envoyée aux préparateurs concernés', 'success')
      setLastReservation(reservation)
      setShowReceipt(true)
      refreshReservations()
    } catch (e) {
      addNotification("Erreur lors de l'enregistrement de la commande", 'error')
    }
  }

  const handleValidate = () => {
    if (order.length === 0) {
      addNotification('Ajoutez au moins un article', 'error')
      return
    }
    if (!isFormComplete) {
      addNotification('Merci de renseigner le nom du client, la date et l\'heure de livraison', 'error')
      return
    }
    // S'il y a une avance à encaisser, le mode de paiement est obligatoire, et on passe par
    // l'écran de confirmation de paiement (montant reçu / monnaie à rendre), comme à la caisse.
    if (avanceValue > 0) {
      if (!paymentMode) {
        addNotification('Choisissez un mode de paiement pour encaisser l\'avance', 'error')
        return
      }
      setShowConfirmPayment(true)
      return
    }
    finalizeReservation()
  }

  const handleConfirmAvancePayment = () => {
    setShowConfirmPayment(false)
    finalizeReservation()
  }

  const handleCloseReceipt = () => {
    setShowReceipt(false)
    setLastReservation(null)
    resetForm()
  }

  const handlePrintReceipt = () => {
    window.print()
    setTimeout(handleCloseReceipt, 400)
  }

  // --- Commandes prêtes (compteur affiché sur le bouton, page dédiée /commandes/suivi) ---
  const [reservations, setReservations] = useState([])
  const refreshReservations = useCallback(async () => setReservations(await getReservations()), [])
  useEffect(() => {
    refreshReservations()
    return subscribeToStockUpdates(refreshReservations)
  }, [refreshReservations])
  // Une commande ne compte comme "prête en attente" que si elle est prête ET que son solde
  // n'a pas encore été payé — sinon elle est déjà récupérée/finalisée (même logique que
  // l'onglet "Prêtes" de la page Suivi commandes, pour que les deux comptes concordent).
  const readyCount = reservations.filter((r) => (r.ready || isReservationFullyReady(r)) && !r.soldePaid).length

  return (
    <div className="h-full overflow-y-auto lg:overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full">

        {/* LEFT: Client & Réservation */}
        <aside className="w-full lg:w-[320px] bg-diana-card border-r border-diana-border p-5 flex flex-col gap-5 shrink-0 lg:h-full lg:overflow-y-auto">
          <button onClick={() => navigate('/commandes/suivi')}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600/90 text-white py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
            <FiTruck size={16} /> Commandes prêtes
            {readyCount > 0 && <span className="ml-1 bg-white/25 rounded-full px-2 py-0.5 text-xs">{readyCount}</span>}
          </button>

          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Client & Réservation</p>
            <h3 className="font-fraunces text-lg text-diana-cream mb-4">Détails de la commande</h3>

            <div className="space-y-3">
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-diana-brown z-10" size={15} />
                <KeyboardField value={clientName} onChange={setClientName}
                  placeholder="Nom Client / Vendeur / Table... *"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm bg-diana-dark/30 border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 ${clientName.trim() === '' ? 'border-diana-danger/50' : 'border-diana-border'}`} />
              </div>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-diana-brown z-10" size={15} />
                <KeyboardField value={clientPhone} onChange={setClientPhone}
                  placeholder="Numéro de téléphone client"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
              </div>
              <div>
                <label className="text-xs text-diana-brown mb-1 block">Date de livraison *</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-diana-brown" size={15} />
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 text-sm bg-diana-dark/30 border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 ${deliveryDate === '' ? 'border-diana-danger/50' : 'border-diana-border'}`} />
                </div>
              </div>
              <div>
                <label className="text-xs text-diana-brown mb-1 block">Heure de livraison *</label>
                <div className="relative">
                  <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-diana-brown" size={15} />
                  <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 text-sm bg-diana-dark/30 border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 ${deliveryTime === '' ? 'border-diana-danger/50' : 'border-diana-border'}`} />
                </div>
              </div>
              <div>
                <label className="text-xs text-diana-brown mb-1 block flex items-center gap-1.5"><FiFileText size={13}/> Note / Détails spéciaux</label>
                <KeyboardTextarea value={note} onChange={setNote} rows={3}
                  placeholder="Taille, saveur, allergies..."
                  className="w-full px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 resize-none" />
              </div>
              {!isFormComplete && (
                <p className="flex items-center gap-1.5 text-xs text-diana-danger"><FiAlertCircle size={13} /> Nom, date et heure de livraison requis (*)</p>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER: Catégories / Produits */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto lg:h-full">
          <AnimatePresence mode="wait">
            {!activeCategory ? (
              <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-2">{lang === 'ar' ? 'حجز جديد' : 'Nouvelle réservation'}</p>
                <h2 className="font-fraunces text-3xl font-medium mb-8 text-diana-cream">{lang === 'ar' ? 'الفئات' : 'Catégories'}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 sm:gap-3">
                  {CATEGORIES.map((cat, index) => (
                    <motion.button key={cat.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                      onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null) }}
                      className="cat-card bg-diana-card border border-diana-border rounded-2xl overflow-hidden text-left cursor-pointer text-diana-cream hover:border-diana-gold/30">
                      {cat.image && (
                        <div className="w-full h-16 sm:h-20 overflow-hidden bg-diana-darker">
                          <img src={cat.image} alt={getCategoryLabel(cat, lang)} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="p-2.5 sm:p-3">
                        <p className="font-fraunces text-xs sm:text-sm font-medium mb-0.5 leading-tight">{getCategoryLabel(cat, lang)}</p>
                        <p className="text-[10px] text-diana-brown">
                          {cat.children ? `${cat.children.length} ${lang === 'ar' ? 'فئة فرعية' : 'sous-catégories'}` : `${PRODUCTS[cat.id]?.length || 0} ${lang === 'ar' ? 'منتج' : 'produits'}`}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : hasChildren && !activeSubcategory ? (
              <motion.div key={`${activeCategory}-children`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setActiveCategory(null)}
                  className="flex items-center gap-2 text-diana-gold text-sm mb-6 hover:text-diana-goldLight transition-colors">
                  <FiArrowLeft size={16} /> {lang === 'ar' ? 'الرجوع إلى الفئات' : 'Retour aux catégories'}
                </button>
                <h2 className="font-fraunces text-2xl font-medium mb-6 text-diana-cream">{getCategoryLabel(currentCategory, lang)}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 sm:gap-3">
                  {currentCategory.children.map((sub, index) => (
                    <motion.button key={sub.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                      onClick={() => setActiveSubcategory(sub.id)}
                      className="cat-card bg-diana-card border border-diana-border rounded-2xl overflow-hidden text-left cursor-pointer text-diana-cream hover:border-diana-gold/30">
                      {sub.image && (
                        <div className="w-full h-16 sm:h-20 overflow-hidden bg-diana-darker">
                          <img src={sub.image} alt={getCategoryLabel(sub, lang)} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="p-2.5 sm:p-3">
                        <p className="font-fraunces text-xs sm:text-sm font-medium mb-0.5 leading-tight">{getCategoryLabel(sub, lang)}</p>
                        <p className="text-[10px] text-diana-brown">{PRODUCTS[sub.id]?.length || 0} {lang === 'ar' ? 'منتج' : 'produits'}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key={leafCategoryId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => hasChildren ? setActiveSubcategory(null) : setActiveCategory(null)}
                  className="flex items-center gap-2 text-diana-gold text-sm mb-6 hover:text-diana-goldLight transition-colors">
                  <FiArrowLeft size={16} /> {lang === 'ar'
                    ? (hasChildren ? `الرجوع إلى ${getCategoryLabel(currentCategory, lang)}` : 'الرجوع إلى الفئات')
                    : `Retour ${hasChildren ? `à ${currentCategory.label}` : 'aux catégories'}`}
                </button>
                <h2 className="font-fraunces text-2xl font-medium mb-6 text-diana-cream">{getCategoryLabel(leafCategory, lang)}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 sm:gap-3">
                  {PRODUCTS[leafCategoryId]?.map((prod) => (
                    <motion.button key={prod.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => handleProductClick({ ...prod, category: leafCategoryId })}
                      className="prod-card bg-diana-card border border-diana-border rounded-xl p-2 sm:p-2.5 text-left cursor-pointer text-diana-cream hover:border-diana-gold/50">
                      {prod.image && (
                        <div className="w-full h-14 sm:h-20 mb-1.5 sm:mb-2 rounded-lg overflow-hidden bg-diana-dark">
                          <img src={prod.image} alt={getProductDisplayName(prod, lang)} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                        </div>
                      )}
                      <p className="text-[11px] sm:text-xs font-semibold mb-1 leading-snug line-clamp-2">{getProductDisplayName(prod, lang)}</p>
                      <p className="font-fraunces text-sm sm:text-base text-diana-gold mb-0.5">
                        {prod.price > 0 ? `${prod.price.toFixed(2)} DH` : (lang === 'ar' ? 'الثمن حسب الطلب' : 'Prix sur devis')}{prod.unit === 'kg' ? ' / kg' : ''}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-medium text-diana-brown">Stock: {stock[prod.id] ?? 0}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT: Résumé de commande */}
        <aside className="w-full lg:w-[360px] bg-[#FFE8D6] text-diana-brownDark flex flex-col shrink-0 lg:h-full lg:overflow-y-auto">
          <div className="p-5 pb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C89A5C]/15 text-[#8B6A3A] text-xs font-semibold">
              <FiUser size={13} /> {user ? `Commande ${user.name}` : 'Commande'}
            </span>
            {user ? (
              <button onClick={() => { logout(); navigate('/') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diana-danger/10 text-diana-danger text-xs font-semibold hover:bg-diana-danger/20 transition-colors">
                <FiLogOut size={13} /> Déconnexion
              </button>
            ) : (
              <Link to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C89A5C] text-white text-xs font-semibold hover:bg-[#B88443] transition-colors">
                <FiLogIn size={13} /> Connexion
              </Link>
            )}
          </div>

          <div className="px-5">
            <p className="font-fraunces text-lg font-medium text-diana-brownDark mb-3">Résumé de commande</p>
          </div>

          <div className="flex-1 px-5 min-h-0 max-h-[50vh] lg:max-h-none overflow-y-auto">
            {order.length === 0 ? (
              <p className="text-sm italic text-[#B68C6C] py-6 text-center">Aucun article sélectionné</p>
            ) : (
              <div className="border-t border-dashed border-[#D9A86C] pt-2">
                <div className="grid grid-cols-[1fr,auto,auto] gap-2 text-xs font-semibold text-diana-brownDark pb-2">
                  <span>Article</span><span>Qté</span><span className="text-right">Prix</span>
                </div>
                <AnimatePresence mode="popLayout">
                  {order.map((item) => (
                    <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}
                      className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-2 border-b border-[#E7CCB4] text-sm">
                      <span className="truncate flex items-center gap-1">
                        {getProductDisplayName(item, lang)}
                        {(item.customNote || item.customImage) && <FiFileText size={11} className="text-emerald-600 shrink-0" title="Personnalisé" />}
                      </span>
                      <button onClick={() => handleEditOrderQty(item)}
                        className="px-2 py-1 rounded-md border border-[#C89A5C] text-xs font-semibold hover:bg-[#C89A5C] hover:text-white transition-colors">
                        {formatQty(item.qty)}{item.unit === 'kg' ? 'kg' : ''}
                      </button>
                      <span className="flex items-center gap-1.5 justify-end">
                        {itemTotal(item).toFixed(2)} DH
                        <button onClick={() => removeItem(item.id)} className="text-diana-danger hover:text-red-700"><FiX size={13} /></button>
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="p-5 pt-2.5 shrink-0">
            <button onClick={handleCancelOrder}
              className="w-full mb-2.5 py-2 rounded-xl text-sm font-semibold text-diana-danger bg-diana-danger/10 hover:bg-diana-danger/20 transition-colors">
              Annuler commande
            </button>

            <div className="bg-white border border-[#E7CCB4] rounded-xl p-2.5 mb-2.5">
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-fraunces text-sm text-diana-brownDark">Total</span>
                <span className="font-fraunces text-xl font-semibold text-diana-brownDark">{subtotal.toFixed(2)} <span className="text-sm font-normal">DH</span></span>
              </div>

              <label className="text-xs text-[#8B6A3A] mb-1 block">Avance</label>
              <NumericField value={avance} onChange={setAvance} placeholder="0.00" title="Avance" unit="DH"
                className="w-full mb-2 px-3 py-1.5 text-sm bg-[#FFF6EC] border border-[#E7CCB4] rounded-lg text-diana-brownDark text-left focus:outline-none focus:border-[#C89A5C]" />

              <div className="flex justify-between items-baseline pt-1.5 border-t border-[#E7CCB4]">
                <span className="text-sm text-diana-brownDark">Reste à payer</span>
                <span className="text-base font-semibold text-diana-danger">{resteAPayer.toFixed(2)} DH</span>
              </div>
            </div>

            <p className="text-xs text-[#8B6A3A] mb-1.5">
              Mode de paiement actuel : <span className="font-medium text-diana-brownDark">{paymentMode === 'cash' ? 'Espèces' : paymentMode === 'card' ? 'TPE' : 'Non spécifié'}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <button onClick={() => setPaymentMode('cash')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${paymentMode === 'cash' ? 'bg-[#C89A5C] text-white' : 'bg-[#C89A5C]/15 text-[#8B6A3A] border border-[#C89A5C]/40'}`}>
                <FiDollarSign size={15} /> Espèces
              </button>
              <button onClick={() => setPaymentMode('card')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${paymentMode === 'card' ? 'bg-diana-brownDark text-white' : 'bg-diana-brownDark/10 text-diana-brownDark border border-diana-brownDark/20'}`}>
                <FiCreditCard size={15} /> TPE
              </button>
            </div>

            <button onClick={handleValidate} disabled={!canValidate}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-diana-brownDark text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              Valider la commande
            </button>
          </div>
        </aside>
      </div>

      {/* QUANTITY MODAL */}
      <QuantityModal open={qtyModalState.open} product={qtyModalState.product} initialValue={qtyModalState.initialValue} mode={qtyModalState.mode}
        onConfirm={confirmQuantity} onCancel={cancelQuantity} />

      {/* PERSONNALISATION GÂTEAU (texte + photo) */}
      <CakeCustomizationModal open={customModalState.open} product={customModalState.product} qty={customModalState.qty}
        onConfirm={confirmCustomization} onSkip={skipCustomization} />

      {/* COMPOSITION GÂTEAUX MAROCAINS */}
      <MoroccanCakeModal open={moroccanModalState.open} product={moroccanModalState.product} qty={moroccanModalState.qty}
        onConfirm={confirmMoroccanCustomization} onCancel={cancelMoroccanCustomization} />

      {/* CONFIRMATION DE PAIEMENT DE L'AVANCE */}
      <ConfirmPaymentModal open={showConfirmPayment} method={paymentMode}
        amountDue={avanceValue} onConfirm={handleConfirmAvancePayment} onCancel={() => setShowConfirmPayment(false)} />

      {/* COMPOSITION PLATEAU SALÉ */}
      <SalePlateauModal open={salePlateauState.open}
        product={salePlateauState.product ? { ...salePlateauState.product, _components: SALE_PLATEAU_COMPONENTS } : null}
        requiredCount={salePlateauState.product ? SALE_PLATEAU_COMPOSITIONS[salePlateauState.product.id] : 0}
        onConfirm={confirmSalePlateau} onCancel={cancelSalePlateau} />

      {/* SÉLECTION DES TAILLES LAYER (Cake Design) */}
      <LayerModal open={layerModalState.open} product={layerModalState.product} qty={layerModalState.qty}
        variants={layerModalState.product ? getLayerVariants(layerModalState.product.layerHeight) : []}
        onConfirm={confirmLayerSelection} onCancel={cancelLayerSelection} />

      {/* REÇU DE RÉSERVATION (avec avance / reste à payer) */}
      <AnimatePresence>
        {showReceipt && lastReservation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#FFE8D6] text-diana-brownDark rounded-2xl p-8 max-w-sm w-full mx-4 shadow-gold-lg max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><span className="text-2xl">✓</span></div>
                <h3 className="font-fraunces text-xl font-medium">Commande enregistrée</h3>
                <p className="text-sm text-[#8B6A3A] mt-1">Reçu à remettre au client</p>
              </div>
              <div className="receipt-print bg-white rounded-xl p-4 mb-6 text-xs border border-gray-300 text-black max-h-[50vh] overflow-y-auto">
                {/* PAGE 1 — EXEMPLAIRE CLIENT */}
                <div className="receipt-page">
                  <ReceiptHeader subtitle="Commande enregistrée">
                    <p className="text-gray-500 text-[10.5px] mt-1.5">{new Date(lastReservation.createdAt).toLocaleDateString('fr-FR')} {new Date(lastReservation.createdAt).toLocaleTimeString('fr-FR')}</p>
                    {lastReservation.ticketNumber && <p className="text-gray-500 text-[10.5px]">N° {lastReservation.ticketNumber}</p>}
                  </ReceiptHeader>
                  <p className="text-center text-[10.5px] font-semibold text-black mb-2 uppercase tracking-wide">Exemplaire client</p>
                  <div className="mb-3 space-y-0.5">
                    <p><span className="text-gray-500">Client :</span> <span className="font-semibold">{lastReservation.clientName}</span></p>
                    {lastReservation.clientPhone && <p><span className="text-gray-500">Téléphone :</span> {lastReservation.clientPhone}</p>}
                    <p><span className="text-gray-500">Livraison :</span> {lastReservation.deliveryDate} à {lastReservation.deliveryTime}</p>
                    {lastReservation.note && <p><span className="text-gray-500">Note :</span> {lastReservation.note}</p>}
                  </div>
                  <ReceiptItemsList items={lastReservation.items} withPrices lang={lang} itemTotal={itemTotal} />
                  <div className="border-t border-dashed border-gray-300 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between font-semibold"><span>Total</span><span>{lastReservation.total.toFixed(2)} DH</span></div>
                    <div className="flex justify-between text-black"><span>Avance versée</span><span>{lastReservation.avance.toFixed(2)} DH</span></div>
                    <div className="flex justify-between font-semibold text-black"><span>Reste à payer</span><span>{lastReservation.resteAPayer.toFixed(2)} DH</span></div>
                  </div>
                </div>

                {/* PAGE 2 — EXEMPLAIRE CAISSIER (infos internes en plus : mode de paiement, opérateur) */}
                <div className="receipt-page">
                  <ReceiptHeader subtitle="Commande enregistrée">
                    <p className="text-gray-500 text-[10.5px] mt-1.5">{new Date(lastReservation.createdAt).toLocaleDateString('fr-FR')} {new Date(lastReservation.createdAt).toLocaleTimeString('fr-FR')}</p>
                    {lastReservation.ticketNumber && <p className="text-gray-500 text-[10.5px]">N° {lastReservation.ticketNumber}</p>}
                  </ReceiptHeader>
                  <p className="text-center text-[10.5px] font-semibold text-black mb-2 uppercase tracking-wide">Exemplaire caisse</p>
                  <div className="mb-3 space-y-0.5">
                    <p><span className="text-gray-500">Client :</span> <span className="font-semibold">{lastReservation.clientName}</span></p>
                    {lastReservation.clientPhone && <p><span className="text-gray-500">Téléphone :</span> {lastReservation.clientPhone}</p>}
                    <p><span className="text-gray-500">Livraison :</span> {lastReservation.deliveryDate} à {lastReservation.deliveryTime}</p>
                    {lastReservation.note && <p><span className="text-gray-500">Note :</span> {lastReservation.note}</p>}
                  </div>
                  <ReceiptItemsList items={lastReservation.items} withPrices lang={lang} itemTotal={itemTotal} />
                  <div className="border-t border-dashed border-gray-300 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between font-semibold"><span>Total</span><span>{lastReservation.total.toFixed(2)} DH</span></div>
                    <div className="flex justify-between text-black"><span>Avance versée</span><span>{lastReservation.avance.toFixed(2)} DH</span></div>
                    <div className="flex justify-between font-semibold text-black"><span>Reste à payer</span><span>{lastReservation.resteAPayer.toFixed(2)} DH</span></div>
                    {lastReservation.avance > 0 && (
                      <div className="flex justify-between"><span className="text-gray-500">Mode paiement avance</span><span className="font-semibold">{lastReservation.paymentMode === 'cash' ? 'Espèces' : lastReservation.paymentMode === 'card' ? 'TPE' : '—'}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">Enregistré par</span><span className="font-semibold">{user?.name || '—'}</span></div>
                  </div>
                </div>

                {/* PAGES SUIVANTES — UN BON DE PRÉPARATION PAR ATELIER CONCERNÉ, SANS PRIX */}
                {atelierOrder.map((atelierId) => {
                  const atelierObj = ATELIERS.find((a) => a.id === atelierId)
                  const atelierLabel = atelierObj ? getCategoryLabel(atelierObj, lang) : atelierId
                  return (
                    <div className="receipt-page" key={atelierId}>
                      <ReceiptHeader subtitle="Bon de préparation">
                        <p className="text-gray-500 text-[10.5px] mt-1.5">{new Date(lastReservation.createdAt).toLocaleDateString('fr-FR')} {new Date(lastReservation.createdAt).toLocaleTimeString('fr-FR')}</p>
                        {lastReservation.ticketNumber && <p className="text-gray-500 text-[10.5px]">N° {lastReservation.ticketNumber}</p>}
                      </ReceiptHeader>
                      <p className="text-center text-sm font-bold text-black mb-2 uppercase tracking-wide">Atelier {atelierLabel}</p>
                      <div className="mb-3 space-y-0.5">
                        <p><span className="text-gray-500">Client :</span> <span className="font-semibold">{lastReservation.clientName}</span></p>
                        <p><span className="text-gray-500">Livraison :</span> {lastReservation.deliveryDate} à {lastReservation.deliveryTime}</p>
                      </div>
                      <ReceiptItemsList items={atelierGroups[atelierId]} withPrices={false} lang={lang} itemTotal={itemTotal} />
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={handlePrintReceipt}
                  className="flex items-center justify-center gap-2 bg-diana-brownDark text-white py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiPrinter size={16} /> Imprimer le reçu
                </button>
                <button onClick={handleCloseReceipt}
                  className="flex items-center justify-center gap-2 bg-[#C89A5C] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#B88443] transition-all">
                  Fermer et nouvelle commande
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
