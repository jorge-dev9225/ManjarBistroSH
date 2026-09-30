'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { categorySchema, ORDER_STATES, productSchema, settingsSchema } from '@/lib/validation'
import type { ActionResult } from '@/lib/types'

const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMG = 4 * 1024 * 1024

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : 'Error inesperado'
  return { ok: false, error: msg === 'No autorizado' ? 'Tu sesión expiró. Volvé a ingresar.' : msg }
}

function storagePathFromUrl(url: string | null) {
  if (!url) return null
  const i = url.indexOf('/productos/')
  return i >= 0 ? url.slice(i + '/productos/'.length) : null
}

function refreshMenu() {
  revalidatePath('/')
  revalidatePath('/admin/menu')
}

// ─────────── Productos ───────────
export async function saveProduct(fd: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const parsed = productSchema.safeParse({
      id: fd.get('id'),
      nombre: fd.get('nombre'),
      descripcion: fd.get('descripcion'),
      piezas: fd.get('piezas'),
      precio: fd.get('precio'),
      costo: fd.get('costo'),
      category_id: fd.get('category_id'),
      variante_label: fd.get('variante_label'),
      variantes: fd.get('variantes'),
      disponible: fd.get('disponible'),
      destacado: fd.get('destacado'),
      orden: fd.get('orden'),
    })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const { id, costo, ...data } = parsed.data

    const imagenActual = (fd.get('imagen_actual') as string) || null
    let imagen_url = fd.get('quitar_imagen') === 'on' ? null : imagenActual
    const file = fd.get('imagen')

    if (file instanceof File && file.size > 0) {
      if (!IMG_TYPES.includes(file.type)) return { ok: false, error: 'La imagen debe ser JPG, PNG o WEBP' }
      if (file.size > MAX_IMG) return { ok: false, error: 'La imagen no puede superar 4 MB' }
      const path = `${crypto.randomUUID()}.${file.type.split('/')[1]}`
      const { error } = await supabase.storage
        .from('productos')
        .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (error) return { ok: false, error: `No se pudo subir la imagen: ${error.message}` }
      imagen_url = supabase.storage.from('productos').getPublicUrl(path).data.publicUrl
    }

    const row = {
      ...data,
      descripcion: data.descripcion || null,
      piezas: data.piezas || null,
      variante_label: data.variantes.length ? data.variante_label || 'Opción' : null,
      imagen_url,
    }

    let productId = id
    if (id) {
      const { error } = await supabase.from('products').update(row).eq('id', id)
      if (error) return { ok: false, error: error.message }
    } else {
      const { data: created, error } = await supabase.from('products').insert(row).select('id').single()
      if (error || !created) return { ok: false, error: error?.message ?? 'No se pudo crear' }
      productId = created.id
    }

    const { error: cErr } = await supabase.from('product_costs').upsert({ product_id: productId, costo })
    if (cErr) return { ok: false, error: cErr.message }

    // Borrar imagen vieja si se reemplazó o quitó
    if (imagenActual && imagenActual !== imagen_url) {
      const old = storagePathFromUrl(imagenActual)
      if (old) await supabase.storage.from('productos').remove([old])
    }

    refreshMenu()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { data: p } = await supabase.from('products').select('imagen_url').eq('id', id).single()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }
    const path = storagePathFromUrl(p?.imagen_url ?? null)
    if (path) await supabase.storage.from('productos').remove([path])
    refreshMenu()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function toggleDisponible(id: string, disponible: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('products').update({ disponible }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    refreshMenu()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ─────────── Categorías ───────────
export async function saveCategory(fd: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const parsed = categorySchema.safeParse({
      id: fd.get('id'),
      nombre: fd.get('nombre'),
      orden: fd.get('orden'),
      activo: fd.get('activo'),
    })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const { id, ...row } = parsed.data
    const { error } = id
      ? await supabase.from('categories').update(row).eq('id', id)
      : await supabase.from('categories').insert(row)
    if (error) return { ok: false, error: error.message }
    refreshMenu()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }
    refreshMenu()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ─────────── Pedidos ───────────
export async function updateOrderStatus(id: string, estado: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    if (!(ORDER_STATES as readonly string[]).includes(estado)) return { ok: false, error: 'Estado inválido' }

    const { data: order } = await supabase.from('orders').select('metodo_pago,estado_pago').eq('id', id).single()
    if (!order) return { ok: false, error: 'Pedido no encontrado' }

    const patch: Record<string, unknown> = { estado }
    // Efectivo: al entregarlo, se considera cobrado → cuenta en las ventas
    if (estado === 'entregado' && order.metodo_pago === 'efectivo' && order.estado_pago !== 'aprobado') {
      patch.estado_pago = 'aprobado'
      patch.pagado_at = new Date().toISOString()
    }
    if (estado === 'cancelado' && order.metodo_pago === 'efectivo') patch.estado_pago = 'cancelado'

    const { error } = await supabase.from('orders').update(patch).eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/admin/pedidos')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ─────────── Ajustes ───────────
export async function updateSettings(fd: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const parsed = settingsSchema.safeParse(Object.fromEntries(fd))
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const d = parsed.data
    const { error } = await supabase
      .from('settings')
      .update({
        ...d,
        whatsapp: d.whatsapp.replace(/\D/g, '') || null,
        horario: d.horario || null,
        mensaje_cerrado: d.mensaje_cerrado || null,
      })
      .eq('id', 1)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/')
    revalidatePath('/admin/ajustes')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function toggleAbierto(abierto: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from('settings').update({ abierto }).eq('id', 1)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function signOut() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
