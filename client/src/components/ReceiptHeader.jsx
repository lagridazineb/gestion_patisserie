import React from 'react'

// Coordonnées de la pâtisserie — mêmes informations que sur le site
export const SHOP_INFO = {
  name: 'Pâtisserie Dianna',
  address: 'Av. Mohammed V, Hay Karima, Salé',
  phone: '05 37 86 28 80',
}

// En-tête standard d'un reçu : nom, adresse, téléphone, puis un subtitle optionnel.
// Pas de logo — uniquement du texte, pour un ticket sobre en noir et blanc à l'impression.
// hideAddress : pour les bons destinés aux préparateurs (atelier), qui n'ont pas besoin de
// l'adresse ni du téléphone de la pâtisserie — seulement du nom, pour rester très clair et bref.
export default function ReceiptHeader({ subtitle, children, hideAddress = false }) {
  return (
    <div className="text-center pb-3 mb-3 border-b border-dashed border-black">
      <p className="font-fraunces text-lg font-bold tracking-wide text-black uppercase">{SHOP_INFO.name}</p>
      {!hideAddress && (
        <>
          <p className="text-black text-[10px] leading-snug mt-1">{SHOP_INFO.address}</p>
          <p className="text-black text-[10px] leading-snug">Tél : {SHOP_INFO.phone}</p>
        </>
      )}
      {subtitle && <p className="text-black text-[11px] font-bold mt-2">{subtitle}</p>}
      {children}
    </div>
  )
}
