import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { UsuarioSesion, Rol } from './api'
import * as api from './api'
import { config } from './config'

export async function getSession(): Promise<UsuarioSesion | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(config.jwtCookieName)?.value
  if (!token) return null

  // C# es la autoridad de autenticación, roles, cuenta activa y tokenVersion.
  return api.getSession()
}

export function getDashboardPorRol(rol: Rol): string {
  switch (rol) {
    case 'TECNICO': return '/tecnico'
    case 'SUPERADMIN': return '/admin'
    case 'ADMIN': return '/admin/agenda'
    default: return '/dashboard'
  }
}

export async function requireAuth(): Promise<UsuarioSesion> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireRole(
  roles: Rol[]
): Promise<UsuarioSesion> {
  const session = await requireAuth()
  if (!roles.includes(session.rol)) {
    redirect(getDashboardPorRol(session.rol))
  }
  return session
}