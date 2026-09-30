'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { updateSettings } from '@/app/admin/actions'
import type { Settings } from '@/lib/types'

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const r = await updateSettings(new FormData(e.currentTarget))
    setSaving(false)
    if (r.ok) toast.success('Ajustes guardados')
    else toast.error(r.error)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="card space-y-4 p-5">
        <h2 className="font-display text-xl italic">Local</h2>
        <Toggle name="abierto" label="Local abierto (se aceptan pedidos)" defaultChecked={s.abierto} />
        <div>
          <label className="label" htmlFor="horario">Horario (se muestra en la tienda)</label>
          <input id="horario" name="horario" maxLength={80} defaultValue={s.horario ?? ''} className="input" placeholder="Mar a Dom · 20 a 00 hs" />
        </div>
        <div>
          <label className="label" htmlFor="mensaje_cerrado">Mensaje cuando está cerrado</label>
          <input id="mensaje_cerrado" name="mensaje_cerrado" maxLength={160} defaultValue={s.mensaje_cerrado ?? ''} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="whatsapp">WhatsApp del local</label>
          <input id="whatsapp" name="whatsapp" maxLength={20} defaultValue={s.whatsapp ?? ''} className="input" placeholder="5491133052122" inputMode="tel" />
          <p className="mt-1 text-xs text-crema/40">Formato internacional: 549 + código de área + número, sin 0 ni 15.</p>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-xl italic">Pedidos y cobros</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="costo_envio">Costo de envío ($)</label>
            <input id="costo_envio" name="costo_envio" type="number" min={0} step={1} defaultValue={s.costo_envio} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="pedido_minimo">Pedido mínimo ($)</label>
            <input id="pedido_minimo" name="pedido_minimo" type="number" min={0} step={1} defaultValue={s.pedido_minimo} className="input" />
          </div>
        </div>
        <Toggle name="acepta_efectivo" label="Aceptar pago en efectivo al recibir/retirar" defaultChecked={s.acepta_efectivo} />
        <div>
          <label className="label" htmlFor="comision_mp_pct">Comisión de Mercado Pago (%)</label>
          <input id="comision_mp_pct" name="comision_mp_pct" type="number" min={0} max={30} step={0.01} defaultValue={s.comision_mp_pct} className="input sm:w-40" />
          <p className="mt-1 text-xs text-crema/40">
            Se descuenta en el dashboard para calcular la ganancia neta. Revisá tu % en Mercado Pago → Tu negocio → Costos.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary min-w-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Guardar ajustes</>}
        </button>
      </div>
    </form>
  )
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-madera-claro transition peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-crema after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}
