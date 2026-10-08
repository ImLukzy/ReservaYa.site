import 'server-only'
import { cookies } from 'next/headers'
import { config } from './config'
import { ApiError } from './api-types'

interface ServerFetchInit extends RequestInit {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

// Único fetch de servidor: usa BACKEND_URL reenviando
// la cookie de sesión. Lo usan lib/api.ts y lib/b2b-api.ts.
export async function serverFetch(path: string, init?: ServerFetchInit): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(config.jwtCookieName)?.value
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const hasRevalidate = init?.next?.revalidate !== undefined
  if (token && !hasRevalidate) headers.set('Cookie', `${config.jwtCookieName}=${token}`)

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5200'
  const cache = init?.cache ?? (hasRevalidate ? undefined : 'no-store')

  return fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
    ...(cache !== undefined ? { cache } : {}),
  })
}

export async function getJson<T>(path: string, init?: ServerFetchInit): Promise<T> {
  const res = await serverFetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`)
  }
  return (await res.json()) as T
}
