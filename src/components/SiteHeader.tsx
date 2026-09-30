'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { cartTotals, useCart, useHydrated } from '@/lib/cart-store'
import { Logo } from './Logo'

export function SiteHeader({ showCart = true }: { showCart?: boolean }) {
  const hydrated = useHydrated()
  const items = useCart((s) => s.items)
  const setOpen = useCart((s) => s.setOpen)
  const { count } = cartTotals(items)

  return (
    <header className="sticky top-0 z-40 border-b border-madera-borde/50 bg-carbon/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Manjar Bistro Sushi — inicio">
          <Logo />
          <div className="leading-none">
            <div className="font-display text-2xl font-semibold italic">Manjar</div>
            <div className="mt-0.5 text-[10px] font-semibold tracking-[.32em] text-oro">BISTRO SUSHI</div>
          </div>
        </Link>
        {showCart && (
          <button onClick={() => setOpen(true)} className="btn-ghost relative" aria-label={`Abrir carrito (${count} productos)`}>
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Mi pedido</span>
            {hydrated && count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-rojo px-1.5 text-xs font-bold text-white ring-2 ring-carbon">
                {count}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
