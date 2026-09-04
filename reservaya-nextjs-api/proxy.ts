import { NextRequest, NextResponse } from 'next/server'
import { config as appConfig } from '@/lib/config'
import { verifyToken } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(appConfig.jwtCookieName)?.value
  const pathname = request.nextUrl.pathname
  const session = token ? await verifyToken(token) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/superadmin') && session.rol !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    pathname.startsWith('/admin') &&
    session.rol !== 'ADMIN' &&
    session.rol !== 'SUPERADMIN'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/superadmin/:path*'],
}