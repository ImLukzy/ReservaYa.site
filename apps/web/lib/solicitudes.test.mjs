import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarSolicitud, solicitudDeRespuesta, claveGuia, guiaAbierta } from './solicitudes.ts'

const DISTRITOS = ['Cayma', 'Yanahuara']
const ok = {
  nombre: 'Complejo Los Andes', direccion: 'Av. Ejército 123', distrito: 'Cayma', telefono: '959 123 456',
  canchaNombre: 'Cancha 1', tipo: 'FUTBOL5', precio: '60', capacidad: '10', acepta: true,
}

test('formulario completo → cuerpo para POST /api/solicitudes', () => {
  const r = validarSolicitud(ok, DISTRITOS)
  assert.deepEqual(r, {
    input: {
      complejo: { nombre: 'Complejo Los Andes', direccion: 'Av. Ejército 123', distrito: 'Cayma', telefono: '959 123 456' },
      cancha: { nombre: 'Cancha 1', tipo: 'FUTBOL5', precioPorHora: 60, capacidad: 10 },
      aceptaConvenio: true,
    },
  })
})

test('sin convenio aceptado no se envía', () => {
  assert.equal(validarSolicitud({ ...ok, acepta: false }, DISTRITOS).campo, 'acepta')
})

test('distrito fuera de la lista, precio cero y capacidad 1 se rechazan', () => {
  assert.equal(validarSolicitud({ ...ok, distrito: 'Lima' }, DISTRITOS).campo, 'distrito')
  assert.equal(validarSolicitud({ ...ok, precio: '0' }, DISTRITOS).campo, 'precio')
  assert.equal(validarSolicitud({ ...ok, capacidad: '1' }, DISTRITOS).campo, 'capacidad')
  assert.equal(validarSolicitud({ ...ok, precio: '45,5' }, DISTRITOS).input.cancha.precioPorHora, 45.5)
})

test('respuesta de mias: null, rechazada o estado desconocido → sin solicitud', () => {
  assert.equal(solicitudDeRespuesta(null), null)
  assert.equal(solicitudDeRespuesta({ solicitud: null }), null)
  assert.equal(solicitudDeRespuesta({ solicitud: { estado: 'RECHAZADA' } }), null)
  assert.equal(solicitudDeRespuesta({ solicitud: { id: 'c1', estado: 'PENDIENTE' } }).id, 'c1')
  assert.equal(solicitudDeRespuesta({ solicitud: { id: 'c1', estado: 'APROBADA' } }).estado, 'APROBADA')
})

test('guía del dueño: abre sola la primera vez, Omitir la cierra, se reabre a pedido', () => {
  assert.equal(claveGuia('u1'), 'ry-guia-dueno:u1')
  assert.equal(guiaAbierta(null, false), true)
  assert.equal(guiaAbierta('omitida', false), false)
  assert.equal(guiaAbierta('omitida', true), true)
})
