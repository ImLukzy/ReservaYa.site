import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canAccess, fallbackPorRol, perfilPorRol } from './permissions.ts'

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

test('perfilPorRol: "Mi perfil" dentro del panel de cada rol', () => {
  assert.equal(perfilPorRol('USUARIO'), '/dashboard/perfil')
  assert.equal(perfilPorRol('ADMIN'), '/admin/perfil')
  assert.equal(perfilPorRol('SUPERADMIN'), '/admin/perfil')
  assert.equal(perfilPorRol('TECNICO'), '/tecnico/perfil')
})
