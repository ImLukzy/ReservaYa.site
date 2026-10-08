/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin Turbopack en Windows: `next dev --webpack` (ver package.json).
  // El backend es NestJS; /api/* se proxya del lado servidor.
  async redirects() {
    return [
      { source: '/completar-cuadro', destination: '/jugar', statusCode: 301 },
      { source: '/sortear', destination: '/jugar', statusCode: 301 },
      { source: '/torneos', destination: '/jugar', statusCode: 301 },
      { source: '/precios', destination: '/duenos', statusCode: 301 },
      { source: '/publica-tu-cancha', destination: '/duenos', statusCode: 301 },
      { source: '/jugador/perfil', destination: '/dashboard/perfil', statusCode: 301 },
      { source: '/mis-reservas', destination: '/dashboard/reservas', statusCode: 301 },
      { source: '/mis-partidos', destination: '/dashboard/partidos', statusCode: 301 },
    ];
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:5200';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  poweredByHeader: false,
};

module.exports = nextConfig;
