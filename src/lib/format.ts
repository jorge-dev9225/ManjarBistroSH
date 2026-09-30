import type { Order } from './types'

export const TZ = 'America/Argentina/Buenos_Aires'

export function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatHora(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatFecha(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function haceCuanto(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

/** Clave de día (YYYY-MM-DD) en hora de Argentina */
export function arDayKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

/** Medianoche argentina de hace `daysAgo` días */
export function arStartOfDay(daysAgo = 0) {
  const today = new Date(`${arDayKey(new Date())}T00:00:00-03:00`)
  return new Date(today.getTime() - daysAgo * 86_400_000)
}

export function arHour(iso: string) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)))
}

export function whatsappLink(numero: string, texto?: string) {
  const n = numero.replace(/\D/g, '')
  // Números argentinos sin código de país → 549 + número
  const full = n.startsWith('54') ? n : `549${n.replace(/^0/, '').replace(/^15/, '')}`
  return `https://wa.me/${full}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

// ─────────── Estados de pedido ───────────
export type Estado = Order['estado']

export const ESTADO_LABEL: Record<Estado, string> = {
  nuevo: 'Recibido',
  preparando: 'En preparación',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const PAGO_LABEL: Record<Order['estado_pago'], string> = {
  pendiente: 'Pago pendiente',
  aprobado: 'Pagado',
  rechazado: 'Pago rechazado',
  cancelado: 'Pago cancelado',
  reembolsado: 'Reembolsado',
}

export function flujoEstados(tipo: Order['tipo_entrega']): Estado[] {
  return tipo === 'delivery'
    ? ['nuevo', 'preparando', 'listo', 'en_camino', 'entregado']
    : ['nuevo', 'preparando', 'listo', 'entregado']
}

export function siguienteEstado(estado: Estado, tipo: Order['tipo_entrega']): Estado | null {
  const f = flujoEstados(tipo)
  const i = f.indexOf(estado)
  return i >= 0 && i < f.length - 1 ? f[i + 1] : null
}

export function labelEstado(estado: Estado, tipo: Order['tipo_entrega']) {
  if (estado === 'listo') return tipo === 'retiro' ? 'Listo para retirar' : 'Listo para enviar'
  return ESTADO_LABEL[estado]
}

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}
