'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { cookieDecision, serverCookieDecision, subscribeCookies } from '@/lib/public/cookie-consent'

declare global { interface Window { dataLayer?: unknown[][] } }

export default function Analytics() {
  const pathname = usePathname()
  const decision = useSyncExternalStore(subscribeCookies, cookieDecision, serverCookieDecision)
  const previous = useRef<string | null>(null)
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GA_ID
    // Never load analytics on the password-reset route, including its fragment.
    if (!id) return
    const allowed = decision === 'accepted' && pathname !== '/reset-password'
    Object.assign(window, { [`ga-disable-${id}`]: !allowed })
    if (!allowed) {
      previous.current = null
      return
    }
    if (previous.current === pathname) return
    const first = !document.querySelector('script[data-reservaya-ga]')
    if (first) {
      const script = document.createElement('script')
      script.dataset.reservayaGa = 'true'
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
      document.head.appendChild(script)
      window.dataLayer ??= []
      window.dataLayer.push(['js', new Date()])
      window.dataLayer.push(['config', id, { anonymize_ip: true, send_page_view: false }])
    }
    window.dataLayer ??= []
    window.dataLayer.push(['event', 'page_view', { page_location: window.location.origin + pathname, page_path: pathname }])
    previous.current = pathname
  }, [pathname, decision])
  return null
}
