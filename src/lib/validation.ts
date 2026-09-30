import { z } from 'zod'

// ─────────── Checkout (cliente sin registro) ───────────
export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variante: z.string().max(60).nullable().optional(),
          cantidad: z.number().int().min(1).max(50),
        }),
      )
      .min(1, 'Tu carrito está vacío')
      .max(40, 'Demasiados productos en un solo pedido'),
    cliente: z.object({
      nombre: z.string().trim().min(2, 'Ingresá tu nombre').max(80),
      telefono: z
        .string()
        .trim()
        .regex(/^[0-9+\s()-]{8,20}$/, 'Ingresá un teléfono válido (con código de área)'),
      email: z.union([z.literal(''), z.string().trim().email('Email inválido').max(120)]).optional(),
    }),
    tipoEntrega: z.enum(['retiro', 'delivery']),
    direccion: z.string().trim().max(200).optional(),
    notas: z.string().trim().max(300).optional(),
    metodoPago: z.enum(['mercadopago', 'efectivo']),
    website: z.string().optional(), // honeypot anti-bots: debe venir vacío
  })
  .refine((d) => d.tipoEntrega === 'retiro' || (d.direccion?.length ?? 0) >= 5, {
    message: 'Ingresá la dirección de entrega',
    path: ['direccion'],
  })

export type CheckoutInput = z.infer<typeof checkoutSchema>

// ─────────── Panel: productos ───────────
const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())
const texto = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().max(max, `Máximo ${max} caracteres`))
const entero = (msg: string) =>
  z.coerce.number({ invalid_type_error: msg }).int(msg).min(0, msg).max(10_000_000, msg)

export const productSchema = z.object({
  id: z.preprocess((v) => (v ? v : undefined), z.string().uuid().optional()),
  nombre: z.string().trim().min(2, 'El nombre es muy corto').max(80),
  descripcion: texto(400),
  piezas: texto(30),
  precio: entero('Precio inválido').refine((n) => n > 0, 'El precio debe ser mayor a 0'),
  costo: entero('Costo inválido'),
  category_id: z.preprocess((v) => (v ? v : null), z.string().uuid().nullable()),
  variante_label: texto(40),
  variantes: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []),
    z.array(z.string().max(40)).max(10, 'Máximo 10 opciones'),
  ),
  disponible: checkbox,
  destacado: checkbox,
  orden: z.coerce.number().int().min(0).max(999).catch(0),
})

export const categorySchema = z.object({
  id: z.preprocess((v) => (v ? v : undefined), z.string().uuid().optional()),
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(50),
  orden: z.coerce.number().int().min(0).max(999).catch(0),
  activo: checkbox,
})

export const settingsSchema = z.object({
  abierto: checkbox,
  acepta_efectivo: checkbox,
  costo_envio: entero('Costo de envío inválido'),
  pedido_minimo: entero('Pedido mínimo inválido'),
  comision_mp_pct: z.coerce.number().min(0).max(30),
  whatsapp: texto(20),
  horario: texto(80),
  mensaje_cerrado: texto(160),
})

export const ORDER_STATES = ['nuevo', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado'] as const
