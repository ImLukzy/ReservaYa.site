import type { MetadataRoute } from 'next'

// Manifiesto PWA (spec 67): instalable en móvil. Colores del spec 53/54:
// sillar #06120a (fondo noche del sitio público). Iconos derivados de
// public/favicon.svg (ver icon-*.png en public/).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReservaYa — canchas deportivas en Arequipa',
    short_name: 'ReservaYa',
    description: 'Busca, reserva y juega. Sistema de reservas de canchas deportivas en Arequipa.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#06120a',
    theme_color: '#06120a',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
