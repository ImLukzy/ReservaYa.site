/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin Turbopack en Windows: `next dev --webpack` (ver package.json).
  // El backend es ASP.NET Core; /api/* se proxya del lado servidor.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:5000'}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:5000'}/uploads/:path*`,
      },
    ];
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
