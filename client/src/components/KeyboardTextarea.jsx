import React, { useState } from 'react'
import VirtualKeyboardModal from './VirtualKeyboardModal'

// Remplacement direct de <textarea>, en gardant la même logique value/onChange.
export default function KeyboardTextarea({
  value, onChange, placeholder, rows = 3, className, subtitle,
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <textarea
        readOnly
        rows={rows}
        value={value}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      <VirtualKeyboardModal
        open={open}
        title={placeholder}
        subtitle={subtitle}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
        multiline
      />
    </>
  )
}
