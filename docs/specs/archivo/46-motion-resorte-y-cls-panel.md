# Especificación: 46 — Resorte único de motion y CLS del panel medido

> **Estado:** ✅ Aprobada por Lukas (2026-09-30, «sì») y ejecutada salvo A8/T5: la medición del panel está bloqueada porque el login da 500 hasta aplicar la migración de la spec 44 (`BLOQUEO-API`, §7).
> **Origen:** Directiva de Lukas (2026-09-30): heredar los estándares de Universo_Agustino (un solo `SPRING` 400/30, CLS 0, skills de dominio con reglas de motion). Brechas verificadas contra el código el mismo día.

## 1. Objetivo
**Problema:**
1. **Motion sin fuente única.** 25 declaraciones con curvas o duraciones literales en 7 archivos (3 CSS + 4 `<style>` de Astro) y 4 utilidades `duration-*` en TSX (el borrador contaba solo los 3 CSS; inventario completado al ejecutar). Solo existía un token (`--ease-salida`, `reservaya-frontend-astro/src/styles/tokens.css:115`):
   - `tokens.css:139` `.btn-tactil` `0.1s ease` · `:176` `.chip-tactil` `0.15s ease`.
   - `motion.css:17` `1.4s ease-in-out` · `:41` `2s ease-in-out` · `:45` `180ms` · `:76` `0.6s cubic-bezier(0.16,1,0.3,1)` · `:102`, `:114`, `:134` `0.3s cubic-bezier(0.16,1,0.3,1)`.
   - `reservaya-nextjs-api/app/globals.css:169` `0.6s ease` · `:197` `0.12s/0.15s ease` · `:222` `0.7s ease` · `:236` `1.8s cubic-bezier(0.4,0,0.6,1)` · `:252` `0.28s ease-out` · `:255` `0.38s cubic-bezier(0.22,1,0.36,1)` · `:263` `0.3s ease` · `:315` `0.1s ease` · `:351` `0.15s ease` · `:379` `220ms/180ms ease` · `:388` `180ms ease`. El `@theme inline` del panel (`:54`) no tiene ningún `--ease-*`.
   - `<style>` de Astro: `CintaPitazo.astro:17` `34s linear` · `ui/PatronCancha.astro:66` `1.1s` · `pages/duenos.astro:105` y `pages/index.astro:97` `0.7s cubic-bezier(0.16,1,0.3,1)`.
   - Utilidades: `features/CanchaCard.tsx:91` y `features/PartidosJugadorPanel.tsx:153` `duration-150` · `layout/Sidebar.tsx:231` `duration-200` · `ui/Button.tsx:14` `duration-150`.
   - 84 utilidades `transition*` en el panel y 10 en Astro usan el default de Tailwind (`150ms cubic-bezier(0.4,0,0.2,1)`), ajeno a ambos.
2. **CLS del panel nunca medido.** `docs/specs/21-operativa.md:242` «Verificación de métricas CLS ≤ 0.05» sigue `[ ]`. Hay un solo `app/(dashboard)/loading.tsx` (título + 3 tarjetas + bloque `h-72`) para 32 páginas con formas distintas (agenda, caja, tablas).
3. **Skills sin la regla.** `docs/skills/panel-next.md` (13 líneas) no menciona motion ni CLS; `astro-landing.md` regla 8 fija CLS < 0.02 pero no prohíbe curvas ni duraciones sueltas.
4. **Fallo previo hallado al ejecutar:** `motion.css:132-143`, respaldo para navegadores sin `interpolate-size`, ponía `max-height: 0; opacity: 0` sobre el propio `<details>`: en esos navegadores las preguntas frecuentes desaparecían enteras, `summary` incluido. `motion.css:88` tenía además una transición sin efecto (`scroll-behavior 0s linear`).

**Resultado esperado:** un solo resorte (k 400, c 30, m 1, el `SPRING` de Universo) como token `--ease-resorte` idéntico en ambas apps, con `--ease-salida` y 3 duraciones; ninguna curva o duración literal fuera de los tokens salvo los bucles ambientales listados, garantizado por un `--check` en CI. CLS del panel medido en 12 rutas por rol a 1280 y 375 px, ≤ 0.02, y skills actualizadas.

## 2. Fuera de alcance
- `framer-motion`/`motion`: Astro no tiene React y el panel anima con CSS; `linear()` reproduce el resorte con 0 KB de dependencia.
- Partir los 25 componentes del panel de más de 150 líneas (`CronogramaView.tsx` 1 240, `CajaPanel.tsx` 897, `ComplejosGrid.tsx` 668…): spec 48 aparte.
- `CajaPanel.tsx`, `CronogramaView.tsx`, `VistaMesCronograma.tsx`, `VistaSemanaCronograma.tsx`: cambios sin commitear de otra sesión. No se tocan; si su ruta supera el umbral, se anota en §7 para esa sesión.
- API .NET, `prisma/**`, migraciones, `fetch` y lógica de negocio. Colores, sombras y radios (specs 20, 26, 27).

**Decisiones de producto que requieren aprobación:**
1. Sin `framer-motion` (default tomado; se cambia si lo pides).
2. Umbral de CLS del panel **0.02** (igual que la landing y Universo) en lugar del 0.05 de la spec 21.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `scripts/motion-tokens.mjs` | crear | Genera `linear()` desde k/c/m; `--write` escribe el token en ambos CSS; `--check` falla si difieren o hay literales fuera de tokens/lista ambiental |
| `scripts/motion-tokens.test.mjs` | crear | `node --test`: x(0)=0, x(fin)=1, asentado 400 ms, sobrepaso 2,84 % |
| `reservaya-frontend-astro/src/styles/tokens.css` | modificar | Tokens en `@theme static` + default de transición de Tailwind; `.btn-tactil`, `.chip-tactil` con tokens |
| `reservaya-frontend-astro/src/styles/motion.css` | modificar | Curvas y duraciones → tokens (tabla §4); fuera el respaldo roto de `<details>` y la transición sin efecto |
| `reservaya-frontend-astro/src/{components/CintaPitazo,components/ui/PatronCancha,pages/duenos,pages/index}.astro` | modificar | `<style>`: 3 entradas de héroe → resorte; cinta = ambiental |
| `reservaya-nextjs-api/components/{features/CanchaCard,features/PartidosJugadorPanel,layout/Sidebar,ui/Button}.tsx` | modificar | `duration-N` → `ease-resorte duration-(--dur-resorte)` o default |
| `reservaya-nextjs-api/app/globals.css` | modificar | Mismos tokens en `@theme inline`; clases con tokens; `prefers-reduced-motion` global como Astro |
| `reservaya-nextjs-api/scripts/cls.mjs` | crear | Playwright: CLS y scroll horizontal por ruta y ancho |
| `reservaya-nextjs-api/package.json`, `package-lock.json` | modificar | `devDependencies.playwright` 1.63.0 (sin scripts de instalación; usa el Chromium ya descargado si falta el de su revisión) |
| `reservaya-nextjs-api/app/(dashboard)/<ruta>/loading.tsx` | crear | Solo en rutas con CLS > 0.02, con la forma real de la página |
| `docs/skills/astro-landing.md` | modificar | Regla 8: motion solo por tokens |
| `docs/skills/panel-next.md` | modificar | Regla 10: motion por tokens, CLS ≤ 0.02, `loading.tsx` con forma real |
| `.github/workflows/ci.yml` | modificar | Paso `node scripts/motion-tokens.mjs --check` + test |
| `CLAUDE.md` | modificar | 1 línea en Comandos |
| `PLAN_OTRO_AGENTE.md` | modificar | §3.0 punto 4 |
| `docs/specs/21-operativa.md` | modificar | `:242` remite a esta spec |

## 4. Diseño y lógica
- **Tokens (idénticos en ambas apps):**

| Token | Valor | Uso |
|---|---|---|
| `--ease-resorte` | `linear(…)` generado de k 400, c 30, m 1: ζ 0,75; 90 % a 140 ms; pico +2,84 % a 238 ms; asentado ±0,1 % a 400 ms. Sin soporte de `linear()` → `--ease-salida` | `transform` de interacción |
| `--dur-resorte` | `400ms` | siempre junto a `--ease-resorte` |
| `--ease-salida` | `cubic-bezier(0.2, 0.8, 0.2, 1)` (ya existe en Astro) | opacidad, color, sombra, alto |
| `--dur-toque` | `120ms` | color y sombra en hover/press |
| `--dur-entra` | `180ms` | entradas de opacidad |
| `--default-transition-duration` / `--default-transition-timing-function` | `var(--dur-toque)` / `var(--ease-salida)` | las 94 utilidades `transition*` heredan sin tocar componentes |

- **Reemplazos:**

| Lugar | Hoy | Nuevo |
|---|---|---|
| `.btn-tactil`, `.btn-press` (`transform`) | `0.1s`/`0.12s ease` | resorte |
| Sombra y fondo de `.btn-*`, `.chip-tactil` | `0.1–0.15s ease` | toque + salida |
| `.modal-card-enter`, `.ticket-bump` | `0.38s (0.22,1,0.36,1)`, `0.3s ease` | resorte |
| `.modal-backdrop-enter`, `.fila-entra` | `0.28s ease-out`, `180ms` | entra + salida |
| Chevron de `details`, `.seccion-entra` | `0.3s`/`0.6s (0.16,1,0.3,1)` | resorte |
| Alto del contenido de `details` (Astro y panel) | `0.3s (0.16,1,0.3,1)`, `220ms ease` | `--dur-resorte` + salida (sin sobrepaso de alto); opacidad del panel con `--dur-entra` |
| Marcador de `summary` (panel) | `180ms ease` | resorte |
| Entradas de héroe: `hero-entra`, `duenos-entra`, `hero-patron-entra` | `0.7s`/`1.1s (0.16,1,0.3,1)` | resorte (400 ms: más rápidas que antes) |
| Hover de tarjetas (`CanchaCard`, `PartidosJugadorPanel`), cajón del `Sidebar` | `duration-150`/`duration-200` | `ease-resorte duration-(--dur-resorte)` |
| `Button` ghost (`transition-colors`) | `duration-150` | default (toque + salida) |
| Bucles ambientales: `esqueleto` 1.4s, `pulso-inicial` 2s×3, `badge-ping` 1.8s, `flash-green` 0.6s, `btn-shine` 0.7s, `cinta-pitazo` 34s | literales | se quedan, marcados `/* motion: ambiental */` (el `--check` los salta) |

- **Medición CLS:** `PerformanceObserver('layout-shift')` sin `hadRecentInput`, carga en frío, espera `networkidle` + 1 s, anchos 1280 y 375; también `scrollWidth − clientWidth`. Rutas (12): USUARIO `/dashboard`, `/dashboard/reservas`, `/dashboard/canchas`, `/dashboard/perfil` · ADMIN `/admin`, `/admin/agenda`, `/admin/caja`, `/admin/reservas`, `/admin/clientes` · SUPERADMIN `/admin/complejos` (su inicio es `/admin`, `login.astro:129`) · TECNICO `/tecnico`, `/tecnico/usuarios`. Sesión real contra `npm run dev:all` con `QA_<ROL>_EMAIL`/`QA_<ROL>_PASSWORD` del entorno del shell (nunca en archivos). Ruta > 0.02 → `loading.tsx` propio o altura reservada; se re-mide.
- **API:** sin cambios; solo `POST` de login existente para la sesión de QA.
- **Invariantes:** 0 cambios de lógica o `fetch`; `prefers-reduced-motion: reduce` anula toda animación en ambas apps; tokens idénticos byte a byte.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests panel | `npm --prefix reservaya-nextjs-api test` | 100 % verdes |
| A4 | Astro | `astro check` + `astro build` | 0 errores |
| A5 | Build panel | `npm --prefix reservaya-nextjs-api run build` | OK |
| A6 | Motion único | `node scripts/motion-tokens.mjs --check` | exit 0 |
| A7 | Resorte correcto | `node --test scripts/motion-tokens.test.mjs` | asentado 400 ± 5 ms; sobrepaso 2,84 ± 0,05 % |
| A8 | CLS panel | `node reservaya-nextjs-api/scripts/cls.mjs` | ≤ 0.02 en 12 rutas × 2 anchos |
| A9 | Scroll horizontal panel | mismo script, 375 px | 0 px |
| A10 | Landing sin regresión | CLS `/`, `/canchas` a 375 y 1440 | < 0.02 |
| A11 | Movimiento reducido | Playwright `reducedMotion: 'reduce'` | duración computada ≤ 0.01 ms en `.btn-tactil` y `.modal-card-enter` |
| A12 | Capturas | press de botón y apertura de modal a 1280 y 375 | revisadas a ojo |

## 6. Checklist
- [ ] T1: `reservaya-nextjs-api/scripts/cls.mjs` + `playwright` hechos y probados con la landing; **falta la medición del panel** (cuentas QA).
- [x] T2: `scripts/motion-tokens.mjs` + test.
- [x] T3: Tokens en `tokens.css` y `globals.css` + default de transición.
- [x] T4: Reemplazos de §4; `prefers-reduced-motion` global en el panel; respaldo roto de `<details>` fuera.
- [ ] T5: `loading.tsx` o altura reservada en rutas > 0.02; re-medir. Depende de T1.
- [x] T6: Skills (`astro-landing.md` regla 8, `panel-next.md` regla 10), `CLAUDE.md`, `ci.yml`, `PLAN_OTRO_AGENTE.md` §3.0, `21-operativa.md:242`.
- [ ] T7: A1–A7, A9 (landing), A10, A11 verificados; A8/A9 del panel pendientes; A12 sin el modal real.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 Tipos panel | ✅ | `npm run typecheck`: 0 errores |
| 2026-09-30 | A2 Lint panel | ✅ | `npm run lint`: 0 errores, 2 warnings previos en archivos no tocados (`lib/onboarding-simulation.test.mjs:1`, `prisma/seed.ts:44`) |
| 2026-09-30 | A3 Tests panel | ✅ | `npm test`: 40/40 |
| 2026-09-30 | A4 Astro | ✅ | `astro check`: 0 errores, 0 warnings, 4 hints; `npm run build`: 18 páginas |
| 2026-09-30 | A5 Build panel | ✅ | `next build` OK. CSS emitido: `--ease-resorte:linear(0, .018, …)`, `.ease-resorte{…}`, `.duration-\(--dur-resorte\){…}`, respaldo `@supports not`, `--default-transition-*: var(--dur-toque)/var(--ease-salida)`; en Astro, `.transition-*` leen `var(--default-transition-*)` |
| 2026-09-30 | A6 Motion único | ✅ | `node scripts/motion-tokens.mjs --check`: «2 bloques idénticos, 0 curvas ni duraciones sueltas» (inventario inicial: 25 declaraciones + 4 utilidades) |
| 2026-09-30 | A7 Resorte | ✅ | `node --test scripts/motion-tokens.test.mjs`: 6/6. Asentado 399,5 ms, sobrepaso 2,84 % a 237,5 ms, 90 % a 140 ms |
| 2026-09-30 | Resorte en navegador | ✅ | Chromium, `.modal-card-enter` del CSS compilado del panel: translateY 48 px → mínimo −1,34 px a 247 ms (teoría 1,36 px a 238 ms) → 0 px; `.btn-tactil` `0.4s, 0.12s` + `linear(…)` en panel y landing; héroe de `/` a 0.4s con `linear(…)` |
| 2026-09-30 | A8 CLS panel | 🟡 pendiente | Script listo; sin `QA_<ROL>_*` omite los 4 roles y sale con 1 |
| 2026-09-30 | A8 CLS panel | ⛔ `BLOQUEO-API` | Lukas confirmó `ep-super-art`/`neondb` como BD de desarrollo. `POST /api/auth/login` `{ email: "<rol>@reservafacil.com", password: <default del seed> }` → **500** `Npgsql.PostgresException 42703: column u.avatarUrl does not exist`, en los 4 roles, tanto en la API de :5000 (arrancada por otra sesión) como en una instancia propia en :5055 con `EMAIL_PROVIDER=log`. Causa: la migración `20260930142543_GoogleLogin` (spec 44, commit `4da5c91`) está sin aplicar («la aplica Lukas», `44-google-y-correos.md:61`). No se aplicó (cero migraciones). Al aplicarla: `npm run dev:api` y `node reservaya-nextjs-api/scripts/cls.mjs` con las cuentas del seed |
| 2026-09-30 | A9 Desborde | ✅ landing / 🟡 panel | Landing 0 px a 375 y 1440; panel pendiente con A8 |
| 2026-09-30 | A10 Landing | ✅ | `node scripts/cls.mjs --landing --base http://127.0.0.1:4400` (`astro preview` del build nuevo): `/` 0.0001 y 0.0013; `/canchas` 0.0164 (375) y 0.0034 (1440); API apagada → `/canchas` medida en su estado de error |
| 2026-09-30 | A11 Movimiento reducido | ✅ | `reducedMotion: 'reduce'`: `.btn-tactil` 1e-05s en panel y landing; `.modal-card-enter` `none` (0s); héroe 1e-05s |
| 2026-09-30 | A12 Capturas | ✅ landing / 🟡 modal | `/` a 375 y 1280 tras la entrada, sin cortes ni saltos; «Buscar canchas» pulsado (sombra 1 px). Modal del panel verificado por muestreo (fila «Resorte en navegador»), sin captura del modal real (requiere sesión) |
| 2026-09-30 | Fallo `<details>` | ✅ corregido | Con el respaldo viejo aplicado, `<details>` medía 0 px de alto y opacidad 0; eliminado: sin `interpolate-size` abre de golpe, nativo |
