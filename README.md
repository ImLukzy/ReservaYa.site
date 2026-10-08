# ReservaYa

Reservas de canchas deportivas en Arequipa. Una web Next.js 16.2.9 / React 19.2.4 reúne las páginas públicas y los paneles; la API NestJS + Fastify conserva los datos, reglas y sesión HttpOnly. Neon y el esquema existente permanecen sin cambios.

## Aplicaciones

- `apps/web`: Next, componentes públicos/panel, cliente de API, assets.
- `apps/api`: NestJS + Fastify, API de producción (:5200).
- `packages/db`, `packages/shared`, `packages/config`: Prisma, contratos zod y configuración común.
- `docs`: arquitectura, contrato de API, spec vigente ([56 — migración TypeScript](docs/specs/56-migracion-typescript.md), rama `main`) y archivo histórico.
- `scripts`: arranque Node web/API y checker de motion.

Rollback: `git revert` o redeploy de un commit anterior en Render; no revertir la base automáticamente.

## Desarrollo

Se necesitan Node.js 22.20.0, pnpm 10.18.3. Preparar dependencias desde raíz con `corepack pnpm install --frozen-lockfile` y configurar el entorno local a partir de `apps/web/.env.example`; no versionar secretos.

Desde cualquier directorio, `node /ruta/al/repositorio/scripts/start-dev.mjs` resuelve la raíz del proyecto. Desde la raíz:

```sh
npm run dev:all
```

El runner carga el entorno local de `apps/web/.env` en el proceso, sin imprimirlo; espera `/healthz` de la API :5200 y luego inicia Next :3000. Un servicio existente solo se reutiliza si supera la comprobación de identidad y salud. Ctrl+C cierra los árboles iniciados por el runner. El wrapper PowerShell llama al mismo runner.

| Comando desde raíz | Acción |
|---|---|
| `npm run dev` / `npm run dev:next` | Web :3000 con `next dev --webpack` |
| `npm run dev:api` | API :5200; requiere variables en el entorno del shell |
| `pnpm build` / `pnpm build:next` | Todos los paquetes / Next |
| `npm run preview` | `next start`, tras build |
| `npm --prefix apps/web run typecheck` | Tipos |
| `npm --prefix apps/web run lint` | Lint |
| `npm --prefix apps/web test` | Pruebas web |
| `node --test scripts/start-dev.test.mjs` | Contratos y ciclo de vida del runner |
| `node scripts/motion-tokens.mjs --check` | Tokens de motion |
| `pnpm --filter @reservaya/api build` | Compilar API |
| `npm --prefix apps/web run db:check` | Comprobación de BD de solo lectura |

`pnpm db:generate` genera el cliente Prisma sin conectarse a una base. `pnpm db:qa drift` utiliza exclusivamente TEST_DATABASE_URL* de `hive/qa.env`. CI valida cada paquete; no consume credenciales de producción. Ver [baseline y rollback](docs/specs/56/f1/baseline-runbook.md).

CI genera tipos con `next typegen` antes de typecheck. Para un checkout sin tipos generados, ejecutar ese comando dentro de `apps/web` mediante `npm exec -- next typegen`.

## Reglas

Spec56 F1 permite baseline únicamente en la rama QA aislada; cualquier operación de producción necesita autorización humana posterior. Cookie HttpOnly emitida por API; el cliente no lee JWT. `/api/*` usa el rewrite privado `BACKEND_URL`; las imágenes se suben a R2 vía `/api/upload`; no publicar secretos. Los roles son USUARIO, ADMIN, SUPERADMIN y TECNICO.

Ver [arquitectura](docs/architecture.md), [API y variables](docs/api.md), [guía Next](docs/skills/panel-next.md), [despliegue](DEPLOY_GRATIS.md) y [spec 55](docs/specs/55-paneles-por-rol.md) (vigente). La documentación previa se conserva en `docs/specs/archivo`.
