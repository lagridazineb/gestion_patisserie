import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NumericField from './NumericField'

// Modal "Confirmer le paiement" — même structure que la maquette d'origine
// (Méthode / Montant à payer / Montant reçu / Monnaie à rendre / Confirmer-Annuler)
// mais habillée dans la palette marron / beige de Pâtisserie Dianna.
export default function ConfirmPaymentModal({ open, method, amountDue, onConfirm, onCancel }) {
  const [received, setReceived] = useState('')

  useEffect(() => {
    if (open) setReceived((amountDue || 0).toFixed(2))
  }, [open, amountDue])

  const receivedValue = parseFloat(received) || 0
  const dueValue = amountDue || 0
  const monnaie = Math.max(0, receivedValue - dueValue)
  const insufficient = method === 'cash' && receivedValue < dueValue

  const confirm = () => {
    if (insufficient) return
    onConfirm({ amountReceived: receivedValue, change: monnaie })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={onCancel}>
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="bg-[#FFF6EC] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 border border-[#E7CCB4]"
            onClick={(e) => e.stopPropagation()}>

            <h2 className="text-2xl font-fraunces font-bold text-center text-[#3A2A18] mb-5">Confirmer le paiement</h2>

            <p className="text-center text-[#5C4326] mb-1.5">
              Méthode: <span className="font-bold text-[#8B5A2B]">{method === 'cash' ? 'ESPECE' : 'TPE'}</span>
            </p>
            <p className="text-center text-[#5C4326] mb-4">
              Montant à payer: <span className="font-bold text-[#8B5A2B]">{dueValue.toFixed(2)} DH</span>
            </p>

            <hr className="border-[#E7CCB4] mb-4" />

            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="font-semibold text-[#5C4326] shrink-0">Montant reçu (DH):</label>
              <NumericField value={received} onChange={setReceived} prefill
                title="Montant reçu" subtitle="Confirmer le paiement" unit="DH"
                className="w-32 px-3 py-2 bg-white border border-[#D9A86C] rounded-lg text-right text-lg font-semibold text-[#3A2A18] focus:outline-none focus:border-[#C89A5C]" />
            </div>

            <p className="text-center mb-1">
              <span className="text-[#5C4326]">Monnaie à rendre: </span>
              <span className="font-bold text-emerald-700">{monnaie.toFixed(2)} DH</span>
            </p>
            {insufficient && (
              <p className="text-center text-xs text-red-700 mb-2">Montant reçu insuffisant</p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={confirm} disabled={insufficient}
                className="py-3 rounded-xl bg-[#8B5A2B] text-white font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                Confirmer
              </button>
              <button onClick={onCancel}
                className="py-3 rounded-xl bg-white text-[#8B5A2B] font-bold border-2 border-[#8B5A2B]/50 hover:bg-[#8B5A2B]/10 transition-all active:scale-[0.98]">
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
