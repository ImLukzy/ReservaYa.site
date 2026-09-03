/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // El backend ahora es ASP.NET Core (http://localhost:5000).
    // /api/* se reenvía del lado del servidor a la API C#.
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:5000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig