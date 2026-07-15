import React, { useState } from 'react'
import NumberPadModal from './NumberPadModal'

// Remplacement direct de <input type="number">, en gardant la même logique value/onChange
// (onChange reçoit directement la nouvelle valeur en string, comme e.target.value ferait).
// Ouvre un clavier numérique en popup au lieu du clavier natif du téléphone/PC.
export default function NumericField({
  value, onChange, placeholder, title, subtitle, unit, allowDecimal = true, className = '', autoFocus, prefill = false,
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} autoFocus={autoFocus}
        className={className || 'w-full px-3 py-2.5 text-sm bg-white border border-diana-border rounded-lg text-left focus:outline-none focus:border-diana-gold/50'}>
        {value !== '' && value !== undefined && value !== null ? String(value) : (
          <span className="opacity-50">{placeholder || '0'}</span>
        )}
      </button>
      <NumberPadModal
        open={open}
        title={title || placeholder || 'Valeur'}
        subtitle={subtitle}
        unit={unit}
        initialValue={value}
        allowDecimal={allowDecimal}
        prefill={prefill}
        onConfirm={(n) => { onChange(String(n)); setOpen(false) }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
