import 'server-only'
import { cookies } from 'next/headers'
import { config } from './config'
import { ApiError } from './api-types'

// Único fetch de servidor: llama directo a la API .NET (BACKEND_URL) reenviando
// la cookie de sesión. Lo usan lib/api.ts y lib/b2b-api.ts.
export async function serverFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(config.jwtCookieName)?.value
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Cookie', `${config.jwtCookieName}=${token}`)

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5000'
  return fetch(`${backendUrl}${path}`, { ...init, headers, cache: 'no-store' })
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await serverFetch(path)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`)
  }
  return (await res.json()) as T
}
