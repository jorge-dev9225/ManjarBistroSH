'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/format'
import type { Category, PublicProduct } from '@/lib/types'
import { ProductCard } from './ProductCard'

export function MenuView({
  categories,
  products,
  abierto,
}: {
  categories: Category[]
  products: PublicProduct[]
  abierto: boolean
}) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (p: PublicProduct) =>
      !q || p.nombre.toLowerCase().includes(q) || (p.descripcion ?? '').toLowerCase().includes(q)
    const list = categories.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      items: products.filter((p) => p.category_id === c.id && match(p)),
    }))
    const otros = products.filter((p) => !categories.some((c) => c.id === p.category_id) && match(p))
    if (otros.length) list.push({ id: 'otros', nombre: 'Otros', items: otros })
    return list.filter((g) => g.items.length > 0)
  }, [categories, products, query])

  const [active, setActive] = useState<string | undefined>(groups[0]?.id)

  // Resalta la categoría visible mientras se scrollea
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id.replace('cat-', ''))
      },
      { rootMargin: '-140px 0px -55% 0px' },
    )
    groups.forEach((g) => {
      const el = document.getElementById(`cat-${g.id}`)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [groups])

  return (
    <section id="menu" className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-36">
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-madera-borde/40 bg-carbon/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <nav className="no-scrollbar flex flex-1 gap-2 overflow-x-auto" aria-label="Categorías">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`#cat-${g.id}`}
                className={cn('chip py-1.5 text-sm', active === g.id ? 'chip-active' : 'hover:border-oro/60')}
              >
                {g.nombre}
              </a>
            ))}
          </nav>
          <label className="relative hidden sm:block">
            <span className="sr-only">Buscar en el menú</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-crema/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="input w-48 rounded-full py-2 pl-9"
            />
          </label>
        </div>
        <label className="relative mt-3 block sm:hidden">
          <span className="sr-only">Buscar en el menú</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-crema/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar salmón, langostino, temaki…"
            className="input rounded-full py-2 pl-9"
          />
        </label>
      </div>

      {groups.length === 0 && (
        <div className="py-16 text-center text-crema/60">
          <p>No encontramos “{query}”.</p>
          <button onClick={() => setQuery('')} className="btn-ghost mt-4">
            <X className="h-4 w-4" /> Limpiar búsqueda
          </button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.id} id={`cat-${g.id}`} className="mb-14 scroll-mt-36">
          <h2 className="section-title">{g.nombre}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => (
              <ProductCard key={p.id} product={p} cerrado={!abierto} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
