// Regla de oro: 0 migraciones pendientes.
// Verifica que el modelo EF Core (origen: Models/Entities.cs + Data/AppDbContext.cs)
// coincide con la base de datos real (origen: information_schema + pg_enum).
// Prisma ya cubre su parte con `migrate diff`; esto cubre el mapeo EF, que es
// lo que rompió el dashboard (column r.codigo does not exist).
//
// Uso: npm run db:check   (exit 0 = limpio, exit 1 = deriva detectada)
// Solo lee: information_schema, pg_tables, pg_enum. No toca datos.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend', 'ReservaFacil.Api');

// --- .env mínimo (sin dependencias): respeta el entorno si ya existe ---
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*(DATABASE_URL|DATABASE_URL_UNPOOLED)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();
if (!process.env.DATABASE_URL) {
  console.error('db:check FAIL: falta DATABASE_URL (.env o entorno)');
  process.exit(1);
}

// --- 1. Clases y nullability desde Entities.cs ---
const entitiesSrc = readFileSync(join(backend, 'Models', 'Entities.cs'), 'utf8');
const classNames = new Set([...entitiesSrc.matchAll(/public\s+(?:class|record)\s+(\w+)/g)].map((m) => m[1]));

function baseType(t) {
  const list = t.match(/^List<\s*(\w+)\s*>\?]?$/);
  if (list) return { name: list[1], nav: true };
  const nullable = t.endsWith('?');
  return { name: nullable ? t.slice(0, -1).trim() : t, nav: false, nullable };
}

// props por clase: { Clase: Map<prop, {nullable, scalar}> }
const classProps = {};
for (const m of entitiesSrc.matchAll(/public\s+class\s+(\w+)[\s\S]*?(?=public\s+class\s+\w+|$)/g)) {
  const cls = m[1];
  const props = new Map();
  for (const p of m[0].matchAll(/public\s+([\w<>\?,\s]+?)\s+(\w+)\s*\{\s*get;/g)) {
    const { name, nav, nullable } = baseType(p[1].trim());
    if (nav || classNames.has(name)) continue; // navegación, no columna
    props.set(p[2], { nullable: nullable ?? false });
  }
  classProps[cls] = props;
}

// --- 2. Tabla + columnas mapeadas desde AppDbContext.cs ---
const ctxSrc = readFileSync(join(backend, 'Data', 'AppDbContext.cs'), 'utf8');
const sections = ctxSrc.split(/var\s+\w+\s*=\s*modelBuilder\.Entity</).slice(1);
// expected: { tabla: { col: {nullable} } }
const expected = {};
for (const sec of sections) {
  const cls = (sec.match(/^(\w+)>\(\)/) || [])[1];
  if (!cls || !classProps[cls]) continue;
  const table = (sec.match(/\.ToTable\("([^"]+)"\)/) || [])[1];
  if (!table) continue;
  expected[table] ??= {};
  for (const pm of sec.matchAll(/\.Property\(\w+\s*=>\s*\w+\.(\w+)\)\.HasColumnName\("([^"]+)"\)/g)) {
    const prop = classProps[cls].get(pm[1]);
    if (!prop) continue;
    expected[table][pm[2]] = prop;
  }
}

// --- 3. Enums: MapEnum<> en Program.cs vs miembros en Models/Enums.cs ---
const progSrc = readFileSync(join(backend, 'Program.cs'), 'utf8');
const mappedEnums = [...progSrc.matchAll(/\.MapEnum<(\w+)>\("([^"]+)"/g)].map((m) => ({ cs: m[1], pg: m[2] }));
const enumsSrc = readFileSync(join(backend, 'Models', 'Enums.cs'), 'utf8');
const enumMembers = {};
for (const m of enumsSrc.matchAll(/public\s+enum\s+(\w+)\s*\{([^}]+)\}/g)) {
  const sinComentarios = m[2].replace(/\/\/[^\n]*/g, '');
  enumMembers[m[1]] = sinComentarios.split(',').map((s) => s.trim()).filter(Boolean);
}

// --- 4. Comparar contra la DB real ---
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
let errores = 0;
let avisos = 0;
const fail = (msg) => { errores++; console.error('  ✗ ' + msg); };
const warn = (msg) => { avisos++; console.warn('  ! ' + msg); };

try {
  const tables = new Set(
    (await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
      .map((t) => t.tablename),
  );
  const cols = await prisma.$queryRaw`
    SELECT table_name, column_name, is_nullable FROM information_schema.columns
    WHERE table_schema = 'public'`;
  const byTable = {};
  for (const c of cols) (byTable[c.table_name] ??= {})[c.column_name] = c.is_nullable === 'YES';

  console.log('db:check · tablas mapeadas: ' + Object.keys(expected).length);
  for (const [tabla, columnas] of Object.entries(expected)) {
    if (!tables.has(tabla)) { fail(`tabla "${tabla}" mapeada en EF pero no existe en DB`); continue; }
    for (const [col, prop] of Object.entries(columnas)) {
      if (!(col in (byTable[tabla] ?? {}))) { fail(`columna "${tabla}"."${col}" mapeada en EF pero no existe en DB`); continue; }
      const dbNullable = byTable[tabla][col];
      if (!prop.nullable && dbNullable) warn(`"${tabla}"."${col}": modelo exige NOT NULL pero DB permite NULL`);
    }
  }

  const pgEnums = await prisma.$queryRaw`
    SELECT t.typname AS type, e.enumlabel AS label FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid`;
  const pgByType = {};
  for (const r of pgEnums) (pgByType[r.type] ??= new Set()).add(r.label);
  for (const { cs, pg } of mappedEnums) {
    const members = enumMembers[cs];
    if (!members) { warn(`enum C# "${cs}" mapeado pero no definido en Enums.cs`); continue; }
    if (!pgByType[pg]) { fail(`tipo enum "${pg}" (MapEnum<${cs}>) no existe en DB`); continue; }
    for (const label of members) {
      if (!pgByType[pg].has(label)) fail(`etiqueta "${pg}"."${label}" falta en DB (un INSERT/UPDATE con ${cs}.${label} daría 500)`);
    }
  }

  // Nombres explícitos de PKs/índices/FKs declarados en AppDbContext.
  const declared = new Set();
  for (const re of [/\.HasDatabaseName\("([^"]+)"\)/g, /\.HasName\("([^"]+)"\)/g, /\.HasConstraintName\("([^"]+)"\)/g]) {
    for (const m of ctxSrc.matchAll(re)) declared.add(m[1]);
  }
  const liveIdx = new Set(
    (await prisma.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`)
      .map((r) => r.indexname),
  );
  const liveCon = new Set(
    (await prisma.$queryRaw`SELECT conname FROM pg_constraint WHERE contype IN ('p', 'u', 'f')`)
      .map((r) => r.conname),
  );
  let namedOk = 0;
  for (const name of declared) {
    if (liveIdx.has(name) || liveCon.has(name)) namedOk++;
    else fail(`objeto "${name}" declarado en AppDbContext pero no existe en DB`);
  }
  console.log(`db:check · nombres explícitos verificados: ${namedOk}/${declared.size}`);

  // Fidelidad total: cada columna que EF va a SELECTear (incluidas sombras
  // del snapshot como MovimientoCaja.UsuarioId, que tumbó caja/hoy con 42703)
  // debe existir en information_schema.
  const snapSrc = readFileSync(join(backend, 'Migrations', 'AppDbContextModelSnapshot.cs'), 'utf8');
  const snapBlocks = snapSrc.split(/modelBuilder\.Entity\("/).slice(1);
  let snapCols = 0;
  for (const block of snapBlocks) {
    const tableM = block.match(/\.ToTable\("([^"]+)"[,)]/);
    if (!tableM) continue;
    const tabla = tableM[1];
    if (!tables.has(tabla)) { fail(`tabla "${tabla}" en snapshot pero no existe en DB`); continue; }
    for (const pm of block.matchAll(/\.Property<[^>]+>\("([^"]+)"\)([\s\S]*?);/g)) {
      const colM = pm[2].match(/\.HasColumnName\("([^"]+)"\)/);
      const col = colM ? colM[1] : pm[1];
      snapCols++;
      if (!(col in (byTable[tabla] ?? {}))) fail(`columna "${tabla}"."${col}" en snapshot EF pero no existe en DB`);
    }
  }
  console.log(`db:check · columnas del snapshot verificadas: ${snapCols}`);
} catch (e) {
  fail('no se pudo consultar la DB: ' + String(e.message || e).slice(0, 200));
} finally {
  await prisma.$disconnect();
}

if (errores > 0) {
  console.error(`db:check FAIL: ${errores} error(es), ${avisos} aviso(s) → crea la migración antes de codear`);
  process.exit(1);
}
console.log(`db:check OK: 0 migraciones pendientes (${avisos} aviso(s))`);
