'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { ExternalLink, LayoutDashboard, LogOut, ReceiptText, Settings, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { signOut, toggleAbierto } from '@/app/admin/actions'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/format'

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ReceiptText },
  { href: '/admin/menu', label: 'Menú', icon: UtensilsCrossed },
  { href: '/admin/ajustes', label: 'Ajustes', icon: Settings },
]

export function AdminNav({ email, abierto }: { email: string; abierto: boolean }) {
  const path = usePathname()
  const [pending, start] = useTransition()
  const isActive = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href))

  const toggle = () =>
    start(async () => {
      const r = await toggleAbierto(!abierto)
      if (r.ok) toast.success(!abierto ? 'Local ABIERTO: se reciben pedidos' : 'Local CERRADO: no se reciben pedidos')
      else toast.error(r.error)
    })

  const Switch = (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        abierto ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-rojo/50 bg-rojo/10 text-rojo-claro',
      )}
      aria-pressed={abierto}
    >
      <span className={cn('h-2 w-2 rounded-full', abierto ? 'bg-emerald-400' : 'bg-rojo')} />
      {abierto ? 'Abierto' : 'Cerrado'}
    </button>
  )

  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-madera-borde/60 bg-madera/60 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <Logo size={34} />
          <div className="leading-none">
            <div className="font-display text-lg italic">Manjar</div>
            <div className="text-[9px] tracking-[.3em] text-oro">PANEL</div>
          </div>
        </div>
        <div className="mb-5 px-2">{Switch}</div>
        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                isActive(href) ? 'bg-oro text-carbon font-semibold' : 'text-crema/70 hover:bg-madera-claro hover:text-crema',
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-crema/50 hover:text-crema">
            <ExternalLink className="h-4 w-4" /> Ver tienda
          </Link>
        </nav>
        <div className="border-t border-madera-borde/60 pt-3">
          <p className="truncate px-2 text-xs text-crema/40">{email}</p>
          <form action={signOut}>
            <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-crema/60 hover:bg-madera-claro">
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </form>
        </div>
      </aside>

      {/* Celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-madera-borde/60 bg-carbon/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-display italic">Panel</span>
        </div>
        <div className="flex items-center gap-2">
          {Switch}
          <form action={signOut}>
            <button className="rounded-full p-2 text-crema/60" aria-label="Salir"><LogOut className="h-4 w-4" /></button>
          </form>
        </div>
      </header>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-madera-borde/60 bg-madera/95 backdrop-blur md:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', isActive(href) ? 'text-oro' : 'text-crema/55')}
          >
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>
    </>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl italic">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-crema/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
