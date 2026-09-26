import { test } from 'node:test'
import assert from 'node:assert/strict'
import { returnUrlSeguro } from './redirect.ts'

const PANEL = 'http://localhost:3000'
const LANDING = 'http://localhost:4321'

test('rutas locales pasan relativas', () => {
  assert.equal(returnUrlSeguro('/dashboard/reservas?x=1#a', PANEL), '/dashboard/reservas?x=1#a')
  assert.equal(returnUrlSeguro('/', PANEL), '/')
})

test('vacío o nulo → null', () => {
  assert.equal(returnUrlSeguro(null, PANEL), null)
  assert.equal(returnUrlSeguro('', PANEL), null)
  assert.equal(returnUrlSeguro(undefined, PANEL), null)
})

test('protocol-relative y barra invertida → null', () => {
  for (const raw of ['//evil.com', '/\\evil.com', '\\\\evil.com', '/\\/evil.com', 'https:\\\\evil.com']) {
    assert.equal(returnUrlSeguro(raw, PANEL), null, raw)
  }
})

test('caracteres de control (tab/salto) → null', () => {
  assert.equal(returnUrlSeguro('/\t/evil.com', PANEL), null)
  assert.equal(returnUrlSeguro('/\n/evil.com', PANEL), null)
})

test('esquemas no http → null', () => {
  assert.equal(returnUrlSeguro('javascript:alert(1)', PANEL, [LANDING]), null)
  assert.equal(returnUrlSeguro('data:text/html,hola', PANEL), null)
})

test('orígenes absolutos: solo propio y extras', () => {
  assert.equal(returnUrlSeguro('http://localhost:4321/mis-reservas', PANEL, [LANDING]), 'http://localhost:4321/mis-reservas')
  assert.equal(returnUrlSeguro('http://localhost:3000/admin', PANEL), 'http://localhost:3000/admin')
  assert.equal(returnUrlSeguro('http://localhost:4321/x', PANEL), null)
  assert.equal(returnUrlSeguro('https://evil.com/', PANEL, [LANDING]), null)
  assert.equal(returnUrlSeguro('http://localhost:9999/', PANEL, [LANDING]), null)
})

test('extras inválidos no rompen', () => {
  assert.equal(returnUrlSeguro('https://evil.com/', PANEL, ['no-es-url']), null)
})
