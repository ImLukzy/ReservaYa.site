import { NextRequest, NextResponse } from 'next/server'
import { config as appConfig } from '@/lib/config'
import { jwtVerify } from 'jose'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(appConfig.jwtCookieName)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(appConfig.jwtSecret)
    const { payload } = await jwtVerify(token, secret)
    const role = payload.rol as string

    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Pragma', 'no-cache')

    // Redirect by role if accessing wrong dashboard.
    const path = request.nextUrl.pathname
    const expectedPath = getDashboardPath(role)
    if (path.startsWith('/dashboard') && role !== 'USUARIO') {
      return NextResponse.redirect(new URL(expectedPath, request.url))
    }
    if (path.startsWith('/admin') && role !== 'ADMIN' && role !== 'SUPERADMIN' && role !== 'TECNICO') {
      return NextResponse.redirect(new URL(expectedPath, request.url))
    }
    if (path.startsWith('/superadmin') && role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL(expectedPath, request.url))
    }

    return response
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(appConfig.jwtCookieName)
    return response
  }
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'TECNICO': return '/tecnico'
    case 'SUPERADMIN': return '/admin'
    case 'ADMIN': return '/admin/agenda'
    default: return '/dashboard'
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/superadmin/:path*'],
}