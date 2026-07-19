import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiShield, FiX } from 'react-icons/fi'

// Modal générique : demande le code (mot de passe du compte) avant une action sensible
// (déconnexion, vider la caisse). `onConfirm(code)` doit renvoyer une Promise ; si elle est
// rejetée (code incorrect), on affiche l'erreur sans fermer le modal.
export default function CodeConfirmModal({ open, title, description, confirmLabel = 'Confirmer', onConfirm, onCancel }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) { setCode(''); setError(''); setIsLoading(false) }
  }, [open])

  const handleConfirm = async () => {
    if (!code) { setError('Veuillez entrer le code.'); return }
    setIsLoading(true)
    setError('')
    try {
      await onConfirm(code)
    } catch (e) {
      setError(e?.response?.data?.error || 'Code incorrect. Réessayez.')
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
          <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-7 max-w-xs w-full shadow-gold-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-full bg-diana-gold/15 flex items-center justify-center"><FiShield size={18} className="text-diana-gold" /></div>
              <button onClick={onCancel} className="text-diana-brown hover:text-diana-cream"><FiX size={18} /></button>
            </div>
            <h3 className="font-fraunces text-lg font-medium text-diana-cream mb-1">{title}</h3>
            {description && <p className="text-xs text-diana-brown mb-4">{description}</p>}

            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
              placeholder="Code (mot de passe)"
              className="w-full px-4 py-3 text-sm bg-diana-dark/40 border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50 mb-1"
            />
            {error && <p className="text-xs text-diana-danger mt-1.5">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button onClick={onCancel} disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-diana-dark/40 border border-diana-border text-diana-brown hover:text-diana-cream transition-colors">
                Annuler
              </button>
              <button onClick={handleConfirm} disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-diana-gold text-diana-dark hover:brightness-105 transition-all disabled:opacity-50">
                {isLoading ? '...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
