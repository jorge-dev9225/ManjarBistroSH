'use client'

import { useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react'
import { cn, formatARS, formatFecha } from '@/lib/format'
import type { DashboardData, Kpis } from '@/lib/stats'

const ORO = '#d9a441'
const ROJO = '#e0304b'
const VERDE = '#34d399'
const GRID = 'rgba(243,228,199,.08)'
const TICK = { fill: 'rgba(243,228,199,.55)', fontSize: 11 }

const short = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`

function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-crema/40">sin datos previos</span>
  const pct = Math.round(((now - before) / Math.abs(before)) * 100)
  const up = pct >= 0
  return (
    <span className={cn('inline-flex items-center text-xs font-semibold', up ? 'text-emerald-400' : 'text-rojo-claro')}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(pct)}% vs período anterior
    </span>
  )
}

function Kpi({ label, value, k, a, b, hint }: { label: string; value: string; k: keyof Kpis; a: Kpis; b: Kpis; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-crema/50">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
      <div className="mt-1"><Delta now={a[k]} before={b[k]} /></div>
      {hint && <p className="mt-1 text-[11px] text-crema/40">{hint}</p>}
    </div>
  )
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-madera-borde bg-carbon/95 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-crema">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-crema/60">{p.name}:</span>
          <span className="font-semibold">{p.name === 'Pedidos' || p.name === 'Unidades' ? p.value : formatARS(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function DashboardView({ data, days }: { data: DashboardData; days: number }) {
  const { actual: a, anterior: b } = data
  const [serie, setSerie] = useState<'ambas' | 'ventas' | 'ganancia'>('ambas')
  const [topBy, setTopBy] = useState<'cantidad' | 'ventas'>('cantidad')
  const top = [...data.top].sort((x, y) => y[topBy] - x[topBy])

  function exportCsv() {
    const head = ['Pedido', 'Fecha', 'Cliente', 'Entrega', 'Pago', 'Total', 'Ganancia bruta', 'Items']
    const rows = data.filas.map((f) => [f.numero, formatFecha(f.fecha), f.cliente, f.entrega, f.pago, f.total, f.ganancia, f.items])
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ventas-manjar-${days}d.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ventas" value={formatARS(a.ventas)} k="ventas" a={a} b={b} />
        <Kpi label="Ganancia neta" value={formatARS(a.gananciaNeta)} k="gananciaNeta" a={a} b={b}
          hint={a.comision ? `Descontada comisión MP: ${formatARS(a.comision)}` : `Margen ${a.margen}%`} />
        <Kpi label="Pedidos" value={String(a.pedidos)} k="pedidos" a={a} b={b} />
        <Kpi label="Ticket promedio" value={formatARS(a.ticket)} k="ticket" a={a} b={b} />
      </div>

      {a.costoMercaderia === 0 && a.ventas > 0 && (
        <p className="rounded-xl border border-oro/30 bg-oro/5 px-4 py-3 text-sm text-crema/75">
          💡 Cargá el <strong>costo</strong> de cada producto en <em>Menú</em> para que la ganancia sea real.
        </p>
      )}

      {/* Evolución */}
      <section className="card p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl italic">Evolución</h2>
          <div className="flex gap-1.5">
            {(['ambas', 'ventas', 'ganancia'] as const).map((s) => (
              <button key={s} onClick={() => setSerie(s)} className={cn('chip capitalize', serie === s && 'chip-active')}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data.daily} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORO} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={ORO} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VERDE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={VERDE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="fecha" tick={TICK} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={short} width={56} />
              <Tooltip content={<TooltipBox />} />
              {serie !== 'ganancia' && (
                <Area type="monotone" dataKey="ventas" name="Ventas" stroke={ORO} strokeWidth={2.5} fill="url(#gv)" />
              )}
              {serie !== 'ventas' && (
                <Area type="monotone" dataKey="ganancia" name="Ganancia" stroke={VERDE} strokeWidth={2.5} fill="url(#gg)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top productos */}
        <section className="card p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl italic">Más vendidos</h2>
            <div className="flex gap-1.5">
              <button onClick={() => setTopBy('cantidad')} className={cn('chip', topBy === 'cantidad' && 'chip-active')}>Unidades</button>
              <button onClick={() => setTopBy('ventas')} className={cn('chip', topBy === 'ventas' && 'chip-active')}>$</button>
            </div>
          </div>
          {top.length === 0 ? (
            <p className="py-16 text-center text-sm text-crema/40">Sin ventas en este período</p>
          ) : (
            <div style={{ height: Math.max(180, top.length * 38) }}>
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nombre" tick={TICK} tickLine={false} axisLine={false} width={130} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(217,164,65,.06)' }} />
                  <Bar dataKey={topBy} name={topBy === 'cantidad' ? 'Unidades' : 'Ventas'} fill={ORO} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Horarios */}
        <section className="card p-4 md:p-5">
          <h2 className="mb-4 font-display text-xl italic">Horarios con más pedidos</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.horas} margin={{ left: -24, right: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="hora" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(217,164,65,.06)' }} />
                <Bar dataKey="pedidos" name="Pedidos" fill={ROJO} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Donut title="Retiro vs delivery" data={data.tipo} fmt={(v) => `${v} pedidos`} />
        <Donut title="Cobrado por medio de pago" data={data.pago} fmt={formatARS} />
      </div>

      <div className="flex justify-end">
        <button onClick={exportCsv} disabled={!data.filas.length} className="btn-ghost">
          <Download className="h-4 w-4" /> Exportar ventas (CSV / Excel)
        </button>
      </div>
    </div>
  )
}

function Donut({ title, data, fmt }: { title: string; data: { name: string; value: number }[]; fmt: (v: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const colors = [ORO, ROJO]
  return (
    <section className="card p-4 md:p-5">
      <h2 className="mb-2 font-display text-xl italic">{title}</h2>
      {total === 0 ? (
        <p className="py-16 text-center text-sm text-crema/40">Sin datos</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3 text-sm">
            {data.map((d, i) => (
              <li key={d.name}>
                <span className="flex items-center gap-2 text-crema/70">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} /> {d.name}
                </span>
                <span className="ml-4.5 block pl-[18px] font-semibold">
                  {fmt(d.value)} · {Math.round((d.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
