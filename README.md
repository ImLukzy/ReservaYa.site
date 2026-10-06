# ReservaYa

Reservas de canchas deportivas en Arequipa. Una web Next.js 16.2.9 / React 19.2.4 reúne las páginas públicas y los paneles; la API .NET 10 conserva los datos, reglas y sesión HttpOnly. Neon y el esquema existente permanecen sin cambios.

## Aplicaciones

- `apps/web`: Next, componentes públicos/panel, cliente de API, assets y espejo Prisma.
- `apps/api`: API ASP.NET Core, modelos EF Core y migraciones existentes protegidas.
- `docs`: arquitectura, contrato de API, spec vigente ([55 — paneles por rol](docs/specs/55-paneles-por-rol.md), rama `main`) y archivo histórico.
- `scripts`: arranque Node web/API y checker de motion.

El proyecto .NET se llama `ReservaFacil.Api` (`apps/api/ReservaFacil.Api.csproj`, `ReservaFacil.Api.dll` en el `Dockerfile`) a propósito: la spec 51 conservó el nombre sin renombrar. No es un clon equivocado; no renombrarlo.

## Desarrollo

Se necesitan Node.js 22+, npm y .NET SDK 10. Preparar las dependencias de `apps/web` con `npm --prefix apps/web ci` y configurar el entorno local a partir de `apps/web/.env.example`; no versionar secretos.

Desde cualquier directorio, `node /ruta/al/repositorio/scripts/start-dev.mjs` resuelve la raíz del proyecto. Desde la raíz:

```sh
npm run dev:all
```

El runner carga el entorno local de `apps/web/.env` en el proceso, sin imprimirlo; espera `/healthz` de la API :5000 y luego inicia Next :3000. Un servicio existente solo se reutiliza si supera la comprobación de identidad y salud. Ctrl+C cierra los árboles iniciados por el runner. El wrapper PowerShell llama al mismo runner.

| Comando desde raíz | Acción |
|---|---|
| `npm run dev` / `npm run dev:next` | Web :3000 con `next dev --webpack` |
| `npm run dev:api` | API :5000; requiere variables en el entorno del shell |
| `npm run build` / `npm run build:next` | Build Next |
| `npm run preview` | `next start`, tras build |
| `npm --prefix apps/web run typecheck` | Tipos |
| `npm --prefix apps/web run lint` | Lint |
| `npm --prefix apps/web test` | Pruebas web |
| `node --test scripts/start-dev.test.mjs` | Contratos y ciclo de vida del runner |
| `node scripts/motion-tokens.mjs --check` | Tokens de motion |
| `dotnet build apps/api/ReservaFacil.Api.csproj` | Compilar API |
| `npm --prefix apps/web run db:check` | Comprobación de BD de solo lectura |

`npm --prefix apps/web run db:check` y el `prisma generate` del `postinstall` necesitan una `DATABASE_URL` real de Neon en el entorno; sin ella fallan. La API no tiene tests en el repo: CI solo ejecuta `dotnet build`, así que los cambios de API se verifican compilando y probando a mano contra la web.

CI genera tipos con `next typegen` antes de typecheck. Para un checkout sin tipos generados, ejecutar ese comando dentro de `apps/web` mediante `npm exec -- next typegen`.

## Reglas

Cero migraciones o cambios a Prisma, Migrations, Entities.cs y AppDbContext.cs en esta tarea. Cookie HttpOnly emitida por API; el cliente no lee JWT. `/api/*` y `/uploads/*` usan el rewrite privado `BACKEND_URL`; no publicar secretos. Los roles son USUARIO, ADMIN, SUPERADMIN y TECNICO.

Ver [arquitectura](docs/architecture.md), [API y variables](docs/api.md), [guía Next](docs/skills/panel-next.md), [despliegue](DEPLOY_GRATIS.md) y [spec 55](docs/specs/55-paneles-por-rol.md) (vigente). La documentación previa se conserva en `docs/specs/archivo`.
