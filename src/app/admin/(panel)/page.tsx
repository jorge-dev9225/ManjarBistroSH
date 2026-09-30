import Link from 'next/link'
import { PageHeader } from '@/components/admin/AdminNav'
import { DashboardView } from '@/components/admin/DashboardView'
import { requireAdmin } from '@/lib/auth'
import { arStartOfDay, cn } from '@/lib/format'
import { buildDashboard, type DashOrder } from '@/lib/stats'

const RANGOS = [
  { d: 1, label: 'Hoy' },
  { d: 7, label: '7 días' },
  { d: 30, label: '30 días' },
  { d: 90, label: '90 días' },
]

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams
  const days = RANGOS.some((x) => x.d === Number(r)) ? Number(r) : 7
  const { supabase } = await requireAdmin()

  const from = arStartOfDay(days - 1)
  const prevFrom = new Date(from.getTime() - days * 86_400_000)

  const [{ data: orders }, { data: settings }, { count: activos }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id,numero,cliente_nombre,total,subtotal,costo_envio,costo_total,created_at,tipo_entrega,metodo_pago,order_items(nombre,cantidad,subtotal)',
      )
      .eq('estado_pago', 'aprobado')
      .neq('estado', 'cancelado')
      .gte('created_at', prevFrom.toISOString())
      .order('created_at'),
    supabase.from('settings').select('comision_mp_pct').eq('id', 1).single(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['nuevo', 'preparando', 'listo', 'en_camino'])
      .or('metodo_pago.eq.efectivo,estado_pago.eq.aprobado'),
  ])

  const data = buildDashboard((orders ?? []) as DashOrder[], from, days, Number(settings?.comision_mp_pct ?? 0))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        subtitle="Ventas confirmadas (pagadas con MP o entregadas en efectivo)"
        action={
          <div className="flex rounded-full border border-madera-borde bg-madera/60 p-1">
            {RANGOS.map((x) => (
              <Link
                key={x.d}
                href={`/admin?r=${x.d}`}
                scroll={false}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  x.d === days ? 'bg-oro text-carbon' : 'text-crema/60 hover:text-crema',
                )}
              >
                {x.label}
              </Link>
            ))}
          </div>
        }
      />
      {(activos ?? 0) > 0 && (
        <Link href="/admin/pedidos" className="card mb-6 flex items-center justify-between border-oro/50 bg-oro/10 px-5 py-4 hover:bg-oro/15">
          <span className="font-semibold">🔔 {activos} pedido{activos === 1 ? '' : 's'} en curso</span>
          <span className="text-sm text-oro">Ver pedidos →</span>
        </Link>
      )}
      <DashboardView data={data} days={days} />
    </div>
  )
}
