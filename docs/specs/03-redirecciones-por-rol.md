# Especificación: 03 - Redirecciones seguras y destino único por rol (backlog P1-9 + P0-1 en el panel)

## 1. Objetivo
**Problema:**
- Open redirect en el panel: `reservaya-nextjs-api/app/(auth)/login/page.tsx:31` y `register/page.tsx:43` validan `returnUrl` con `/^\/[^/]/`. Esa regex acepta `/\evil.com`, que el navegador resuelve como `//evil.com`. También aceptan cualquier `http://localhost:*`.
- El mapa rol → inicio está triplicado: `fallbackPorRol` (`lib/permissions.ts:48`), `getDashboardPorRol` (`lib/session.ts:16`) y `getDashboardPath` (`proxy.ts:41`).
- Los dos logins envían al `SUPERADMIN` a `/superadmin` (obsoleto, hace un salto extra): `app/(auth)/login/page.tsx:36` y `reservaya-frontend-astro/src/pages/login.astro:118`. Astro además manda al `ADMIN` a `/admin`, no a `/admin/agenda`.
- `proxy.ts` no cubre `/tecnico/*` en `matcher`. Hoy lo protege `requireRole(['TECNICO'])` del layout, pero sin la verificación de firma en el borde que tienen las demás zonas.

**Resultado esperado:** `returnUrl` solo acepta rutas locales o los orígenes permitidos (el panel y la landing), probado con tests. Un solo mapa rol → inicio (`fallbackPorRol`), usado por el proxy, las guardas y el login. `/tecnico/*` pasa por el proxy.

## 2. Fuera de alcance
Cambiar la lógica de permisos por módulo (`canAccess`), el backend y `lib/session.ts` más allá del mapa.

**Decisiones de producto que requieren aprobación:** ninguna. `/tecnico` en el `matcher` se avisa en el reporte, como pide el plan.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/lib/redirect.ts` | crear | `returnUrlSeguro(raw, origen, extras)` pura |
| `reservaya-nextjs-api/lib/redirect.test.mjs` | crear | `node --test` |
| `reservaya-nextjs-api/lib/permissions.test.mjs` | crear | `fallbackPorRol` |
| `reservaya-nextjs-api/package.json` | modificar | script `test` |
| `reservaya-nextjs-api/app/(auth)/login/page.tsx` | modificar | `returnUrlSeguro` + `fallbackPorRol` |
| `reservaya-nextjs-api/app/(auth)/register/page.tsx` | modificar | `returnUrlSeguro` |
| `reservaya-nextjs-api/lib/session.ts` | modificar | quitar `getDashboardPorRol`, usar `fallbackPorRol` |
| `reservaya-nextjs-api/app/(dashboard)/superadmin/layout.tsx` | modificar | `fallbackPorRol` |
| `reservaya-nextjs-api/proxy.ts` | modificar | `fallbackPorRol`, regla y matcher `/tecnico` |
| `reservaya-frontend-astro/src/pages/login.astro` | modificar | destinos = espejo de `fallbackPorRol` |

## 4. Diseño y lógica
- `returnUrlSeguro`: rechaza vacío, `\`, caracteres de control y `//`. Una ruta que empieza por `/` se resuelve contra `origen` y se devuelve `pathname+search+hash` si el origen coincide. Una URL absoluta solo pasa si es `http(s)` y su origen está en `[origen, ...extras]`. En cualquier otro caso devuelve `null`.
- Extras del panel: origen de `publicAppUrl` (`lib/public-app.ts`).
- `proxy.ts` importa de `lib/permissions.ts`, que solo tiene `import type` (se borra al compilar y no arrastra `next/headers`).
- **Invariantes:** TECNICO entra en `/admin` y `/tecnico`; `/superadmin` sigue redirigiendo según el rol.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos | `npm run typecheck` | 0 errores |
| A2 | Lint | `npx eslint` sobre archivos tocados | 0 errores |
| A3 | Tests | `npm test` | verde; casos `/\evil`, `//evil`, `javascript:`, origen ajeno, ruta local, landing |
| A4 | Build | `npm run build` | OK; proxy compila |
| A5 | Astro | `astro check` + build + `node --check` inline | 0 errores |
| A6 | Único mapa | `grep -rn "getDashboardPorRol\|getDashboardPath"` | 0 resultados |

## 6. Checklist
- [x] T1: `lib/redirect.ts` + tests + script `test`.
- [x] T2: login/register del panel usan `returnUrlSeguro`; login usa `fallbackPorRol`.
- [x] T3: `session.ts`, superadmin layout/catch-all y `proxy.ts` usan `fallbackPorRol`; `/tecnico` en el matcher; rol desconocido = token inválido.
- [x] T4: `login.astro` alinea destinos.
- [x] T5: verificar A1–A6 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | Antes | ❌ | La regex vieja `/^\/[^/]/` acepta `/\evil.com`; `new URL` lo resuelve a `http://evil.com/` |
| 2026-09-25 | A1 | ✅ | `npm run typecheck` → 0 errores (también se corrigió `superadmin/[[...rest]]/page.tsx`, que importaba `getDashboardPorRol`) |
| 2026-09-25 | A2 | ✅ | `npx eslint` sobre los 9 archivos tocados → 0 problemas |
| 2026-09-25 | A3 | ✅ | `npm test` → 9/9 (`redirect.test.mjs` 7, `permissions.test.mjs` 2) |
| 2026-09-25 | A4 | ✅ | `npm run build` → Compiled successfully, `ƒ Proxy (Middleware)` |
| 2026-09-25 | A5 | ✅ | `astro check` 0 errores · build de 21 páginas · 299 scripts inline sin errores |
| 2026-09-25 | A6 | ✅ | `grep getDashboardPorRol\|getDashboardPath` → 0 resultados |
| 2026-09-25 | Proxy en vivo | ✅ | `next start :3099` + JWT HS256 firmados en local: sin cookie `/tecnico`→`/login`; USUARIO `/tecnico/usuarios`→`/dashboard`; ADMIN `/tecnico`→`/admin/agenda`; TECNICO `/dashboard`→`/tecnico`; ADMIN `/superadmin`→`/admin/agenda`; USUARIO `/admin/caja`→`/dashboard`; rol `PERSONAL`→`/login` + cookie borrada (antes: bucle); firma ajena→`/login` + cookie borrada; TECNICO `/tecnico` y USUARIO `/dashboard` pasan el proxy (el 500 posterior es la API .NET caída, ver spec 04) |
| 2026-09-25 | Login E2E | ✅ | Playwright con `/api/auth/login` interceptado: `/\evil.com` (ADMIN)→`/admin/agenda`; `//evil.com` y `https://evil.com/x`→`/dashboard`; `http://localhost:4321/mis-reservas` se respeta; SUPERADMIN sin returnUrl→`/admin` directo; 0 navegaciones a evil.com; 0 errores de página |
