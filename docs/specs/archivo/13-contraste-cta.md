# Especificación: 13 - Contraste AA en superficies verdes (CTA, badges, avatares)

## 1. Objetivo
**Problema:** en la landing Astro, el texto blanco sobre verde sólido no llega a AA en ninguna variante:

| Superficie | Texto | Contraste | Hover actual | Contraste en hover |
|---|---|---|---|---|
| `bg-[#22C55E]` (39 cadenas de clases) | `text-white` | 2.28:1 | `hover:bg-[#16A34A]` | 3.30:1 |
| `bg-[#16A34A]` (20 cadenas) | `text-white` | 3.30:1 | `hover:bg-[#15803D]` (12 de ellas) | 5.02:1 |
| Sin clase de color que heredan blanco: avatar «J» (`duenos.astro:94`), «Completar identidad» (`jugador/perfil.astro:33`) | blanco heredado | 2.28:1 | `hover:bg-[#16A34A]` (perfil) | 3.30:1 |
| Botones de los modales de login y registro (`components/LoginForm.astro:25`, `RegisterForm.astro:27`, `style="background: var(--accent-main); color: var(--accent-contrast)"`) | `--accent-contrast` #FFFFFF | 2.28:1 | — | — |
| `::selection` (`global.css:522-525`) | #fff sobre #22C55E | 2.28:1 | — | — |

El inventario sale del escaneo de todas las cadenas de clases en `src/**/*.{astro,ts}`, scripts incluidos. Quedan fuera por no llevar texto 6 puntos o barras (`BaseLayout.astro:329`, `duenos.astro:50,82,164`, `register.astro:30`, `torneos.astro:41`), y un botón ya correcto (`bg-[#22C55E] text-black`, 9.22:1).

**Estrategia (texto oscuro, no fondo oscuro):**

| Opción | Reposo | Hover | Efecto de marca |
|---|---|---|---|
| **Elegida: texto #060C08** | 8.66:1 (#22C55E) · 5.99:1 (#16A34A) | #16A34A 5.99:1 · #22C55E 8.66:1 | El verde de marca no cambia. #060C08 es el negro de marca (`--accent-secondary` / `--bg-hero`). El patrón ya existe en el sitio (`index.astro`, «Confirmar reserva»: `bg-[#22C55E] text-black hover:bg-[#4ADE80]`) |
| Descartada: fondo #15803D + blanco | 5.02:1 | #166534 7.13:1 | Apaga el verde neón del hero y de las secciones oscuras, deja el margen justo sobre AA y rompe la coherencia con `--accent-main`, que sigue siendo #22C55E en glows y acentos |

**Resultado esperado:** todo texto sobre verde sólido de la landing queda ≥ 4.5:1, en reposo y en hover.

## 2. Fuera de alcance
- **Panel Next:** 60 cadenas `bg-[#22C55E]`/`bg-[#16A34A]` (9 en `app/`, 51 en `components/`) y `.btn-accent` en `app/globals.css:142-150` (#22C55E + #fff). Va en su propia spec (spec 14), aplicando el mismo criterio y el skill `panel-next.md`.
- **Texto verde sobre fondo claro** (p. ej. #22C55E sobre #F5F5F3 = 2.09:1; `.contact-link`, logo «Ya»). Es otro problema: color de texto, no de superficie.
- Token `--text-soft` sobre claro (spec 12 §2), copy de Lima y búsqueda en el hero (spec 11 §2).
- `.navbar-cta` (`global.css:62-89`): no se usa en el markup. El cambio de `--accent-contrast` la alcanza sin efecto visible.
- Superficies verdes translúcidas (`bg-[#22C55E]/10`, `/15`…): su texto ya lleva color propio.

**Decisiones de producto que requieren aprobación:**
1. Los CTA verdes pasan de etiqueta blanca a **#060C08**, en toda la landing. Esto incluye el hero («Buscar canchas →»), los avatares con iniciales y los badges sobre verde.

## 3. Archivos afectados
Reglas de sustitución, aplicadas solo dentro de cadenas de clases cuyo token base (sin prefijo de variante) es `bg-[#22C55E]` o `bg-[#16A34A]`:
- **R1:** `text-white` → `text-[#060C08]`. Se aplica en las 59 cadenas.
- **R2:** `hover:bg-[#15803D]` → `hover:bg-[#22C55E]`. Solo en las 12 marcadas ‡ (base #16A34A).
- `hover:bg-[#16A34A]` se mantiene en las de base #22C55E: con texto #060C08 da 5.99:1.

Leyenda: † = base `bg-[#16A34A]`; ‡ = base `bg-[#16A34A]` + R2; sin marca = base `bg-[#22C55E]`.

| Archivo | Líneas (R1, salvo que se indique) |
|---|---|
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | 322, 339, 377 |
| `reservaya-frontend-astro/src/pages/404.astro` | 11 |
| `reservaya-frontend-astro/src/pages/500.astro` | 11 |
| `reservaya-frontend-astro/src/pages/canchas.astro` | 97‡, 121, 179, 207, 389 |
| `reservaya-frontend-astro/src/pages/completar-cuadro.astro` | 31, 73‡, 164‡, 179, 243†, 251, 300, 401† |
| `reservaya-frontend-astro/src/pages/duenos.astro` | 60, 101, 134, 239, 302, 397, 438, 511. Además, L94: añadir `text-[#060C08]` al avatar «J» |
| `reservaya-frontend-astro/src/pages/forgot-password.astro` | 25‡ |
| `reservaya-frontend-astro/src/pages/index.astro` | 74, 148, 189, 228, 290†, 335, 381†, 393‡, 406 |
| `reservaya-frontend-astro/src/pages/jugador/perfil.astro` | 17, 25, 50, 57, 68, 121, 204. Además, L33: añadir `text-[#060C08]` a «Completar identidad» |
| `reservaya-frontend-astro/src/pages/libro-reclamaciones.astro` | 43‡ |
| `reservaya-frontend-astro/src/pages/login.astro` | 46‡ |
| `reservaya-frontend-astro/src/pages/mejoras.astro` | 54 |
| `reservaya-frontend-astro/src/pages/mis-partidos.astro` | 21†, 34‡, 40‡, 77† |
| `reservaya-frontend-astro/src/pages/mis-reservas.astro` | 14 |
| `reservaya-frontend-astro/src/pages/precios.astro` | 28† |
| `reservaya-frontend-astro/src/pages/publica-tu-cancha.astro` | 13 |
| `reservaya-frontend-astro/src/pages/register.astro` | 74‡, 104‡ |
| `reservaya-frontend-astro/src/pages/sortear.astro` | 77‡, 283, 357† |
| `reservaya-frontend-astro/src/pages/torneos.astro` | 49 |
| **Ampliación detectada en A4** (cadenas dentro de ternarios `${…}` y con prefijo `enabled:`, que el primer escaneo por comillas no separaba) | R1 en `canchas.astro:42`, `completar-cuadro.astro:57,108`, `duenos.astro:178,250,326,594`, `mejoras.astro:41` (`enabled:`), `precios.astro:36`, `sortear.astro:104,108` (`enabled:`). Además, `duenos.astro:500`: `dot.style.color` #fff → #060C08 en el ✓ del paso completado. Y `register.astro:20-21`: el avatar «J» (#16A34A, estilo inline) pasa a color #060C08 mediante la tupla `[letra, fondo, texto]`; los otros 4 avatares no son verdes y conservan #fff |
| `reservaya-frontend-astro/src/styles/global.css` | L170: `--accent-contrast: #FFFFFF` → `#060C08` (modales de login/registro). L524: `::selection { color: #fff }` → `#060C08` |
| `docs/skills/astro-landing.md` | Regla 8: «Sobre verde sólido (#22C55E/#16A34A) el texto va en #060C08, nunca blanco» |
| `PLAN_OTRO_AGENTE.md` | §6: fila del ítem |

## 4. Diseño y lógica
- **UI:** cambio de tokens de color en las clases existentes. No cambian estructura, espaciado, sombras (`shadow-[…rgba(34,197,94,…)]`) ni animaciones (`btn-shine`, `btn-press`).
  - Los glifos y fragmentos de etiqueta heredan el nuevo color por G3 (spec 12).
  - En `on-dark` (spec 10), los contenedores oscuros no cambian. Solo cambia el texto que está sobre el verde.
- **Hijos con `text-white` explícito dentro de una superficie verde** (p. ej. un badge o un icono): se detectan en A4 y pasan a `text-[#060C08]` o pierden la clase para heredar. Hoy no se ve ninguno en el escaneo estático; los de scripts se cubren en A4.
- **Scripts inline** (`is:inline`): solo cambian literales de cadena; siguen siendo JS plano (skill, regla 1).
- **API:** ninguna. Sin `BLOQUEO-API`.
- **Invariantes:** `--accent-main`, `--accent-hover` y el verde de marca no cambian. Sin scroll horizontal a 375 px. Cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Build + JS inline | `npm --prefix reservaya-frontend-astro run build`, y `node --check` de los `<script>` inline de las páginas tocadas | OK / 0 fallos |
| A3 | Inventario estático | Reejecutar el escaneo de cadenas de clases | 0 cadenas con base verde + `text-white`. 0 con base `bg-[#16A34A]` + `hover:bg-[#15803D]` |
| A4 | Contraste en reposo | Playwright sobre `astro preview` (backend falso :5999), 21 páginas × 375/1280 px: todo nodo de texto cuyo primer fondo opaco sea rgb(34,197,94) o rgb(22,163,74) | ≥ 4.5:1 en el 100 % |
| A5 | Contraste en hover | Playwright: `hover()` sobre cada `a`/`button` con fondo verde sólido, en todas las páginas | ≥ 4.5:1 en el 100 % |
| A6 | Modales y selección | Botón submit de `LoginForm`/`RegisterForm` abiertos: `color` = rgb(6, 12, 8). `::selection` en `global.css` compilado: `color: #060c08` | OK |
| A7 | Sin regresión | Snapshot del color computado antes y después (21 páginas × 2 anchos) | El diff solo contiene nodos con fondo verde sólido propio o heredado |
| A8 | Móvil y visual | 375 px sin scroll horizontal. Capturas antes y después del hero, `/duenos`, `/login` y `/canchas` | Sin scroll; revisadas |
| A9 | Alcance | `git status --short` | Solo los archivos de §3 |

## 6. Checklist
- [x] T1: Línea base: build con backend falso, snapshot A7, medición A4/A5 (debe fallar) y capturas.
- [x] T2: Aplicar R1 y R2 con un script que valide el token base de cada cadena (no un reemplazo global de `text-white`). Revisar el diff línea a línea.
- [x] T3: `duenos.astro:94` y `jugador/perfil.astro:33`: `text-[#060C08]`.
- [x] T4: `global.css`: `--accent-contrast` y `::selection`.
- [x] T5: `docs/skills/astro-landing.md`, regla 8.
- [x] T6: A1–A9; corregir los hijos `text-white` que detecte A4; anotar en §7; `PLAN_OTRO_AGENTE.md` §6; rebuild sin `PUBLIC_RESERVAYA_API_URL`.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | Línea base (T1) | — | 21 páginas × 375/1280 px: 222 nodos sobre verde < 4.5:1; hover con 122 textos < 4.5; botones de los modales en blanco |
| 2026-09-26 | T2 | ✅ | R1 = 59 y R2 = 12 en las líneas exactas de §3. Ampliación: +11 cadenas R1 (ternarios / `enabled:`), `duenos.astro:500` y `register.astro:20-21`. Total: 74 superficies de texto sobre verde |
| 2026-09-26 | A1 | ✅ | `astro check`: 0 errores, 0 warnings |
| 2026-09-26 | A2 | ✅ | Build de 21 páginas. 125 scripts inline de `dist/` → `node --check`: 0 fallos. Build final sin `PUBLIC_RESERVAYA_API_URL` |
| 2026-09-26 | A3 | ✅ | Escaneo por segmentos y con variantes: 0 cadenas con verde sólido + `text-white`, 0 con `bg-[#16A34A]` + `hover:bg-[#15803D]` |
| 2026-09-26 | A4 | ✅ | 0 de 480 nodos sobre verde por debajo de 4.5:1 (antes 222) |
| 2026-09-26 | A5 | ✅ | Hover en 116 controles verdes: 0 textos por debajo de 4.5:1 (antes 122) |
| 2026-09-26 | A6 | ✅ | Botones submit de `LoginForm`/`RegisterForm`: rgb(6, 12, 8). CSS compilado: `::selection{background:#22c55e;color:#060c08}` |
| 2026-09-26 | A7 | ✅ | Diff de 406 nodos, todos sobre superficie verde. 0 fuera |
| 2026-09-26 | A8 | ✅ | 0 px de scroll horizontal a 375 px. Capturas: hero «Buscar canchas →», submit de `/login`, «Empezar gratis» de `/precios` y chip de `/canchas`, todos con texto #060C08 |
| 2026-09-26 | A9 | ✅ | `git status`: 20 archivos de `reservaya-frontend-astro/src`, `astro-landing.md`, `PLAN_OTRO_AGENTE.md` y esta spec |
| 2026-09-26 | Nota | — | `/mis-reservas` sin sesión redirige al login del panel (`localhost:3000/login`), cuyo botón es blanco sobre #22C55E (2.28:1). Es del panel → spec 14. Avatares no verdes de `register.astro:20` («A» #F59E0B 2.15:1, «S» #EC4899 3.53:1, «C» #8B5CF6 4.23:1) quedan fuera de alcance |
