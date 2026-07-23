import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const pad = (n) => String(n).padStart(2, '0')
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Sélecteur de date moderne (calendrier maison), en remplacement du picker natif du navigateur
// (input type="date") dont l'apparence dépend du système. value / onChange fonctionnent comme
// un champ HTML classique : "YYYY-MM-DD" en string.
export default function DatePickerModal({ open, value, onConfirm, onCancel, title = 'Date' }) {
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [selected, setSelected] = useState('')

  useEffect(() => {
    if (!open) return
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
      setSelected(value)
    } else {
      const now = new Date()
      setViewYear(now.getFullYear())
      setViewMonth(now.getMonth())
      setSelected('')
    }
  }, [open, value])

  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7 // lundi = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayISO = toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1)
  }
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1)
  }

  const confirm = () => { if (selected) onConfirm(selected) }

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
                <FiCalendar className="text-diana-gold shrink-0" size={16} />
                <p className="font-fraunces text-base text-diana-cream truncate">{title}</p>
              </div>
              <button onClick={onCancel} className="shrink-0 text-diana-brown hover:text-diana-cream transition-colors p-1">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={goPrevMonth}
                  className="p-1.5 rounded-lg text-diana-brown hover:text-diana-cream hover:bg-diana-gold/10 transition-colors">
                  <FiChevronLeft size={16} />
                </button>
                <span className="font-fraunces text-sm text-diana-gold tabular-nums">{MOIS[viewMonth]} {viewYear}</span>
                <button type="button" onClick={goNextMonth}
                  className="p-1.5 rounded-lg text-diana-brown hover:text-diana-cream hover:bg-diana-gold/10 transition-colors">
                  <FiChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {JOURS.map((j, i) => (
                  <span key={i} className="text-center text-[10px] tracking-wide uppercase text-diana-brown py-1">{j}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {Array.from({ length: firstWeekday }).map((_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const iso = toISO(viewYear, viewMonth, d)
                  const isSelected = iso === selected
                  const isToday = iso === todayISO
                  return (
                    <button key={d} type="button" onClick={() => setSelected(iso)}
                      className={`aspect-square rounded-lg text-sm tabular-nums transition-colors flex items-center justify-center
                        ${isSelected ? 'bg-diana-gold text-diana-dark font-bold' : isToday ? 'text-diana-gold font-semibold border border-diana-gold/40' : 'text-diana-cream hover:bg-diana-gold/10 font-medium'}`}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={onCancel}
                className="py-3 rounded-xl text-sm font-semibold text-diana-brownDark bg-diana-creamDark/20 border border-diana-border hover:bg-diana-creamDark/30 transition-colors">
                Annuler
              </button>
              <button type="button" onClick={confirm} disabled={!selected}
                className="py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none">
                Valider
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
