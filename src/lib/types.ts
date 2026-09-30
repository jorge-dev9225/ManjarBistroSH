export type Category = {
  id: string
  nombre: string
  orden: number
  activo: boolean
}

export type PublicProduct = {
  id: string
  category_id: string | null
  nombre: string
  descripcion: string | null
  piezas: string | null
  precio: number
  imagen_url: string | null
  variante_label: string | null
  variantes: string[]
  disponible: boolean
  destacado: boolean
  orden: number
}

export type AdminProduct = PublicProduct & { costo: number }

export type Settings = {
  abierto: boolean
  costo_envio: number
  pedido_minimo: number
  acepta_efectivo: boolean
  whatsapp: string | null
  horario: string | null
  mensaje_cerrado: string | null
  comision_mp_pct: number
}

export const DEFAULT_SETTINGS: Settings = {
  abierto: true,
  costo_envio: 0,
  pedido_minimo: 0,
  acepta_efectivo: true,
  whatsapp: null,
  horario: null,
  mensaje_cerrado: null,
  comision_mp_pct: 0,
}

export type OrderItem = {
  nombre: string
  variante: string | null
  cantidad: number
  subtotal: number
  precio_unitario?: number
}

export type Order = {
  id: string
  numero: number
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string | null
  tipo_entrega: 'retiro' | 'delivery'
  direccion: string | null
  notas: string | null
  metodo_pago: 'mercadopago' | 'efectivo'
  estado_pago: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'reembolsado'
  estado: 'nuevo' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'cancelado'
  subtotal: number
  costo_envio: number
  total: number
  created_at: string
  pagado_at: string | null
  order_items: OrderItem[]
}

export type ActionResult = { ok: true } | { ok: false; error: string }
