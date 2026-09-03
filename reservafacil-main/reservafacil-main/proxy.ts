import { NextRequest, NextResponse } from 'next/server'
import { config as appConfig } from '@/lib/config'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(appConfig.jwtCookieName)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/superadmin/:path*'],
}