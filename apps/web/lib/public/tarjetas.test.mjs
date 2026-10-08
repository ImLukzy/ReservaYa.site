import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agruparPorComplejo, ordenarGrupos, fotoDeGrupo, intercalarPromos, textoConteo } from './tarjetas.ts'

const item = (id, precio, complejoId, tipo = 'FUTBOL7', imagen = null) => ({
  precio,
  cancha: {
    id,
    nombre: `Cancha ${id}`,
    tipo,
    imagen,
    complejoId,
    complejo: complejoId ? { id: complejoId, nombre: `Complejo ${complejoId}`, distrito: 'Cayma' } : null,
  },
})
const precio = (it) => it.precio

test('agrupa por complejo conservando el orden y calcula precio desde y deportes', () => {
  const grupos = agruparPorComplejo([item('1', 70, 'a'), item('2', 25, 'b'), item('3', 50, 'a', 'VOLLEYBALL'), item('4', 60, 'a')], precio)
  assert.deepEqual(grupos.map((g) => g.nombre), ['Complejo a', 'Complejo b'])
  assert.equal(grupos[0].items.length, 3)
  assert.equal(grupos[0].desde, 50)
  assert.deepEqual(grupos[0].tipos, ['FUTBOL7', 'VOLLEYBALL'])
  assert.equal(grupos[0].distrito, 'Cayma')
})

test('una cancha sin complejo forma su propio grupo con su nombre', () => {
  const grupos = agruparPorComplejo([item('1', 30, null), item('2', 40, null)], precio)
  assert.equal(grupos.length, 2)
  assert.equal(grupos[0].nombre, 'Cancha 1')
  assert.equal(grupos[0].distrito, 'Arequipa')
  assert.equal(grupos[0].complejoId, null)
})

test('ordena grupos por precio desde y por valoración', () => {
  const grupos = agruparPorComplejo([item('1', 70, 'a'), item('2', 25, 'b'), item('3', 40, 'c')], precio)
  assert.deepEqual(ordenarGrupos(grupos, 'precio', () => 0).map((g) => g.desde), [25, 40, 70])
  assert.deepEqual(ordenarGrupos(grupos, 'precio-desc', () => 0).map((g) => g.desde), [70, 40, 25])
  const notas = { 'complejo:a': 4.5, 'complejo:b': 3, 'complejo:c': 5 }
  assert.deepEqual(ordenarGrupos(grupos, 'valoracion', (g) => notas[g.clave]).map((g) => g.complejoId), ['c', 'a', 'b'])
  assert.deepEqual(grupos.map((g) => g.complejoId), ['a', 'b', 'c'], 'no muta la entrada')
})

test('la foto del grupo es la primera válida', () => {
  const [g] = agruparPorComplejo([item('1', 1, 'a', 'FUTBOL', 'https://otro.com/x.jpg'), item('2', 1, 'a', 'FUTBOL', '/uploads/y.jpg')], precio)
  assert.equal(fotoDeGrupo(g, (u) => Boolean(u?.startsWith('/uploads/'))), '/uploads/y.jpg')
  assert.equal(fotoDeGrupo(g, () => false), null)
})

test('intercala una promo cada 5 tarjetas y como máximo 2', () => {
  const celdas = intercalarPromos(Array.from({ length: 17 }, (_, i) => i))
  const promos = celdas.map((c, i) => (c.tipo === 'promo' ? i : -1)).filter((i) => i >= 0)
  assert.deepEqual(promos, [5, 11])
  assert.equal(celdas.filter((c) => c.tipo === 'item').length, 17)
  assert.deepEqual(celdas.filter((c) => c.tipo === 'promo').map((c) => c.indice), [0, 1])
})

test('sin promos con menos de 5 tarjetas', () => {
  assert.equal(intercalarPromos([1, 2, 3, 4]).some((c) => c.tipo === 'promo'), false)
  assert.deepEqual(intercalarPromos([]), [])
})

test('texto de conteo con singular y plural', () => {
  assert.equal(textoConteo(1, 1), '1 complejo · 1 cancha')
  assert.equal(textoConteo(3, 9), '3 complejos · 9 canchas')
})

test('prefiere portada propia del complejo y conserva respaldo de cancha', () => {
  const row = item('1', 40, 'a', 'FUTBOL', '/uploads/cancha.webp')
  row.cancha.complejo.fotos = ['/uploads/portada.webp', '/uploads/otra.webp']
  const [grupo] = agruparPorComplejo([row], precio)
  const valida = u => Boolean(u?.startsWith('/uploads/'))
  assert.equal(fotoDeGrupo(grupo, valida), '/uploads/portada.webp')
  row.cancha.complejo.fotos = ['https://outside.example/photo.webp']
  assert.equal(fotoDeGrupo(grupo, valida), '/uploads/cancha.webp')
})
