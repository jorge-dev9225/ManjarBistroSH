import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Circle, Clock, MessageCircle, XCircle } from 'lucide-react'
import { OrderLive } from '@/components/OrderLive'
import { SiteHeader } from '@/components/SiteHeader'
import { cn, flujoEstados, formatARS, formatFecha, labelEstado, whatsappLink } from '@/lib/format'
import { getPublicSettings } from '@/lib/menu'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Order } from '@/lib/types'

export const metadata: Metadata = { title: 'Tu pedido', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pago?: string }>
}) {
  const { id } = await params
  const { pago } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  // El ID (UUID aleatorio) funciona como "llave": solo quien hizo el pedido lo conoce.
  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select(
      'id,numero,cliente_nombre,tipo_entrega,direccion,metodo_pago,estado_pago,estado,subtotal,costo_envio,total,created_at,order_items(nombre,variante,cantidad,subtotal)',
    )
    .eq('id', id)
    .maybeSingle()
  if (!data) notFound()
  const o = data as unknown as Order
  const settings = await getPublicSettings()

  const esMP = o.metodo_pago === 'mercadopago'
  const confirmado = !esMP || o.estado_pago === 'aprobado'
  const pagoFallido = esMP && (o.estado_pago === 'rechazado' || o.estado_pago === 'cancelado' || pago === 'fallido')
  const final = o.estado === 'entregado' || o.estado === 'cancelado' || (pagoFallido && o.estado_pago !== 'pendiente')
  const pasos = flujoEstados(o.tipo_entrega)
  const idxActual = pasos.indexOf(o.estado)

  return (
    <>
      <SiteHeader showCart={false} />
      <main className="mx-auto max-w-2xl px-4 py-10 pb-20">
        <OrderLive confirmado={confirmado && !pagoFallido} final={final} />

        <div className="card p-6 text-center">
          {pagoFallido && o.estado_pago !== 'aprobado' ? (
            <>
              <XCircle className="mx-auto h-14 w-14 text-rojo-claro" />
              <h1 className="mt-3 font-display text-3xl italic">El pago no se completó</h1>
              <p className="mt-2 text-crema/65">No se realizó ningún cobro. Tu carrito sigue guardado para que lo intentes de nuevo.</p>
              <Link href="/checkout" className="btn-primary mt-6">Reintentar pago</Link>
            </>
          ) : !confirmado ? (
            <>
              <Clock className="mx-auto h-14 w-14 animate-pulse text-oro" />
              <h1 className="mt-3 font-display text-3xl italic">Confirmando tu pago…</h1>
              <p className="mt-2 text-crema/65">Esto tarda unos segundos. La página se actualiza sola.</p>
            </>
          ) : o.estado === 'cancelado' ? (
            <>
              <XCircle className="mx-auto h-14 w-14 text-rojo-claro" />
              <h1 className="mt-3 font-display text-3xl italic">Pedido cancelado</h1>
              <p className="mt-2 text-crema/65">Si tenés dudas, escribinos por WhatsApp.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
              <h1 className="mt-3 font-display text-3xl italic">¡Gracias, {o.cliente_nombre.split(' ')[0]}!</h1>
              <p className="mt-2 text-crema/65">
                Pedido <strong className="text-oro">#{o.numero}</strong> · {formatFecha(o.created_at)}
              </p>
            </>
          )}
        </div>

        {confirmado && !pagoFallido && o.estado !== 'cancelado' && (
          <ol className="card mt-5 space-y-4 p-6" aria-label="Estado del pedido">
            {pasos.map((p, i) => {
              const hecho = i < idxActual || o.estado === 'entregado'
              const actual = i === idxActual && o.estado !== 'entregado'
              return (
                <li key={p} className="flex items-center gap-3">
                  {hecho ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
                  ) : actual ? (
                    <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                      <span className="absolute h-6 w-6 animate-ping rounded-full bg-oro/40" />
                      <span className="h-3 w-3 rounded-full bg-oro" />
                    </span>
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-crema/25" />
                  )}
                  <span className={cn(hecho ? 'text-crema/70' : actual ? 'font-semibold text-oro' : 'text-crema/35')}>
                    {labelEstado(p, o.tipo_entrega)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        <div className="card mt-5 p-6">
          <h2 className="mb-3 font-display text-xl italic">Detalle</h2>
          <ul className="space-y-1.5 text-sm">
            {o.order_items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3">
                <span className="text-crema/80">
                  {i.cantidad}× {i.nombre}
                  {i.variante && <span className="text-crema/45"> · {i.variante}</span>}
                </span>
                <span>{formatARS(i.subtotal)}</span>
              </li>
            ))}
            {o.costo_envio > 0 && (
              <li className="flex justify-between text-crema/60"><span>Envío</span><span>{formatARS(o.costo_envio)}</span></li>
            )}
          </ul>
          <div className="mt-3 flex justify-between border-t border-madera-borde pt-3 text-lg font-bold">
            <span>Total</span><span className="text-oro">{formatARS(o.total)}</span>
          </div>
          <p className="mt-3 text-sm text-crema/55">
            {o.tipo_entrega === 'delivery' ? `Envío a: ${o.direccion}` : 'Retiro en el local'} ·{' '}
            {esMP ? 'Mercado Pago' : 'Efectivo'}
          </p>
        </div>

        {settings.whatsapp && (
          <a
            href={whatsappLink(settings.whatsapp, `Hola! Consulto por mi pedido #${o.numero}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost mt-5 w-full"
          >
            <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
          </a>
        )}
        <Link href="/" className="mt-3 block text-center text-sm text-crema/50 hover:text-oro">Volver al menú</Link>
      </main>
    </>
  )
}
