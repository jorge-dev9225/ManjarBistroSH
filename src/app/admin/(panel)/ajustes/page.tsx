import { PageHeader } from '@/components/admin/AdminNav'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { requireAdmin } from '@/lib/auth'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/types'

export default async function AjustesPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
  const settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ajustes" subtitle="Configuración del local y de los pedidos" />
      <SettingsForm settings={settings} />
    </div>
  )
}
