import React from 'react'

// Coordonnées de la pâtisserie
export const SHOP_INFO = {
   name: 'Pâtisserie Dianna',
  address: 'Av. Mohammed V, Hay Karima, Salé',
  phone: '05 37 86 28 80',
}

// En-tête standard d'un reçu : nom + téléphone, puis un subtitle optionnel
export default function ReceiptHeader({ subtitle, children }) {
  return (
    <div className="text-center pb-3 mb-3">
      <p className="font-fraunces text-xl font-bold tracking-wide text-diana-dark">{SHOP_INFO.name}</p>
      <p className="text-diana-brown/70 text-[10px] leading-snug mt-1">Tél : {SHOP_INFO.phone}</p>
      {subtitle && <p className="text-diana-brown text-[11px] font-semibold mt-2">{subtitle}</p>}
      {children}
    </div>
  )
}
