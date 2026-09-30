import { PageHeader } from '@/components/admin/AdminNav'
import { OrdersBoard } from '@/components/admin/OrdersBoard'
import { requireAdmin } from '@/lib/auth'
import type { Order } from '@/lib/types'

export default async function PedidosPage() {
  const { supabase } = await requireAdmin()
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString()
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(nombre,variante,cantidad,subtotal)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Pedidos" subtitle="Últimos 3 días · se actualiza en tiempo real" />
      <OrdersBoard orders={(data ?? []) as Order[]} />
    </div>
  )
}
