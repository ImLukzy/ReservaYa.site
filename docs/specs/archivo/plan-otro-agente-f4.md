# Plan F4 (archivado) — ReservaYa

> Archivado: describe la spec 51/F4. Spec vigente: [55 — paneles por rol](../55-paneles-por-rol.md), rama `main`.

Spec activa: [51 — migración del monorepo](../51-migracion-monorepo.md), rama `refactor/monorepo-apps`.

- F2: páginas públicas y panel en un mismo Next; cerrada por Pam/god.
- F3: UI compartida, bajas verificadas y archivo histórico; cerrada por Pam/god.
- F4: código trasladado a `apps/web` y `apps/api`, hashes de protegidos conservados; infraestructura, runner y documentación actualizados. Gates finales y revisión de Pam/god pendientes.
- Manual: plataforma web, DNS, Google, email, tráfico y retorno. No asumir producción validada por pasar gates locales.

Web :3000 y API :5000: `npm run dev:all`. Ver [README](../../../README.md), [arquitectura](../../architecture.md) y [despliegue](../../../DEPLOY_GRATIS.md).

Cero migraciones, seed o cambios de bytes en `apps/web/prisma/**`, `apps/api/Migrations/**`, `Entities.cs` y `AppDbContext.cs`. Sin commit/push/tag salvo instrucción explícita. La API conserva auth, permisos, reservas y multitenancy.

El detalle anterior y sus evidencias se conservan en [plan histórico](./plan-previo-f4.md). El tablero operativo de la oficina sigue a cargo de god.
