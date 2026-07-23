import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiClock } from 'react-icons/fi'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const pad = (n) => String(n).padStart(2, '0')

// Colonne défilante d'un sélecteur de temps (heures ou minutes), format 24h.
function WheelColumn({ values, selected, onSelect, label }) {
  const containerRef = useRef(null)
  const itemRefs = useRef({})

  useEffect(() => {
    const el = itemRefs.current[selected]
    if (el && containerRef.current) {
      el.scrollIntoView({ block: 'center' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex-1 min-w-0">
      <p className="text-center text-[10px] tracking-[2px] uppercase text-diana-brown mb-1.5">{label}</p>
      <div ref={containerRef} className="h-48 overflow-y-auto rounded-xl bg-diana-dark/30 border border-diana-border py-1 no-scrollbar">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            ref={(el) => { itemRefs.current[v] = el }}
            onClick={() => onSelect(v)}
            className={`w-full text-center py-2 text-base tabular-nums transition-colors rounded-lg
              ${v === selected ? 'bg-diana-gold text-diana-dark font-bold' : 'text-diana-cream hover:bg-diana-gold/10 font-medium'}`}>
            {pad(v)}
          </button>
        ))}
      </div>
    </div>
  )
}

// Sélecteur d'heure moderne, 100% 24h (pas de AM/PM — inutilisé au Maroc), en remplacement du
// picker natif du navigateur (input type="time") dont l'affichage dépend du système (AM/PM, mise
// en page datée...). value / onChange fonctionnent comme un champ HTML classique : "HH:MM" en string.
export default function TimePickerModal({ open, value, onConfirm, onCancel, title = 'Heure' }) {
  const [h, setH] = useState(0)
  const [m, setM] = useState(0)

  useEffect(() => {
    if (!open) return
    if (value && /^\d{1,2}:\d{2}$/.test(value)) {
      const [vh, vm] = value.split(':').map(Number)
      setH(vh)
      setM(vm)
    } else {
      const now = new Date()
      setH(now.getHours())
      setM(now.getMinutes())
    }
  }, [open, value])

  const confirm = () => onConfirm(`${pad(h)}:${pad(m)}`)

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
              <div className="min-w-0 pr-2 flex items-center gap-2">
                <FiClock className="text-diana-gold shrink-0" size={16} />
                <p className="font-fraunces text-base text-diana-cream truncate">{title}</p>
              </div>
              <button onClick={onCancel} className="shrink-0 text-diana-brown hover:text-diana-cream transition-colors p-1">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="text-center mb-3">
                <span className="font-fraunces text-3xl tabular-nums text-diana-gold">{pad(h)}:{pad(m)}</span>
              </div>
              <div className="flex gap-2.5">
                <WheelColumn values={HOURS} selected={h} onSelect={setH} label="Heures" />
                <WheelColumn values={MINUTES} selected={m} onSelect={setM} label="Minutes" />
              </div>
            </div>

            <div className="px-5 pb-5 pt-4 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={onCancel}
                className="py-3 rounded-xl text-sm font-semibold text-diana-brownDark bg-diana-creamDark/20 border border-diana-border hover:bg-diana-creamDark/30 transition-colors">
                Annuler
              </button>
              <button type="button" onClick={confirm}
                className="py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 transition-all active:scale-[0.98]">
                Valider
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
