'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartItem = {
  key: string
  productId: string
  nombre: string
  precio: number // solo para mostrar: el servidor recalcula el precio real
  variante: string | null
  cantidad: number
  imagen: string | null
}

type CartState = {
  items: CartItem[]
  open: boolean
  add: (item: Omit<CartItem, 'key' | 'cantidad'>, qty?: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item, qty = 1) =>
        set((s) => {
          const key = `${item.productId}::${item.variante ?? ''}`
          const existing = s.items.find((i) => i.key === key)
          if (existing) {
            return {
              items: s.items.map((i) => (i.key === key ? { ...i, cantidad: Math.min(50, i.cantidad + qty) } : i)),
            }
          }
          return { items: [...s.items, { ...item, key, cantidad: qty }] }
        }),
      setQty: (key, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, cantidad: Math.min(50, qty) } : i)),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: 'manjar-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
)

export function cartTotals(items: CartItem[]) {
  return {
    count: items.reduce((s, i) => s + i.cantidad, 0),
    subtotal: items.reduce((s, i) => s + i.precio * i.cantidad, 0),
  }
}

/** Evita diferencias SSR/cliente con el carrito guardado en localStorage */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
