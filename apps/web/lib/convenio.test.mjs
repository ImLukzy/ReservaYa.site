import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panelBloqueado } from './convenio.ts';
test('sin complejos permite el alta inicial; vencidos bloquean; una activación vuelve a abrir el panel', () => {
  assert.equal(panelBloqueado([]), false);
  assert.equal(panelBloqueado([{ bloqueada: true }, { bloqueada: true }]), true);
  assert.equal(panelBloqueado([{ bloqueada: true }, { bloqueada: false }]), false);
});
