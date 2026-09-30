'use client'

import Image from 'next/image'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, Pencil, Plus, Save, Tags, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteCategory, deleteProduct, saveCategory, saveProduct, toggleDisponible } from '@/app/admin/actions'
import { cn, formatARS } from '@/lib/format'
import type { ActionResult, AdminProduct, Category } from '@/lib/types'

export function MenuManager({
  categories,
  products,
  header,
}: {
  categories: Category[]
  products: AdminProduct[]
  header: React.ReactNode
}) {
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)
  const [showCats, setShowCats] = useState(false)

  const groups = [
    ...categories.map((c) => ({ id: c.id, nombre: c.nombre, activo: c.activo, items: products.filter((p) => p.category_id === c.id) })),
    { id: 'none', nombre: 'Sin categoría', activo: true, items: products.filter((p) => !categories.some((c) => c.id === p.category_id)) },
  ].filter((g) => g.items.length > 0 || g.id !== 'none')

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        <div className="flex gap-2">
          <button onClick={() => setShowCats((v) => !v)} className="btn-ghost"><Tags className="h-4 w-4" /> Categorías</button>
          <button onClick={() => setEditing('new')} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo producto</button>
        </div>
      </div>

      {showCats && <CategoriesPanel categories={categories} />}

      <div className="mt-2 space-y-8">
        {groups.map((g) => (
          <section key={g.id}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl italic">
              {g.nombre}
              <span className="font-sans text-xs not-italic text-crema/40">({g.items.length})</span>
              {!g.activo && <span className="rounded-full bg-rojo/20 px-2 py-0.5 font-sans text-[10px] not-italic text-rojo-claro">OCULTA</span>}
            </h2>
            {g.items.length === 0 ? (
              <p className="card px-4 py-6 text-center text-sm text-crema/40">Sin productos</p>
            ) : (
              <ul className="card divide-y divide-madera-borde/60">
                {g.items.map((p) => <ProductRow key={p.id} p={p} onEdit={() => setEditing(p)} />)}
              </ul>
            )}
          </section>
        ))}
      </div>

      {editing && (
        <ProductForm product={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function ProductRow({ p, onEdit }: { p: AdminProduct; onEdit: () => void }) {
  const [pending, start] = useTransition()
  const margen = p.precio ? Math.round(((p.precio - p.costo) / p.precio) * 100) : 0

  const run = (fn: () => Promise<ActionResult>, ok: string) =>
    start(async () => {
      const r = await fn()
      if (r.ok) toast.success(ok)
      else toast.error(r.error)
    })

  return (
    <li className={cn('flex items-center gap-3 p-3', pending && 'opacity-60')}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-madera-claro">
        {p.imagen_url ? <Image src={p.imagen_url} alt="" fill sizes="56px" className="object-cover" /> : <div className="grid h-full place-items-center">🍣</div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {p.nombre} {p.destacado && <span className="ml-1 rounded bg-rojo px-1.5 py-0.5 text-[10px] text-white">NUEVO</span>}
        </p>
        <p className="text-xs text-crema/50">
          <span className="font-semibold text-oro">{formatARS(p.precio)}</span>
          {p.costo > 0 ? <> · costo {formatARS(p.costo)} · <span className={margen < 30 ? 'text-rojo-claro' : 'text-emerald-400'}>margen {margen}%</span></> : ' · sin costo cargado'}
          {p.variantes.length > 0 && <> · {p.variantes.join(' / ')}</>}
        </p>
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-crema/60" title="Disponible hoy">
        <span className="hidden sm:inline">{p.disponible ? 'Disponible' : 'Agotado'}</span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={p.disponible}
          onChange={(e) => run(() => toggleDisponible(p.id, e.target.checked), e.target.checked ? 'Disponible' : 'Marcado como agotado')}
        />
        <span className="relative h-6 w-11 rounded-full bg-madera-claro transition peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-crema after:transition peer-checked:after:translate-x-5" />
      </label>
      <button onClick={onEdit} className="rounded-full p-2 text-crema/60 hover:bg-madera-claro hover:text-oro" aria-label={`Editar ${p.nombre}`}>
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => confirm(`¿Eliminar "${p.nombre}" del menú? Los pedidos anteriores no se modifican.`) && run(() => deleteProduct(p.id), 'Producto eliminado')}
        className="rounded-full p-2 text-crema/40 hover:bg-madera-claro hover:text-rojo-claro"
        aria-label={`Eliminar ${p.nombre}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

function ProductForm({ product, categories, onClose }: { product: AdminProduct | null; categories: Category[]; onClose: () => void }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(product?.imagen_url ?? null)
  const [quitar, setQuitar] = useState(false)
  const [precio, setPrecio] = useState(product?.precio ?? 0)
  const [costo, setCosto] = useState(product?.costo ?? 0)
  const margen = precio > 0 ? Math.round(((precio - costo) / precio) * 100) : 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const r = await saveProduct(new FormData(e.currentTarget))
    setSaving(false)
    if (r.ok) {
      toast.success(product ? 'Producto actualizado' : 'Producto creado')
      onClose()
      router.refresh()
    } else toast.error(r.error)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 4 * 1024 * 1024) {
      toast.error('La imagen no puede superar 4 MB')
      e.target.value = ''
      return
    }
    setPreview(URL.createObjectURL(f))
    setQuitar(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-madera-borde bg-madera shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-madera-borde px-5 py-4">
          <h2 className="font-display text-2xl italic">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-madera-claro" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={product?.id ?? ''} />
          <input type="hidden" name="imagen_actual" value={product?.imagen_url ?? ''} />

          {/* Imagen */}
          <div className="sm:col-span-2">
            <span className="label">Foto</span>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-madera-borde bg-carbon/60">
                {preview && !quitar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-3xl">🍣</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="btn-ghost btn-sm cursor-pointer">
                  <ImagePlus className="h-4 w-4" /> {preview ? 'Cambiar foto' : 'Subir foto'}
                  <input type="file" name="imagen" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="sr-only" />
                </label>
                {product?.imagen_url && (
                  <label className="flex items-center gap-2 text-xs text-crema/60">
                    <input type="checkbox" name="quitar_imagen" checked={quitar} onChange={(e) => setQuitar(e.target.checked)} className="accent-oro" />
                    Quitar foto
                  </label>
                )}
                <p className="text-[11px] text-crema/40">JPG, PNG o WEBP · máx. 4 MB · ideal horizontal 4:3</p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="nombre">Nombre *</label>
            <input id="nombre" name="nombre" required minLength={2} maxLength={80} defaultValue={product?.nombre} className="input" placeholder="Ej: Alaska Roll" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="descripcion">Ingredientes / descripción</label>
            <textarea id="descripcion" name="descripcion" rows={2} maxLength={400} defaultValue={product?.descripcion ?? ''} className="input resize-none" />
          </div>
          <div>
            <label className="label" htmlFor="category_id">Categoría</label>
            <select id="category_id" name="category_id" defaultValue={product?.category_id ?? categories[0]?.id ?? ''} className="input">
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="piezas">Cantidad / porción</label>
            <input id="piezas" name="piezas" maxLength={30} defaultValue={product?.piezas ?? ''} className="input" placeholder="8 piezas" />
          </div>
          <div>
            <label className="label" htmlFor="precio">Precio de venta *</label>
            <input id="precio" name="precio" type="number" required min={1} step={1} inputMode="numeric" value={precio || ''}
              onChange={(e) => setPrecio(Number(e.target.value))} className="input" placeholder="15000" />
          </div>
          <div>
            <label className="label" htmlFor="costo">Costo de producción <span className="normal-case text-crema/40">(privado)</span></label>
            <input id="costo" name="costo" type="number" min={0} step={1} inputMode="numeric" value={costo || ''}
              onChange={(e) => setCosto(Number(e.target.value))} className="input" placeholder="6000" />
            {precio > 0 && costo > 0 && (
              <p className={cn('mt-1 text-xs', margen < 30 ? 'text-rojo-claro' : 'text-emerald-400')}>
                Ganancia {formatARS(precio - costo)} por unidad · margen {margen}%
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="variante_label">Nombre de la opción</label>
            <input id="variante_label" name="variante_label" maxLength={40} defaultValue={product?.variante_label ?? ''} className="input" placeholder="Ej: Salmón" />
          </div>
          <div>
            <label className="label" htmlFor="variantes">Opciones (separadas por coma)</label>
            <input id="variantes" name="variantes" defaultValue={product?.variantes.join(', ') ?? ''} className="input" placeholder="Fresco, Al vapor" />
          </div>
          <div>
            <label className="label" htmlFor="orden">Orden en el menú</label>
            <input id="orden" name="orden" type="number" min={0} max={999} defaultValue={product?.orden ?? 0} className="input" />
          </div>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="disponible" defaultChecked={product?.disponible ?? true} className="h-4 w-4 accent-oro" /> Disponible para vender
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="destacado" defaultChecked={product?.destacado ?? false} className="h-4 w-4 accent-oro" /> Destacar como “Nuevo”
            </label>
          </div>
        </div>

        <div className="pb-safe flex justify-end gap-2 border-t border-madera-borde px-5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary min-w-32">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Guardar</>}
          </button>
        </div>
      </form>
    </div>
  )
}

function CategoriesPanel({ categories }: { categories: Category[] }) {
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent<HTMLFormElement>, msg: string) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    start(async () => {
      const r = await saveCategory(fd)
      if (r.ok) {
        toast.success(msg)
        if (!fd.get('id')) form.reset()
      } else toast.error(r.error)
    })
  }

  return (
    <section className="card mb-8 p-4">
      <h2 className="mb-3 font-display text-lg italic">Categorías</h2>
      <div className={cn('space-y-2', pending && 'opacity-60')}>
        {categories.map((c) => (
          <form key={c.id} onSubmit={(e) => submit(e, 'Categoría guardada')} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input name="nombre" defaultValue={c.nombre} required minLength={2} maxLength={50} className="input flex-1 py-2" aria-label="Nombre" />
            <input name="orden" type="number" defaultValue={c.orden} min={0} className="input w-20 py-2" aria-label="Orden" title="Orden" />
            <label className="flex items-center gap-1.5 text-xs text-crema/60">
              <input type="checkbox" name="activo" defaultChecked={c.activo} className="accent-oro" /> Visible
            </label>
            <button className="btn-ghost btn-sm" aria-label="Guardar"><Save className="h-3.5 w-3.5" /></button>
            <button
              type="button"
              onClick={() =>
                confirm(`¿Eliminar la categoría "${c.nombre}"? Sus productos quedan "Sin categoría".`) &&
                start(async () => {
                  const r = await deleteCategory(c.id)
                  if (r.ok) toast.success('Categoría eliminada')
                  else toast.error(r.error)
                })
              }
              className="btn-ghost btn-sm hover:text-rojo-claro"
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        ))}
        <form onSubmit={(e) => submit(e, 'Categoría creada')} className="flex flex-wrap items-center gap-2 border-t border-madera-borde/60 pt-3">
          <input name="nombre" required minLength={2} maxLength={50} placeholder="Nueva categoría (ej: Bebidas)" className="input flex-1 py-2" />
          <input name="orden" type="number" defaultValue={categories.length + 1} min={0} className="input w-20 py-2" aria-label="Orden" />
          <input type="hidden" name="activo" value="on" />
          <button className="btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> Agregar</button>
        </form>
      </div>
    </section>
  )
}
