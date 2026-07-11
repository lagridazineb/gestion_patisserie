import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SalePlateauModal({ open, product, requiredCount, onConfirm, onCancel }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (open) setSelected([])
  }, [open, product])

  if (!product) return null

  const toggle = (arabic) => {
    setSelected((prev) => {
      if (prev.includes(arabic)) return prev.filter((x) => x !== arabic)
      if (prev.length >= requiredCount) return prev
      return [...prev, arabic]
    })
  }

  const isValid = selected.length === requiredCount

  const confirm = () => {
    if (!isValid) return
    onConfirm(`Composition : ${selected.join(', ')}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            className="bg-white text-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100">
              <h3 className="font-fraunces text-xl font-bold mb-1">Composition de Plateau</h3>
              <p className="text-sm text-gray-500">
                Composition pour : <span className="font-semibold text-[#0070f3]">{product.name}</span> (Sélectionnez <span className="font-semibold text-[#0070f3]">{requiredCount} composant(s)</span>)
              </p>
            </div>

            <div className="px-6 py-4 max-h-72 overflow-y-auto border border-gray-100 mx-6 my-4 rounded-lg">
              {product._components.map((c) => {
                const checked = selected.includes(c.arabic)
                return (
                  <label key={c.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggle(c.arabic)}
                      disabled={!checked && selected.length >= requiredCount}
                      className="w-4 h-4 accent-[#0070f3]" />
                    <span dir="rtl" className="text-base text-gray-800 flex-1 text-right">{c.arabic}</span>
                  </label>
                )
              })}
            </div>

            <p className="text-center text-xs text-gray-500 pb-2">{selected.length} / {requiredCount} sélectionné(s)</p>

            <div className="px-6 pb-6 flex flex-col gap-2.5">
              <button onClick={confirm} disabled={!isValid}
                className={`py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${isValid ? 'bg-[#0070f3] text-white hover:brightness-110' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                Confirmer sélection
              </button>
              <button onClick={onCancel}
                className="py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-gray-500 text-white hover:brightness-110 transition-all">
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
