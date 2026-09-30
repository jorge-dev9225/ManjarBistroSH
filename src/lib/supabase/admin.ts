import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con SERVICE ROLE: saltea RLS. Usar SOLO en el servidor
 * (checkout, webhook, seguimiento de pedido). Nunca importarlo en componentes cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
