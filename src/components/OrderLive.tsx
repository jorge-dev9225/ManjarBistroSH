'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-store'

/** Vacía el carrito cuando el pedido quedó confirmado y refresca el estado cada 10 s. */
export function OrderLive({ confirmado, final }: { confirmado: boolean; final: boolean }) {
  const router = useRouter()
  const clear = useCart((s) => s.clear)

  useEffect(() => {
    if (confirmado) clear()
  }, [confirmado, clear])

  useEffect(() => {
    if (final) return
    const t = setInterval(() => router.refresh(), 10_000)
    return () => clearInterval(t)
  }, [final, router])

  return null
}
