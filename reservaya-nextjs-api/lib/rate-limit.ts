type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  if (store.size > 10_000) {
    for (const [k, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(k)
    }
  }

  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}

export function clientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}