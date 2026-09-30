import { createPublicClient } from './supabase/client'
import { DEFAULT_SETTINGS, type Category, type PublicProduct, type Settings } from './types'

export const PUBLIC_PRODUCT_FIELDS =
  'id,category_id,nombre,descripcion,piezas,precio,imagen_url,variante_label,variantes,disponible,destacado,orden'
const PUBLIC_SETTINGS_FIELDS =
  'abierto,costo_envio,pedido_minimo,acepta_efectivo,whatsapp,horario,mensaje_cerrado,comision_mp_pct'

export async function getPublicSettings(): Promise<Settings> {
  const db = createPublicClient()
  const { data } = await db.from('settings').select(PUBLIC_SETTINGS_FIELDS).eq('id', 1).maybeSingle()
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings
}

export async function getPublicMenu() {
  const db = createPublicClient()
  const [cats, prods, settings] = await Promise.all([
    db.from('categories').select('id,nombre,orden,activo').eq('activo', true).order('orden'),
    db.from('products').select(PUBLIC_PRODUCT_FIELDS).order('orden'),
    getPublicSettings(),
  ])
  if (cats.error) console.error('[menu] categorías', cats.error.message)
  if (prods.error) console.error('[menu] productos', prods.error.message)
  return {
    categories: (cats.data ?? []) as Category[],
    products: (prods.data ?? []) as PublicProduct[],
    settings,
  }
}
