import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pasosOnboarding } from './onboarding.ts'

const cancha = (complejoId, extra = {}) => ({ complejoId, activa: true, imagen: 'uploads/a.jpg', ...extra })
const horario = (activo = true) => ({ activo })

test('sin complejos → nada completado', () => {
  assert.deepEqual(pasosOnboarding({ complejos: [], canchas: [], horarios: {} }), [false, false, false, false, false])
})

test('complejo recién creado → solo el paso 1', () => {
  const r = pasosOnboarding({ complejos: [{ id: 'c1' }], canchas: [], horarios: { c1: [] } })
  assert.deepEqual(r, [true, false, false, false, false])
})

test('negocio configurado → pasos 1 a 4; compartir queda manual', () => {
  const r = pasosOnboarding({
    complejos: [{ id: 'c1' }],
    canchas: [cancha('c1'), cancha('c1')],
    horarios: { c1: [horario()] },
  })
  assert.deepEqual(r, [true, true, true, true, false])
})

test('canchas inactivas no cuentan como canchas ni exigen foto', () => {
  const r = pasosOnboarding({
    complejos: [{ id: 'c1' }],
    canchas: [cancha('c1', { activa: false })],
    horarios: { c1: [horario()] },
  })
  assert.deepEqual(r, [true, false, true, false, false])
})

test('horario con error de carga (null) o solo filas inactivas → pendiente', () => {
  const base = { complejos: [{ id: 'c1' }], canchas: [cancha('c1')] }
  assert.equal(pasosOnboarding({ ...base, horarios: { c1: null } })[2], false)
  assert.equal(pasosOnboarding({ ...base, horarios: { c1: [horario(false)] } })[2], false)
  assert.equal(pasosOnboarding({ ...base, horarios: {} })[2], false)
})

test('dos complejos: canchas y horarios se exigen en ambos', () => {
  const r = pasosOnboarding({
    complejos: [{ id: 'c1' }, { id: 'c2' }],
    canchas: [cancha('c1')],
    horarios: { c1: [horario()], c2: null },
  })
  assert.deepEqual(r, [true, false, false, true, false])
})

test('una cancha activa sin imagen → fotos pendiente', () => {
  const r = pasosOnboarding({
    complejos: [{ id: 'c1' }],
    canchas: [cancha('c1'), cancha('c1', { imagen: null })],
    horarios: { c1: [horario()] },
  })
  assert.equal(r[3], false)
})

test('canchas sin complejo o de otro alcance se ignoran', () => {
  const r = pasosOnboarding({
    complejos: [{ id: 'c1' }],
    canchas: [cancha(null), cancha('otro'), cancha(null, { imagen: null })],
    horarios: { c1: [horario()] },
  })
  assert.deepEqual(r, [true, false, true, false, false])
})
