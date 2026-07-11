import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Popup pour un type "Layer hXX" : liste les 5 tailles disponibles (Layer 10/hXX à 30/hXX),
// chacune avec son propre prix. L'utilisateur peut cocher autant de tailles qu'il veut ;
// chaque case cochée devient sa propre ligne dans la commande (prix indépendant).
export default function LayerModal({ open, product, variants, qty = 1, onConfirm, onCancel }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (open) setSelected([])
  }, [open, product])

  if (!product) return null

  const toggle = (variantId) => {
    setSelected((prev) => prev.includes(variantId) ? prev.filter((x) => x !== variantId) : [...prev, variantId])
  }

  const isValid = selected.length > 0

  const confirm = () => {
    if (!isValid) return
    onConfirm(variants.filter((v) => selected.includes(v.id)))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            className="bg-diana-card border border-diana-gold/30 rounded-2xl w-full max-w-sm shadow-gold-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 text-center border-b border-diana-border">
              <h3 className="font-fraunces text-xl text-diana-cream mb-1">{product.name}</h3>
              <p className="text-xs text-diana-brown">Coche toutes les tailles voulues {qty > 1 ? `(x${qty} chacune)` : ''}</p>
            </div>

            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {variants.map((v) => {
                const checked = selected.includes(v.id)
                return (
                  <label key={v.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-diana-border/50 last:border-0 cursor-pointer">
                    <span className="flex items-center gap-3">
                      <input type="checkbox" checked={checked} onChange={() => toggle(v.id)}
                        className="w-4 h-4 accent-diana-gold" />
                      <span className="text-sm text-diana-cream">{v.name}</span>
                    </span>
                    <span className="text-sm text-diana-gold font-medium">{v.price.toFixed(2)} DH</span>
                  </label>
                )
              })}
            </div>

            <p className="text-center text-xs text-diana-brown pb-2">{selected.length} sélectionné(s)</p>

            <div className="px-6 pb-6 flex flex-col gap-2.5">
              <button onClick={confirm} disabled={!isValid}
                className="py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                Ajouter à la commande
              </button>
              <button onClick={onCancel}
                className="py-3 rounded-xl text-sm font-semibold text-diana-brownDark bg-diana-creamDark/20 border border-diana-border hover:bg-diana-creamDark/30 transition-colors">
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
