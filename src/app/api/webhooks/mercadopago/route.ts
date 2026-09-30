import { NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapPaymentStatus, mpClient, verifyMpSignature } from '@/lib/mercadopago'
import { notifyNewOrder } from '@/lib/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ok = () => NextResponse.json({ ok: true })

/**
 * Webhook de Mercado Pago. Es la ÚNICA fuente de verdad para marcar un pedido como pagado.
 * 1) valida la firma  2) consulta el pago a la API de MP  3) valida monto y moneda
 * 4) actualiza de forma idempotente  5) notifica al dueño una sola vez
 */
export async function POST(req: Request) {
  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as {
    type?: string
    topic?: string
    data?: { id?: string | number }
  }
  const type = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const dataId = String(body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')

  if (type !== 'payment' || !dataId) return ok()
  if (!verifyMpSignature(req.headers, dataId)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  let payment
  try {
    payment = await new Payment(mpClient()).get({ id: dataId })
  } catch (e) {
    console.error('[webhook] no se pudo consultar el pago', dataId, e)
    return NextResponse.json({ error: 'retry' }, { status: 500 }) // MP reintenta
  }

  const orderId = payment.external_reference
  if (!orderId) return ok()

  const db = createAdminClient()
  const { data: order } = await db.from('orders').select('id,total,estado_pago').eq('id', orderId).maybeSingle()
  if (!order) return ok()

  const estado = mapPaymentStatus(payment.status)

  if (estado === 'aprobado') {
    const pagado = Math.round(Number(payment.transaction_amount ?? 0))
    if (pagado !== order.total || payment.currency_id !== 'ARS') {
      console.error('[webhook] ⚠️ monto no coincide', { orderId, pagado, esperado: order.total })
      return ok()
    }
    // Idempotente: solo la primera notificación "aprobado" actualiza y avisa
    const { data: updated } = await db
      .from('orders')
      .update({ estado_pago: 'aprobado', mp_payment_id: String(payment.id), pagado_at: new Date().toISOString() })
      .eq('id', order.id)
      .neq('estado_pago', 'aprobado')
      .select('id')
    if (updated && updated.length > 0) {
      await notifyNewOrder(order.id).catch((e) => console.error('[notify]', e))
    }
  } else if (order.estado_pago !== 'aprobado' || estado === 'reembolsado') {
    await db.from('orders').update({ estado_pago: estado, mp_payment_id: String(payment.id) }).eq('id', order.id)
  }

  return ok()
}
