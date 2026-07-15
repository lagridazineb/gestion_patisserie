import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiTrash2, FiEdit3, FiImage, FiTag } from 'react-icons/fi'
import { ALL_PRODUCTS, LEAF_CATEGORIES } from '../data/products'
import { useNotification } from '../context/NotificationContext'
import NumericField from '../components/NumericField'

export default function ProduitsPage() {
  const [products, setProducts] = useState(ALL_PRODUCTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const { addNotification } = useNotification()

  const [formData, setFormData] = useState({ name: '', price: '', category: 'pain', image: '' })

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAdd = () => {
    const price = parseFloat(formData.price)
    if (!formData.name || isNaN(price) || price <= 0) return
    const newProduct = { id: `custom_${Date.now()}`, name: formData.name, price, category: formData.category, image: formData.image || null }
    setProducts(prev => [...prev, newProduct])
    setFormData({ name: '', price: '', category: 'pain', image: '' })
    setShowAddModal(false)
    addNotification('Produit ajouté avec succès', 'success')
  }

  const handleDelete = (id) => { setProducts(prev => prev.filter(p => p.id !== id)); addNotification('Produit supprimé', 'success') }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({ name: product.name, price: String(product.price), category: product.category, image: product.image || '' })
    setShowAddModal(true)
  }

  const handleUpdate = () => {
    const price = parseFloat(formData.price)
    if (!formData.name || isNaN(price) || price <= 0) return
    setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, name: formData.name, price, category: formData.category, image: formData.image || null } : p))
    setFormData({ name: '', price: '', category: 'pain', image: '' })
    setEditingProduct(null)
    setShowAddModal(false)
    addNotification('Produit modifié avec succès', 'success')
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Catalogue</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Produits</h2>
          </div>
          <button onClick={() => { setEditingProduct(null); setFormData({ name: '', price: '', category: 'pain', image: '' }); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-diana-gold text-diana-dark px-5 py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
            <FiPlus size={16} /> Ajouter un produit
          </button>
        </motion.div>
        <div className="relative max-w-md mb-6">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={18} />
          <input type="text" placeholder="Rechercher un produit..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredProducts.map((product, i) => (
              <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.02 }}
                className="bg-diana-card border border-diana-border rounded-xl p-4 group hover:border-diana-gold/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-diana-dark flex items-center justify-center text-diana-gold">
                    {product.image ? <FiImage size={16} /> : <FiTag size={16} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(product)}
                      className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-gold transition-colors"><FiEdit3 size={12} /></button>
                    <button onClick={() => handleDelete(product.id)}
                      className="w-7 h-7 rounded-lg bg-diana-dark border border-diana-border flex items-center justify-center text-diana-brown hover:text-diana-danger transition-colors"><FiTrash2 size={12} /></button>
                  </div>
                </div>
                <p className="text-sm font-medium text-diana-cream mb-1 truncate">{product.name}</p>
                <p className="text-xs text-diana-brown mb-2 capitalize">{product.category}</p>
                <p className="font-fraunces text-lg text-diana-gold">{product.price.toFixed(2)} DH</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {showAddModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-diana-card border border-diana-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-gold-lg" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-fraunces text-xl text-diana-cream mb-6">{editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">Nom du produit</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" placeholder="Nom du produit" />
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">Prix (DH)</label>
                    <NumericField value={formData.price} onChange={(v) => setFormData(prev => ({ ...prev, price: v }))} placeholder="0.00" title="Prix" unit="DH"
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream text-left focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">Catégorie</label>
                    <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50 transition-colors text-sm appearance-none">
                      {LEAF_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-diana-brown mb-1.5">URL de l'image (optionnel)</label>
                    <input type="text" value={formData.image} onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" placeholder="https://..." />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl text-sm text-diana-brown border border-diana-border hover:text-diana-cream hover:border-diana-gold/30 transition-colors">Annuler</button>
                  <button onClick={editingProduct ? handleUpdate : handleAdd}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 transition-all">{editingProduct ? 'Modifier' : 'Ajouter'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
