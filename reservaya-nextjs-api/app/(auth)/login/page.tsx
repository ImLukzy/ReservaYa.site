import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { publicAppUrl } from '@/lib/public-app'
import { returnUrlSeguro } from '@/lib/redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.returnUrl) ? params.returnUrl[0] : params.returnUrl
  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const panelOrigin = host ? `${protocol}://${host}` : null
  const seguro = panelOrigin ? returnUrlSeguro(raw, panelOrigin) : null
  const destino = new URL('/login', publicAppUrl)

  if (seguro && panelOrigin) {
    destino.searchParams.set('returnUrl', new URL(seguro, panelOrigin).href)
  }

  redirect(destino.href)
}
