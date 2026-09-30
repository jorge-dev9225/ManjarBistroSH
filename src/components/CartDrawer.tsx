'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { cartTotals, useCart, useHydrated } from '@/lib/cart-store'
import { cn, formatARS } from '@/lib/format'

export function CartDrawer({ abierto, pedidoMinimo }: { abierto: boolean; pedidoMinimo: number }) {
  const { items, open, setOpen, setQty, remove } = useCart()
  const hydrated = useHydrated()
  const { subtotal, count } = cartTotals(items)
  const faltaMinimo = pedidoMinimo > 0 && subtotal < pedidoMinimo

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, setOpen])

  return (
    <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={() => setOpen(false)}
        className={cn('absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity', open ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-madera-borde bg-madera shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-madera-borde px-5 py-4">
          <h2 className="font-display text-2xl italic">Tu pedido</h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-madera-claro" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hydrated || items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-crema/60">
              <ShoppingBag className="h-12 w-12 opacity-40" />
              <p>Todavía no agregaste nada.</p>
              <button onClick={() => setOpen(false)} className="btn-ghost">
                Ver el menú
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3 rounded-xl border border-madera-borde/60 bg-carbon/40 p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-madera-claro">
                    {i.imagen ? (
                      <Image src={i.imagen} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-2xl">🍣</div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{i.nombre}</p>
                        {i.variante && <p className="text-xs text-crema/55">{i.variante}</p>}
                      </div>
                      <button
                        onClick={() => remove(i.key)}
                        className="rounded-full p-1 text-crema/40 hover:text-rojo-claro"
                        aria-label={`Quitar ${i.nombre}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-madera-borde">
                        <button
                          onClick={() => setQty(i.key, i.cantidad - 1)}
                          className="p-1.5 hover:text-oro"
                          aria-label="Restar uno"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{i.cantidad}</span>
                        <button
                          onClick={() => setQty(i.key, i.cantidad + 1)}
                          className="p-1.5 hover:text-oro"
                          aria-label="Sumar uno"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-semibold text-oro">{formatARS(i.precio * i.cantidad)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hydrated && items.length > 0 && (
          <div className="pb-safe space-y-3 border-t border-madera-borde bg-madera px-5 pt-4">
            <div className="flex items-center justify-between text-lg">
              <span className="text-crema/70">Subtotal ({count})</span>
              <span className="font-bold text-oro">{formatARS(subtotal)}</span>
            </div>
            <p className="text-xs text-crema/45">El envío (si corresponde) se suma en el siguiente paso.</p>
            {faltaMinimo && (
              <p className="rounded-lg bg-rojo/15 px-3 py-2 text-sm text-rojo-claro">
                El pedido mínimo es {formatARS(pedidoMinimo)}. Te faltan {formatARS(pedidoMinimo - subtotal)}.
              </p>
            )}
            {!abierto ? (
              <p className="rounded-lg bg-rojo/15 px-3 py-2 text-center text-sm">El local está cerrado ahora.</p>
            ) : (
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                aria-disabled={faltaMinimo}
                className={cn('btn-primary w-full py-3.5 text-base', faltaMinimo && 'pointer-events-none opacity-50')}
              >
                Continuar con el pedido
              </Link>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}

export function MobileCartBar() {
  const hydrated = useHydrated()
  const items = useCart((s) => s.items)
  const open = useCart((s) => s.open)
  const setOpen = useCart((s) => s.setOpen)
  const { count, subtotal } = cartTotals(items)
  if (!hydrated || count === 0 || open) return null
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex w-full animate-fade-up items-center justify-between rounded-2xl bg-oro px-5 py-4 font-semibold text-carbon shadow-2xl shadow-black/50"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-carbon px-2 text-sm text-oro">{count}</span>
          Ver mi pedido
        </span>
        <span>{formatARS(subtotal)}</span>
      </button>
    </div>
  )
}
