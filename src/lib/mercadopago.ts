import 'server-only'
import crypto from 'node:crypto'
import { MercadoPagoConfig } from 'mercadopago'
import type { Order } from './types'

let client: MercadoPagoConfig | null = null

export function mpClient() {
  if (!client) {
    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) throw new Error('Falta MP_ACCESS_TOKEN')
    client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } })
  }
  return client
}

/**
 * Verifica la firma `x-signature` de los webhooks de Mercado Pago.
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyMpSignature(headers: Headers, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    // Sin secreto configurado solo se permite en desarrollo.
    // Igual es seguro: el pago SIEMPRE se re-consulta a la API de MP antes de aprobar.
    return process.env.NODE_ENV !== 'production'
  }
  const xSignature = headers.get('x-signature')
  const xRequestId = headers.get('x-request-id')
  if (!xSignature) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k?.trim(), v?.trim()]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  let manifest = `id:${id};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(v1)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function mapPaymentStatus(status?: string | null): Order['estado_pago'] {
  switch (status) {
    case 'approved':
      return 'aprobado'
    case 'rejected':
      return 'rechazado'
    case 'cancelled':
      return 'cancelado'
    case 'refunded':
    case 'charged_back':
      return 'reembolsado'
    default:
      return 'pendiente'
  }
}
