import React, { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [order, setOrder] = useState([])
  // TVA désactivée : la caisse fonctionne sans taxe, calcul simple (sous-total - remise)
  const tva = 0
  const [remise, setRemise] = useState(0)

  const subtotal = order.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tvaAmount = 0
  const remiseAmount = subtotal * (remise / 100)
  const total = subtotal - remiseAmount

  const addToOrder = useCallback((product, qty = 1) => {
    setOrder((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
      }
      return [...prev, { ...product, qty }]
    })
  }, [])

  // Définit directement la quantité d'un article (saisie au clavier numérique),
  // permet les valeurs décimales pour les produits vendus au kg (0.5, 4.5, ...)
  const setItemQuantity = useCallback((product, qty, extra = {}) => {
    setOrder((prev) => {
      if (qty <= 0) return prev.filter((i) => i.id !== product.id)
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty, ...extra } : i)
      }
      return [...prev, { ...product, qty, ...extra }]
    })
  }, [])

  const changeQty = useCallback((id, delta) => {
    setOrder((prev) => prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0))
  }, [])

  const removeItem = useCallback((id) => {
    setOrder((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearOrder = useCallback(() => { setOrder([]); setRemise(0) }, [])

  const setDiscount = useCallback((value) => { setRemise(Math.max(0, Math.min(100, value))) }, [])

  return (
    <CartContext.Provider value={{ order, addToOrder, changeQty, setItemQuantity, removeItem, clearOrder,
      subtotal, tva, tvaAmount, remise, remiseAmount, total, setDiscount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}