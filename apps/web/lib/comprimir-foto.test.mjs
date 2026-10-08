import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('./comprimir-foto.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replace("'./media'", JSON.stringify(new URL('./media.ts', import.meta.url).href))
const { comprimirFoto } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
function replace(t, key, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key])
}
test('browser decoding errors are translated instead of exposing English messages', async t => {
  replace(t, 'createImageBitmap', async () => { throw new DOMException('The source image could not be decoded.') })
  await assert.rejects(comprimirFoto(new File(['invalid'], 'foto.png', { type: 'image/png' })), { message: 'No se pudo leer la imagen. Prueba con otra foto JPG, PNG o WebP.' })
})
test('canvas errors are translated and decoded image resources are released', async t => {
  const close = t.mock.fn()
  replace(t, 'createImageBitmap', async () => ({ width: 2000, height: 1000, close }))
  replace(t, 'document', { createElement: () => ({ getContext: () => { throw new DOMException('Canvas unavailable') } }) })
  await assert.rejects(comprimirFoto(new File(['fixture'], 'foto.jpg', { type: 'image/jpeg' })), { message: 'No se pudo preparar la foto. Prueba con otra imagen JPG, PNG o WebP.' })
  assert.equal(close.mock.callCount(), 1)
})
test('successful compression still returns WebP resized to 1600px', async t => {
  const close = t.mock.fn()
  replace(t, 'createImageBitmap', async () => ({ width: 2000, height: 1000, close }))
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob(['webp'], { type: 'image/webp' })) }
  replace(t, 'document', { createElement: () => canvas })
  const result = await comprimirFoto(new File(['fixture'], 'foto.jpg', { type: 'image/jpeg' }))
  assert.equal(result.type, 'image/webp'); assert.equal(result.name, 'foto.webp')
  assert.equal(canvas.width, 1600); assert.equal(canvas.height, 800)
  assert.equal(close.mock.callCount(), 1)
})
