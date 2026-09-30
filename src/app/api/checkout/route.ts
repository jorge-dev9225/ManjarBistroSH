import { NextResponse } from 'next/server'
import { Preference } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkoutSchema } from '@/lib/validation'
import { mpClient } from '@/lib/mercadopago'
import { notifyNewOrder } from '@/lib/notify'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { siteUrl } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${getClientIp(req)}`, 6, 60_000)) {
    return fail('Demasiados intentos. Esperá un minuto y probá de nuevo.', 429)
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return fail('Solicitud inválida')
  }
  const parsed = checkoutSchema.safeParse(json)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos')
  const input = parsed.data
  if (input.website) return fail('Solicitud inválida') // bot

  const db = createAdminClient()

  const { data: settings } = await db
    .from('settings')
    .select('abierto,costo_envio,pedido_minimo,acepta_efectivo')
    .eq('id', 1)
    .single()
  if (!settings?.abierto) return fail('El local está cerrado en este momento.', 409)
  if (input.metodoPago === 'efectivo' && !settings.acepta_efectivo) {
    return fail('Por ahora solo aceptamos pagos con Mercado Pago.')
  }

  // Unificar líneas repetidas (mismo producto + misma opción)
  const merged = new Map<string, { productId: string; variante: string | null; cantidad: number }>()
  for (const it of input.items) {
    const variante = it.variante?.trim() || null
    const key = `${it.productId}::${variante ?? ''}`
    const prev = merged.get(key)
    merged.set(key, { productId: it.productId, variante, cantidad: Math.min(50, (prev?.cantidad ?? 0) + it.cantidad) })
  }
  const ids = [...new Set([...merged.values()].map((i) => i.productId))]

  // 🔒 Precios SIEMPRE desde la base, nunca desde el navegador
  const [{ data: products, error: pErr }, { data: costs }] = await Promise.all([
    db.from('products').select('id,nombre,precio,disponible,variantes').in('id', ids),
    db.from('product_costs').select('product_id,costo').in('product_id', ids),
  ])
  if (pErr || !products) return fail('No pudimos leer el menú. Probá de nuevo.', 500)
  const costMap = new Map((costs ?? []).map((c) => [c.product_id as string, c.costo as number]))

  const lines: {
    product_id: string
    nombre: string
    variante: string | null
    precio_unitario: number
    costo_unitario: number
    cantidad: number
    subtotal: number
  }[] = []

  for (const it of merged.values()) {
    const p = products.find((x) => x.id === it.productId)
    if (!p) return fail('Un producto de tu carrito ya no existe. Actualizá la página.', 409)
    if (!p.disponible) return fail(`"${p.nombre}" no está disponible por hoy. Quitalo del carrito.`, 409)
    const opciones: string[] = p.variantes ?? []
    if (opciones.length > 0 && (!it.variante || !opciones.includes(it.variante))) {
      return fail(`Elegí una opción válida para "${p.nombre}".`)
    }
    lines.push({
      product_id: p.id,
      nombre: p.nombre,
      variante: opciones.length > 0 ? it.variante : null,
      precio_unitario: p.precio,
      costo_unitario: costMap.get(p.id) ?? 0,
      cantidad: it.cantidad,
      subtotal: p.precio * it.cantidad,
    })
  }

  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  if (subtotal < settings.pedido_minimo) {
    return fail(`El pedido mínimo es de $${settings.pedido_minimo.toLocaleString('es-AR')}.`)
  }
  const costo_envio = input.tipoEntrega === 'delivery' ? settings.costo_envio : 0
  const total = subtotal + costo_envio
  const costo_total = lines.reduce((s, l) => s + l.costo_unitario * l.cantidad, 0)

  const { data: order, error: oErr } = await db
    .from('orders')
    .insert({
      cliente_nombre: input.cliente.nombre,
      cliente_telefono: input.cliente.telefono,
      cliente_email: input.cliente.email || null,
      tipo_entrega: input.tipoEntrega,
      direccion: input.tipoEntrega === 'delivery' ? input.direccion : null,
      notas: input.notas || null,
      metodo_pago: input.metodoPago,
      subtotal,
      costo_envio,
      total,
      costo_total,
    })
    .select('id,numero')
    .single()
  if (oErr || !order) {
    console.error('[checkout] order', oErr)
    return fail('No pudimos registrar el pedido. Probá de nuevo.', 500)
  }

  const { error: iErr } = await db.from('order_items').insert(lines.map((l) => ({ ...l, order_id: order.id })))
  if (iErr) {
    console.error('[checkout] items', iErr)
    await db.from('orders').delete().eq('id', order.id)
    return fail('No pudimos registrar el pedido. Probá de nuevo.', 500)
  }

  // ── Efectivo: se avisa al dueño ya mismo ──
  if (input.metodoPago === 'efectivo') {
    await notifyNewOrder(order.id).catch((e) => console.error('[notify]', e))
    return NextResponse.json({ url: `/pedido/${order.id}` })
  }

  // ── Mercado Pago: se crea la preferencia; el aviso llega cuando el webhook confirma el pago ──
  try {
    const base = siteUrl()
    const https = base.startsWith('https://')
    const pref = await new Preference(mpClient()).create({
      body: {
        items: [
          ...lines.map((l) => ({
            id: l.product_id,
            title: l.variante ? `${l.nombre} (${l.variante})` : l.nombre,
            quantity: l.cantidad,
            unit_price: l.precio_unitario,
            currency_id: 'ARS',
          })),
          ...(costo_envio > 0
            ? [{ id: 'envio', title: 'Envío a domicilio', quantity: 1, unit_price: costo_envio, currency_id: 'ARS' }]
            : []),
        ],
        external_reference: order.id,
        payer: {
          name: input.cliente.nombre,
          ...(input.cliente.email ? { email: input.cliente.email } : {}),
        },
        back_urls: {
          success: `${base}/pedido/${order.id}`,
          pending: `${base}/pedido/${order.id}`,
          failure: `${base}/pedido/${order.id}?pago=fallido`,
        },
        ...(https ? { auto_return: 'approved', notification_url: `${base}/api/webhooks/mercadopago` } : {}),
        binary_mode: true, // aprobado o rechazado al instante, sin "pendientes"
        statement_descriptor: 'MANJAR BISTRO',
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
        },
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        metadata: { order_numero: order.numero },
      },
    })
    await db.from('orders').update({ mp_preference_id: pref.id }).eq('id', order.id)
    return NextResponse.json({ url: pref.init_point })
  } catch (e) {
    console.error('[checkout] mercadopago', e)
    await db.from('orders').update({ estado: 'cancelado', estado_pago: 'cancelado' }).eq('id', order.id)
    return fail('No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en un momento.', 502)
  }
}
