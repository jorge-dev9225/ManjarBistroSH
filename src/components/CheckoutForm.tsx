'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Banknote, CreditCard, Loader2, Lock, Store, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { cartTotals, useCart, useHydrated } from '@/lib/cart-store'
import { cn, formatARS } from '@/lib/format'
import type { Settings } from '@/lib/types'

const SAVED_KEY = 'manjar-cliente'

export function CheckoutForm({ settings }: { settings: Settings }) {
  const hydrated = useHydrated()
  const items = useCart((s) => s.items)
  const [tipo, setTipo] = useState<'retiro' | 'delivery'>('retiro')
  const [pago, setPago] = useState<'mercadopago' | 'efectivo'>('mercadopago')
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '', notas: '', website: '' })
  const [loading, setLoading] = useState(false)

  // Recordar datos del cliente para la próxima compra (solo en su navegador)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEY)
      if (saved) setForm((f) => ({ ...f, ...JSON.parse(saved) }))
    } catch {}
  }, [])

  const { subtotal } = cartTotals(items)
  const envio = tipo === 'delivery' ? settings.costo_envio : 0
  const total = subtotal + envio
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { nombre, telefono, email, direccion } = form
      localStorage.setItem(SAVED_KEY, JSON.stringify({ nombre, telefono, email, direccion }))
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, variante: i.variante, cantidad: i.cantidad })),
          cliente: { nombre, telefono, email },
          tipoEntrega: tipo,
          direccion: tipo === 'delivery' ? direccion : undefined,
          notas: form.notas,
          metodoPago: pago,
          website: form.website,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el pedido')
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  if (!hydrated) {
    return <div className="card h-96 animate-pulse" />
  }

  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="text-5xl">🍣</p>
        <p className="mt-4 text-crema/70">Tu carrito está vacío.</p>
        <Link href="/#menu" className="btn-primary mt-6">
          Ver el menú
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-crema/60 hover:text-oro">
          <ArrowLeft className="h-4 w-4" /> Seguir comprando
        </Link>

        {/* Entrega */}
        <fieldset className="card p-5">
          <legend className="sr-only">Tipo de entrega</legend>
          <h2 className="mb-4 font-display text-xl italic">¿Cómo lo recibís?</h2>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard active={tipo === 'retiro'} onClick={() => setTipo('retiro')} icon={<Store />} title="Retiro" sub="Sin costo" />
            <OptionCard
              active={tipo === 'delivery'}
              onClick={() => setTipo('delivery')}
              icon={<Truck />}
              title="Delivery"
              sub={settings.costo_envio ? formatARS(settings.costo_envio) : 'Gratis'}
            />
          </div>
          {tipo === 'delivery' && (
            <div className="mt-4 animate-fade-up">
              <label className="label" htmlFor="direccion">Dirección de entrega</label>
              <input id="direccion" required minLength={5} maxLength={200} value={form.direccion} onChange={set('direccion')}
                className="input" placeholder="Calle, número, barrio, referencias" autoComplete="street-address" />
            </div>
          )}
        </fieldset>

        {/* Datos */}
        <fieldset className="card space-y-4 p-5">
          <legend className="sr-only">Tus datos</legend>
          <h2 className="font-display text-xl italic">Tus datos</h2>
          <p className="-mt-2 text-xs text-crema/50">No hace falta registrarse. Solo los usamos para este pedido.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nombre">Nombre</label>
              <input id="nombre" required minLength={2} maxLength={80} value={form.nombre} onChange={set('nombre')}
                className="input" autoComplete="name" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="label" htmlFor="telefono">WhatsApp / Teléfono</label>
              <input id="telefono" required type="tel" inputMode="tel" value={form.telefono} onChange={set('telefono')}
                className="input" autoComplete="tel" placeholder="2946 123456" pattern="[0-9+\s()\-]{8,20}" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="email">Email <span className="normal-case text-crema/40">(opcional, para el comprobante)</span></label>
            <input id="email" type="email" value={form.email} onChange={set('email')} className="input" autoComplete="email" placeholder="tu@email.com" />
          </div>
          <div>
            <label className="label" htmlFor="notas">Notas <span className="normal-case text-crema/40">(opcional)</span></label>
            <textarea id="notas" maxLength={300} rows={2} value={form.notas} onChange={set('notas')} className="input resize-none"
              placeholder="Sin cebollín, timbre roto, etc." />
          </div>
          {/* Honeypot anti-bots: invisible para personas */}
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')}
            className="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden="true" />
        </fieldset>

        {/* Pago */}
        <fieldset className="card p-5">
          <legend className="sr-only">Forma de pago</legend>
          <h2 className="mb-4 font-display text-xl italic">Forma de pago</h2>
          <div className={cn('grid gap-3', settings.acepta_efectivo ? 'grid-cols-2' : 'grid-cols-1')}>
            <OptionCard active={pago === 'mercadopago'} onClick={() => setPago('mercadopago')} icon={<CreditCard />}
              title="Mercado Pago" sub="Tarjeta, débito o dinero en cuenta" />
            {settings.acepta_efectivo && (
              <OptionCard active={pago === 'efectivo'} onClick={() => setPago('efectivo')} icon={<Banknote />}
                title="Efectivo" sub={tipo === 'delivery' ? 'Al recibir' : 'Al retirar'} />
            )}
          </div>
        </fieldset>
      </div>

      {/* Resumen */}
      <aside className="card p-5 lg:sticky lg:top-24">
        <h2 className="mb-4 font-display text-xl italic">Resumen</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex justify-between gap-3">
              <span className="text-crema/80">
                {i.cantidad}× {i.nombre}
                {i.variante && <span className="text-crema/45"> · {i.variante}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatARS(i.precio * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="my-4 h-px bg-madera-borde" />
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-crema/60">Subtotal</dt><dd>{formatARS(subtotal)}</dd></div>
          {tipo === 'delivery' && (
            <div className="flex justify-between"><dt className="text-crema/60">Envío</dt><dd>{envio ? formatARS(envio) : 'Gratis'}</dd></div>
          )}
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd className="text-oro">{formatARS(total)}</dd></div>
        </dl>
        <button type="submit" disabled={loading || !settings.abierto} className="btn-primary mt-5 w-full py-3.5 text-base">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : pago === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar pedido'}
        </button>
        {!settings.abierto && <p className="mt-3 text-center text-sm text-rojo-claro">El local está cerrado en este momento.</p>}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-crema/45">
          <Lock className="h-3.5 w-3.5" /> Pago seguro procesado por Mercado Pago
        </p>
      </aside>
    </form>
  )
}

function OptionCard(props: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition [&_svg]:h-5 [&_svg]:w-5',
        props.active ? 'border-oro bg-oro/10 text-oro' : 'border-madera-borde hover:border-oro/50',
      )}
    >
      {props.icon}
      <span className="font-semibold text-crema">{props.title}</span>
      <span className="text-xs text-crema/55">{props.sub}</span>
    </button>
  )
}
