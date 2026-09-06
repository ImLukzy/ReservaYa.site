import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800', '900'] })

export const metadata: Metadata = {
  title: 'ReservaYa',
  description: 'Busca, reserva y juega. Sistema de reservas de canchas deportivas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={nunito.className}>{children}</body>
    </html>
  )
}