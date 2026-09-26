# CLAUDE.md — ReservaYa
Reservas de canchas deportivas en Arequipa (29 distritos whitelist). Monorepo: landing Astro + panel Next.js + API .NET + Neon Postgres.

## Trabajo
- Español. Al terminar: "Hecho." + resultado verificable. Sin explicar código.
- Tarea = spec `docs/specs/NN-slug.md` (plantilla `docs/specs/_TEMPLATE.md`); `[x]` + evidencia en §7 solo con gates en verde.
- Backlog y estado: `PLAN_OTRO_AGENTE.md` §3. Bloqueos de API/BD se anotan `BLOQUEO-API` (endpoint, payload, respuesta), no se parchean.
- No commit/push sin pedirlo. Nunca `.env`, `bin/`, `obj/`, `.next/`, `dist/`.
- Skills (leer antes de tocar): Astro → `docs/skills/astro-landing.md` · Panel Next → `docs/skills/panel-next.md`.
- Bajo demanda: API `reservaya-frontend-astro/docs/api.md` · arquitectura `reservaya-frontend-astro/docs/architecture.md` · deploy `DEPLOY_GRATIS.md`.

## Árbol
```
reservaya-frontend-astro/      Astro 5 estático :4321 — landing, login/register, jugador (src/pages, layouts/BaseLayout.astro)
reservaya-nextjs-api/          Next 16 :3000 — panel /dashboard /admin /superadmin /tecnico; rewrites /api/* y /uploads/* → BACKEND_URL
  app/(auth) app/(dashboard)   rutas; guardas en lib/session.ts (requireAuth, requireRole)
  components/{b2b,features,layout,ui}
  lib/                         server-fetch.ts→api.ts,b2b-api.ts (servidor) · http.ts→api-client.ts,b2b-client.ts (cliente)
                               carga.ts (errores visibles) · redirect.ts · permissions.ts (fallbackPorRol) · *.test.mjs
  proxy.ts                     middleware: verifica JWT (jose, claim `rol`) y redirige por rol
  backend/ReservaFacil.Api/    .NET 10 :5000 — única autoridad (auth, reservas, caja, torneos)
  prisma/                      esquema espejo; dueño de la BD = EF Core
.github/workflows/ci.yml       astro check + build · typecheck + lint + test + build · db:check (secreto DATABASE_URL)
```

## Comandos (npm)
- Todo: `npm run dev:all` (API 5000 → Next 3000 → Astro 4321) · API sola: `npm run dev:api`
- Astro: `npm --prefix reservaya-frontend-astro run build` · `npx --prefix reservaya-frontend-astro astro check`
- Panel: `npm --prefix reservaya-nextjs-api run typecheck` · `run lint` · `test` (node --test) · `run build` · `run db:check` (solo lectura)

## Entorno (solo nombres)
- Astro (build-time): `PUBLIC_RESERVAYA_API_URL` `PUBLIC_RESERVAYA_APP_URL` `PUBLIC_GA_ID` `PUBLIC_INBOXMEJIKAI_ENDPOINT`
- Panel: `DATABASE_URL` `DATABASE_URL_UNPOOLED` `JWT_SECRET`(≥32) `BACKEND_URL` `FRONTEND_ORIGIN` `NEXT_PUBLIC_PUBLIC_APP_URL` `COOKIE_SECURE`

## Reglas críticas
- ⛔ Cero migraciones: prohibido `dotnet ef`, `prisma migrate|db push|db pull|db execute`; no tocar `prisma/**`, `backend/**/Migrations/**`, `Entities.cs`, `AppDbContext.cs`.
- Sesión: cookie HttpOnly `token` emitida por la API; el cliente nunca lee el JWT. Roles: `USUARIO` `ADMIN` `SUPERADMIN` `TECNICO` (sin `PERSONAL`).
- Multitenancy: `TECNICO` = plataforma; cada `SUPERADMIN` solo sus complejos; 403 cross-owner lo decide la API.
- Rama `agents/frontend-nextjs-ui`: solo `reservaya-frontend-astro/src/**` y `public/**`, y `app/` `components/` `lib/` del panel (+ `docs/`, `.github/`).
- Comandos IA: `/spec` (escribir spec y esperar "aprobado") · `/gates` (correr gates y anotar §7) · `@explorer` (haiku, solo lectura) · `@reviewer` (revisión vs spec). Hook `.claude/settings.json` bloquea editar `.env`, `prisma/**`, `Migrations/**`, `Entities.cs`, `AppDbContext.cs`, `bin/obj/.next/dist`.
