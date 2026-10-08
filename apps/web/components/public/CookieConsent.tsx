'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { cookieDecision, serverCookieDecision, subscribeCookies, chooseCookies, COOKIE_OPEN } from '@/lib/public/cookie-consent'

export function CookiePreferences() {
  return <button id="cookie-preferences" type="button" className="inline-flex min-h-11 items-center rounded px-1 text-pizarra hover:text-basalto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped" onClick={() => window.dispatchEvent(new Event(COOKIE_OPEN))}>Preferencias de cookies</button>
}
export default function CookieConsent() {
  const decision = useSyncExternalStore(subscribeCookies, cookieDecision, serverCookieDecision)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(COOKIE_OPEN, show)
    return () => window.removeEventListener(COOKIE_OPEN, show)
  }, [])
  if (decision !== null && !open) return null
  function choose(value: 'accepted' | 'rejected') {
    if (value === 'rejected' && process.env.NEXT_PUBLIC_GA_ID) {
      Object.assign(window, { [`ga-disable-${process.env.NEXT_PUBLIC_GA_ID}`]: true })
    }
    const persisted = chooseCookies(value)
    setOpen(false)
    document.getElementById('cookie-preferences')?.focus()
    // Retirar un SDK ya ejecutado exige un documento nuevo para detener sus tareas.
    if (value === 'rejected' && persisted && document.querySelector('script[data-reservaya-ga]')) window.location.reload()
  }
  return <section role="region" aria-labelledby="cookie-title" aria-describedby="cookie-description" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-texto rounded-surface border border-cal bg-tiza p-4 shadow-suave">
    <h2 id="cookie-title" className="font-sans text-lg font-bold text-basalto [font-variation-settings:normal]">Cookies de análisis</h2>
    <p id="cookie-description" className="mt-1 text-sm text-pizarra">Usamos cookies necesarias para tu sesión. Google Analytics solo se activa si aceptas; puedes cambiar tu decisión en el pie. <Link href="/legal/privacy" className="inline-block min-h-11 min-w-11 py-3 -my-3 font-semibold underline">Privacidad</Link>.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <Button apariencia="publica" variante="secundario" onClick={() => choose('rejected')}>Rechazar</Button>
      <Button apariencia="publica" variante="secundario" onClick={() => choose('accepted')}>Aceptar</Button>
    </div>
  </section>
}
