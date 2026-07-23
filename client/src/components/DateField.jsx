import React, { useState } from 'react'
import DatePickerModal from './DatePickerModal'

const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// Remplacement direct de <input type="date"> : même logique value/onChange ("YYYY-MM-DD" en
// string), mais avec un calendrier maison au design cohérent avec le reste de l'app (comme
// TimeField pour l'heure), plutôt que le picker natif du système d'exploitation.
export default function DateField({ value, onChange, placeholder = 'Sélectionner une date', className = '', title }) {
  const [open, setOpen] = useState(false)

  const display = (() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const [y, m, d] = value.split('-').map(Number)
    return `${d} ${MOIS_COURT[m - 1]} ${y}`
  })()

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={className || 'w-full px-3 py-2.5 text-sm bg-white border border-diana-border rounded-lg text-left focus:outline-none focus:border-diana-gold/50'}>
        {display ? <span className="tabular-nums">{display}</span> : <span className="opacity-50">{placeholder}</span>}
      </button>
      <DatePickerModal
        open={open}
        value={value}
        title={title}
        onConfirm={(v) => { onChange(v); setOpen(false) }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
