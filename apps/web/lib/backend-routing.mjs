/** @typedef {{ BACKEND_URL?: string, NEST_URL?: string, NEST_ROUTES?: string }} RoutingEnv */
/** @param {RoutingEnv} env */
function canaryRoutes(env) {
  if (!env.NEST_URL || !env.NEST_ROUTES?.trim()) return []
  const url = new URL(env.NEST_URL)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('NEST_URL debe ser un origen HTTP sin credenciales')
  }
  return [...new Set(env.NEST_ROUTES.split(',').map(route => route.trim().replace(/\/+$/, '')).filter(Boolean))].map(route => {
    if (!/^\/api\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(route) || route === '/api/upload' || route.startsWith('/api/upload/')) {
      throw new Error('Prefijo NEST_ROUTES inválido o reservado')
    }
    return { prefix: route, origin: url.origin }
  }).sort((a, b) => b.prefix.length - a.prefix.length)
}
/** @param {string} path @param {RoutingEnv} [env] */
export function backendForPath(path, env = process.env) {
  const pathname = path.split(/[?#]/, 1)[0]
  return canaryRoutes(env).find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.origin
    ?? env.BACKEND_URL ?? 'http://localhost:5000'
}
/** @param {RoutingEnv} [env] */
export function backendRewrites(env = process.env) {
  const backend = env.BACKEND_URL ?? 'http://localhost:5000'
  return [
    ...canaryRoutes(env).map(({ prefix, origin }) => ({ source: `${prefix}/:path*`, destination: `${origin}${prefix}/:path*` })),
    { source: '/api/:path*', destination: `${backend}/api/:path*` },
    { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
  ]
}
