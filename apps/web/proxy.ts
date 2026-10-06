import { NextRequest, NextResponse } from 'next/server'
import { config as appConfig } from '@/lib/config'
import { fallbackPorRol } from '@/lib/permissions'
import type { Rol } from '@/lib/api-types'
import { jwtVerify } from 'jose'

// Zonas del panel y roles que pueden entrar (el resto va a su inicio).
const ZONAS: ReadonlyArray<[prefijo: string, roles: readonly Rol[]]> = [
  ['/dashboard', ['USUARIO']],
  ['/admin', ['ADMIN', 'SUPERADMIN', 'TECNICO']],
  ['/tecnico', ['TECNICO']],
]
const ROLES: readonly string[] = ['USUARIO', 'ADMIN', 'SUPERADMIN', 'TECNICO']

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(appConfig.jwtCookieName)?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.search = `?returnUrl=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`
    return NextResponse.redirect(loginUrl)
  }

  try {
    const secret = new TextEncoder().encode(appConfig.jwtSecret)
    const { payload } = await jwtVerify(token, secret)
    // Rol desconocido (p. ej. PERSONAL heredado) = token inválido: evita bucles de redirección.
    if (typeof payload.rol !== 'string' || !ROLES.includes(payload.rol)) throw new Error('rol')
    const role = payload.rol as Rol

    const path = request.nextUrl.pathname
    const zona = ZONAS.find(([prefijo]) => path === prefijo || path.startsWith(prefijo + '/'))
    if (zona && !zona[1].includes(role)) {
      return NextResponse.redirect(new URL(fallbackPorRol(role), request.url))
    }

    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    return response
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.search = `?returnUrl=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(appConfig.jwtCookieName)
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/tecnico/:path*'],
}
