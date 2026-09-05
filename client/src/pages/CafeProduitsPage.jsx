import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiImage, FiDroplet } from 'react-icons/fi'
import apiClient from '../api/client'
import { useNotification } from '../context/NotificationContext'
import { resizeImageFile } from '../utils/resizeImage'

const EMPTY_FORM = { id: null, name: '', price: '', image: '', waterOption: true }

export default function CafeProduitsPage() {
  const { addNotification } = useNotification()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { mode: 'add' | 'edit', form }
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // product

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/cafe/products')
      setProducts(data.products)
    } catch (e) {
      addNotification("Erreur lors du chargement des produits", 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  const openAdd = () => setModal({ mode: 'add', form: { ...EMPTY_FORM } })
  const openEdit = (p) => setModal({ mode: 'edit', form: { id: p.id, name: p.name, price: String(p.price), image: p.image || '', waterOption: p.waterOption } })
  const closeModal = () => setModal(null)

  const updateForm = (patch) => setModal((m) => m ? { ...m, form: { ...m.form, ...patch } } : m)

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImageFile(file, { width: 500, height: 400, quality: 0.82 })
      updateForm({ image: dataUrl })
    } catch (err) {
      addNotification("Impossible de traiter cette image", 'error')
    }
  }

  const handleSave = async () => {
    if (!modal) return
    const { form, mode } = modal
    const price = parseFloat(String(form.price).replace(',', '.'))
    if (!form.name.trim()) { addNotification('Le nom du produit est requis', 'error'); return }
    if (isNaN(price) || price < 0) { addNotification('Prix invalide', 'error'); return }

    setSaving(true)
    try {
      if (mode === 'add') {
        await apiClient.post('/cafe/products', { name: form.name.trim(), price, image: form.image || null, waterOption: form.waterOption })
        addNotification('Produit ajouté', 'success')
      } else {
        await apiClient.put(`/cafe/products/${form.id}`, { name: form.name.trim(), price, image: form.image, waterOption: form.waterOption })
        addNotification('Produit modifié', 'success')
      }
      closeModal()
      loadProducts()
    } catch (e) {
      addNotification(e.response?.data?.error || "Erreur lors de l'enregistrement", 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await apiClient.delete(`/cafe/products/${confirmDelete.id}`)
      addNotification('Produit supprimé', 'success')
      setConfirmDelete(null)
      loadProducts()
    } catch (e) {
      addNotification(e.response?.data?.error || 'Erreur lors de la suppression', 'error')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-cafe-bg">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[2px] text-cafe-espressoLight/50 mb-1">Dianna Café</p>
          <h2 className="font-display text-2xl font-bold text-cafe-espresso">Produits</h2>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-cafe-espresso text-white hover:brightness-110 transition-all active:scale-[0.98]">
          <FiPlus size={16} /> Ajouter un produit
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-cafe-espressoLight/60 italic">Chargement...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {products.map((p) => (
            <div key={p.id} className="bg-cafe-card border border-cafe-border rounded-2xl overflow-hidden flex flex-col">
              <div className="w-full h-24 bg-cafe-bgDeep overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cafe-espressoLight/30"><FiImage size={22} /></div>
                )}
              </div>
              <div className="p-3.5 flex flex-col flex-1">
                <p className="font-display font-semibold text-cafe-espresso leading-snug mb-1">{p.name}</p>
                <p className="text-cafe-terracotta font-semibold text-lg mb-2">{p.price.toFixed(2)} DH</p>
                {p.waterOption && (
                  <span className="self-start flex items-center gap-1 text-[11px] font-medium text-cafe-terracotta bg-cafe-terracotta/10 px-2 py-1 rounded-full select-none mb-2">
                    <FiDroplet size={11} /> Option eau
                  </span>
                )}
                <div className="mt-auto flex gap-2 pt-1">
                  <button onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-cafe-bg text-cafe-espresso hover:bg-cafe-terracotta/10 transition-colors">
                    <FiEdit2 size={13} /> Modifier
                  </button>
                  <button onClick={() => setConfirmDelete(p)}
                    className="flex items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold bg-cafe-danger/10 text-cafe-danger hover:bg-cafe-danger/20 transition-colors">
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout / modification */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-cafe-card rounded-2xl p-5 max-w-sm w-full shadow-cafe-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display font-semibold text-cafe-espresso">{modal.mode === 'add' ? 'Ajouter un produit' : 'Modifier le produit'}</p>
                <button onClick={closeModal} className="text-cafe-espressoLight/60"><FiX size={18} /></button>
              </div>

              <div className="w-full h-32 rounded-xl bg-cafe-bgDeep overflow-hidden mb-3 flex items-center justify-center">
                {modal.form.image ? (
                  <img src={modal.form.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FiImage size={26} className="text-cafe-espressoLight/30" />
                )}
              </div>
              <label className="block mb-4">
                <span className="text-xs font-medium text-cafe-espresso mb-1 block">Photo du produit</span>
                <input type="file" accept="image/*" onChange={handleImagePick}
                  className="w-full text-xs text-cafe-espressoLight/70 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cafe-terracotta/10 file:text-cafe-terracotta" />
                <span className="text-[11px] text-cafe-espressoLight/50 mt-1 block">L'image est automatiquement redimensionnée et recadrée.</span>
              </label>

              <label className="block mb-3">
                <span className="text-xs font-medium text-cafe-espresso mb-1 block">Nom</span>
                <input type="text" value={modal.form.name} onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="Ex : Jus mangue"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cafe-cream border border-cafe-border text-sm text-cafe-espresso focus:outline-none focus:ring-2 focus:ring-cafe-terracotta/40" />
              </label>

              <label className="block mb-3">
                <span className="text-xs font-medium text-cafe-espresso mb-1 block">Prix (DH)</span>
                <input type="text" inputMode="decimal" value={modal.form.price} onChange={(e) => updateForm({ price: e.target.value })}
                  placeholder="Ex : 15"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cafe-cream border border-cafe-border text-sm text-cafe-espresso focus:outline-none focus:ring-2 focus:ring-cafe-terracotta/40" />
              </label>

              <label className="flex items-center justify-between mb-5 px-3.5 py-2.5 rounded-xl bg-cafe-cream border border-cafe-border cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-cafe-espresso">
                  <FiDroplet className="text-cafe-terracotta" size={15} /> Option "ajouter une eau" disponible
                </span>
                <input type="checkbox" checked={modal.form.waterOption} onChange={(e) => updateForm({ waterOption: e.target.checked })}
                  className="w-4 h-4 accent-cafe-terracotta" />
              </label>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-cafe-espresso text-white hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60">
                {saving ? 'Enregistrement...' : modal.mode === 'add' ? 'Ajouter le produit' : 'Enregistrer les modifications'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation suppression */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-cafe-card rounded-2xl p-5 max-w-xs w-full shadow-cafe-lg text-center">
              <p className="font-display font-semibold text-cafe-espresso mb-1">Supprimer « {confirmDelete.name} » ?</p>
              <p className="text-xs text-cafe-espressoLight/60 mb-4">Ce produit ne sera plus visible en caisse.</p>
              <div className="flex gap-2.5">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cafe-bg text-cafe-espresso">Annuler</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cafe-danger text-white">Supprimer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
