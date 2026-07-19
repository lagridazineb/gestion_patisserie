import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiLock, FiCheck } from 'react-icons/fi'
import NumericField from './NumericField'

// Popup obligatoire affiché juste après le login d'un caissier : il doit indiquer le montant
// du dépôt (fond de caisse) avant de pouvoir accéder à la Caisse — impossible à fermer sans
// avoir saisi un nombre (même 0).
export default function DepositModal({ open, userName, onConfirm, isLoading }) {
  const [amount, setAmount] = useState('')

  if (!open) return null

  const hasValue = amount !== '' && amount !== null && amount !== undefined && !isNaN(Number(amount))

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-diana-card border border-diana-border rounded-2xl p-7 max-w-sm w-full shadow-gold-lg">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-diana-gold/15 flex items-center justify-center mx-auto mb-3">
            <FiLock size={22} className="text-diana-gold" />
          </div>
          <h3 className="font-fraunces text-xl font-medium text-diana-cream">Dépôt d'ouverture de caisse</h3>
          <p className="text-sm text-diana-brown mt-1">Bonjour {userName || ''}, indiquez le montant du fond de caisse pour commencer votre session.</p>
        </div>

        <label className="block text-xs font-semibold text-diana-brown mb-2 uppercase tracking-wide">Montant du dépôt (DH)</label>
        <NumericField
          value={amount}
          onChange={setAmount}
          placeholder="Entrez le montant (0 si aucun)"
          title="Dépôt d'ouverture"
          subtitle="Montant du fond de caisse en DH"
          allowDecimal
          autoFocus
          className="w-full px-4 py-3.5 text-base bg-diana-dark/40 border border-diana-border rounded-xl text-left text-diana-cream focus:outline-none focus:border-diana-gold/50"
        />

        <p className="text-[11px] text-diana-brown italic mt-2">La saisie est obligatoire, même si le montant est 0.</p>

        <button
          onClick={() => hasValue && onConfirm(Number(amount))}
          disabled={!hasValue || isLoading}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-diana-gold text-diana-dark py-3.5 rounded-xl text-sm font-bold hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiCheck size={17} /> {isLoading ? 'Enregistrement...' : 'Commencer la session'}
        </button>
      </motion.div>
    </div>
  )
}
