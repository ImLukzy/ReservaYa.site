import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backendForPath, backendRewrites } from './backend-routing.mjs'

test('disabled canary preserves existing browser and server destinations', () => {
  for (const env of [{}, { BACKEND_URL: 'https://legacy.example' }, { NEST_URL: 'https://nest.example', NEST_ROUTES: '' }, { NEST_ROUTES: '/api/canchas' }]) {
    const backend = env.BACKEND_URL ?? 'http://localhost:5000'
    assert.deepEqual(backendRewrites(env), [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ])
    for (const path of ['/api/canchas', '/api/reservas/1', '/uploads/a.png']) assert.equal(backendForPath(path, env), backend)
  }
})
test('canary precedes catch-all and uses segment boundaries, query strings and longest prefix', () => {
  const env = { BACKEND_URL: 'https://legacy.example', NEST_URL: 'https://nest.example/', NEST_ROUTES: ' /api/canchas/buscar, /api/partidos, /api/partidos ' }
  const rewrites = backendRewrites(env)
  assert.equal(rewrites.length, 4)
  for (const path of ['/api/canchas/buscar?dia=1', '/api/partidos', '/api/partidos/123']) assert.equal(backendForPath(path, env), 'https://nest.example')
  for (const path of ['/api/canchas', '/api/partidos-extra', '/api/reservas', '/api/upload', '/uploads/a']) assert.equal(backendForPath(path, env), env.BACKEND_URL)
  for (const rewrite of rewrites.slice(0, -2)) {
    const path = rewrite.source.replace('/:path*', '')
    assert.equal(backendForPath(path, env) + path, rewrite.destination.replace('/:path*', ''))
  }
})
test('rejects rewrite syntax, non-API prefixes, credentials and reserved upload route', () => {
  for (const NEST_ROUTES of ['/api/:path*', '/api', '/uploads', '/api/upload', '/api/upload/x', '/api/../auth']) {
    assert.throws(() => backendRewrites({ NEST_URL: 'https://nest.example', NEST_ROUTES }))
  }
  assert.throws(() => backendRewrites({ NEST_URL: 'https://user:password@nest.example', NEST_ROUTES: '/api/partidos' }))
})
