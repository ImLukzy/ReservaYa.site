# CLAUDE.md — ReservaYa

Reservas de canchas deportivas en Arequipa (29 distritos whitelist). Web pública y panel Next.js 16 en `apps/web`; API .NET 10 en `apps/api`; Neon conserva su esquema existente.

## Trabajo

- Español. Entregar resultado verificable, archivos cambiados y comandos/salidas. No commit/push/tag sin instrucción explícita.
- Implementar desde spec aprobada en `docs/specs`; plantilla `_TEMPLATE.md`, spec activa 51 e historia en `archivo`. El plan vigente está en `PLAN_OTRO_AGENTE.md`; en la oficina god asigna cards y Pam registra §7.
- Antes de frontend leer `docs/skills/panel-next.md`. Contrato API: `docs/api.md`; arquitectura: `docs/architecture.md`; deploy: `DEPLOY_GRATIS.md`.
- BLOQUEO-API: endpoint, payload y respuesta; no parchear ausencia de datos o permisos.
- Spec, exploración y revisión describen trabajos del equipo; no asumir slash commands ni aliases de agentes instalados. Seguir las herramientas/skills realmente disponibles en la sesión.

## Árbol

```text
apps/web/                  Next 16 :3000 — público y /dashboard /admin /superadmin /tecnico
  app/(public)             rutas públicas, metadata y layout sin guarda
  app/(dashboard)          guardas requireAuth/requireRole
  components/ui            UI compartida público/panel
  lib                      server-fetch→api/b2b-api; http→api-client/b2b-client; public/*
  proxy.ts                 verifica JWT/rol solo en rutas protegidas
  prisma                   espejo protegido; dueño del esquema = EF Core
apps/api/                  .NET 10 :5000 — auth, reservas, caja, torneos; Migrations protegidas
scripts/                   runner Node y checker/tests motion
.github/workflows/ci.yml   tipos/lint/tests/build web, runner/motion, build API, db:check
```

## Comandos desde raíz

- `npm run dev:all`: runner Node, API :5000 saludable antes de web :3000; Ctrl+C limpia hijos propios. Carga entorno local apps/web/.env en ejecución; no imprime secretos.
- `npm run dev`, `dev:next`, `build`, `build:next`, `preview`: web. `dev:api`: API sola con variables en el entorno del shell.
- `npm --prefix apps/web run typecheck`, `run lint`, `test`, `run build`, `run db:check` (solo lectura).
- Dentro de apps/web: `npm exec -- next typegen` si faltan tipos generados. CI lo ejecuta antes de typecheck.
- `dotnet build apps/api/ReservaFacil.Api.csproj`; `node --test scripts/start-dev.test.mjs`.
- Motion: `node scripts/motion-tokens.mjs --check` y `node --test scripts/motion-tokens.test.mjs`.
- CLS: `node apps/web/scripts/cls.mjs` (QA_<ROL>_EMAIL/PASSWORD del shell) o `--landing` para público.

## Entorno y reglas críticas

Variables de ejemplo en apps/web/.env.example. Públicas: NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT, NEXT_PUBLIC_WHATSAPP_NUMBER. Privadas: DATABASE_URL, DATABASE_URL_UNPOOLED, JWT_SECRET (≥32), BACKEND_URL; API además FRONTEND_ORIGIN, COOKIE_SECURE y configuración de correo. Nunca editar/versionar .env real ni artefactos node_modules/.next/bin/obj/dist.

Cero migraciones: prohibidos dotnet ef y prisma migrate/db push/db pull/db execute. No cambiar bytes de apps/web/prisma/**, apps/api/Migrations/**, Entities.cs ni AppDbContext.cs. En spec 51 solo se autorizó su traslado con hashes iguales. No ejecutar seed.

Cookie HttpOnly token emitida por API; cliente no lee JWT. Roles USUARIO, ADMIN, SUPERADMIN y TECNICO. Multitenancy y 403 cross-owner los decide la API. Requests y uploads del navegador usan el mismo origen web.

El hook real existe en `.claude/settings.json`, creado y probado por god para esta fase. Filtra Edit/Write/MultiEdit en herramientas compatibles, protege .env/Prisma/Migrations/Entities/AppDbContext/artefactos y permite únicamente .env.example como excepción exacta de entorno. No asumir que cubre shell u otros proveedores; las reglas anteriores siguen aplicando.
