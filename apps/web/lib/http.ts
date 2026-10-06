import { ApiError } from './api-types'

// Único helper de cliente (Client Components): /api/* same-origin con la cookie
// HttpOnly de sesión. Lo usan lib/api-client.ts y lib/b2b-client.ts.
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `Error ${res.status}`)
  return body as T
}
