import { test } from 'node:test'
import assert from 'node:assert/strict'

// El número se lee al importar el módulo: cada caso importa una copia fresca.
async function cargar(valor) {
  if (valor === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = valor
  return import(`./whatsapp.ts?caso=${Math.random()}`)
}

test('sin número configurado no hay botón', async () => {
  const w = await cargar(undefined)
  assert.equal(w.whatsappDisponible, false)
  assert.equal(w.whatsappUrl(), null)
})

test('con número arma el enlace y el formato visible', async () => {
  const w = await cargar('+51 987 654 321')
  assert.equal(w.whatsappUrl(), 'https://wa.me/51987654321')
  assert.equal(w.whatsappUrl('Hola'), 'https://wa.me/51987654321?text=Hola')
  assert.equal(w.whatsappVisible(), '987 654 321')
})
