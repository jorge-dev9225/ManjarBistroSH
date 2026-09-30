'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, ChevronRight, MapPin, MessageCircle, Phone, Store, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateOrderStatus } from '@/app/admin/actions'
import { createClient } from '@/lib/supabase/client'
import { cn, formatARS, formatHora, haceCuanto, labelEstado, PAGO_LABEL, siguienteEstado, whatsappLink } from '@/lib/format'
import type { Order } from '@/lib/types'

type Filtro = 'activos' | 'entregados' | 'cancelados' | 'sin_pagar'

const ACTIVOS: Order['estado'][] = ['nuevo', 'preparando', 'listo', 'en_camino']
const esVisible = (o: Order) => o.metodo_pago === 'efectivo' || o.estado_pago === 'aprobado'

/** Campanita generada por código (no requiere archivos de audio) */
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ;[880, 1175, 1568].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.18
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.32)
    })
  } catch {}
}

export function OrdersBoard({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const [alertas, setAlertas] = useState(false)
  const anunciados = useRef(new Set(orders.filter(esVisible).map((o) => o.id)))

  // Tiempo real: cualquier cambio en pedidos → refrescar; pedidos nuevos confirmados → sonido + aviso
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('pedidos-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const n = payload.new as Partial<Order>
        if (n?.id && !anunciados.current.has(n.id) && (n.metodo_pago === 'efectivo' || n.estado_pago === 'aprobado') && n.estado === 'nuevo') {
          anunciados.current.add(n.id)
          beep()
          toast.success(`🍣 Nuevo pedido #${n.numero} · ${formatARS(n.total ?? 0)}`, { duration: 10_000 })
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Nuevo pedido #${n.numero}`, { body: `${n.cliente_nombre} · ${formatARS(n.total ?? 0)}` })
          }
        }
        router.refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  useEffect(() => {
    setAlertas('Notification' in window && Notification.permission === 'granted')
  }, [])

  async function activarAlertas() {
    beep() // desbloquea el audio (los navegadores exigen un toque del usuario)
    if ('Notification' in window) {
      const p = await Notification.requestPermission()
      setAlertas(p === 'granted')
      toast[p === 'granted' ? 'success' : 'info'](
        p === 'granted' ? 'Alertas activadas en este dispositivo' : 'Solo sonará mientras el panel esté abierto',
      )
    }
  }

  const grupos = useMemo(() => {
    const visibles = orders.filter(esVisible)
    return {
      activos: visibles.filter((o) => ACTIVOS.includes(o.estado)).sort((a, b) => a.created_at.localeCompare(b.created_at)),
      entregados: visibles.filter((o) => o.estado === 'entregado'),
      cancelados: orders.filter((o) => o.estado === 'cancelado' && esVisible(o)),
      sin_pagar: orders.filter((o) => o.metodo_pago === 'mercadopago' && o.estado_pago !== 'aprobado'),
    }
  }, [orders])

  const TABS: { id: Filtro; label: string }[] = [
    { id: 'activos', label: 'En curso' },
    { id: 'entregados', label: 'Entregados' },
    { id: 'cancelados', label: 'Cancelados' },
    { id: 'sin_pagar', label: 'Pago no completado' },
  ]
  const lista = grupos[filtro]

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setFiltro(t.id)} className={cn('chip py-1.5 text-sm', filtro === t.id && 'chip-active')}>
              {t.label}
              <span className={cn('rounded-full px-1.5 text-[11px]', filtro === t.id ? 'bg-carbon/20' : 'bg-madera-claro')}>
                {grupos[t.id].length}
              </span>
            </button>
          ))}
        </div>
        <button onClick={activarAlertas} className={cn('btn-ghost btn-sm', alertas && 'border-emerald-500/50 text-emerald-300')}>
          {alertas ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {alertas ? 'Alertas activas' : 'Activar alertas'}
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="card py-16 text-center text-crema/45">No hay pedidos acá.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>
      )}
    </div>
  )
}

function OrderCard({ o }: { o: Order }) {
  const [pending, start] = useTransition()
  const next = siguienteEstado(o.estado, o.tipo_entrega)
  const pagoOk = o.estado_pago === 'aprobado'

  const cambiar = (estado: Order['estado']) =>
    start(async () => {
      const r = await updateOrderStatus(o.id, estado)
      if (r.ok) toast.success(`Pedido #${o.numero}: ${labelEstado(estado, o.tipo_entrega)}`)
      else toast.error(r.error)
    })

  const cancelar = () => {
    const aviso = o.metodo_pago === 'mercadopago' && pagoOk
      ? '\n\nOjo: ya fue pagado con Mercado Pago. Tendrás que devolver el dinero desde tu cuenta de MP.'
      : ''
    if (confirm(`¿Cancelar el pedido #${o.numero}?${aviso}`)) cambiar('cancelado')
  }

  const msgCliente = `Hola ${o.cliente_nombre.split(' ')[0]}! Te escribimos de Manjar Bistro por tu pedido #${o.numero}.`

  return (
    <article className={cn('card flex flex-col p-4', o.estado === 'nuevo' && 'border-oro/70 ring-1 ring-oro/30')}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">
            #{o.numero} <span className="font-normal text-crema/70">· {o.cliente_nombre}</span>
          </p>
          <p className="text-xs text-crema/45">{formatHora(o.created_at)} · {haceCuanto(o.created_at)}</p>
        </div>
        <span className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
          o.estado === 'nuevo' ? 'bg-oro text-carbon' : o.estado === 'cancelado' ? 'bg-rojo/20 text-rojo-claro' : 'bg-madera-claro text-crema/80',
        )}>
          {labelEstado(o.estado, o.tipo_entrega)}
        </span>
      </header>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="chip">
          {o.tipo_entrega === 'delivery' ? <MapPin className="h-3 w-3" /> : <Store className="h-3 w-3" />}
          {o.tipo_entrega === 'delivery' ? 'Delivery' : 'Retira'}
        </span>
        <span className={cn('chip', pagoOk ? 'border-emerald-500/40 text-emerald-300' : 'border-oro/40 text-oro')}>
          {o.metodo_pago === 'mercadopago' ? `MP · ${PAGO_LABEL[o.estado_pago]}` : pagoOk ? 'Efectivo · cobrado' : 'Efectivo · a cobrar'}
        </span>
      </div>

      {o.tipo_entrega === 'delivery' && o.direccion && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.direccion)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-sm text-crema/75 underline decoration-crema/20 underline-offset-2 hover:text-oro"
        >
          📍 {o.direccion}
        </a>
      )}

      <ul className="mt-3 space-y-1 border-t border-madera-borde/60 pt-3 text-sm">
        {o.order_items.map((i, k) => (
          <li key={k} className="flex justify-between gap-2">
            <span><strong className="text-oro">{i.cantidad}×</strong> {i.nombre}{i.variante && <span className="text-crema/50"> · {i.variante}</span>}</span>
          </li>
        ))}
      </ul>
      {o.notas && <p className="mt-2 rounded-lg bg-oro/10 px-3 py-2 text-sm">📝 {o.notas}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-madera-borde/60 pt-3">
        <span className="text-lg font-bold text-oro">{formatARS(o.total)}</span>
        <div className="flex gap-1">
          <a href={`tel:${o.cliente_telefono}`} className="rounded-full p-2 text-crema/60 hover:bg-madera-claro hover:text-crema" aria-label="Llamar">
            <Phone className="h-4 w-4" />
          </a>
          <a href={whatsappLink(o.cliente_telefono, msgCliente)} target="_blank" rel="noopener noreferrer"
            className="rounded-full p-2 text-crema/60 hover:bg-madera-claro hover:text-emerald-300" aria-label="WhatsApp al cliente">
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>

      {ACTIVOS.includes(o.estado) && esVisible(o) && (
        <div className="mt-3 flex gap-2">
          {next && (
            <button onClick={() => cambiar(next)} disabled={pending} className="btn-primary flex-1">
              {labelEstado(next, o.tipo_entrega)} <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <button onClick={cancelar} disabled={pending} className="btn-ghost px-3" aria-label="Cancelar pedido">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </article>
  )
}
