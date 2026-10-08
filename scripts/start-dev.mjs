#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVICES = [
  { name: 'API', port: 5200 },
  { name: 'Web', port: 3000 },
];

export function launchCommand(service, platform) {
  if (service.name === 'API') return { command: platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args: ['--filter', '@reservaya/api', 'dev'], shell: platform === 'win32' };
  // Todos los argumentos son constantes: cmd solo se usa para ejecutar los .cmd de pnpm/npm.
  return { command: platform === 'win32' ? 'npm.cmd' : 'npm', args: ['--prefix', 'apps/web', 'run', 'dev', '--', '--port', '3000'], shell: platform === 'win32' };
}

export function portOccupied(port) {
  return new Promise((resolvePort, reject) => {
    const socket = connect({ host: 'localhost', port });
    socket.setTimeout(1500);
    socket.once('connect', () => { socket.destroy(); resolvePort(true); });
    socket.once('timeout', () => { socket.destroy(); reject(new Error(`No se pudo comprobar el puerto ${port}`)); });
    socket.once('error', (error) => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolvePort(false);
      else reject(error);
    });
  });
}

export async function serviceHealthy(service, signal) {
  try {
    const response = await fetch(`http://localhost:${service.port}${service.name === 'API' ? '/healthz' : '/login'}`, {
      redirect: 'manual', signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
    });
    if (!response.ok) return false;
    if (service.name === 'API') {
      return (await response.json()).ok === true;
    }
    const html = await response.text();
    return html.includes('ReservaYa') && /\/_next\/static\//.test(html) && /<html[^>]*lang="es"/.test(html);
  } catch { return false; }
}

export async function stopChildTree(child, platform = process.platform, spawnProcess = spawn) {
  if (!child.pid) return;
  if (platform === 'win32') {
    await new Promise((resolveStop) => {
      const killer = spawnProcess('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      const timer = setTimeout(() => { killer.kill(); resolveStop(); }, 8000);
      killer.once('error', () => { clearTimeout(timer); resolveStop(); });
      killer.once('exit', () => { clearTimeout(timer); resolveStop(); });
    });
    return;
  }
  // Cada hijo Unix tiene su grupo: nunca se señala al grupo del shell ni a servicios reutilizados.
  const kill = (signal) => {
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
  kill('SIGTERM');
  await Promise.race([exited, delay(1500)]);
  kill('SIGKILL');
}

export async function runDev({
  repoRoot = ROOT, platform = process.platform, timeoutMs = 90_000,
  spawnProcess = spawn, occupied = portOccupied, healthy = serviceHealthy,
  pause = delay, now = Date.now, stopTree = stopChildTree, signals = process,
  log = console.log, shellBackend,
} = {}) {
  const children = [];
  const controller = new AbortController();
  let result;
  let finish;
  let stopping = false;
  const done = new Promise((resolveDone) => { finish = resolveDone; });
  const end = (code, message) => {
    if (result) return;
    result = { code, message };
    controller.abort();
    finish(result);
  };
  const onInt = () => end(130, 'Parada solicitada');
  const onTerm = () => end(143, 'Parada solicitada');
  signals.once('SIGINT', onInt);
  signals.once('SIGTERM', onTerm);
  try {
    for (const service of SERVICES) {
      if (controller.signal.aborted) break;
      if (await occupied(service.port)) {
        if (!await healthy(service, controller.signal)) throw new Error(`${service.name}: puerto ${service.port} ocupado por un servicio no reconocido o no saludable`);
        log(`${service.name} existente validado (:${service.port})`);
        continue;
      }
      const { command, args, shell } = launchCommand(service, platform);
      const env = service.name === 'API'
        ? { ...process.env, PORT: String(service.port) }
        : { ...process.env, BACKEND_URL: shellBackend ?? `http://localhost:${SERVICES[0].port}` };
      const child = spawnProcess(command, args, { cwd: repoRoot, env, stdio: 'inherit', detached: platform !== 'win32', shell });
      children.push(child);
      child.once('error', () => end(1, `No se pudo iniciar ${service.name}`));
      child.once('exit', (code) => { if (!stopping) end(1, `${service.name} terminó antes de la parada (código ${code ?? 'señal'})`); });
      const deadline = now() + timeoutMs;
      let ready = false;
      while (!controller.signal.aborted && now() < deadline) {
        if (await healthy(service, controller.signal)) { ready = true; break; }
        await pause(300, undefined, { signal: controller.signal });
      }
      if (controller.signal.aborted) break;
      if (!ready) throw new Error(`${service.name} no respondió correctamente en ${timeoutMs / 1000} s`);
      log(`${service.name} listo (:${service.port})`);
    }
    if (!result) log('API :5200 | Web :3000. Ctrl+C termina los procesos iniciados aquí.');
    await done;
  } catch (error) {
    if (!result) end(1, error.message);
  } finally {
    stopping = true;
    signals.removeListener('SIGINT', onInt);
    signals.removeListener('SIGTERM', onTerm);
    await Promise.all(children.map((child) => stopTree(child, platform, spawnProcess)));
  }
  if (result.message) log(result.message);
  return result.code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const shellBackend = process.env.BACKEND_URL;
  // Solo el runtime carga el entorno local; no se imprime ni copia su contenido.
  try { loadEnvFile(join(ROOT, 'apps/web/.env')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  process.exitCode = await runDev({ shellBackend });
}
