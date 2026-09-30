'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-5 p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <h1 className="font-display text-2xl italic">Panel del local</h1>
          <p className="text-sm text-crema/55">Acceso solo para el dueño y el equipo.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} className="input" />
        </div>
        {error && <p className="rounded-lg bg-rojo/15 px-3 py-2 text-sm text-rojo-claro" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Lock className="h-4 w-4" /> Ingresar</>}
        </button>
      </form>
    </main>
  )
}
