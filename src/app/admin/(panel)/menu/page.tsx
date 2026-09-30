import { PageHeader } from '@/components/admin/AdminNav'
import { MenuManager } from '@/components/admin/MenuManager'
import { requireAdmin } from '@/lib/auth'
import { PUBLIC_PRODUCT_FIELDS } from '@/lib/menu'
import type { AdminProduct, Category, PublicProduct } from '@/lib/types'

export default async function MenuAdminPage() {
  const { supabase } = await requireAdmin()
  const [{ data: cats }, { data: prods }, { data: costs }] = await Promise.all([
    supabase.from('categories').select('id,nombre,orden,activo').order('orden'),
    supabase.from('products').select(PUBLIC_PRODUCT_FIELDS).order('orden'),
    supabase.from('product_costs').select('product_id,costo'),
  ])
  const costMap = new Map((costs ?? []).map((c) => [c.product_id as string, c.costo as number]))
  const products: AdminProduct[] = ((prods ?? []) as PublicProduct[]).map((p) => ({ ...p, costo: costMap.get(p.id) ?? 0 }))

  return (
    <div className="mx-auto max-w-5xl">
      <MenuManager categories={(cats ?? []) as Category[]} products={products} header={
        <PageHeader title="Menú" subtitle="Los cambios se ven en la tienda al instante" />
      } />
    </div>
  )
}
