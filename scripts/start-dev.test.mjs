import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { launchCommand, runDev, serviceHealthy, stopChildTree } from './start-dev.mjs';

function harness(extra = {}) {
  const signals = new EventEmitter();
  const launches = [], stops = [], log = [];
  let time = 0;
  const options = {
    repoRoot: '/tmp/repo con espacios', signals, timeoutMs: 10,
    shellBackend: process.env.BACKEND_URL,
    log: (text) => log.push(text), now: () => time,
    pause: async () => { time += 11; }, occupied: async () => false,
    healthy: async () => true,
    spawnProcess: (command, args, opts) => {
      const child = new EventEmitter(); child.pid = 100 + launches.length;
      launches.push({ command, args, opts, child }); return child;
    },
    stopTree: async (child) => { stops.push(child.pid); },
    ...extra,
  };
  return { options, signals, launches, stops, log };
}

test('API lista antes de web; Ctrl+C limpia solo hijos propios, incluso con espacios', async () => {
  const h = harness();
  const ready = h.options.healthy;
  h.options.healthy = async (service) => {
    if (service.name === 'Web') queueMicrotask(() => h.signals.emit('SIGINT'));
    return ready(service);
  };
  assert.equal(await runDev(h.options), 130);
  assert.deepEqual(h.launches.map((x) => x.command), ['pnpm', 'npm']);
  assert.equal(h.launches[0].opts.cwd, '/tmp/repo con espacios');
  assert.equal(h.launches[0].opts.detached, true);
  assert.deepEqual(h.launches[0].args, ['--filter', '@reservaya/api', 'dev']);
  assert.equal(h.launches[0].opts.env.PORT, '5200');
  assert.equal(h.launches[1].opts.env.BACKEND_URL, process.env.BACKEND_URL ?? 'http://localhost:5200');
  assert.deepEqual(h.stops, [100, 101]);
  assert.equal(h.signals.listenerCount('SIGINT'), 0);
});

test('un servicio preexistente validado se reutiliza y nunca se termina', async () => {
  const h = harness({ occupied: async (port) => port === 5200 });
  h.options.healthy = async (service) => {
    if (service.name === 'Web') queueMicrotask(() => h.signals.emit('SIGTERM'));
    return true;
  };
  assert.equal(await runDev(h.options), 143);
  assert.deepEqual(h.launches.map((x) => x.command), ['npm']);
  assert.deepEqual(h.stops, [100]);
});

test('puerto ocupado no saludable falla sin lanzar ni cerrar procesos ajenos', async () => {
  const h = harness({ occupied: async () => true, healthy: async () => false });
  assert.equal(await runDev(h.options), 1);
  assert.equal(h.launches.length, 0); assert.equal(h.stops.length, 0);
});

test('timeout de API detiene su hijo y evita lanzar web', async () => {
  const h = harness({ healthy: async () => false });
  assert.equal(await runDev(h.options), 1);
  assert.deepEqual(h.launches.map((x) => x.command), ['pnpm']);
  assert.deepEqual(h.stops, [100]);
});

test('salida prematura del hijo falla y limpia los hijos', async () => {
  const h = harness();
  h.options.healthy = async () => { h.launches[0].child.emit('exit', 0); return false; };
  assert.equal(await runDev(h.options), 1);
  assert.deepEqual(h.stops, [100]);
});

test('Windows ejecuta npm.cmd y taskkill solo contra el árbol propio', async () => {
  assert.deepEqual(launchCommand({name:'Web'}, 'win32'), {command:'npm.cmd',args:['--prefix','apps/web','run','dev','--','--port','3000'],shell:true});
  assert.deepEqual(launchCommand({name:'API'}, 'win32'), {command:'pnpm.cmd',args:['--filter','@reservaya/api','dev'],shell:true});
  const calls = [];
  await stopChildTree({pid:123}, 'win32', (command, args) => {
    calls.push({command,args}); const child = new EventEmitter();
    queueMicrotask(() => child.emit('exit', 0)); return child;
  });
  assert.deepEqual(calls, [{command:'taskkill',args:['/PID','123','/T','/F']}]);
});

test('la salud exige ok de API y firma de Next, no solo HTTP 200', async () => {
  const previous = globalThis.fetch;
  const signal = new AbortController().signal;
  try {
    globalThis.fetch = async () => new Response('{"ok":false}');
    assert.equal(await serviceHealthy({name:'API',port:5200},signal), false);
    globalThis.fetch = async () => new Response('{"ok":true}');
    assert.equal(await serviceHealthy({name:'API',port:5200},signal), true);
    globalThis.fetch = async () => new Response('<html lang="es">ReservaYa<script src="/_next/static/test.js"></script></html>');
    assert.equal(await serviceHealthy({name:'Web',port:3000},signal), true);
    globalThis.fetch = async () => new Response('ReservaYa');
    assert.equal(await serviceHealthy({name:'Web',port:3000},signal), false);
  } finally { globalThis.fetch = previous; }
});

test('web ignora BACKEND_URL de .env y respeta el valor previo del shell', async () => {
  const previous = process.env.BACKEND_URL;
  try {
    for (const backend of [undefined, 'http://localhost:5300']) {
      if (backend === undefined) delete process.env.BACKEND_URL;
      else process.env.BACKEND_URL = backend;
      const shellBackend = process.env.BACKEND_URL;
      // Simula el valor que loadEnvFile carga después de capturar el shell.
      if (shellBackend === undefined) process.env.BACKEND_URL = 'http://localhost:5000';
      const h = harness({ shellBackend });
      h.options.healthy = async (service) => {
        if (service.name === 'Web') queueMicrotask(() => h.signals.emit('SIGINT'));
        return true;
      };
      assert.equal(await runDev(h.options), 130);
      assert.equal(h.launches[1].opts.env.BACKEND_URL, backend ?? 'http://localhost:5200');
    }
  } finally {
    if (previous === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previous;
  }
});
