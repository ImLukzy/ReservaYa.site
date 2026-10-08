import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estadoCalificar, urlResenas, unirPaginas, loginHref, inicial, indiceColor, porcentaje, fechaPeru, textoTotal } from './resenas.ts'

const resena = (id, puntuacion = 4) => ({ id, puntuacion, comentario: null, respuestaDueno: null, creadoEn: '2026-10-08T03:00:00Z', autor: 'Ana Q.' })
const pagina = (ids, siguiente = null, total = 9) => ({ promedio: 4.2, total, distribucion: { 1: 0, 2: 1, 3: 1, 4: 3, 5: 4 }, orden: 'recientes', resenas: ids.map((id) => resena(id)), siguiente })

test('estado sin sesión cuando /mia responde 401', () => {
  assert.deepEqual(estadoCalificar({ status: 401 }), { tipo: 'sin-sesion' })
})

test('estado "no jugó" cuando no tiene reserva completada', () => {
  assert.deepEqual(estadoCalificar({ status: 200, body: { complejoId: 'c1', puedeCalificar: false, motivo: 'SIN_RESERVA_COMPLETADA', resena: null } }), { tipo: 'no-jugo' })
})

test('estado "puede" con el id del complejo para enviar la reseña', () => {
  assert.deepEqual(estadoCalificar({ status: 200, body: { complejoId: 'c1', puedeCalificar: true, motivo: null, resena: null } }), { tipo: 'puede', complejoId: 'c1' })
})

test('estado "ya calificó" muestra su reseña aunque ya no tenga reservas', () => {
  const propia = { ...resena('r1'), complejoId: 'c1' }
  assert.deepEqual(estadoCalificar({ status: 200, body: { complejoId: 'c1', puedeCalificar: true, motivo: null, resena: propia } }), { tipo: 'ya-califico', complejoId: 'c1', resena: propia })
})

test('errores de red o de servidor no se confunden con "sin sesión"', () => {
  assert.deepEqual(estadoCalificar({ status: 500 }), { tipo: 'error' })
  assert.deepEqual(estadoCalificar({ status: 403 }), { tipo: 'error' })
})

test('ordenar arma la URL con el orden y sin cursor', () => {
  assert.equal(urlResenas('centro norte', 'mejor'), '/api/resenas/publicas?slug=centro+norte&orden=mejor&limite=5')
  assert.equal(urlResenas('c', 'peor', null, 20), '/api/resenas/publicas?slug=c&orden=peor&limite=20')
})

test('ver más pide la siguiente página con el cursor y la añade sin duplicar', () => {
  assert.equal(urlResenas('c', 'recientes', 'r2'), '/api/resenas/publicas?slug=c&orden=recientes&limite=5&cursor=r2')
  const unidas = unirPaginas(pagina(['r1', 'r2'], 'r2'), pagina(['r2', 'r3'], null, 10))
  assert.deepEqual(unidas.resenas.map((r) => r.id), ['r1', 'r2', 'r3'])
  assert.equal(unidas.siguiente, null)
  assert.equal(unidas.total, 10)
})

test('login vuelve al perfil del complejo', () => {
  assert.equal(loginHref('centro-sur'), '/login?returnUrl=%2Fc%2Fcentro-sur')
})

test('inicial, color estable, porcentajes, fecha en hora de Perú y total', () => {
  assert.equal(inicial('ana Q.'), 'A')
  assert.equal(inicial(' '), 'J')
  assert.equal(indiceColor('Ana Q.', 6), indiceColor('Ana Q.', 6))
  assert.ok(indiceColor('Luis', 6) >= 0 && indiceColor('Luis', 6) < 6)
  assert.equal(porcentaje(1, 3), 33)
  assert.equal(porcentaje(0, 0), 0)
  // 03:00 UTC del 8 es aún 7 de octubre en Lima (UTC-5).
  assert.equal(fechaPeru('2026-10-08T03:00:00Z'), '7 de octubre de 2026')
  assert.equal(fechaPeru('no-fecha'), '')
  assert.equal(textoTotal(1), '1 reseña')
  assert.equal(textoTotal(3), '3 reseñas')
})
