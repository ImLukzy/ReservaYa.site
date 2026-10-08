import { isIP } from 'node:net'

// Vercel overwrites X-Forwarded-For at its edge. Never trust custom origin/IP headers from the browser.
export function originHeaders(incoming: Pick<Headers, 'get'>, outgoing = new Headers(), secret = process.env.ORIGIN_SECRET): Headers {
  const result = new Headers(outgoing)
  result.delete('x-origin-secret')
  result.delete('x-reservaya-client-ip')
  if (secret === undefined) return result
  if (secret.length < 32) throw new Error('ORIGIN_SECRET debe tener al menos 32 caracteres')
  const client = (incoming.get('x-forwarded-for')?.split(',')[0] ?? incoming.get('x-real-ip') ?? '').trim()
  result.set('x-origin-secret', secret)
  if (isIP(client)) result.set('x-reservaya-client-ip', client.toLowerCase())
  return result
}
