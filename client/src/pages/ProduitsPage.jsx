import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiTrash2, FiEdit3, FiImage, FiTag, FiUpload, FiLink, FiEyeOff, FiRotateCcw, FiX } from 'react-icons/fi'
import { ALL_PRODUCTS, LEAF_CATEGORIES, mergeProductOverlay } from '../data/products'
import { getProductOverlay, createProduct, updateProduct, deleteProduct, restoreProduct } from '../api/products'
import { useNotification } from '../context/NotificationContext'
import { useLanguage } from '../context/LanguageContext'
import { getProductDisplayName, getCategoryLabel, autoTranslateProductNameToAr } from '../i18n/productNames'
import NumericField from '../components/NumericField'

const emptyForm = { name: '', nameAr: '', price: '', category: 'pain', image: '' }

export default function ProduitsPage() {
  // overlay = ce qui vient du serveur (produits ajoutés, modifications, masquages) : c'est la
  // seule partie qui change réellement. Le catalogue de base reste celui codé dans products.js.
  const [overlay, setOverlay] = useState({ customProducts: [], edits: [], deletedIds: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const { addNotification } = useNotification()
  const { t, lang } = useLanguage()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState(emptyForm)
  const [imageMode, setImageMode] = useState('url') // 'url' | 'upload'

  const loadOverlay = async () => {
    try {
      const data = await getProductOverlay()
      setOverlay(data)
    } catch (e) {
      addNotification(t('produits.erreurChargement'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOverlay() }, [])

  const products = useMemo(() => mergeProductOverlay(overlay), [overlay])
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Produits du catalogue de base actuellement masqués (pour la vue "Produits masqués").
  const hiddenBaseProducts = ALL_PRODUCTS.filter(p => overlay.deletedIds.includes(p.id))

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData(emptyForm)
    setImageMode('url')
    setShowAddModal(true)
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({ name: product.name, nameAr: product.nameAr || '', price: String(product.price), category: product.category, image: product.image || '' })
    setImageMode(product.image && product.image.startsWith('data:') ? 'upload' : 'url')
    setShowAddModal(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      addNotification(t('produits.imageTropLourde'), 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setFormData(prev => ({ ...prev, image: reader.result }))
    reader.onerror = () => addNotification(t('produits.imageIllisible'), 'error')
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const price = parseFloat(formData.price)
    if (!formData.name.trim()) { addNotification(t('produits.nomRequis'), 'error'); return null }
    if (isNaN(price) || price <= 0) { addNotification(t('produits.prixInvalide'), 'error'); return null }
    return price
  }

  const handleAdd = async () => {
    const price = validate()
    if (price === null) return
    setSaving(true)
    try {
      const product = await createProduct({ name: formData.name.trim(), nameAr: formData.nameAr.trim() || null, price, category: formData.category, image: formData.image || null })
      setOverlay(prev => ({ ...prev, customProducts: [product, ...prev.customProducts] }))
      setShowAddModal(false)
      setFormData(emptyForm)
      addNotification(t('produits.produitAjoute'), 'success')
    } catch (e) {
      addNotification(e.response?.data?.error || t('produits.erreurAjout'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    const price = validate()
    if (price === null) return
    setSaving(true)
    try {
      const payload = { name: formData.name.trim(), nameAr: formData.nameAr.trim() || null, price, category: formData.category, image: formData.image || null }
      const product = await updateProduct(editingProduct.id, payload)
      if (product.isCustom) {
        setOverlay(prev => ({ ...prev, customProducts: prev.customProducts.map(p => p.id === product.id ? product : p) }))
      } else {
        setOverlay(prev => ({
          ...prev,
          edits: [
            ...prev.edits.filter(e => e.productId !== product.id),
            { productId: product.id, name: product.name, nameAr: product.nameAr, price: product.price, category: product.category, image: product.image },
          ],
        }))
      }
      setShowAddModal(false)
      setEditingProduct(null)
      setFormData(emptyForm)
      addNotification(t('produits.produitModifie'), 'success')
    } catch (e) {
      addNotification(e.response?.data?.error || t('produits.erreurModification'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product) => {
    try {
      await deleteProduct(product.id)
      if (product.isCustom) {
        setOverlay(prev => ({ ...prev, customProducts: prev.customProducts.filter(p => p.id !== product.id) }))
      } else {
        setOverlay(prev => ({ ...prev, deletedIds: [...prev.deletedIds, product.id] }))
      }
      addNotification(t('produits.produitSupprime'), 'success')
    } catch (e) {
      addNotification(e.response?.data?.error || t('produits.erreurSuppression'), 'error')
    }
  }

  const handleRestore = async (productId) => {
    try {
      await restoreProduct(productId)
      setOverlay(prev => ({ ...prev, deletedIds: prev.deletedIds.filter(id => id !== productId) }))
      addNotification(t('produits.produitReaffiche'), 'success')
    } catch (e) {
      addNotification(e.response?.data?.error || t('produits.erreurRestauration'), 'error')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">{t('produits.catalogue')}</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">{t('produits.titre')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHidden(v => !v)}
              className="flex items-center gap-2 bg-diana-card border border-diana-border text-diana-brown px-4 py-2.5 rounded-xl text-sm font-semibold hover:text-diana-cream hover:border-diana-gold/30 transition-all">
              <FiEyeOff size={15} /> {t('produits.produitsMasques')} {overlay.deletedIds.length > 0 && `(${overlay.deletedIds.length})`}
            </button>
            <button onClick={openAddModal}
              className="flex items-center gap-2 bg-diana-gold text-diana-dark px-5 py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
              <FiPlus size={16} /> {t('produits.ajouterProduit')}
            </button>
          </div>
        </motion.div>

        {loading ? (
          <p className="text-diana-brown text-sm">{t('common.loading')}</p>
        ) : showHidden ? (
          <div>
            <h3 className="font-fraunces text-lg text-diana-cream mb-4">{t('produits.produitsMasques')}</h3>
            {hiddenBaseProducts.length === 0 ? (
              <p className="text-diana-brown text-sm italic">{t('produits.aucunProduitMasque')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {hiddenBaseProducts.map((product) => (
                  <div key={product.id} className="bg-diana-card border border-diana-border rounded-xl p-4 opacity-70">
                    <p className="text-sm font-medium text-diana-cream mb-1 truncate">{getProductDisplayName(product, lang)}</p>
                    <p className="text-xs text-diana-brown mb-2 capitalize">{getCategoryLabel(LEAF_CATEGORIES.find(c => c.id === product.category), lang) || product.category}</p>
                    <p className="font-fraunces text-lg text-diana-gold mb-3">{product.price.toFixed(2)} DH</p>
                    <button onClick={() => handleRestore(product.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-emerald-600/90 text-white hover:brightness-110 transition-all">
                      <FiRotateCcw size={12} /> {t('produits.reafficher')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="relative max-w-md mb-6">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={18} />
              <input type="text" placeholder={t('produits.rechercherProduit')} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filteredProducts.map((product, i) => (
                  <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: Math.min(i, 20) * 0.02 }}
                    className="bg-diana-card border border-diana-border rounded-xl p-4 group hover:border-diana-gold/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-diana-dark flex items-center justify-center text-diana-gold overflow-hidden">
                        {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <FiTag size={16} />}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(product)}
                          className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-gold transition-colors"><FiEdit3 size={12} /></button>
                        <button onClick={() => handleDelete(product)}
                          className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-danger transition-colors"><FiTrash2 size={12} /></button>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-diana-cream mb-1 truncate">{getProductDisplayName(product, lang)}{product.isCustom && <span className="ml-1.5 text-[9px] uppercase tracking-wide text-diana-gold/70">{t('produits.ajoute')}</span>}</p>
                    <p className="text-xs text-diana-brown mb-2 capitalize">{getCategoryLabel(LEAF_CATEGORIES.find(c => c.id === product.category), lang) || product.category}</p>
                    <p className="font-fraunces text-lg text-diana-gold">{product.price.toFixed(2)} DH</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        <AnimatePresence>
          {showAddModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowAddModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-diana-card border border-diana-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-gold-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-fraunces text-xl text-diana-cream mb-6">{editingProduct ? t('produits.modifierProduit') : t('produits.ajouterProduitTitre')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">{t('produits.nomProduit')}</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" placeholder={t('produits.nomProduit')} />
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">{t('produits.nomProduitAr')}</label>
                    <input type="text" dir="rtl" value={formData.nameAr} onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm"
                      placeholder={formData.name ? autoTranslateProductNameToAr(formData.name) : ''} />
                    <p className="text-[11px] text-diana-brown mt-1">{t('produits.nomProduitArHelp')}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">{t('produits.prix')}</label>
                    <NumericField value={formData.price} onChange={(v) => setFormData(prev => ({ ...prev, price: v }))} placeholder="0.00" title={t('produits.prix')} unit="DH"
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream text-left focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">{t('produits.categorie')}</label>
                    <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50 transition-colors text-sm appearance-none">
                      {LEAF_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{getCategoryLabel(cat, lang)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">{t('produits.image')}</label>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setImageMode('url')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${imageMode === 'url' ? 'bg-diana-gold text-diana-dark' : 'bg-diana-dark/40 text-diana-brown border border-diana-border'}`}>
                        <FiLink size={12} /> {t('produits.url')}
                      </button>
                      <button type="button" onClick={() => setImageMode('upload')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${imageMode === 'upload' ? 'bg-diana-gold text-diana-dark' : 'bg-diana-dark/40 text-diana-brown border border-diana-border'}`}>
                        <FiUpload size={12} /> {t('produits.telecharger')}
                      </button>
                    </div>
                    {imageMode === 'url' ? (
                      <input type="text" value={formData.image.startsWith('data:') ? '' : formData.image}
                        onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" placeholder="https://..." />
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-diana-border text-diana-brown hover:border-diana-gold/50 hover:text-diana-cream transition-colors text-sm">
                        <FiUpload size={14} /> {t('produits.choisirImage')}
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    {formData.image && (
                      <div className="relative mt-3 w-20 h-20 rounded-lg overflow-hidden bg-diana-dark border border-diana-border">
                        <img src={formData.image} alt={t('produits.apercu')} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"><FiX size={11} /></button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddModal(false)} disabled={saving}
                    className="flex-1 py-3 rounded-xl text-sm text-diana-brown border border-diana-border hover:text-diana-cream hover:border-diana-gold/30 transition-colors disabled:opacity-50">{t('common.cancel')}</button>
                  <button onClick={editingProduct ? handleUpdate : handleAdd} disabled={saving}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 transition-all disabled:opacity-50">
                    {saving ? t('common.saving') : (editingProduct ? t('common.edit') : t('common.add'))}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
