import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cambiarSeleccion, resumenSeleccion, horaMinutos, fechasReserva, vueltaReserva } from './reserva.ts'
const franjas = Array.from({ length: 8 }, (_, i) => ({ inicio: 480 + i * 30, fin: 510 + i * 30, precio: i < 4 ? '40.00' : '30.00', estado: 'LIBRE' }))
test('selección contigua: sin huecos ni franjas ocupadas y máximo 3 horas', () => {
  let selected = []
  for (const f of franjas.slice(0, 6)) selected = cambiarSeleccion(franjas, selected, f.inicio).seleccion
  assert.deepEqual(selected, [480, 510, 540, 570, 600, 630])
  assert.deepEqual(cambiarSeleccion(franjas, selected, 660).seleccion, selected)
  assert.match(cambiarSeleccion(franjas, selected, 660).error, /3 horas/)
  assert.deepEqual(cambiarSeleccion(franjas, [480], 540).seleccion, [480])
  const blocked = franjas.map(f => f.inicio === 510 ? { ...f, estado: 'OCUPADA' } : f)
  assert.deepEqual(cambiarSeleccion(blocked, [480], 510).seleccion, [480])
})
test('permite ampliar ambos extremos y quitar solo extremos', () => {
  assert.deepEqual(cambiarSeleccion(franjas, [510, 540], 480).seleccion, [480, 510, 540])
  assert.deepEqual(cambiarSeleccion(franjas, [480, 510, 540], 510).seleccion, [480, 510, 540])
  assert.deepEqual(cambiarSeleccion(franjas, [480, 510, 540], 480).seleccion, [510, 540])
})
test('exige 1–3 horas; rechaza huecos y suma los céntimos sin errores flotantes', () => {
  assert.equal(resumenSeleccion(franjas, [480]), null)
  assert.equal(resumenSeleccion(franjas, [480, 540]), null)
  assert.equal(resumenSeleccion(franjas, franjas.map(f => f.inicio)), null)
  assert.deepEqual(resumenSeleccion(franjas, [480, 510]), { inicio: 480, fin: 540, total: '80.00' })
  assert.equal(resumenSeleccion(franjas, [480, 510, 540, 570, 600, 630]).total, '220.00')
  assert.equal(resumenSeleccion(franjas.map(f => ({ ...f, precio: '0.10' })), [480, 510, 540]).total, '0.30')
})
test('no restaura horarios que dejaron de estar libres después del login', () => {
  assert.equal(resumenSeleccion(franjas.map(f => f.inicio === 510 ? { ...f, estado: 'OCUPADA' } : f), [480, 510]), null)
})
test('14 días usan calendario peruano; etiquetas incluyen medianoche', () => {
  const dates = fechasReserva(new Date('2026-10-09T04:59:00Z'))
  assert.equal(dates.length, 14); assert.equal(dates[0], '2026-10-08'); assert.equal(dates.at(-1), '2026-10-21')
  assert.equal(horaMinutos(510), '08:30'); assert.equal(horaMinutos(1440), '24:00')
})
test('returnUrl vuelve al mismo perfil con cancha, fecha e intervalo codificados', () => {
  const url = new URL(vueltaReserva('centro-fixture', 'court&1', '2026-10-08', 480, 540), 'https://reservaya.site')
  assert.equal(url.pathname, '/c/centro-fixture'); assert.equal(url.searchParams.get('cancha'), 'court&1'); assert.equal(url.searchParams.get('fecha'), '2026-10-08'); assert.equal(url.searchParams.get('inicio'), '480'); assert.equal(url.searchParams.get('fin'), '540'); assert.equal(url.hash, '#reservar')
})
