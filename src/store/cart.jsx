import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const storageKey = 'la-belle-vie-cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || [] } catch { return [] }
  })
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)) }, [items])
  const value = useMemo(() => ({
    items, isOpen, setIsOpen,
    addItem(product) { setItems((current) => { const found = current.find((item) => item.id === product.id); return found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }] }); setIsOpen(true) },
    updateQuantity(id, quantity) { setItems((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity } : item)) },
    removeItem(id) { setItems((current) => current.filter((item) => item.id !== id)) },
  }), [items, isOpen])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
