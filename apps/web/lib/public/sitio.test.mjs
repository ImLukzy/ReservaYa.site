import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SITIO, linkPublico } from './sitio.ts'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('./metadata.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replace("'./sitio'", JSON.stringify(new URL('./sitio.ts', import.meta.url).href))
const { publicMetadata } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
import { reservaCanchaHref } from './complejo-publico.ts'
import { whatsappUrl } from '../whatsapp.ts'
test('profile, QR and WhatsApp share URL use the canonical domain and encode the slug', () => {
  assert.equal(SITIO, 'https://reservaya.site')
  assert.equal(linkPublico('centro-arequipa'), 'https://reservaya.site/c/centro-arequipa')
  assert.equal(linkPublico('centro/extra'), 'https://reservaya.site/c/centro%2Fextra')
  const text = `Reserva tu cancha aquí: ${linkPublico('centro-arequipa')}`
  assert.ok(new URL(`https://wa.me/?text=${encodeURIComponent(text)}`).searchParams.get('text').includes('https://reservaya.site/c/centro-arequipa'))
  const metadata = publicMetadata('Centro', 'Descripción', '/c/centro-arequipa')
  assert.equal(metadata.alternates.canonical, linkPublico('centro-arequipa'))
  assert.equal(metadata.openGraph.url, linkPublico('centro-arequipa'))
  assert.equal(metadata.openGraph.images[0], `${SITIO}/og-default.png`)
})
test('profile card reservation selects the court in the same profile and encodes identifiers', () => {
  const url = new URL(reservaCanchaHref('centro/uno', 'cancha & dos'), SITIO)
  assert.equal(url.pathname, '/c/centro%2Funo')
  assert.equal(url.searchParams.get('cancha'), 'cancha & dos')
  assert.equal(url.hash, '#reservar')
  assert.equal(url.searchParams.has('q'), false)
})
test('complex WhatsApp number overrides support and local mobile numbers use Peru code', () => {
  assert.equal(whatsappUrl('Reserva', '987 654 321'), 'https://wa.me/51987654321?text=Reserva')
  assert.equal(whatsappUrl('Reserva', '+51 987 654 321'), 'https://wa.me/51987654321?text=Reserva')
  assert.equal(whatsappUrl('Reserva', ''), null)
})
