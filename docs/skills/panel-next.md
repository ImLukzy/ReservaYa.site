# SKILL: Panel Next.js 16 (`reservaya-nextjs-api/app|components|lib`)
**Cuándo usar:** cambios en rutas del panel, componentes `b2b/`/`features/`/`layout/`, clientes de API en `lib/`.

## Reglas Estrictas:
1. **Next 16 ≠ el que conoces:** consultar `node_modules/next/dist/docs/` antes de usar una API; el middleware es `proxy.ts` (export `proxy`). `npm run dev` = `next dev --webpack`: Turbopack dev en Windows da 404 en rutas dentro de grupos `(…)`.
2. **Sesión:** cookie HttpOnly `token` (`config.jwtCookieName`). Servidor: `requireAuth`/`requireRole` de `lib/session.ts` en layouts. El cliente nunca lee ni guarda el JWT.
3. **Superficie API única:** servidor = `lib/server-fetch.ts` (`serverFetch`/`getJson`, `server-only`) → lecturas en `lib/api.ts` y `lib/b2b-api.ts`. Cliente = `lib/http.ts` (`apiRequest`) → `lib/api-client.ts` y `lib/b2b-client.ts`. Tipos en `lib/api-types.ts`. Una función existe en un solo archivo; los componentes cliente solo hacen `import type` de `lib/api.ts`.
4. **Errores:** todo lanza `ApiError` (`lib/api-types.ts`; `B2BApiError` es alias). En páginas: `crearCarga()` de `lib/carga.ts` + `<AvisoCarga errores={carga.errores} />`, nunca `.catch(() => [])`. Los no controlados los recoge `app/(dashboard)/error.tsx` o `app/error.tsx`.
5. **Server vs client:** `'use client'` solo en componentes con estado/efectos; páginas son server components que cargan datos y pasan props.
6. **Efectos (lint `react-hooks/set-state-in-effect`):** no llamar `setState` síncrono en el cuerpo de `useEffect`; derivar en render, usar `key` para resetear, o setear dentro del callback async.
7. **Permisos:** matriz en `lib/permissions.ts`; si falta un dato de otra sede es `BLOQUEO-API`, no workaround.
8. **Verificación:** `npm run typecheck` + `npm run lint` (0 errores) + `npm run build` si se tocan rutas; `npm run db:check` antes de commit.
