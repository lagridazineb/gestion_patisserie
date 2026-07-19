import React from 'react'

// Coordonnées de la pâtisserie, affichées en haut de chaque reçu imprimé (vente, commande,
// achat, stock, etc.). Un seul endroit à modifier si l'adresse/le téléphone changent.
export const SHOP_INFO = {
  name: 'Pâtisserie Dianna',
  address: 'Av. Mohammed V, Hay Karima, Salé',
  phone: '05 37 86 28 80',
}

// En-tête standard d'un reçu : logo + nom + adresse + téléphone, puis un `subtitle` optionnel
// (ex: "Commande fournisseur — Rziza") et les infos passées en `children` (date, n° de ticket...).
export default function ReceiptHeader({ subtitle, children }) {
  return (
    <div className="text-center border-b border-dashed border-diana-creamDark pb-3 mb-3">
      <img src="/logo.png" alt={SHOP_INFO.name} className="w-12 h-12 object-contain mx-auto mb-1.5" />
      <p className="font-fraunces text-base font-bold tracking-wide text-diana-dark">{SHOP_INFO.name}</p>
      <p className="text-diana-brown text-[10.5px] leading-snug mt-0.5">{SHOP_INFO.address}</p>
      <p className="text-diana-brown text-[10.5px] leading-snug">Tél : {SHOP_INFO.phone}</p>
      {subtitle && <p className="text-diana-brown text-[11px] font-semibold mt-1.5">{subtitle}</p>}
      {children}
    </div>
  )
}
