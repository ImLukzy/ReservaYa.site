# Especificación: 02 - `astro check` en verde (backlog P1-7 / P1-8)

## 1. Objetivo
**Problema:** `npx astro check` daba **95 errores** (2026-09-25), así que el job `frontend` de `.github/workflows/ci.yml` fallaría. Origen: `<script>` procesados (TS) sin tipos. `querySelectorAll()` devuelve `Element` (sin `dataset`/`style`), timers y parámetros con `any` implícito, `string | string[]` en `parseFloat`. Reparto: `src/pages/duenos.astro` (50), `src/pages/index.astro` (37), `src/layouts/BaseLayout.astro` (7), `src/pages/precios.astro:31` (1), `src/scripts/smooth-wheel.ts:19` (1). Además, 8 scripts con atributos (`define:vars`, `set:html`, `async src`) eran inline implícitos (hint `astro(4000)`).
**Resultado esperado:** `astro check` con 0 errores y 0 warnings. Los scripts inline se marcan con `is:inline` explícito y siguen en JS plano. Los scripts procesados quedan tipados sin `as any`.

## 2. Fuera de alcance
Cambiar el comportamiento de las animaciones o demos. Hints `ts(6133)` falsos positivos por atributos HTML `onerror` en `index.astro:38-40`. Hint `ts(80006)` en `completar-cuadro.astro:277`.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/pages/index.astro` | modificar | genéricos `querySelectorAll<HTMLElement>`, tipos de timers y parámetros |
| `reservaya-frontend-astro/src/pages/duenos.astro` | modificar | ídem + `Record<string,string[]>`, `SVGPathElement`, null-checks `insc-*` |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | modificar | foco de retorno `HTMLElement \| null`, formularios `HTMLFormElement`; `is:inline` en ld+json y gtag |
| `reservaya-frontend-astro/src/pages/precios.astro` | modificar | `parseFloat(String(p))` |
| `reservaya-frontend-astro/src/scripts/smooth-wheel.ts` | modificar | `el: Node \| null` |
| `src/pages/{login,register,forgot-password}.astro`, `src/components/{LoginForm,RegisterForm}.astro` | modificar | `is:inline` explícito junto a `define:vars` |

## 4. Diseño y lógica
- Tipado solo en `<script>` procesados por Vite. En scripts inline no se añade nada de TS (regla 1 de `docs/skills/astro-landing.md`).
- `e.target` de `IntersectionObserver` se estrecha con `instanceof HTMLElement` (sin cast).
- Sin cambios de comportamiento. Solo se añaden guardas `if (el)` donde antes podía lanzar con `null`.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Check | `npx astro check` | 0 errores, 0 warnings |
| A2 | Build | `npm run build` | OK |
| A3 | JS inline | `node --check` de cada script inline de `dist/**/*.html` | 0 errores |
| A4 | Comportamiento | `/`, `/duenos`, `/precios` en Playwright 1280/375 | 0 errores de página, scroll-x 0 |

## 6. Checklist
- [x] T1: tipar scripts de `index.astro`, `duenos.astro`, `BaseLayout.astro`, `precios.astro`, `smooth-wheel.ts`.
- [x] T2: `is:inline` explícito en los 8 scripts con atributos.
- [x] T3: verificar A1–A4 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | `npx astro check` → 95 errores / 0 warnings / 17 hints **→ 0 / 0 / 8** (hints restantes: 6 `onerror` HTML, 1 `genero`, 1 async) |
| 2026-09-25 | A2 | ✅ | `npm run build` → 21 page(s) built |
| 2026-09-25 | A3 | ✅ | 299 scripts inline en 21 HTML → 0 errores de sintaxis |
| 2026-09-25 | A4 | ✅ | Playwright 1280/375 sobre `astro preview`: `/` hero dot 1 activo, filtro F7 → "2 canchas cerca de ti", carrusel → "Reserva · 02/03"; `/duenos` anual → 0/71.92/159.20, inscripción 300 → total 2,400, rol Admin → 3 permisos; `/precios` anual → 0/71.92/159.20; 0 errores de página/consola; scroll-x 0 px en las 6 combinaciones; capturas revisadas |

## 8. Detectado fuera de alcance
- ⛔ **BLOQUEO-API** `register.astro:125`: el selector de género (`.gen`, `let genero`) no se envía. `POST /api/auth/register` no tiene campo `genero` y `Usuario` no tiene columna (haría falta una migración, prohibida en esta rama). Decisión de producto: persistirlo (Agente 1) o quitar el selector.
