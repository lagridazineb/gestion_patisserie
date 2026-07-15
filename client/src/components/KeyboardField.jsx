import React, { useState } from 'react'
import VirtualKeyboardModal from './VirtualKeyboardModal'

// Remplacement direct de <input>, en gardant la même logique value/onChange.
// Le champ est en lecture seule et readOnly+onClick ouvre le clavier virtuel
// à la place du clavier natif de l'appareil (utile sur une caisse tactile
// sans clavier physique).
export default function KeyboardField({
  value, onChange, placeholder, type = 'text', className, subtitle, required, id, name, autoFocus,
}) {
  const [open, setOpen] = useState(false)
  const isPassword = type === 'password'

  return (
    <>
      <input
        id={id}
        name={name}
        type={isPassword ? 'password' : 'text'}
        inputMode="none"
        readOnly
        autoFocus={autoFocus}
        value={value}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={className}
      />
      <VirtualKeyboardModal
        open={open}
        title={placeholder}
        subtitle={subtitle}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
