import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTorneos, parseDetalle, cuerpoResultado, rutaResultado, ESTADOS_TORNEO } from './torneos.ts'

// Formas reales de TorneosController (List, Get, PartidoShape, InscripcionShape).
const LISTA = {
  ok: true,
  torneos: [
    {
      id: 't1', complejoId: 'c1', nombre: 'Copa Arequipa', deporte: 'FUTBOL', fechaInicio: '2026-10-01T00:00:00Z',
      fechaFin: null, costoInscripcion: '0.00', cupoMax: 8, premio: 'S/ 500', reglamento: null,
      estado: 'INSCRIPCIONES_ABIERTAS', creadoEn: '2026-09-01T00:00:00Z', _count: { inscripciones: 3, partidos: 2 },
    },
  ],
}

const DETALLE = {
  ok: true,
  torneo: { id: 't1', nombre: 'Copa Arequipa', cupoMax: 8, premio: 'S/ 500', estado: 'EN_CURSO', fechaInicio: '2026-10-01T00:00:00Z', fechaFin: null },
  inscripciones: [{ id: 'i1', torneoId: 't1', equipo: 'Los Andes', capitanId: null, telefono: '987654321', pagado: false }],
  partidos: [
    { id: 'p1', torneoId: 't1', fase: 'Grupos', equipoA: 'Los Andes', equipoB: 'Misti FC', golesA: 2, golesB: 1, fecha: null, canchaId: null, ganador: 'Los Andes' },
    { id: 'p2', torneoId: 't1', fase: 'Grupos', equipoA: 'Chachani', equipoB: 'Sillar', golesA: null, golesB: null, fecha: null, canchaId: null, ganador: null },
  ],
}

test('la lista usa cupoMax y _count.inscripciones', () => {
  const [t] = parseTorneos(LISTA)
  assert.equal(t.cupoMax, 8)
  assert.equal(t.inscritos, 3)
  assert.equal(t.estado, 'INSCRIPCIONES_ABIERTAS')
  assert.ok(ESTADOS_TORNEO.includes(t.estado))
})

test('el detalle lee equipoA/equipoB y golesA/golesB', () => {
  const d = parseDetalle(DETALLE)
  assert.ok(d)
  assert.equal(d.inscritos, 1)
  assert.equal(d.inscripciones[0].telefono, '987654321')
  assert.deepEqual([d.partidos[0].equipoA, d.partidos[0].equipoB], ['Los Andes', 'Misti FC'])
  assert.deepEqual([d.partidos[0].golesA, d.partidos[0].golesB], [2, 1])
  assert.equal(d.partidos[1].golesA, null)
})

test('sin torneo en el cuerpo no hay detalle', () => {
  assert.equal(parseDetalle({ ok: true }), null)
  assert.deepEqual(parseTorneos(null), [])
})

test('el resultado va a PUT /api/torneos/partidos/{id} con golesA/golesB', () => {
  assert.equal(rutaResultado('p1'), '/api/torneos/partidos/p1')
  assert.deepEqual(cuerpoResultado('3', '0'), { golesA: 3, golesB: 0 })
})
