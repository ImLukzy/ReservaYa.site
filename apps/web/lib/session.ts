import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { UsuarioSesion, Rol } from './api'
import * as api from './api'
import { config } from './config'
import { fallbackPorRol } from './permissions'

export const getSession = cache(async (): Promise<UsuarioSesion | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(config.jwtCookieName)?.value
  if (!token) return null

  // C# es la autoridad de autenticación, roles, cuenta activa y tokenVersion.
  return api.getSession()
})

export async function requireAuth(): Promise<UsuarioSesion> {
  const session = await getSession()
  if (!session) {
    // Con cookie pero rechazada por la API (tokenVersion/rol cambió): el login lo explica.
    const conCookie = (await cookies()).has(config.jwtCookieName)
    redirect(conCookie ? '/login?sesion=cambio' : '/login')
  }
  return session
}

export async function requireRole(
  roles: Rol[]
): Promise<UsuarioSesion> {
  const session = await requireAuth()
  if (!roles.includes(session.rol)) {
    redirect(fallbackPorRol(session.rol))
  }
  return session
}