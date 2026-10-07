import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  invitacionesDeRespuesta, haceCuanto, contador, etiquetaBandeja, anuncioNuevas, avisoUnion, estadoMiembro,
} from './invitaciones.ts'

const fila = {
  id: 'm1',
  complejo: { id: 'c1', nombre: 'Complejo Los Andes', distrito: 'Cayma' },
  invitadoPor: { nombre: 'Ana' },
  creadoEn: '2026-10-06T10:00:00Z',
}

test('respuesta válida → invitaciones', () => {
  assert.deepEqual(invitacionesDeRespuesta({ ok: true, invitaciones: [fila] }), [fila])
})

test('respuesta rota o filas incompletas se descartan', () => {
  assert.deepEqual(invitacionesDeRespuesta(null), [])
  assert.deepEqual(invitacionesDeRespuesta({ invitaciones: 'x' }), [])
  assert.deepEqual(invitacionesDeRespuesta({ invitaciones: [{ id: 'm2' }, { ...fila, complejo: { id: 'c' } }] }), [])
})

test('sin invitador ni distrito se normaliza', () => {
  const [i] = invitacionesDeRespuesta({ invitaciones: [{ ...fila, invitadoPor: null, complejo: { id: 'c1', nombre: 'X' } }] })
  assert.equal(i.invitadoPor, null)
  assert.equal(i.complejo.distrito, '')
})

test('haceCuanto en minutos, horas, días y meses', () => {
  const t = Date.parse('2026-10-06T10:00:00Z')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t + 20_000), 'ahora')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t + 5 * 60_000), 'hace 5 min')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t + 3 * 3600_000), 'hace 3 h')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t + 26 * 3600_000), 'hace 1 día')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t + 4 * 86400_000), 'hace 4 días')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t + 65 * 86400_000), 'hace 2 meses')
  assert.equal(haceCuanto('2026-10-06T10:00:00Z', t - 60_000), 'ahora')
  assert.equal(haceCuanto('no-fecha', t), '')
})

test('contador y etiqueta de la campana', () => {
  assert.equal(contador(0), '')
  assert.equal(contador(3), '3')
  assert.equal(contador(12), '9+')
  assert.equal(etiquetaBandeja(0), 'Invitaciones: no tienes pendientes')
  assert.equal(etiquetaBandeja(1), 'Invitaciones: 1 pendiente')
  assert.equal(etiquetaBandeja(2), 'Invitaciones: 2 pendientes')
})

test('solo se anuncian invitaciones nuevas', () => {
  assert.equal(anuncioNuevas(0, 0), '')
  assert.equal(anuncioNuevas(2, 1), '')
  assert.equal(anuncioNuevas(0, 1), 'Tienes una invitación de equipo nueva.')
  assert.equal(anuncioNuevas(1, 3), 'Tienes 2 invitaciones de equipo nuevas.')
})

test('aviso tras aceptar y estado del miembro', () => {
  assert.equal(avisoUnion('Los Andes'), 'Ya eres parte del equipo de Los Andes.')
  assert.equal(estadoMiembro({ activo: false }), 'PENDIENTE')
  assert.equal(estadoMiembro({ activo: true }), 'ACTIVO')
  assert.equal(estadoMiembro({ activo: true, estado: 'PENDIENTE' }), 'PENDIENTE')
})
