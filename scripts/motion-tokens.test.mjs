import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bloque, curvaLinear, metricas, posicion, RESORTE, violaciones, TOKENS, ESCANEO } from './motion-tokens.mjs';

test('el resorte 400/30 parte de 0 y termina en 1', () => {
  assert.equal(posicion(RESORTE, 0), 0);
  assert.match(curvaLinear(), /^linear\(0, .+, 1\)$/);
  assert.equal(curvaLinear().split(',').length, 41);
});

test('métricas físicas del resorte 400/30', () => {
  const m = metricas();
  assert.ok(Math.abs(m.asentadoMs - 400) <= 5, `asentado ${m.asentadoMs} ms`);
  assert.ok(Math.abs(m.sobrepasoPct - 2.84) <= 0.05, `sobrepaso ${m.sobrepasoPct} %`);
  assert.ok(Math.abs(m.t90Ms - 140) <= 5, `90 % a ${m.t90Ms} ms`);
});

test('un resorte sobreamortiguado se rechaza', () => {
  assert.throws(() => posicion({ k: 400, c: 60, m: 1 }, 0.1), /subamortiguado/);
});

test('el bloque trae los 7 tokens entre marcadores', () => {
  const b = bloque();
  for (const t of ['--ease-resorte', '--dur-resorte', '--ease-salida', '--dur-toque', '--dur-entra', '--default-transition-duration', '--default-transition-timing-function']) {
    assert.ok(b.includes(`${t}:`), t);
  }
  assert.deepEqual(violaciones('x.css', `.a {\n${b}\n}`), []);
});

test('violaciones: literales sí, tokens y ambientales no', () => {
  assert.equal(violaciones('a.css', '  transition: transform 0.1s ease;').length, 2);
  assert.equal(violaciones('a.css', '  animation: x 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;').length, 2);
  assert.deepEqual(violaciones('a.css', '  transition: transform var(--dur-resorte) var(--ease-resorte);'), []);
  assert.deepEqual(violaciones('a.css', '  animation: esqueleto 1.4s ease-in-out infinite; /* motion: ambiental */'), []);
  assert.deepEqual(violaciones('a.css', '    transition-duration: 0.01ms !important;'), []);
  assert.deepEqual(violaciones('a.css', '  animation-delay: 60ms;'), []);
});

test('violaciones: utilidades de Tailwind en componentes', () => {
  assert.equal(violaciones('B.tsx', "'transition-colors duration-150 hover:bg-piedra'").length, 1);
  assert.equal(violaciones('B.astro', '<div class="ease-in-out">').length, 1);
  assert.deepEqual(violaciones('B.tsx', "'transition-transform ease-resorte duration-(--dur-resorte)'"), []);
  assert.deepEqual(violaciones('a.css', '.x { color: red } /* duration-150 */'), []);
  assert.equal(violaciones('B.tsx', "style={{ transition: 'opacity 0.3s' }}").length, 1);
});

test('tokens y escáner cubren la única web Next tras retirar Astro', () => {
  assert.deepEqual(TOKENS, ['apps/web/app/globals.css']);
  assert.deepEqual(ESCANEO, ['apps/web/app', 'apps/web/components', 'apps/web/lib']);
});
