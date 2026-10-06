import type { Metadata } from 'next'

const site = 'https://reservaya.com'
export function publicMetadata(title: string, description: string, path: string, robots = 'index, follow'): Metadata {
  const canonical = new URL(path, site).href
  const image = new URL('/og-default.png', site).href
  return {
    title, description, metadataBase: new URL(site),
    alternates: { canonical }, robots,
    referrer: 'strict-origin-when-cross-origin',
    icons: { icon: '/favicon.svg' },
    openGraph: { type: 'website', url: canonical, title, description, images: [image], siteName: 'ReservaYa', locale: 'es_PE' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
