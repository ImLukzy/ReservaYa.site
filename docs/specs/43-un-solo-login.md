# Especificación: 43 - Un solo login: el de la landing

**Aprobada por Lukas:** 2026-09-30 01:01 («sí, y también quitar el register»).

## 1. Objetivo
**Problema:** hay dos pantallas de login: la del panel (`http://localhost:3000/login`, `reservaya-nextjs-api/app/(auth)/login/page.tsx`) y la oficial de la landing (`http://localhost:4321/login`, `reservaya-frontend-astro/src/pages/login.astro`). Lo mismo pasa con el registro (`app/(auth)/register/page.tsx` y `src/pages/register.astro`). Lukas (2026-09-30): «elimina esto: http://localhost:3000/login, ya no debe existir esa pestaña, solo debe existir un login: http://localhost:4321/login».
**Resultado esperado:** quien entra a `/login` o `/register` del panel, o llega sin sesión a una ruta protegida, termina en el login o el registro de la landing. Tras entrar, vuelve a la página del panel que pidió. El panel ya no tiene formularios de login ni de registro.

## 2. Fuera de alcance
Login con Google y envío de correos (van en la Spec 44), API, `prisma/**`, `.env`, cambios en `login.astro`/`register.astro`.

**Decisiones de producto que requieren aprobación:** aprobar la spec, incluido que el registro del panel también se vaya.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/proxy.ts:19,40` | modificar | sin sesión o con token inválido → `${publicAppUrl}/login?returnUrl=<URL completa pedida>`; se mantiene el borrado de la cookie inválida |
| `reservaya-nextjs-api/app/(auth)/login/page.tsx` | reemplazar | sin formulario: redirección de servidor a `${publicAppUrl}/login`, conservando `returnUrl` si llega. Así las 24 referencias a `/login` del panel (`redirect('/login')`, Sidebar, etc.) siguen funcionando sin tocarlas |
| `reservaya-nextjs-api/app/(auth)/register/page.tsx` | reemplazar | redirección de servidor a `${publicAppUrl}/register` |
| `reservaya-nextjs-api/lib/api-client.ts:9` | modificar | borrar la función de registro si queda sin uso |
| `reservaya-nextjs-api/app/globals.css:169-175` | modificar | borrar `.auth-home-link` y `.auth-*` que queden sin uso |

`publicAppUrl` es la URL pública de la landing que ya usa hoy `app/(auth)/login/page.tsx:56` (variable `NEXT_PUBLIC_PUBLIC_APP_URL`).

## 4. Diseño y lógica
- **UI:** el panel deja de mostrar formularios de acceso; todo acceso pasa por la landing.
- **API:** sin cambios. `login.astro` ya acepta `returnUrl` del mismo origen o del origen del panel (`login.astro:44-62`) y, sin él, manda a cada rol a su inicio.
- **Invariantes:** sesión por cookie HttpOnly `token` emitida por la API; el cliente nunca lee el JWT; `returnUrl` solo acepta orígenes permitidos (sin redirecciones abiertas); las guardas por rol de `proxy.ts` quedan iguales.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gates panel | `typecheck` · `lint` · `test` · `build` | 0 errores; avisos ≤ los de hoy |
| A2 | `/login` del panel | Playwright: `http://localhost:3000/login` → URL final | `http://localhost:4321/login` |
| A3 | `/register` del panel | igual | `http://localhost:4321/register` |
| A4 | Ruta protegida sin sesión | Playwright: `http://localhost:3000/admin/agenda` sin cookie | `…:4321/login?returnUrl=…admin%2Fagenda` |
| A5 | Vuelta tras entrar | Lukas en su navegador: login en la landing con `returnUrl` → vuelve a la ruta pedida | vuelve |
| A6 | Sin formularios | `git grep -n "type=\"password\"" reservaya-nextjs-api/app` | 0 |

## 6. Checklist
- [x] T1: `proxy.ts` redirige a la landing con `returnUrl`.
- [x] T2: `/login` y `/register` del panel pasan a redirecciones.
- [x] T3: borrar el código que quede sin uso.
- [x] T4: gates, Playwright y §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 | ✅ | god: typecheck 0 · lint 0 errores, 2 avisos (los de antes) · test 40/40 · build 0 |
| 2026-09-30 | A2 | ✅ | Playwright: `:3000/login` → `http://localhost:4321/login` |
| 2026-09-30 | A3 | ✅ | Playwright: `:3000/register` → `http://localhost:4321/register` |
| 2026-09-30 | A4 | ✅ | Playwright sin cookie: `:3000/admin/agenda` → `:4321/login?returnUrl=http://localhost:3000/admin/agenda` |
| 2026-09-30 | Seguridad | ✅ | `:3000/login?returnUrl=https://evil.example/x` → `:4321/login` sin returnUrl (lo filtra `returnUrlSeguro`); `/login` y `/register` fuera del matcher de `proxy.ts`: sin bucles. Revisión god línea por línea |
| 2026-09-30 | A5 | pendiente | lo prueba Lukas con su cuenta |
| 2026-09-30 | A6 | ✅ | `git grep 'type="password"' reservaya-nextjs-api/app` → 0 |
