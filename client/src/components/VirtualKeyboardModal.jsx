import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDelete, FiX, FiCheck, FiChevronUp } from 'react-icons/fi'

const ACCENTS = ['é', 'è', 'à', 'ç', 'ù', 'ï', 'ö', 'â']
const ROW1 = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
const ROW2 = ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm']
const ROW3 = ['w', 'x', 'c', 'v', 'b', 'n']
const NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const SYM1 = ['@', '#', '$', '%', '&', '*', '(', ')', '/']
const SYM2 = ['-', '_', '+', '=', ':', ';', '"']
const SYM3 = [',', '.', '!', '?', "'"]

// Clavier virtuel générique (AZERTY), en panneau ancré en bas de l'écran.
// Utilisé partout où on doit saisir du texte (nom, téléphone, note...) à la place
// du clavier natif de l'appareil — utile sur une caisse tactile sans clavier physique.
// La saisie est synchronisée en direct via onChange (comme un vrai clavier).
export default function VirtualKeyboardModal({
  open, title, subtitle, value, onChange, onClose, multiline = false,
}) {
  const [shift, setShift] = useState(true) // Majuscule sur la 1ère lettre par défaut
  const [symbols, setSymbols] = useState(false)
  const [typedOnce, setTypedOnce] = useState(false)

  useEffect(() => {
    if (open) { setShift(true); setSymbols(false); setTypedOnce(false) }
  }, [open])

  const v = value || ''

  const insert = (char) => {
    onChange(v + char)
    if (shift && !typedOnce) setShift(false)
    setTypedOnce(true)
  }
  const backspace = () => onChange(v.slice(0, -1))
  const space = () => onChange(v + ' ')
  const newline = () => onChange(v + '\n')

  const letterRows = symbols
    ? [SYM1, SYM2, SYM3]
    : [ROW1, ROW2, ROW3]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-black/40" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[141] bg-diana-card border-t border-diana-gold/30 rounded-t-2xl shadow-gold-lg px-3 sm:px-5 pt-3 pb-4 max-w-3xl mx-auto"
            onClick={(e) => e.stopPropagation()}>

            {/* Poignée */}
            <div className="flex justify-center mb-2">
              <div className="w-10 h-1 rounded-full bg-diana-border" />
            </div>

            {/* Aperçu de la saisie */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                {subtitle && <p className="text-[10px] tracking-[2px] uppercase text-diana-brown mb-0.5">{subtitle}</p>}
                <div className="bg-diana-dark/40 border border-diana-border rounded-xl px-3 py-2 min-h-[42px] flex items-center">
                  <span className="font-fraunces text-base text-diana-cream truncate whitespace-pre-wrap">
                    {v === '' ? <span className="opacity-40 font-inter text-sm">{title || 'Saisie'}</span> : v}
                  </span>
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="shrink-0 mt-4 text-diana-brown hover:text-diana-cream transition-colors p-1">
                <FiX size={20} />
              </button>
            </div>

            {/* Accents rapides */}
            {!symbols && (
              <div className="grid grid-cols-8 gap-1.5 mb-1.5">
                {ACCENTS.map((k) => (
                  <button key={k} type="button" onClick={() => insert(shift ? k.toUpperCase() : k)}
                    className="h-9 rounded-lg text-xs text-diana-brownLight bg-diana-dark/20 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                    {shift ? k.toUpperCase() : k}
                  </button>
                ))}
              </div>
            )}

            {/* Chiffres */}
            <div className="grid grid-cols-10 gap-1.5 mb-1.5">
              {NUMS.map((k) => (
                <button key={k} type="button" onClick={() => insert(k)}
                  className="h-11 rounded-lg text-sm font-medium text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                  {k}
                </button>
              ))}
            </div>

            {/* Lettres / Symboles */}
            <div className="space-y-1.5 mb-1.5">
              <div className="grid grid-cols-10 gap-1.5">
                {letterRows[0].map((k) => (
                  <button key={k} type="button" onClick={() => insert(symbols ? k : (shift ? k.toUpperCase() : k))}
                    className="h-11 rounded-lg text-sm font-medium text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                    {symbols ? k : (shift ? k.toUpperCase() : k)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-10 gap-1.5 px-[5%]">
                {letterRows[1].map((k) => (
                  <button key={k} type="button" onClick={() => insert(symbols ? k : (shift ? k.toUpperCase() : k))}
                    className="h-11 rounded-lg text-sm font-medium text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                    {symbols ? k : (shift ? k.toUpperCase() : k)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                <button type="button" onClick={() => setShift((s) => !s)} disabled={symbols}
                  className={`col-span-1 h-11 rounded-lg flex items-center justify-center transition-colors
                    ${shift && !symbols ? 'bg-diana-gold text-diana-dark border-diana-gold' : 'bg-diana-dark/30 text-diana-cream border-diana-border'}
                    border hover:bg-diana-gold/10 active:scale-95 disabled:opacity-30`}>
                  <FiChevronUp size={18} />
                </button>
                {letterRows[2].map((k) => (
                  <button key={k} type="button" onClick={() => insert(symbols ? k : (shift ? k.toUpperCase() : k))}
                    className="h-11 rounded-lg text-sm font-medium text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                    {symbols ? k : (shift ? k.toUpperCase() : k)}
                  </button>
                ))}
                <button type="button" onClick={backspace}
                  className="col-span-1 h-11 rounded-lg flex items-center justify-center text-diana-accentLight bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                  <FiDelete size={18} />
                </button>
              </div>
            </div>

            {/* Dernière rangée : 123/ABC, espace, point, valider */}
            <div className="grid grid-cols-6 gap-1.5">
              <button type="button" onClick={() => setSymbols((s) => !s)}
                className="col-span-1 h-11 rounded-lg text-xs font-semibold text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                {symbols ? 'ABC' : '123'}
              </button>
              <button type="button" onClick={space}
                className="col-span-3 h-11 rounded-lg text-xs text-diana-brownLight bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                Espace
              </button>
              {multiline ? (
                <button type="button" onClick={newline}
                  className="col-span-1 h-11 rounded-lg text-xs font-semibold text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                  Entrée
                </button>
              ) : (
                <button type="button" onClick={() => insert('.')}
                  className="col-span-1 h-11 rounded-lg text-sm font-medium text-diana-cream bg-diana-dark/30 border border-diana-border hover:bg-diana-gold/10 active:scale-95 transition-colors">
                  .
                </button>
              )}
              <button type="button" onClick={onClose}
                className="col-span-1 h-11 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold bg-diana-gold text-diana-dark hover:brightness-110 active:scale-95 transition-all">
                <FiCheck size={16} /> OK
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
