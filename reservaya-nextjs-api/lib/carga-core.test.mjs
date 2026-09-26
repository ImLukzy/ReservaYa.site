import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearCargaCon, mensajeCarga } from './carga-core.ts'

// Simula unstable_rethrow: relanza los errores de control de Next (digest NEXT_*).
const rethrow = (e) => { if (e && typeof e.digest === 'string' && e.digest.startsWith('NEXT_')) throw e }
const crearCarga = () => crearCargaCon(rethrow)

class ApiErrorFalso extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

test('mensajeCarga: usa el mensaje de la API o el status', () => {
  assert.equal(mensajeCarga(new ApiErrorFalso(403, 'No tienes acceso a esta sede')), 'No tienes acceso a esta sede')
  assert.equal(mensajeCarga(new ApiErrorFalso(500, 'Error 500')), 'la API respondió 500')
  assert.equal(mensajeCarga(new TypeError('fetch failed')), 'sin conexión con la API')
  assert.equal(mensajeCarga('raro'), 'error inesperado')
})

test('crearCarga: éxito devuelve el dato y no registra error', async () => {
  const carga = crearCarga()
  assert.deepEqual(await carga.de(Promise.resolve([1, 2]), [], 'las canchas'), [1, 2])
  assert.deepEqual(carga.errores, [])
})

test('crearCarga: fallo devuelve el vacío y acumula un mensaje por carga', async () => {
  const carga = crearCarga()
  const errorOriginal = console.error
  console.error = () => {}
  try {
    const [a, b] = await Promise.all([
      carga.de(Promise.reject(new ApiErrorFalso(500, 'Error 500')), [], 'las reservas'),
      carga.de(Promise.reject(new TypeError('fetch failed')), null, 'el reporte'),
    ])
    assert.deepEqual(a, [])
    assert.equal(b, null)
  } finally {
    console.error = errorOriginal
  }
  assert.deepEqual(carga.errores, [
    'No se pudieron cargar las reservas: la API respondió 500.',
    'No se pudieron cargar el reporte: sin conexión con la API.',
  ])
})

test('crearCarga: no se traga redirect() de Next', async () => {
  const carga = crearCarga()
  const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
  await assert.rejects(carga.de(Promise.reject(redirect), [], 'algo'), (e) => e === redirect)
  assert.deepEqual(carga.errores, [])
})
