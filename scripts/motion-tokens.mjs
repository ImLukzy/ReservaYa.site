#!/usr/bin/env node
// Motion único (spec 46): el resorte k 400 / c 30 / m 1 de Universo_Agustino como
// `linear()` de CSS, compartido por la web pública y el panel Next.
//   node scripts/motion-tokens.mjs           imprime el bloque de tokens
//   node scripts/motion-tokens.mjs --write   lo escribe entre los marcadores de ambos CSS
//   node scripts/motion-tokens.mjs --check   falla si difiere o hay curvas/duraciones sueltas
import { copyFileSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESORTE = { k: 400, c: 30, m: 1 };
export const DURACION_MS = 400;
const PASOS = 40; // una muestra cada 10 ms

export function posicion({ k, c, m }, t) {
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z >= 1) throw new Error(`El resorte debe ser subamortiguado (ζ = ${z})`);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}

export function metricas(resorte = RESORTE) {
  let pico = 0;
  let picoMs = 0;
  let t90Ms = null;
  let asentadoMs = 0;
  for (let ms = 0; ms <= 1000; ms += 0.5) {
    const x = posicion(resorte, ms / 1000);
    if (x > pico) [pico, picoMs] = [x, ms];
    if (t90Ms === null && x >= 0.9) t90Ms = ms;
    if (Math.abs(x - 1) > 0.001) asentadoMs = ms;
  }
  return { sobrepasoPct: (pico - 1) * 100, picoMs, t90Ms, asentadoMs };
}

export function curvaLinear(resorte = RESORTE, duracionMs = DURACION_MS, pasos = PASOS) {
  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const x = i === pasos ? 1 : posicion(resorte, (duracionMs / 1000) * (i / pasos));
    puntos.push(Number(x.toFixed(3)));
  }
  return `linear(${puntos.join(', ')})`;
}

const INICIO = '  /* motion:inicio · generado por scripts/motion-tokens.mjs (spec 46); no editar a mano */';
const FIN = '  /* motion:fin */';

export function bloque() {
  return [
    INICIO,
    `  --ease-resorte: ${curvaLinear()};`,
    `  --dur-resorte: ${DURACION_MS}ms;`,
    '  --ease-salida: cubic-bezier(0.2, 0.8, 0.2, 1);',
    '  --dur-toque: 120ms;',
    '  --dur-entra: 180ms;',
    '  --default-transition-duration: var(--dur-toque);',
    '  --default-transition-timing-function: var(--ease-salida);',
    FIN,
  ].join('\n');
}

export const RESPALDO = [
  '/* motion:respaldo · sin linear() el resorte cae a la curva de salida */',
  '@supports not (transition-timing-function: linear(0, 1)) {',
  '  :root {',
  '    --ease-resorte: var(--ease-salida);',
  '  }',
  '}',
].join('\n');

const DECLARACION = /(?:^|[\s{;"'])(transition|animation)(-duration|-timing-function|Duration|TimingFunction)?\s*:\s*['"`]?([^;}"'`]*)/;
const TIEMPO = /(?<![\w.-])\d*\.?\d+m?s(?![\w-])/;
const CURVA = /cubic-bezier\(|steps\(|linear\(|(?<![\w-])(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)(?![\w-])/;
const UTILIDAD = /(?<![\w-])(duration-\d+|duration-\[[^\]]+\]|ease-(?:in|out|in-out|linear)|ease-\[[^\]]+\]|delay-\d+)(?![\w-])/;
const AMBIENTAL = '/* motion: ambiental */';

/** Líneas con curvas o duraciones que no pasan por los tokens. */
export function violaciones(ruta, texto) {
  const halladas = [];
  const esMarcado = /\.(tsx|ts|astro)$/.test(ruta);
  let dentroBloque = false;
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (linea.includes('motion:inicio')) dentroBloque = true;
    if (dentroBloque) {
      if (linea.includes('motion:fin')) dentroBloque = false;
      return;
    }
    if (linea.includes(AMBIENTAL)) return;
    const decl = linea.match(DECLARACION);
    if (decl) {
      const valor = decl[3].replace(/0\.01ms\s*!important/, '');
      if (TIEMPO.test(valor)) halladas.push({ linea: i + 1, motivo: `duración literal en ${decl[1]}` });
      if (CURVA.test(valor)) halladas.push({ linea: i + 1, motivo: `curva literal en ${decl[1]}` });
    }
    const util = esMarcado && linea.match(UTILIDAD);
    if (util) halladas.push({ linea: i + 1, motivo: `utilidad ${util[1]}` });
  });
  return halladas;
}

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TOKENS = ['apps/web/app/globals.css'];
export const ESCANEO = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib',
];

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(css|tsx|ts)$/.test(nombre) && !nombre.endsWith('.d.ts') ? [ruta] : [];
  });
}

function reemplazarBloque(texto) {
  const desde = texto.indexOf(INICIO);
  const hasta = texto.indexOf(FIN);
  if (desde < 0 || hasta < desde) return null;
  return texto.slice(0, desde) + bloque() + texto.slice(hasta + FIN.length);
}

function main(modo) {
  if (!modo) return console.log(`${bloque()}\n\n${RESPALDO}`);
  const errores = [];
  for (const rel of TOKENS) {
    const ruta = join(RAIZ, rel);
    const crudo = readFileSync(ruta, 'utf8');
    const eol = crudo.includes('\r\n') ? '\r\n' : '\n';
    const texto = crudo.replace(/\r\n/g, '\n');
    const nuevo = reemplazarBloque(texto);
    if (nuevo === null) errores.push(`${rel}: faltan los marcadores motion:inicio / motion:fin`);
    else if (modo === '--write' && nuevo !== texto) {
      // OneDrive: escribir aparte y renombrar para que los watchers vean el cambio.
      // Si un dev server tiene el archivo abierto, Windows niega el rename (EPERM): se copia.
      writeFileSync(`${ruta}.tmp`, nuevo.replace(/\n/g, eol));
      try {
        renameSync(`${ruta}.tmp`, ruta);
      } catch {
        copyFileSync(`${ruta}.tmp`, ruta);
        unlinkSync(`${ruta}.tmp`);
      }
    }
    else if (modo === '--check' && nuevo !== texto) errores.push(`${rel}: el bloque de motion no coincide (corre --write)`);
    if (!texto.includes(RESPALDO)) errores.push(`${rel}: falta el respaldo @supports not linear()`);
  }
  for (const ruta of ESCANEO.flatMap((d) => archivos(join(RAIZ, d)))) {
    const rel = relative(RAIZ, ruta).replaceAll('\\', '/');
    for (const v of violaciones(rel, readFileSync(ruta, 'utf8'))) errores.push(`${rel}:${v.linea}  ${v.motivo}`);
  }
  if (errores.length) {
    console.error(`motion-tokens: ${errores.length} problema(s)\n${errores.join('\n')}`);
    process.exit(1);
  }
  console.log(`motion-tokens: OK (${TOKENS.length} bloques idénticos, 0 curvas ni duraciones sueltas)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv[2]);
