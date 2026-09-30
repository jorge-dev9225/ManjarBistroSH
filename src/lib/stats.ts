import { arDayKey, arHour } from './format'

export type DashOrder = {
  id: string
  numero: number
  cliente_nombre: string
  total: number
  subtotal: number
  costo_envio: number
  costo_total: number
  created_at: string
  tipo_entrega: 'retiro' | 'delivery'
  metodo_pago: 'mercadopago' | 'efectivo'
  order_items: { nombre: string; cantidad: number; subtotal: number }[]
}

const DAY = 86_400_000

function kpis(list: DashOrder[], comisionPct: number) {
  const ventas = list.reduce((s, o) => s + o.total, 0)
  const gananciaBruta = list.reduce((s, o) => s + (o.subtotal - o.costo_total), 0)
  const comision = list.reduce((s, o) => s + (o.metodo_pago === 'mercadopago' ? (o.total * comisionPct) / 100 : 0), 0)
  const costoMercaderia = list.reduce((s, o) => s + o.costo_total, 0)
  return {
    ventas,
    gananciaBruta,
    comision: Math.round(comision),
    gananciaNeta: Math.round(gananciaBruta - comision),
    costoMercaderia,
    pedidos: list.length,
    ticket: list.length ? Math.round(ventas / list.length) : 0,
    margen: ventas ? Math.round((gananciaBruta / ventas) * 100) : 0,
  }
}

export type Kpis = ReturnType<typeof kpis>

export function buildDashboard(all: DashOrder[], from: Date, days: number, comisionPct: number) {
  const fromMs = from.getTime()
  const prevFromMs = fromMs - days * DAY
  const cur = all.filter((o) => new Date(o.created_at).getTime() >= fromMs)
  const prev = all.filter((o) => {
    const t = new Date(o.created_at).getTime()
    return t >= prevFromMs && t < fromMs
  })

  // Serie diaria (todos los días del rango, aunque no haya ventas)
  const daily = new Map<string, { fecha: string; ventas: number; ganancia: number; pedidos: number }>()
  for (let i = 0; i < days; i++) {
    const d = new Date(fromMs + i * DAY + 12 * 3600_000)
    const key = arDayKey(d)
    const [, m, dd] = key.split('-')
    daily.set(key, { fecha: `${dd}/${m}`, ventas: 0, ganancia: 0, pedidos: 0 })
  }
  const horas = Array.from({ length: 24 }, (_, h) => ({ hora: `${h}h`, pedidos: 0 }))
  const productos = new Map<string, { nombre: string; cantidad: number; ventas: number }>()
  const tipo = { retiro: 0, delivery: 0 }
  const pago = { mercadopago: 0, efectivo: 0 }

  for (const o of cur) {
    const row = daily.get(arDayKey(new Date(o.created_at)))
    if (row) {
      row.ventas += o.total
      row.ganancia += o.subtotal - o.costo_total
      row.pedidos += 1
    }
    horas[arHour(o.created_at)].pedidos += 1
    tipo[o.tipo_entrega] += 1
    pago[o.metodo_pago] += o.total
    for (const i of o.order_items) {
      const p = productos.get(i.nombre) ?? { nombre: i.nombre, cantidad: 0, ventas: 0 }
      p.cantidad += i.cantidad
      p.ventas += i.subtotal
      productos.set(i.nombre, p)
    }
  }

  // Recortar horas sin actividad en los extremos para que el gráfico sea legible
  const activas = horas.map((h, i) => (h.pedidos ? i : -1)).filter((i) => i >= 0)
  const horasVisibles = activas.length
    ? horas.slice(Math.max(0, Math.min(...activas) - 1), Math.min(24, Math.max(...activas) + 2))
    : horas.slice(18, 24)

  return {
    actual: kpis(cur, comisionPct),
    anterior: kpis(prev, comisionPct),
    daily: [...daily.values()],
    horas: horasVisibles,
    top: [...productos.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 8),
    tipo: [
      { name: 'Retiro', value: tipo.retiro },
      { name: 'Delivery', value: tipo.delivery },
    ],
    pago: [
      { name: 'Mercado Pago', value: pago.mercadopago },
      { name: 'Efectivo', value: pago.efectivo },
    ],
    filas: cur.map((o) => ({
      numero: o.numero,
      fecha: o.created_at,
      cliente: o.cliente_nombre,
      entrega: o.tipo_entrega,
      pago: o.metodo_pago,
      total: o.total,
      ganancia: o.subtotal - o.costo_total,
      items: o.order_items.map((i) => `${i.cantidad}x ${i.nombre}`).join(' | '),
    })),
  }
}

export type DashboardData = ReturnType<typeof buildDashboard>
