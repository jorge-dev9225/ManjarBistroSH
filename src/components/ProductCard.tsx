'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { cn, formatARS } from '@/lib/format'
import type { PublicProduct } from '@/lib/types'

export function ProductCard({ product, cerrado }: { product: PublicProduct; cerrado: boolean }) {
  const add = useCart((s) => s.add)
  const setOpen = useCart((s) => s.setOpen)
  const [variante, setVariante] = useState<string | null>(product.variantes?.[0] ?? null)
  const agotado = !product.disponible

  function onAdd() {
    add({
      productId: product.id,
      nombre: product.nombre,
      precio: product.precio,
      variante,
      imagen: product.imagen_url,
    })
    toast.success(`${product.nombre} agregado`, {
      description: variante ? variante : undefined,
      action: { label: 'Ver pedido', onClick: () => setOpen(true) },
      duration: 2500,
    })
  }

  return (
    <article className="card group flex animate-fade-up flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-oro/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-madera-claro to-carbon">
        {product.imagen_url ? (
          <Image
            src={product.imagen_url}
            alt={product.nombre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn('object-cover transition duration-500 group-hover:scale-105', agotado && 'grayscale')}
          />
        ) : (
          <div className="grid h-full place-items-center text-6xl opacity-80">🍣</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-madera/90 to-transparent" />
        {product.destacado && !agotado && (
          <span className="absolute left-3 top-3 rounded-full bg-rojo px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Nuevo
          </span>
        )}
        {product.piezas && (
          <span className="absolute bottom-3 right-3 rounded-full bg-carbon/80 px-3 py-1 text-xs font-semibold text-oro backdrop-blur">
            {product.piezas}
          </span>
        )}
        {agotado && (
          <div className="absolute inset-0 grid place-items-center bg-carbon/60">
            <span className="rounded-full border border-crema/40 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest">
              Agotado
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-xl font-semibold italic leading-tight">{product.nombre}</h3>
        {product.descripcion && <p className="text-sm leading-relaxed text-crema/65">{product.descripcion}</p>}

        {product.variantes.length > 0 && (
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-crema/50">
              {product.variante_label || 'Opción'}
            </span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={product.variante_label || 'Opción'}>
              {product.variantes.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={variante === v}
                  onClick={() => setVariante(v)}
                  className={cn('chip', variante === v ? 'chip-active' : 'hover:border-oro/60')}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-oro">{formatARS(product.precio)}</span>
          <button onClick={onAdd} disabled={agotado || cerrado} className="btn-primary" aria-label={`Agregar ${product.nombre}`}>
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
      </div>
    </article>
  )
}
