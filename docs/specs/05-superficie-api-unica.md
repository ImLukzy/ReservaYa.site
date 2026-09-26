# Especificación: 05 - Una sola superficie de API cliente/servidor (backlog P1-11)

## 1. Objetivo
**Problema:** el acceso a la API está repartido en cuatro módulos con código repetido:
- `reservaya-nextjs-api/lib/api.ts:57-125`: `clientRequest` + 9 mutaciones (`login`, `register`, `logout`, `createCancha`, `updateCancha`, `deleteCancha`, `createReserva`, `updateReserva`, `updateUsuario`), duplicadas en `lib/api-client.ts`. Nadie importa la copia de `api.ts`, y su `register` ya divergía: no envía `fechaNacimiento` ni `username`.
- Tres copias del helper de cliente: `clientRequest` (`api.ts`), `request` (`api-client.ts:4`) y `request` (`b2b-client.ts:69`, con su propia clase `B2BApiError`, clon de `ApiError`).
- Dos copias de `serverFetch`/`getJson`: `api.ts:130-147` y `b2b-api.ts:24-41`.
- `api.ts` mezcla código de servidor (`cookies()`) con funciones de cliente.

**Resultado esperado:** cada función existe en un solo archivo. Cliente: `lib/http.ts` (`apiRequest`) → `api-client.ts` y `b2b-client.ts`. Servidor: `lib/server-fetch.ts` (`server-only`) → `api.ts` y `b2b-api.ts`. Las firmas públicas que usan los componentes no cambian.

## 2. Fuera de alcance
Los `fetch` sueltos dentro de `components/**` (cada panel b2b), mover tipos de `b2b-client.ts` a `api-types.ts` y cambiar endpoints.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/lib/http.ts` | crear | `apiRequest<T>` (fetch same-origin, `credentials: 'include'`, lanza `ApiError`) |
| `reservaya-nextjs-api/lib/server-fetch.ts` | crear | `import 'server-only'`; `serverFetch` + `getJson` |
| `reservaya-nextjs-api/lib/api.ts` | modificar | fuera `clientRequest` y las 9 mutaciones; usa `server-fetch` |
| `reservaya-nextjs-api/lib/b2b-api.ts` | modificar | usa `server-fetch` |
| `reservaya-nextjs-api/lib/api-client.ts` | modificar | usa `apiRequest` |
| `reservaya-nextjs-api/lib/b2b-client.ts` | modificar | usa `apiRequest`; `B2BApiError` = alias de `ApiError` |
| `docs/skills/panel-next.md` | modificar | regla 3 con los nombres reales |

## 4. Diseño y lógica
- `serverFetch`: reenvía la cookie `token`. Pone `Content-Type: application/json` solo si hay `body` y no viene ya definido (antes `b2b-api` lo ponía siempre y `api.ts` nunca).
- `export { ApiError as B2BApiError }`: los 16 `instanceof B2BApiError` siguen funcionando.
- **Invariantes:** mismas rutas, métodos y cuerpos; el cliente nunca importa `next/headers`.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos | `npm run typecheck` | 0 errores |
| A2 | Lint | `npx eslint lib` | 0 errores |
| A3 | Tests | `npm test` | verde |
| A4 | Build | `npm run build` | OK; sin error de `server-only` en bundles cliente |
| A5 | Sin duplicados | `grep -n "fetch(" lib/*.ts` | 1 `fetch` cliente (`http.ts`) + 1 servidor (`server-fetch.ts`), fuera de `validarCodigo`/`getSession` que usan `serverFetch` |
| A6 | Comportamiento | backend falso: login del panel (cliente) y `/tecnico` + `/admin/agenda` (servidor) | mismas peticiones y respuestas |

## 6. Checklist
- [x] T1: `http.ts` + `server-fetch.ts`.
- [x] T2: migrar `api.ts`, `b2b-api.ts`, `api-client.ts`, `b2b-client.ts`.
- [x] T3: actualizar `docs/skills/panel-next.md`.
- [x] T4: verificar A1–A6 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | `npm run typecheck` → 0 errores |
| 2026-09-25 | A2 | ✅ | `npx eslint lib` → 0 problemas (se quitaron 2 imports de tipo que quedaron sin uso) |
| 2026-09-25 | A3 | ✅ | `npm test` → 13/13 |
| 2026-09-25 | A4 | ✅ | `npm run build` → Compiled successfully; ningún bundle cliente importa `server-only` |
| 2026-09-25 | A5 | ✅ | `grep "fetch(" lib/*.ts` → solo `http.ts:6` (cliente) y `server-fetch.ts:16` (servidor). Líneas: `api.ts` 265→170, `api-client.ts` 38→27, `b2b-api.ts` 82→62, `b2b-client.ts` 203→187 |
| 2026-09-25 | A6 | ✅ | `next start` + backend falso: login del panel (5 casos de returnUrl) sin cambios; `/tecnico` (vía `api.ts`) y `/admin/agenda` (vía `b2b-api.ts` + `api.ts`) en 1280/375, HTTP 200, `getComplejos` OK y aviso solo de las rutas no simuladas; 0 errores de página; scroll-x 0; capturas revisadas |
