import { createBrowserClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'

/** Cliente del navegador (login del panel y tiempo real). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/** Cliente anónimo sin sesión: lectura pública del menú (cacheable). */
export function createPublicClient() {
  return createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}
