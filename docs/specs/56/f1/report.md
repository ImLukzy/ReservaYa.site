# Informe F1 — en curso

RYS-67, spec56 aprobada. Sin commit/push ni operación productiva.

## Cambio

Monorepo pnpm10.18.3/Turbo2.5.8, Node22.20.0 fijado. Web Next existente, Nest11/Fastify5 únicamente /health (:5200), shared zod4, config TS/ESLint y db Prisma6.19.3. Plugins cookie/multipart compatibles y con límites; sin rutas de negocio ni conexión DB al arrancar health.

81 archivos versionados trasladados. 80 mantienen hashes originales; el schema Prisma se reemplaza deliberadamente por el catálogo vivo y su versión previa queda archivada. Seis SQL legacy conservados con hashes; baseline0 revisado desde vacío. 19 tablas/203 columnas, 13 enums y 34 FKs. Sin Reclamo inventado.

Dockerfile raíz y runner apuntan a apps/api-dotnet; .NET sigue siendo servicio vigente para web. BACKEND_URL/rewrite/rutas Next conservadas. Bin/obj/uploads de procesos activos no se trasladan ni borran. Vercel apps/web/vercel.json usa pnpm/Turbo y necesita incluir fuentes externas al Root Directory antes del próximo deployment. No se modifica servicio remoto ni se despliega TS. Lock único pnpm: npm retirado después de frozen install PASS.

CI tiene jobs independientes config/shared/db/api/web, legacy .NET y baseline PostgreSQL efímero. Sin credenciales productivas; el antiguo db-check productivo se retira del workflow.

## Comandos verificados

God ejecutó la lista primero en Node26.10.0 y luego confirmó instalación congelada, tipos, lint, tests y buildNext con el binario oficial Node22.20.0 y pnpm10.18.3. db:build tenía una invocación pnpm anidada que usaba Node26; se retiró y queda repetir ese build. Los resultados son pruebas locales, no una ejecución de GitHub Actions ni un despliegue remoto.

| Comando | Resultado |
|---|---|
| pnpm install; pnpm install --frozen-lockfile | PASS |
| pnpm db:generate | PASS |
| pnpm exec turbo run build --filter=@reservaya/api --filter=@reservaya/shared --filter=@reservaya/db | PASS 4/4 tareas |
| pnpm --filter @reservaya/web exec next typegen | PASS |
| pnpm typecheck | PASS 8/8 tareas |
| pnpm lint | PASS 5/5 tareas |
| pnpm test | PASS 6/6 tareas; API3/shared1 pruebas |
| pnpm build:next, JWT_SECRET temporal | PASS 18 páginas; .next eliminado después |
| dotnet build apps/api-dotnet/ReservaFacil.Api.csproj -c Release | PASS (god0warn0error; sandboxNU1900 consulta vulnerabilidades sin red) |
| node --test scripts/start-dev.test.mjs scripts/motion-tokens.test.mjs | PASS 2/2 |
| Prisma validate schema; diff from-empty to-schema --script | PASS offline |
| git diff --check; hashes traslados | PASS |
| node scripts/db-qa.mjs drift | PASS QA0 antes de reconciliar |

## QA historial

Archivo aprobado en migration_archive._prisma_migrations_legacy, fuera de public para evitar drift auxiliar. Primer intento de reconciliación: regclass no deserializable; transacción revertida, god comprobó ocho filas originales y ningún archivo/schema creado. Corregido ::text; reintento pendiente. Recreación desde vacío PASS: god creó una BD temporal `recreacion_efimera` dentro de la rama QA, aplicó baseline, obtuvo status limpio y diff vacío, y eliminó la BD. No había daemon Docker local. Resolve/status/drift posterior pendientes. Runbook y rollback en baseline-runbook.md.

## Gates todavía abiertos

- Reconciliación QA, status limpio y drift0 posterior.
- Build db sin subproceso Node26; resto de gates Node22.20 PASS.
- Confirmación de configuración Vercel que incluye fuentes externas antes de despliegue.

No afirmar F1 terminada hasta registrar estas evidencias y comunicar los límites de la verificación de hosting.
