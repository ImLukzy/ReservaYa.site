import type { ReactNode } from 'react'
import Header from '@/components/public/Header'
import Footer from '@/components/public/Footer'
import Effects from '@/components/public/Effects'
import Analytics from '@/components/public/Analytics'
import CookieConsent from '@/components/public/CookieConsent'
import { EMAIL, INSTAGRAM } from '@/lib/public/contacto'

const site = 'https://reservaya.com'
const structuredData = [
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'ReservaYa', url: site, logo: `${site}/favicon.svg`, sameAs: [INSTAGRAM], contactPoint: { '@type': 'ContactPoint', email: EMAIL, contactType: 'customer service', areaServed: 'PE', availableLanguage: 'Spanish' } },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ReservaYa', url: site },
  { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'ReservaYa', url: site, description: 'Reserva de canchas deportivas en Arequipa: fútbol, vóley, básquet, pádel y tenis en los distritos de la ciudad.', applicationCategory: 'SportsApplication', operatingSystem: 'Web', areaServed: { '@type': 'City', name: 'Arequipa', addressCountry: 'PE' } },
]

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="public-site flex min-h-screen flex-col" data-inbox-endpoint={process.env.NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT}>
    <link rel="sitemap" href="/sitemap.xml" />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <Header />
    <main id="contenido" tabIndex={-1} className="min-h-[calc(100svh-4rem)] flex-1 focus:outline-none">{children}</main>
    <Footer />
    <Effects />
    <CookieConsent />
    <Analytics />
  </div>
}
