import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
function loadUrl(file) {
  const source = readFileSync(file, 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from (["'])(\.[^"']+)\1/g, (_, quote, path) => `from ${JSON.stringify(loadUrl(new URL(`${path}.ts`, file)))}`)
  return `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
}
const { urlReservar, urlFicha } = await import(loadUrl(new URL('./scripts/filas.ts', import.meta.url)))
const file = new URL('../../components/public/reserva/ReservaWidget.tsx', import.meta.url)
const source = readFileSync(file, 'utf8')
const ast = ts.createSourceFile('widget.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'normalizarInicial')
const compiled = ts.transpileModule(source.slice(declaration.getStart(ast), declaration.end), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { normalizarInicial } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const cancha = { id: 'cancha & 2', complejoId: 'complejo', complejo: { slug: 'centro/uno' } }
test('catalog and hourly board preserve court, date and minutes in profile link', () => {
  const url = new URL(urlReservar('', cancha, '2026-10-09', 9.5), 'https://reservaya.site')
  assert.equal(url.pathname, '/c/centro%2Funo')
  assert.equal(url.hash, '#reservar')
  assert.deepEqual(Object.fromEntries(url.searchParams), { cancha: 'cancha & 2', fecha: '2026-10-09', inicio: '570', fin: '630' })
  assert.equal(urlFicha('', cancha), '/c/centro%2Funo#reservar')
})
test('standalone and legacy responses retain dashboard reservation flow', () => {
  for (const complejoId of [null, 'legacy']) {
    const url = new URL(urlReservar('', { id: 'court', complejoId }, '2026-10-09', 10), 'https://reservaya.site')
    assert.equal(url.pathname, '/dashboard/canchas')
    assert.equal(url.searchParams.get('horaInicio'), '600')
    assert.equal(url.searchParams.get('horaFin'), '660')
    assert.equal(url.searchParams.get('complejoId'), complejoId)
  }
})
const courts = [{ id: 'first' }, { id: 'second' }]
const days = ['2026-10-08', '2026-10-09']
const defaults = { cancha: 'first', fecha: days[0] }
test('widget retains valid selection and defaults to first court and today', () => {
  const valid = { cancha: 'second', fecha: days[1], inicio: 570, fin: 660 }
  assert.deepEqual(normalizarInicial(courts, days, valid), valid)
  assert.deepEqual(normalizarInicial(courts, days, {}), defaults)
})
test('foreign courts, invalid dates and invalid ranges discard the entire preset', () => {
  for (const patch of [{ cancha: 'foreign' }, { fecha: 'invalid' }, { inicio: -1 }, { inicio: 601 }, { fin: undefined }, { fin: 630 }, { fin: 840 }, { fin: 1500 }, { inicio: NaN }]) {
    assert.deepEqual(normalizarInicial(courts, days, { cancha: 'second', fecha: days[1], inicio: 600, fin: 660, ...patch }), defaults)
  }
})
