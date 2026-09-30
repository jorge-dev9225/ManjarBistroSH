import { Clock, MessageCircle } from 'lucide-react'
import { whatsappLink } from '@/lib/format'
import type { Settings } from '@/lib/types'
import { Logo } from './Logo'

export function Hero({ settings }: { settings: Settings }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-12 text-center md:pb-16 md:pt-20">
        <div className="mb-6 flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              settings.abierto ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rojo/50 bg-rojo/10 text-rojo-claro'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${settings.abierto ? 'animate-pulse bg-emerald-400' : 'bg-rojo'}`} />
            {settings.abierto ? 'Abierto · tomando pedidos' : 'Cerrado ahora'}
          </span>
        </div>
        <h1 className="font-display text-5xl italic leading-tight md:text-7xl">Disfrutá la mejor</h1>
        <p className="mt-2 text-lg font-bold tracking-[.28em] text-oro md:text-2xl">EXPERIENCIA EN SUSHI</p>
        <p className="mx-auto mt-5 max-w-lg text-crema/65">
          Armá tu pedido en segundos, pagá con Mercado Pago y seguí su estado en tiempo real. Sin registrarte.
        </p>
        {!settings.abierto && settings.mensaje_cerrado && (
          <p className="mx-auto mt-4 max-w-md rounded-xl bg-rojo/10 px-4 py-3 text-sm">{settings.mensaje_cerrado}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#menu" className="btn-primary px-7 py-3 text-base">
            Ver el menú
          </a>
          {settings.horario && (
            <span className="inline-flex items-center gap-2 text-sm text-crema/60">
              <Clock className="h-4 w-4" /> {settings.horario}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="border-t border-madera-borde/50 bg-carbon/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center text-sm text-crema/55 md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span>© {new Date().getFullYear()} Manjar Bistro Sushi</span>
        </div>
        {settings.whatsapp && (
          <a
            href={whatsappLink(settings.whatsapp, 'Hola! Tengo una consulta')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-oro"
          >
            <MessageCircle className="h-4 w-4" /> Consultas por WhatsApp
          </a>
        )}
        <p className="text-xs">Las imágenes son ilustrativas, el producto final puede variar.</p>
      </div>
    </footer>
  )
}
