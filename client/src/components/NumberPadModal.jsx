import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDelete, FiX } from 'react-icons/fi'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

// Clavier numérique en popup, générique — utilisé partout où on doit saisir un nombre
// (quantité, prix, montant, remise...) à la place du clavier natif du téléphone/PC,
// qui pose parfois problème (mauvais layout, se ferme, recouvre l'écran...).
export default function NumberPadModal({ open, title, subtitle, unit, initialValue, allowDecimal = true, onConfirm, onCancel }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    // Démarre toujours vide : taper "2" ne doit pas donner "12" à cause d'une valeur pré-remplie.
    if (open) setValue('')
  }, [open])

  const press = (key) => {
    if (key === 'back') { setValue((v) => v.slice(0, -1)); return }
    if (key === '.') {
      if (!allowDecimal) return
      if (value.includes('.')) return
      setValue((v) => (v === '' ? '0.' : v + '.'))
      return
    }
    setValue((v) => (v === '0' ? key : v + key))
  }

  const clearAll = () => setValue('')
  const numeric = parseFloat(value)
  const isValid = !isNaN(numeric) && numeric >= 0
  const confirm = () => { if (isValid) onConfirm(numeric) }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onCancel}>
          <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="bg-diana-card border border-diana-gold/30 rounded-2xl w-full max-w-xs shadow-gold-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-diana-border">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] tracking-[2px] uppercase text-diana-brown mb-1">{subtitle || 'Saisie'}</p>
                <p className="font-fraunces text-base text-diana-cream truncate">{title}</p>
                {initialValue !== undefined && initialValue !== null && initialValue !== '' && (
                  <p className="text-[11px] text-diana-brownLight mt-0.5">Valeur actuelle : {initialValue}{unit ? ` ${unit}` : ''}</p>
                )}
              </div>
              <button onClick={onCancel} className="shrink-0 text-diana-brown hover:text-diana-cream transition-colors p-1">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2">
              <div className="bg-diana-dark/40 border border-diana-border rounded-xl px-4 py-3 text-right">
                <span className="font-fraunces text-3xl text-diana-gold tabular-nums">{value === '' ? '0' : value}</span>
                {unit && <span className="ml-1.5 text-xs text-diana-brown">{unit}</span>}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button key={k} type="button" onClick={() => press(k)}
                  disabled={k === '.' && !allowDecimal}
                  className={`h-12 rounded-xl text-lg font-medium flex items-center justify-center transition-colors
                    ${k === 'back' ? 'text-diana-accentLight' : 'text-diana-cream'}
                    bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 hover:border-diana-gold/40
                    disabled:opacity-25 disabled:cursor-not-allowed active:scale-95`}>
                  {k === 'back' ? <FiDelete size={18} /> : k}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={clearAll}
                className="py-3 rounded-xl text-sm font-semibold text-diana-brownDark bg-diana-creamDark/20 border border-diana-border hover:bg-diana-creamDark/30 transition-colors">
                Effacer
              </button>
              <button type="button" onClick={confirm} disabled={!isValid}
                className="py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                Valider
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
