import React, { useState } from 'react'
import TimePickerModal from './TimePickerModal'

// Remplacement direct de <input type="time"> : même logique value/onChange ("HH:MM" en string),
// mais avec un sélecteur maison en 24h (sans AM/PM, non utilisé au Maroc) et un design cohérent
// avec le reste de l'app, plutôt que le picker natif du système d'exploitation.
export default function TimeField({ value, onChange, placeholder = '--:--', className = '', title }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={className || 'w-full px-3 py-2.5 text-sm bg-white border border-diana-border rounded-lg text-left focus:outline-none focus:border-diana-gold/50'}>
        {value ? <span className="tabular-nums">{value}</span> : <span className="opacity-50">{placeholder}</span>}
      </button>
      <TimePickerModal
        open={open}
        value={value}
        title={title}
        onConfirm={(v) => { onChange(v); setOpen(false) }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
