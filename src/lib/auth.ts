import 'server-only'
import { createClient } from './supabase/server'

export async function getAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, isAdmin: false }
  const { data } = await supabase.rpc('is_admin')
  return { supabase, user, isAdmin: data === true }
}

/** Lanza error si quien llama no es administrador. Usar en TODA server action del panel. */
export async function requireAdmin() {
  const r = await getAdmin()
  if (!r.user || !r.isAdmin) throw new Error('No autorizado')
  return r
}
