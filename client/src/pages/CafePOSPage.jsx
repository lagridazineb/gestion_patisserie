import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMinus, FiPlus, FiTrash2, FiDroplet, FiX, FiMapPin, FiPhone, FiDelete } from 'react-icons/fi'
import { WATER_ADDON } from '../data/cafeConstants'
import { CAFE_INFO } from '../data/cafeInfo'
import { useNotification } from '../context/NotificationContext'
import apiClient from '../api/client'

const QUICK_AMOUNTS = [20, 50, 100, 200]

export default function CafePOSPage() {
  const { addNotification } = useNotification()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [cart, setCart] = useState([]) // [{ key, productId, name, unitPrice, qty, water }]
  const [received, setReceived] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.get('/cafe/products')
      .then(({ data }) => setProducts(data.products))
      .catch(() => addNotification('Erreur lors du chargement de la carte', 'error'))
      .finally(() => setLoadingProducts(false))
  }, [])

  // Popup de quantité (ouvert au clic sur un produit, comme Dianna Patisserie)
  const [qtyModal, setQtyModal] = useState(null) // { product, qty, withWater }

  // Popup du montant reçu (clavier numérique)
  const [showReceivedModal, setShowReceivedModal] = useState(false)
  const [tempReceived, setTempReceived] = useState('')

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0), [cart])
  const receivedValue = parseFloat(String(received).replace(',', '.')) || 0
  const change = Math.max(0, receivedValue - total)

  // ---- Popup quantité ----
  const openQtyModal = (product) => setQtyModal({ product, qty: 1, withWater: false })
  const closeQtyModal = () => setQtyModal(null)
  const changeModalQty = (delta) => setQtyModal((m) => m ? { ...m, qty: Math.max(1, m.qty + delta) } : m)
  const toggleModalWater = () => setQtyModal((m) => m ? { ...m, withWater: !m.withWater } : m)

  const confirmQtyModal = () => {
    if (!qtyModal) return
    const { product, qty, withWater } = qtyModal
    const key = `${product.id}__${withWater ? 'eau' : 'sans'}`
    const unitPrice = product.price + (withWater ? WATER_ADDON.price : 0)
    const name = withWater ? `${product.name} + Eau` : product.name
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) return prev.map((i) => i.key === key ? { ...i, qty: i.qty + qty } : i)
      return [...prev, { key, productId: product.id, name, unitPrice, qty, water: withWater }]
    })
    closeQtyModal()
  }

  const changeQty = (key, delta) => {
    setCart((prev) => prev
      .map((i) => i.key === key ? { ...i, qty: i.qty + delta } : i)
      .filter((i) => i.qty > 0))
  }
  const removeItem = (key) => setCart((prev) => prev.filter((i) => i.key !== key))

  // ---- Popup montant reçu ----
  const openReceivedModal = () => { setTempReceived(received ? String(received) : ''); setShowReceivedModal(true) }
  const closeReceivedModal = () => setShowReceivedModal(false)
  const pressDigit = (d) => setTempReceived((v) => {
    if (d === '.' && v.includes('.')) return v
    if (v === '0' && d !== '.') return d
    return v + d
  })
  const pressBackspace = () => setTempReceived((v) => v.slice(0, -1))
  const pressClear = () => setTempReceived('')
  const pressQuickAmount = (amount) => setTempReceived(String(amount))
  const pressExactAmount = () => setTempReceived(total.toFixed(2))
  const confirmReceivedModal = () => { setReceived(tempReceived); setShowReceivedModal(false) }

  const resetSale = () => {
    setCart([])
    setReceived('')
  }

  const handleValidate = async () => {
    if (cart.length === 0) { addNotification('Le panier est vide', 'error'); return }
    if (receivedValue < total) { addNotification('Montant reçu insuffisant', 'error'); return }
    setSaving(true)
    try {
      const items = cart.map((i) => ({ productId: i.productId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, water: i.water }))
      const { data } = await apiClient.post('/cafe/sales', { items, paymentType: 'cash', total })
      setLastSale({ ...data.sale, items, receivedValue, change })
      setShowReceipt(true)
    } catch (e) {
      addNotification(e.response?.data?.error || "Erreur lors de l'enregistrement de la vente", 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseReceipt = () => { setShowReceipt(false); resetSale() }

  return (
    <div className="h-full overflow-hidden bg-cafe-bg">
      <div className="flex flex-col lg:flex-row h-full">
        {/* Grille produits — clic sur la carte ouvre le popup de quantité */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <p className="text-xs uppercase tracking-[2px] text-cafe-espressoLight/50 mb-1">Dianna Café</p>
          <h2 className="font-display text-2xl font-bold text-cafe-espresso mb-5">Carte</h2>
          {loadingProducts ? (
            <p className="text-sm text-cafe-espressoLight/60 italic">Chargement de la carte...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {products.map((p, index) => (
                <motion.button key={p.id} type="button" onClick={() => openQtyModal(p)}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="item-card bg-cafe-card border border-cafe-border rounded-2xl overflow-hidden text-left cursor-pointer flex flex-col">
                  {p.image && (
                    <div className="w-full h-24 bg-cafe-bgDeep overflow-hidden">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                  )}
                  <div className="p-3.5 flex flex-col flex-1">
                    <p className="font-display font-semibold text-cafe-espresso leading-snug mb-1">{p.name}</p>
                    <p className="text-cafe-terracotta font-semibold text-lg mb-2">{p.price.toFixed(2)} DH</p>
                    {p.waterOption && (
                      <span className="mt-auto self-start flex items-center gap-1 text-[11px] font-medium text-cafe-terracotta bg-cafe-terracotta/10 px-2 py-1 rounded-full select-none">
                        <FiDroplet size={11} /> Option eau disponible
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </main>

        {/* Panier / paiement (espèces uniquement) */}
        <aside className="w-full lg:w-[340px] bg-cafe-card border-t lg:border-t-0 lg:border-l border-cafe-border flex flex-col shrink-0 lg:h-full">
          <div className="px-5 pt-5 pb-3 border-b border-dashed border-cafe-border">
            <p className="font-display font-semibold text-cafe-espresso">Ticket en cours</p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[120px]">
            {cart.length === 0 ? (
              <p className="text-sm italic text-cafe-espressoLight/50 text-center py-8">Aucun article sélectionné</p>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence>
                  {cart.map((i) => (
                    <motion.div key={i.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-cafe-espresso truncate">{i.name}</p>
                        <p className="text-[11px] text-cafe-espressoLight/50">{i.unitPrice.toFixed(2)} DH</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => changeQty(i.key, -1)} className="w-6 h-6 rounded-md bg-cafe-bg flex items-center justify-center text-cafe-espresso"><FiMinus size={11} /></button>
                        <span className="w-5 text-center font-semibold text-cafe-espresso">{i.qty}</span>
                        <button onClick={() => changeQty(i.key, 1)} className="w-6 h-6 rounded-md bg-cafe-bg flex items-center justify-center text-cafe-espresso"><FiPlus size={11} /></button>
                        <button onClick={() => removeItem(i.key)} className="text-cafe-danger ml-1"><FiTrash2 size={13} /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-dashed border-cafe-border">
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-display text-cafe-espresso">Total</span>
              <span className="font-display text-2xl font-bold text-cafe-terracotta">{total.toFixed(2)} <span className="text-xs font-normal">DH</span></span>
            </div>
            <div className="mb-3">
              <label className="text-[11px] text-cafe-espressoLight/70 mb-1 block">Montant reçu (DH)</label>
              <button type="button" onClick={openReceivedModal}
                className="w-full px-3 py-2 bg-cafe-cream border border-cafe-border rounded-lg text-left text-cafe-espresso text-sm focus:outline-none hover:border-cafe-terracotta/60 transition-colors">
                {receivedValue > 0 ? receivedValue.toFixed(2) : <span className="text-cafe-espressoLight/40">0.00</span>}
              </button>
              {receivedValue > 0 && (
                <p className="text-[11px] text-cafe-olive mt-1">Monnaie à rendre : {change.toFixed(2)} DH</p>
              )}
            </div>
            <button onClick={handleValidate} disabled={saving || cart.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-cafe-espresso text-white hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-40">
              {saving ? 'Enregistrement...' : 'Valider la vente'}
            </button>
          </div>
        </aside>
      </div>

      {/* Popup de quantité (au clic sur un produit) */}
      <AnimatePresence>
        {qtyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeQtyModal}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-cafe-card rounded-2xl p-5 max-w-sm w-full shadow-cafe-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {qtyModal.product.image && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-cafe-bgDeep shrink-0">
                      <img src={qtyModal.product.image} alt={qtyModal.product.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-cafe-espresso truncate">{qtyModal.product.name}</p>
                    <p className="text-cafe-terracotta font-semibold text-sm">{qtyModal.product.price.toFixed(2)} DH</p>
                  </div>
                </div>
                <button onClick={closeQtyModal} className="text-cafe-espressoLight/60 shrink-0"><FiX size={18} /></button>
              </div>

              {qtyModal.product.waterOption && (
                <label className="flex items-center justify-between mb-4 px-3.5 py-2.5 rounded-xl bg-cafe-cream border border-cafe-border cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-cafe-espresso">
                    <FiDroplet className="text-cafe-terracotta" size={15} /> Ajouter une eau (+{WATER_ADDON.price.toFixed(2)} DH)
                  </span>
                  <input type="checkbox" checked={qtyModal.withWater} onChange={toggleModalWater}
                    className="w-4 h-4 accent-cafe-terracotta" />
                </label>
              )}

              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-cafe-espresso font-medium">Quantité</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => changeModalQty(-1)} className="w-9 h-9 rounded-lg bg-cafe-bg flex items-center justify-center text-cafe-espresso"><FiMinus size={14} /></button>
                  <span className="w-8 text-center font-display font-bold text-lg text-cafe-espresso">{qtyModal.qty}</span>
                  <button onClick={() => changeModalQty(1)} className="w-9 h-9 rounded-lg bg-cafe-bg flex items-center justify-center text-cafe-espresso"><FiPlus size={14} /></button>
                </div>
              </div>

              <button onClick={confirmQtyModal}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-cafe-espresso text-white hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                Ajouter au ticket · {((qtyModal.product.price + (qtyModal.withWater ? WATER_ADDON.price : 0)) * qtyModal.qty).toFixed(2)} DH
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup montant reçu (clavier numérique) */}
      <AnimatePresence>
        {showReceivedModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeReceivedModal}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-cafe-card rounded-2xl p-5 max-w-sm w-full shadow-cafe-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-semibold text-cafe-espresso">Montant reçu</p>
                <button onClick={closeReceivedModal} className="text-cafe-espressoLight/60"><FiX size={18} /></button>
              </div>

              <div className="bg-cafe-cream border border-cafe-border rounded-xl px-4 py-3 mb-3 text-right">
                <span className="font-display text-2xl font-bold text-cafe-espresso">{tempReceived || '0'}</span>
                <span className="text-sm text-cafe-espressoLight/60 ml-1">DH</span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                <button onClick={pressExactAmount} className="py-2 rounded-lg bg-cafe-terracotta/10 text-cafe-terracotta text-xs font-semibold">Exact ({total.toFixed(0)})</button>
                {QUICK_AMOUNTS.map((a) => (
                  <button key={a} onClick={() => pressQuickAmount(a)} className="py-2 rounded-lg bg-cafe-bg text-cafe-espresso text-xs font-semibold">{a} DH</button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((d) => (
                  <button key={d} onClick={() => pressDigit(d)}
                    className="py-3 rounded-lg bg-cafe-bg text-cafe-espresso font-display font-semibold text-lg hover:bg-cafe-terracotta/10 transition-colors">
                    {d}
                  </button>
                ))}
                <button onClick={pressBackspace}
                  className="py-3 rounded-lg bg-cafe-bg text-cafe-espresso flex items-center justify-center hover:bg-cafe-terracotta/10 transition-colors">
                  <FiDelete size={18} />
                </button>
              </div>

              <div className="flex gap-2.5">
                <button onClick={pressClear} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-cafe-bg text-cafe-espresso">Effacer</button>
                <button onClick={confirmReceivedModal} className="flex-[2] py-3 rounded-xl text-sm font-semibold bg-cafe-espresso text-white hover:brightness-110 transition-all active:scale-[0.98]">Valider</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reçu de vente */}
      <AnimatePresence>
        {showReceipt && lastSale && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleCloseReceipt}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative bg-cafe-card rounded-2xl p-6 max-w-sm w-full shadow-cafe-lg max-h-[90vh] overflow-y-auto">
              <button onClick={handleCloseReceipt}
                className="absolute top-4 right-4 text-cafe-espressoLight/50 hover:text-cafe-espresso transition-colors">
                <FiX size={18} />
              </button>

              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-cafe-olive/15 flex items-center justify-center mx-auto mb-2"><span className="text-xl">✓</span></div>
                <h3 className="font-display text-lg font-bold text-cafe-espresso">Vente enregistrée</h3>
                <p className="text-xs text-cafe-espressoLight/60">Ticket n°{String(lastSale.ticketNumber).padStart(4, '0')}</p>
              </div>

              <div className="text-center mb-5 pb-4 border-b border-dashed border-cafe-border">
                <p className="font-display font-bold text-cafe-espresso">{CAFE_INFO.name}</p>
                <p className="text-[11px] text-cafe-espressoLight/60 flex items-center justify-center gap-1 mt-1">
                  <FiMapPin size={11} /> {CAFE_INFO.address}
                </p>
                <p className="text-[11px] text-cafe-espressoLight/60 flex items-center justify-center gap-1 mt-0.5">
                  <FiPhone size={11} /> {CAFE_INFO.phone}
                </p>
              </div>

              <div className="bg-cafe-cream rounded-xl p-4 mb-5 text-sm border border-cafe-border">
                {lastSale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span>{i.name} × {i.qty}</span>
                    <span>{(i.unitPrice * i.qty).toFixed(2)} DH</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-cafe-border mt-2 pt-2 space-y-1">
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{lastSale.total.toFixed(2)} DH</span></div>
                  <div className="flex justify-between text-cafe-espressoLight/70"><span>Reçu</span><span>{lastSale.receivedValue.toFixed(2)} DH</span></div>
                  <div className="flex justify-between text-cafe-olive font-semibold"><span>Monnaie rendue</span><span>{lastSale.change.toFixed(2)} DH</span></div>
                </div>
              </div>

              <p className="text-center text-[11px] text-cafe-espressoLight/50 italic">Merci de votre visite !</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
