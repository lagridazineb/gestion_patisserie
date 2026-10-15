import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ATELIERS, getAtelierCategories } from '../data/products'
import NumericField from './NumericField'

// Catégories gérées par lots individuels (frigo) : non corrigeables par simple quantité/produit.
const LOT_CATEGORIES = ['gateaux_kg', 'entremet']

// Modal de correction d'une entrée de production (admin) : quantité, produit et catégorie.
// Fonctionne pour n'importe quelle date. Le serveur réajuste le stock (ancien produit -ancienne
// quantité, nouveau produit +nouvelle quantité), ce qui se répercute sur Vente, Préparateur, etc.
export default function EditProductionModal({ entry, products, isAdmin = true, onSave, onCancel }) {
  const [category, setCategory] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!entry) return
    const current = products.find((p) => p.id === entry.productId)
    setCategory(current?.category || entry.category || '')
    setProductId(entry.productId || '')
    setQuantity(String(entry.quantity))
  }, [entry, products])

  const categories = useMemo(
    () => ATELIERS.filter((a) => !LOT_CATEGORIES.includes(a.id)),
    []
  )
  const productsOfCategory = useMemo(
    () => products.filter((p) => p.category === category),
    [products, category]
  )

  if (!entry) return null

  const selected = products.find((p) => p.id === productId)
  const qty = parseFloat(String(quantity).replace(',', '.'))
  const validQty = !isNaN(qty) && qty > 0
  const productChanged = productId !== entry.productId
  const canSave = validQty && !!selected && !saving

  const handleCategoryChange = (c) => {
    setCategory(c)
    // Le produit choisi n'appartient plus à cette catégorie : on le réinitialise.
    if (selected?.category !== c) setProductId('')
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const patch = { quantity: qty }
      if (productChanged) {
        // L'atelier du préparateur est conservé si la nouvelle catégorie fait partie de son
        // groupe (ex: atelier Pâtisserie gère aussi Entremets) ; sinon il suit la catégorie.
        const keepAtelier = entry.atelier && getAtelierCategories(entry.atelier).includes(selected.category)
        Object.assign(patch, {
          productId: selected.id, product: selected.name, category: selected.category,
          price: selected.price, atelier: keepAtelier ? entry.atelier : selected.category,
        })
      }
      await onSave(patch)
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = 'w-full px-3 py-2.5 text-sm bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50'

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-5 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="font-fraunces text-lg text-diana-cream mb-1">Corriger la production</h3>
          <p className="text-xs text-diana-brown mb-4">
            Saisie du {entry.date ? String(entry.date).slice(0, 10) : ''} {entry.time || ''} · {entry.user || '—'}
          </p>

          <div className="space-y-3">
            {isAdmin && (
              <>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-diana-brown mb-1">Catégorie</label>
                  <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className={fieldClass}>
                    {categories.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-diana-brown mb-1">Produit</label>
                  <select value={productId} onChange={(e) => setProductId(e.target.value)} className={fieldClass}>
                    <option value="" disabled>Choisir un produit…</option>
                    {productsOfCategory.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-diana-brown mb-1">Quantité</label>
              <NumericField value={quantity} onChange={setQuantity} title={selected?.name || entry.product}
                unit={selected?.unit === 'kg' ? 'kg' : 'pièce(s)'} className={fieldClass + ' text-left'} />
            </div>
          </div>

          {productChanged && (
            <p className="text-[11px] text-diana-accentLight mt-3">
              Le stock de « {entry.product} » baisse de {entry.quantity} et celui de « {selected?.name || '…'} » augmente de {validQty ? qty : '…'}.
            </p>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-diana-dark text-diana-brown border border-diana-border">Annuler</button>
            <button onClick={handleSave} disabled={!canSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-diana-gold text-diana-darker disabled:opacity-40">
              {saving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
