import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
const values = {};
for (const line of readFileSync(resolve(root, 'hive/qa.env'), 'utf8').split('\n')) {
  const match = line.match(/^(TEST_DATABASE_URL(?:_UNPOOLED)?)=(.*)$/);
  if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
for (const key of ['TEST_DATABASE_URL', 'TEST_DATABASE_URL_UNPOOLED']) {
  if (!values[key] || !['postgres:', 'postgresql:'].includes(new URL(values[key]).protocol)) throw new Error('Falta conexión QA válida');
}
const env = { ...process.env, DATABASE_URL: values.TEST_DATABASE_URL, DATABASE_URL_UNPOOLED: values.TEST_DATABASE_URL_UNPOOLED };
const redact = text => String(text).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[QA connection]').replace(/ep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/g, '[QA endpoint]');
const requireDb = createRequire(resolve(root, 'packages/db/package.json'));
const cli = requireDb.resolve('prisma/build/index.js');
const schema = resolve(root, 'packages/db/prisma/schema.prisma');
const run = args => {
  const result = spawnSync(process.execPath, [cli, ...args, '--schema', schema], { cwd: root, env, encoding: 'utf8' });
  process.stdout.write(redact(result.stdout || '')); process.stderr.write(redact(result.stderr || ''));
  if (result.status !== 0) throw new Error(`Prisma terminó con código ${result.status}`);
};
try {
  const action = process.argv[2] || 'drift';
  if (action === 'reconcile') {
    if (process.argv[3] !== '--confirm-qa-migracion-ts') throw new Error('Requiere confirmación explícita de la rama QA');
    const { PrismaClient } = requireDb('@prisma/client');
    const db = new PrismaClient({ datasources: { db: { url: values.TEST_DATABASE_URL_UNPOOLED } } });
    try {
      await db.$transaction(async tx => {
        await tx.$executeRawUnsafe('LOCK TABLE public._prisma_migrations IN ACCESS EXCLUSIVE MODE');
        await tx.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS migration_archive');
        const existing = await tx.$queryRawUnsafe("SELECT to_regclass('migration_archive._prisma_migrations_legacy')::text AS name");
        if (existing[0].name) throw new Error('Archivo previo encontrado; detener y revisar, sin sobrescribir');
        const rows = await tx.$queryRawUnsafe('SELECT count(*)::int AS count FROM public._prisma_migrations');
        if (rows[0].count !== 8) throw new Error('El historial no contiene las ocho filas esperadas');
        await tx.$executeRawUnsafe('CREATE TABLE migration_archive._prisma_migrations_legacy AS TABLE public._prisma_migrations');
        const copied = await tx.$queryRawUnsafe('SELECT count(*)::int AS count FROM migration_archive._prisma_migrations_legacy');
        if (copied[0].count !== rows[0].count) throw new Error('Conteo de archivo incorrecto');
        await tx.$executeRawUnsafe('DELETE FROM public._prisma_migrations');
        console.log('QA: ocho registros archivados; sin cambios en tablas de negocio');
      });
    } finally { await db.$disconnect(); }
    run(['migrate', 'resolve', '--applied', '0_baseline']);
    run(['migrate', 'status']);
  } else if (action === 'status') run(['migrate', 'status']);
  else if (action !== 'drift') throw new Error('Acción desconocida');
  if (action !== 'status') {
    const result = spawnSync(process.execPath, [cli, 'migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code'], { cwd: root, env, encoding: 'utf8' });
    process.stdout.write(redact(result.stdout || '')); process.stderr.write(redact(result.stderr || ''));
    if (result.status !== 0) throw new Error(`Drift: código ${result.status}`);
    console.log('QA drift 0');
  }
} catch (error) { console.error(redact(error?.stack || error?.message || String(error))); process.exitCode = 1; }
