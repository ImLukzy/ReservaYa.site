#!/usr/bin/env node
// CLS y scroll horizontal por ruta y ancho (spec 46). Solo lectura: GET de páginas.
//   Panel:   QA_<ROL>_EMAIL / QA_<ROL>_PASSWORD en el entorno del shell, `npm run dev:all`
//            node scripts/cls.mjs [--base http://localhost:3000]
//   Pública: node scripts/cls.mjs --landing [--base http://localhost:3000] [--rutas /,/canchas,/duenos]
// Sale con 1 si alguna ruta supera CLS 0.02, desborda en horizontal o redirige.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const UMBRAL = 0.02;
const args = process.argv.slice(2);
const landing = args.includes('--landing');
const iBase = args.indexOf('--base');
const base = iBase >= 0 ? args[iBase + 1] : landing ? 'http://localhost:3000' : 'http://localhost:3000';
const iRutas = args.indexOf('--rutas');
const rutasLanding = iRutas >= 0 ? args[iRutas + 1].split(',') : ['/', '/canchas'];

const RUTAS_PANEL = {
  USUARIO: ['/dashboard', '/dashboard/reservas', '/dashboard/canchas', '/dashboard/perfil'],
  ADMIN: ['/admin', '/admin/agenda', '/admin/caja', '/admin/reservas', '/admin/clientes'],
  SUPERADMIN: ['/admin/complejos'],
  TECNICO: ['/tecnico', '/tecnico/usuarios'],
};
const ANCHOS = landing ? [375, 1440] : [375, 1280];

// Sesiones de CLS (1 s de hueco, 5 s de ventana), como web-vitals.
const OBSERVADOR = () => {
  let max = 0, actual = 0, primero = 0, ultimo = 0;
  new PerformanceObserver((lista) => {
    for (const e of lista.getEntries()) {
      if (e.hadRecentInput) continue;
      if (actual && e.startTime - ultimo < 1000 && e.startTime - primero < 5000) actual += e.value;
      else [actual, primero] = [e.value, e.startTime];
      ultimo = e.startTime;
      max = Math.max(max, actual);
    }
    window.__cls = max;
  }).observe({ type: 'layout-shift', buffered: true });
};

async function lanzar() {
  try {
    return await chromium.launch();
  } catch {
    // Chromium de otra revisión ya descargado (evita bajar ~150 MB).
    const raiz = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
    const dir = existsSync(raiz) && readdirSync(raiz).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
    if (!dir) throw new Error('Sin Chromium: npx playwright install chromium');
    return chromium.launch({ executablePath: join(raiz, dir, 'chrome-win64', 'chrome.exe') });
  }
}

async function medir(contexto, ruta) {
  const pagina = await contexto.newPage();
  await pagina.addInitScript(OBSERVADOR);
  await pagina.goto(base + ruta, { waitUntil: 'networkidle', timeout: 45_000 });
  await pagina.waitForTimeout(1000);
  const r = await pagina.evaluate(() => ({
    cls: window.__cls ?? 0,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    final: location.pathname,
  }));
  await pagina.close();
  return { ...r, redirigio: r.final !== ruta };
}

async function sesion(navegador, ancho, rol) {
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho < 768 ? 812 : 900 } });
  if (!rol) return contexto;
  const email = process.env[`QA_${rol}_EMAIL`];
  const password = process.env[`QA_${rol}_PASSWORD`];
  const res = await contexto.request.post(`${base}/api/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`Login ${rol}: HTTP ${res.status()}`);
  return contexto;
}

const navegador = await lanzar();
const filas = [];
const grupos = landing
  ? [[null, rutasLanding]]
  : Object.entries(RUTAS_PANEL).filter(([rol]) => {
      const hay = process.env[`QA_${rol}_EMAIL`] && process.env[`QA_${rol}_PASSWORD`];
      if (!hay) console.warn(`sin QA_${rol}_EMAIL/PASSWORD: se omiten ${RUTAS_PANEL[rol].join(', ')}`);
      return hay;
    });

for (const [rol, rutas] of grupos) {
  for (const ancho of ANCHOS) {
    const contexto = await sesion(navegador, ancho, rol);
    for (const ruta of rutas) filas.push({ rol: rol ?? 'público', ancho, ruta, ...(await medir(contexto, ruta)) });
    await contexto.close();
  }
}
await navegador.close();

let fallos = 0;
console.log(`base ${base} · umbral CLS ${UMBRAL}`);
for (const f of filas) {
  const mal = f.cls > UMBRAL || f.desborde > 0 || f.redirigio;
  fallos += mal ? 1 : 0;
  const nota = f.redirigio ? ` → ${f.final}` : '';
  console.log(`${mal ? '✗' : '✓'} ${f.rol.padEnd(10)} ${String(f.ancho).padStart(4)} px  CLS ${f.cls.toFixed(4)}  desborde ${f.desborde} px  ${f.ruta}${nota}`);
}
console.log(`${filas.length} mediciones, ${fallos} fuera de umbral`);
process.exit(filas.length && !fallos ? 0 : 1);
