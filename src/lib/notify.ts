import 'server-only'
import { createAdminClient } from './supabase/admin'
import { formatARS, formatFecha } from './format'
import { siteUrl } from './site'
import type { Order } from './types'

/**
 * Avisa al dueño de un pedido nuevo (ya pagado con MP, o en efectivo).
 * Canales: Telegram (instantáneo en el celular) y/o email vía Resend.
 * Si ninguno está configurado, el pedido igual aparece en el panel en tiempo real.
 */
export async function notifyNewOrder(orderId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*, order_items(nombre,variante,cantidad,subtotal)')
    .eq('id', orderId)
    .single()
  if (!data) return
  const o = data as Order

  const items = o.order_items.map(
    (i) => `• ${i.cantidad}x ${i.nombre}${i.variante ? ` (${i.variante})` : ''} — ${formatARS(i.subtotal)}`,
  )
  const pago =
    o.metodo_pago === 'mercadopago' ? '✅ PAGADO con Mercado Pago' : '💵 Paga en EFECTIVO al recibir/retirar'
  const entrega = o.tipo_entrega === 'delivery' ? `🛵 Delivery → ${o.direccion}` : '🏪 Retira en el local'

  const text = [
    `🍣 NUEVO PEDIDO #${o.numero}`,
    formatFecha(o.created_at),
    '',
    `👤 ${o.cliente_nombre}`,
    `📞 ${o.cliente_telefono}`,
    entrega,
    pago,
    '',
    'PEDIDO:',
    ...items,
    '',
    `Subtotal: ${formatARS(o.subtotal)}`,
    o.costo_envio ? `Envío: ${formatARS(o.costo_envio)}` : null,
    `TOTAL: ${formatARS(o.total)}`,
    o.notas ? `\n📝 Notas: ${o.notas}` : null,
    '',
    `Ver en el panel: ${siteUrl()}/admin/pedidos`,
  ]
    .filter((l) => l !== null)
    .join('\n')

  const results = await Promise.allSettled([
    sendTelegram(text),
    sendEmail(`Nuevo pedido #${o.numero} — ${formatARS(o.total)}`, text),
  ])
  const alguno = results.some((r) => r.status === 'fulfilled' && r.value === true)
  results.forEach((r) => r.status === 'rejected' && console.error('[notify]', r.reason))

  await db.from('orders').update({ notificado: alguno }).eq('id', orderId)
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false
  // Se admiten varios chats separados por coma (dueño, cocina, etc.)
  const ids = chatId.split(',').map((s) => s.trim()).filter(Boolean)
  const res = await Promise.all(
    ids.map((id) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text, disable_web_page_preview: true }),
      }),
    ),
  )
  return res.some((r) => r.ok)
}

async function sendEmail(subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.OWNER_EMAIL
  const from = process.env.EMAIL_FROM
  if (!key || !to || !from) return false
  const html = `<pre style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${escapeHtml(text)}</pre>`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), subject, text, html }),
  })
  return r.ok
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
