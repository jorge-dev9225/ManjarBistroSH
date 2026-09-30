import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/admin/actions'
import { AdminNav } from '@/components/admin/AdminNav'
import { getAdmin } from '@/lib/auth'

export const metadata: Metadata = { title: 'Panel', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, isAdmin } = await getAdmin()
  if (!user) redirect('/admin/login')

  if (!isAdmin) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div className="card max-w-sm p-8">
          <h1 className="font-display text-2xl italic">Sin permisos</h1>
          <p className="mt-2 text-sm text-crema/60">
            La cuenta {user.email} no es administradora. Pedile al dueño que la habilite.
          </p>
          <form action={signOut}>
            <button className="btn-ghost mt-5">Salir</button>
          </form>
        </div>
      </main>
    )
  }

  const { data: s } = await supabase.from('settings').select('abierto').eq('id', 1).single()

  return (
    <div className="min-h-dvh md:flex">
      <AdminNav email={user.email ?? ''} abierto={s?.abierto ?? true} />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">{children}</main>
    </div>
  )
}
