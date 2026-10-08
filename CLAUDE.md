# CLAUDE.md — ReservaYa

Reservas de canchas deportivas en Arequipa (29 distritos whitelist). Web pública y panel Next.js 16 en `apps/web`; API vigente NestJS en `apps/api`; Neon conserva su esquema existente.

## Trabajo

- Español. Entregar resultado verificable, archivos cambiados y comandos/salidas. No commit/push/tag sin instrucción explícita.
- Implementar desde una nueva spec aprobada en `docs/specs`, creada desde `_TEMPLATE.md`; sin spec vigente. Historia en `archivo`, última [58 — objetivos táctiles](docs/specs/archivo/58-objetivos-tactiles.md). En la oficina god asigna cards y Pam registra §7.
- Antes de frontend leer `docs/skills/panel-next.md`. Contrato API: `docs/api.md`; arquitectura: `docs/architecture.md`; deploy: `DEPLOY_GRATIS.md`.
- BLOQUEO-API: endpoint, payload y respuesta; no parchear ausencia de datos o permisos.
- Spec, exploración y revisión describen trabajos del equipo; no asumir slash commands ni aliases de agentes instalados. Seguir las herramientas/skills realmente disponibles en la sesión.

## Árbol

```text
apps/web/                  Next 16 :3000 — público y /dashboard /admin /tecnico
  app/(public)             rutas públicas, metadata y layout sin guarda
  app/(dashboard)          guardas requireAuth/requireRole
  components/ui            UI compartida público/panel
  lib                      server-fetch→api/b2b-api; http→api-client/b2b-client; public/*
  proxy.ts                 verifica JWT/rol solo en rutas protegidas
apps/api/                  NestJS + Fastify :5200 — API de producción (todas las rutas)
packages/db/               Prisma canónico y baseline; historial legado archivado
packages/shared/           contratos zod
packages/config/           TypeScript y ESLint compartidos
scripts/                   runner Node y checker/tests motion
.github/workflows/ci.yml   tipos/lint/tests/build web, runner/motion, build API, db:check
```

## Comandos desde raíz

- `npm run dev:all`: runner Node, API NestJS :5200 saludable antes de web :3000; Ctrl+C limpia hijos propios. Carga entorno local apps/web/.env en ejecución; no imprime secretos.
- `pnpm dev`, `dev:next`, `build:next`, `preview`: web; `pnpm build`: paquetes y web. `dev:api`: API NestJS sola con variables en el entorno del shell.
- `npm --prefix apps/web run typecheck`, `run lint`, `test`, `run build`, `run db:check` (solo lectura).
- Dentro de apps/web: `npm exec -- next typegen` si faltan tipos generados. CI lo ejecuta antes de typecheck.
- `node --test scripts/start-dev.test.mjs`.
- Motion: `node scripts/motion-tokens.mjs --check` y `node --test scripts/motion-tokens.test.mjs`.
- CLS: `node apps/web/scripts/cls.mjs` (QA_<ROL>_EMAIL/PASSWORD del shell) o `--landing` para público.

## Entorno y reglas críticas

Variables de ejemplo en apps/web/.env.example. Públicas: NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT, NEXT_PUBLIC_WHATSAPP_NUMBER. Privadas: DATABASE_URL, DATABASE_URL_UNPOOLED, JWT_SECRET (≥32), BACKEND_URL; API además FRONTEND_ORIGIN, COOKIE_SECURE y configuración de correo. Nunca editar/versionar .env real ni artefactos node_modules/.next/dist.

Prisma es dueño del esquema; producción y QA tienen el mismo historial (`0_baseline`, `1_libro_reclamaciones`). Cambios de esquema: nueva migración en `packages/db/prisma/migrations`, probar en `qa-migracion-ts` y `prisma migrate deploy` en producción solo con aprobación humana. No ejecutar seed (ya no existe).

Cookie HttpOnly token emitida por API; cliente no lee JWT. Roles USUARIO, ADMIN, SUPERADMIN y TECNICO. Multitenancy y 403 cross-owner los decide la API. Requests y uploads del navegador usan el mismo origen web.

El hook real existe en `.claude/settings.json`, creado y probado por god para esta fase. Filtra Edit/Write/MultiEdit en herramientas compatibles, protege .env/Prisma/Migrations/Entities/AppDbContext/artefactos y permite únicamente .env.example como excepción exacta de entorno. No asumir que cubre shell u otros proveedores; la autorización de spec56 prevalece sobre las protecciones históricas de esquema; secretos y artefactos siguen protegidos.

Rollback: `git revert` o redeploy de un commit anterior en Render; no revertir la base automáticamente.
