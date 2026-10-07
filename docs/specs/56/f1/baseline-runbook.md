# Baseline F1: QA y futura producción

Estado: SQL generado desde el catálogo, schema validado; gates de paquetes/web Node22 y recreación vacía QA PASS. Reconciliación de historial pendiente. No se ha tocado producción.

## Alcance

19 tablas de negocio, 203 columnas, 13 enums y 34 claves foráneas. `Reclamo` no existe en el catálogo y no se crea. Los identificadores no tienen defaults SQL; Prisma no inventa uuid/cuid. Los arrays nullable se expresan como listas Prisma; el diff real debe confirmar equivalencia. Se conserva el espejo anterior en `schema-before.prisma.txt`.

Las seis migraciones fuente se guardan en `packages/db/prisma/legacy-migrations`, con hashes SHA-256. Las ocho filas históricas incluyen una ejecución incompleta y una migración `enum_defaults` aplicada sin fuente; no se reconstruye su SQL.

## Ensayo autorizado en qa-migracion-ts

Con Node22.20.0 y pnpm10.18.3, instalar con lock congelado y generar cliente:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
node scripts/db-qa.mjs reconcile --confirm-qa-migracion-ts
node scripts/db-qa.mjs status
node scripts/db-qa.mjs drift
```

El wrapper solo toma TEST_DATABASE_URL y TEST_DATABASE_URL_UNPOOLED de `hive/qa.env`, no usa DATABASE_URL del shell ni imprime conexiones. Confirmar en Neon que dichas conexiones pertenecen a la rama QA antes de ejecutarlo. Usa conexión directa para operaciones de historial. En una transacción crea `migration_archive._prisma_migrations_legacy`, verifica ocho filas, copia y verifica conteo, vacía únicamente el historial activo. Archivo en un schema separado para que el diff sobre public no detecte una tabla auxiliar ajena al modelo. Detiene si el archivo existe; no sobrescribe ni repite la reconciliación automáticamente.

Después marca `0_baseline` aplicado (no ejecuta su SQL), exige migrate status limpio y diff con código0. Si resolve falla tras archivar, detener y recuperar historial; no repetir reconcile. No exportar datos ni logs de clientes. La línea nueva contiene solo `0_baseline`.

Generación offline del baseline:

```sh
pnpm --filter @reservaya/db exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Guardar salida en migrations/0_baseline/migration.sql; revisar que no incluya tablas de archivo ni Reclamo. El SQL solo se ejecuta al recrear una base vacía, nunca sobre el catálogo existente.

## Reversión del ensayo

Detener aplicaciones/migradores que puedan escribir historial. En una transacción, comprobar archivo8filas; borrar fila baseline e insertar las ocho filas originales:

```sql
BEGIN;
LOCK TABLE public._prisma_migrations IN ACCESS EXCLUSIVE MODE;
DELETE FROM public._prisma_migrations;
INSERT INTO public._prisma_migrations
SELECT * FROM migration_archive._prisma_migrations_legacy;
COMMIT;
```

Verificar conteo8 y checksum/nombre/estado originales. Conservar el archivo para auditoría. Restaurar código/migraciones legacy desde sus hashes si se revierte la nueva línea. No ejecutar migrate deploy con el historial viejo incompleto: se conserva su estado, no se corrige inventando SQL.

## Producción: plan, no autorización

Solo tras aprobación humana posterior: confirmar rama/endpoint productivo con el responsable, backup/PITR y ventana sin migradores concurrentes; verificar catálogo sin drift y ocho registros equivalentes; ejecutar transacción de archivo/copia/conteo/vaciado y resolve0_baseline, seguido de status y diff0. Verificar conteos de negocio antes/después. El wrapper QA nunca se reutiliza cambiando variables productivas: preparar un procedimiento separado, revisado y aprobado. Reversión con la transacción anterior y despliegue previo; ninguna tabla de negocio cambia.

## Recreación efímera

En PostgreSQL descartable, crear base vacía, aplicar migration.sql y ejecutar migrate diff contra el mismo schema. Exigir código0. No usar un schema nuevo en la rama compartida si no fue aprobado ni usar shadowDatabaseUrl productivo. Ensayo ejecutado por god: BD temporal recreacion_efimera dentro de QA, migrate deploy/status/diff0 PASS; BD eliminada después. CI conserva una recreación independiente con PostgreSQL17.

## Migración posterior: 1_libro_reclamaciones (Spec 56 F6)

Aprobada por el humano solo para QA (2026-10-07). Crea `Reclamo` con columnas, tipos e índices únicos (`Reclamo_numero_key`, `Reclamo_anio_correlativo_key`) idénticos a la migración .NET `20261006133334_LibroReclamaciones`. SQL generado con `prisma migrate diff` desde el schema anterior; sin datos ni seed.

```bash
node scripts/db-qa.mjs deploy --confirm-qa-migracion-ts   # migrate deploy + status, solo URLs TEST de hive/qa.env
node scripts/db-qa.mjs drift                              # exige diff 0
```

Aplicada en `qa-migracion-ts`: status «Database schema is up to date», drift 0. **Producción: pendiente.** Requiere aprobación humana aparte y el procedimiento productivo de la sección anterior (backup/PITR, ventana, verificación de rama). Reversión en QA: `DROP TABLE "Reclamo"` y borrar la fila `1_libro_reclamaciones` de `_prisma_migrations`, solo si no hay reclamos reales.
