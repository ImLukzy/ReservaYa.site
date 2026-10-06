import { test } from 'node:test'
import assert from 'node:assert/strict'
import { edadValida, fechaMaximaRegistro } from './edad.ts'

const hoy = new Date('2026-10-05T23:59:00Z')
test('registro acepta el cumpleaños 14 y rechaza a quien todavía tiene 13', () => {
  assert.equal(edadValida('2012-10-05', hoy), true)
  assert.equal(edadValida('2012-10-06', hoy), false)
  assert.equal(edadValida('2012-10-04', hoy), true)
})
test('rechaza fechas futuras, inexistentes, vacías y anteriores al límite API', () => {
  for (const fecha of ['', '2027-01-01', '2012-02-30', '2011-02-29', '1899-12-31', 'no-fecha', '2012-1-01']) assert.equal(edadValida(fecha, hoy), false, fecha)
  assert.equal(edadValida('1900-01-01', hoy), true)
})
test('el corte usa UTC para coincidir con la API, también cerca de medianoche', () => {
  assert.equal(fechaMaximaRegistro(new Date('2026-10-05T19:30:00-05:00')), '2012-10-06')
})
test('el corte de 29 de febrero ajusta el día como DateTime.AddYears', () => {
  const leap = new Date('2024-02-29T12:00:00Z')
  assert.equal(fechaMaximaRegistro(leap), '2010-02-28')
  assert.equal(edadValida('2010-02-28', leap), true)
  assert.equal(edadValida('2010-03-01', leap), false)
})
test('nacimiento bisiesto alcanza el corte correcto antes y después de marzo', () => {
  assert.equal(edadValida('2012-02-29', new Date('2026-02-28T12:00:00Z')), false)
  assert.equal(edadValida('2012-02-29', new Date('2026-03-01T12:00:00Z')), true)
})
