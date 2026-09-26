import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canAccess, fallbackPorRol } from './permissions.ts'

test('fallbackPorRol: inicio por rol', () => {
  assert.equal(fallbackPorRol('TECNICO'), '/tecnico')
  assert.equal(fallbackPorRol('SUPERADMIN'), '/admin')
  assert.equal(fallbackPorRol('ADMIN'), '/admin/agenda')
  assert.equal(fallbackPorRol('USUARIO'), '/dashboard')
})

test('canAccess: USUARIO no entra a módulos del panel; TECNICO a todos', () => {
  assert.equal(canAccess('agenda', 'USUARIO'), false)
  assert.equal(canAccess('agenda', 'TECNICO'), true)
  assert.equal(canAccess('modulo-inexistente', 'TECNICO'), true)
})
