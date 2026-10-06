import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Dos familias locales con licencia OFL, subconjunto latino (spec 54).
// Anybody: titulares estrechos y pesados, como números de camiseta o un marcador.
const anybody = localFont({
  src: [{ path: '../public/fonts/anybody-variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--ff-anybody',
  display: 'swap',
  fallback: ['Arial Narrow', 'Roboto Condensed', 'system-ui', 'sans-serif'],
  adjustFontFallback: false,
})
// Instrument Sans: texto corrido, formularios y panel.
const instrument = localFont({
  src: [{ path: '../public/fonts/instrument-sans-variable.woff2', weight: '400 700', style: 'normal' }],
  variable: '--ff-instrument',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'ReservaYa',
  description: 'Busca, reserva y juega. Sistema de reservas de canchas deportivas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Las variables de fuente van en <html>: --font-sans y --font-display se resuelven en :root.
    <html lang="es" className={`${anybody.variable} ${instrument.variable}`}>
      <body className="font-cuerpo">{children}</body>
    </html>
  )
}
