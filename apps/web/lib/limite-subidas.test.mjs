import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearLimite } from './limite-subidas.ts'

test('permite hasta el máximo por usuario y luego bloquea', () => {
  const limite = crearLimite(3, 1000)
  assert.equal(limite.permitir('a', 0), true)
  assert.equal(limite.permitir('a', 1), true)
  assert.equal(limite.permitir('a', 2), true)
  assert.equal(limite.permitir('a', 3), false)
  assert.equal(limite.permitir('b', 3), true, 'otro usuario tiene su propio cupo')
})

test('la ventana es deslizante', () => {
  const limite = crearLimite(2, 1000)
  assert.equal(limite.permitir('a', 0), true)
  assert.equal(limite.permitir('a', 500), true)
  assert.equal(limite.permitir('a', 999), false)
  assert.equal(limite.permitir('a', 1000), true, 'el intento de t=0 ya salió de la ventana')
  assert.equal(limite.permitir('a', 1001), false)
})

test('los intentos rechazados no consumen cupo', () => {
  const limite = crearLimite(1, 1000)
  assert.equal(limite.permitir('a', 0), true)
  for (let t = 1; t < 1000; t += 100) assert.equal(limite.permitir('a', t), false)
  assert.equal(limite.permitir('a', 1000), true)
})
