import 'server-only'

/**
 * Rate limit simple en memoria por IP. Frena abusos básicos (spam de pedidos).
 * En Vercel cada instancia tiene su propia memoria: para tráfico alto,
 * reemplazar por Upstash Ratelimit (ver README).
 */
const hits = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit = 6, windowMs = 60_000) {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs })
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
    return true
  }
  entry.count++
  return entry.count <= limit
}

export function getClientIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  )
}
