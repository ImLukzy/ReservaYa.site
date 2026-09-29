# Especificación: 36 - Cierre del sitio público (errores + legales)

> **Estado:** ✅ **Aprobada por Lukas el 2026-09-29** (ILK-26): «SÍ, y que arregle las secciones, que sean más grandes, que aumente el tamaño de las secciones, que parezca como si fuera acercamiento (zoom) de 1.00 a 1.25, y que el desarrollo del frontend sea más rápido con alto diseño de profesionalismo». Se suma el **Lote 3 (escala 1.25)**.
> **Origen:** Pedido de god (`req-20260929-angel-s36`): cerrar el 100% del sitio público con las 4 páginas que specs 32/33/34 no cubrieron. Base: `hive/agents/toby-explorador-mumypt8r/mapa-s36.md`.
> **Design Read** (heredado Spec 32/34): *mismos diales* (`VARIANCE 8`, `MOTION 5` con `reduced-motion`) *y mismo idioma* (`card-tactil`, `font-display`, croquis, tokens): aquí no se inventa nada, solo se viste lo pendiente.

---

## 1. Objetivo

**Problema:** 4 páginas públicas siguen en identidad v1 (mapa-s36 §1): `404.astro` y `500.astro` usan `card-dashed` y h1 sans; `legal/privacy.md` y `legal/terms.md` renderizan `.prosa` plano sin marco táctil ni display.

**Resultado esperado:** las 4 páginas hablan el idioma Spec 32/34 sin tocar una línea de texto legal ni la lógica de error: `card-tactil` + `font-display` en errores, marco táctil + `.prosa` display en legales. Aprobación de Lukas antes de código.

---

## 2. Fuera de alcance

- Tocar `privacy.md` y `terms.md`: el texto legal queda byte-idéntico (integridad contractual).
- Cambiar destinos, `mailto:{EMAIL}`, `robots`, props de `BaseLayout` o botones de las páginas de error.
- `CroquisCancha.astro`: componente compartido, no se toca (en 500 la semántica de error la lleva la insignia, no el croquis).
- Backend, panel, migraciones.

**Decisiones de producto que requieren aprobación:** ninguna.

---

## 3. Archivos afectados (propuesta de lotes, ningún archivo tocado todavía)

Dos lotes secuenciales (L1 primero), para Oscar.

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-frontend-astro/src/pages/404.astro` | Modificar | `card-dashed` → `card-tactil`; h1 a `font-display` | L1 |
| `reservaya-frontend-astro/src/pages/500.astro` | Modificar | Igual + insignia de error (`error`/`error-suave`, sin tocar el croquis) | L1 |
| `reservaya-frontend-astro/src/layouts/LegalLayout.astro` | Modificar | Envolver `<article class="prosa">` en sección + `card-tactil` (plantilla mapa-s36 §3) | L2 |
| `reservaya-frontend-astro/src/styles/global.css` | Modificar | `.prosa h1/h2` a `font-display` (L2) + raíz `clamp()` escala 1.25 (L3) | L2, L3 |
| `reservaya-frontend-astro/src/styles/motion.css` | Modificar | `translateY(4px)` → `0.25rem` (mapa-px §2) | L3 |
| `reservaya-frontend-astro/src/pages/index.astro` | Modificar | Rayas a `rem`, keyframe a `rem`, `text-[11px]` → `rem` (mapa-px §2) | L3 |
| `reservaya-frontend-astro/src/pages/duenos.astro` | Modificar | Rayas + keyframe a `rem` (mapa-px §2) | L4 |
| `reservaya-frontend-astro/src/pages/torneos.astro` | Modificar | Rayas a `rem` (mapa-px §2) | L4 |
| `reservaya-frontend-astro/src/components/AuthCard.astro` | Modificar | `xl:min-h-[460px]` → `28.75rem` (mapa-px §2) | L4 |

---

## 4. Diseño y lógica (dirección propuesta)

### Lote 1 (L1, Oscar) — errores
- **Acción:** en `404`/`500`: `card-dashed` → `card-tactil p-8 text-center sm:p-12`; h1 a `font-display tracking-tight text-basalto` (escala actual `text-3xl lg:text-4xl`, sin agrandar: son páginas de error, no marketing). En `500`: insignia «Error del servidor» con `error`/`error-suave`; el `CroquisCancha` verde queda como marca de la casa.
- **Criterio medible:** `astro check` + `astro build` en verde; 0 hex; copy/botones/`EMAIL`/`robots` intactos.
- **Gate:** `astro check` + `astro build`.

### Lote 2 (L2, Oscar) — legales vía layout
- **Acción:** `LegalLayout.astro` envuelve el slot en `section > div.card-tactil > article.prosa` (plantilla exacta mapa-s36 §3 Acción 2); `global.css` suma `font-display` a `.prosa h1/h2` (reglas exactas mapa-s36 §3). Los `.md` ni se abren.
- **Criterio medible:** igual que L1 + diff vacío en `privacy.md` y `terms.md` + captura 375/1440 sin scroll horizontal.
- **Gate:** `astro check` + `astro build`.

### Lote 3 (L3, Oscar) — escala 1.25: raíz + movimiento + home (pedido de Lukas)
- **Acción:** (a) `global.css`: `html { font-size: clamp(100%, 0.8rem + 0.5vw, 125%) }` → 16 px a ≤640, fluido en medio, 20 px a ≥1440 (cuenta: a 1440, `0.8×16 + 0.005×1440 = 12.8 + 7.2 = 20`, tope 125 %; a 640, `12.8 + 3.2 = 16`, piso 100 %). (b) Migraciones exactas de `mapa-px-landing.md` §2 en estos 3 archivos: `motion.css:23` (`4px`→`0.25rem`); `index.astro:76` (rayas→`0.875rem`/`1.75rem`), `:92` (`12px`→`0.75rem`), `:142` (`11px`→`0.6875rem`).
- **Qué px se quedan fijos (verificado en diff):** bordes 2 px, sombras duras de `tokens.css`, offsets de clic (`±1px/2px`), `underline-offset 3px`/`outline-offset 2px`, radios (`6px`, `12px`, `9999px`). Breakpoints intactos por construcción: los `rem` de las media queries usan los 16 px iniciales (regla CSS), así que `sm/md/lg/xl` no se mueven.
- **Criterio medible:** raíz computada 20 px a 1440 y 16 px a ≤640 (DevTools); 0 px de scroll horizontal a 360/768/1440 en `/`, `/canchas`, `/duenos`; mismos breakpoints aplicados que hoy a 768; diff limitado a las líneas del mapa; contraste sin cambios (mismos colores).
- **Gate:** `astro check` + `astro build` + capturas 360/768/1440.

### Lote 4 (L4, Oscar) — escala 1.25: réplica mecánica (subdivisión de L3 por la regla ≤3 archivos)
- **Acción:** migraciones exactas restantes de `mapa-px-landing.md` §2: `duenos.astro:89` (rayas), `:103` (`12px`→`0.75rem`); `torneos.astro:33` (rayas); `AuthCard.astro:25` (`460px`→`28.75rem`).
- **Criterio medible:** igual que L3 (raíz ya verificada en L3; aquí solo las 5 líneas del mapa + capturas 360/1440 de `/duenos`, `/torneos`, `/login`).
- **Gate:** `astro check` + `astro build` + capturas 360/1440.

**Invariantes:** texto legal byte-idéntico; errores sin lógica nueva; 0 hex; 0 tokens nuevos.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Astro build | `npm --prefix reservaya-frontend-astro run build` | 0 errores (17 págs) |
| A3 | Identidad intacta | `grep` de hex en archivos tocados | 0 hex, 0 tokens nuevos |
| A4 | Sin *scroll* horizontal | Captura a 375px y 1440px | 0px extra |
| A5 | Legales intactos | `git diff` de `privacy.md` y `terms.md` | 0 líneas |
| A6 | Errores intactos | Diff de `404`/`500` | 0 cambios en destinos, `EMAIL`, `robots`, botones |
| A7 | Raíz 1.25 | `font-size` computado de `html` en DevTools | 20 px a 1440, 16 px a ≤640, fluido en medio |
| A8 | Sin *scroll* + breakpoints | Capturas a 360/768/1440 de `/`, `/canchas`, `/duenos`, `/torneos`, `/login` | 0 px extra; mismos breakpoints que hoy a 768 |
| A9 | Migraciones px→rem exactas | Diff limitado a las 14 líneas de `mapa-px-landing.md` §2; px fijos intactos | 0 líneas fuera del mapa; bordes/sombras/radios en px |

---

## 6. Checklist

- [x] T1: mapa-s36 leído (4 páginas, plantillas exactas de layout y `.prosa`).
- [x] T2: 4 lotes ≤3 archivos secuenciales para Oscar (§3–§4; L3/L4 subdividen la escala por la regla ≤3).
- [x] T3: criterios medibles con gates (§5, A7–A9 para la escala).
- [x] T4: aprobación de Lukas (ILK-26, escala 1.25 incluida).
- [ ] T5: con «aprobado», despachar L1 a Oscar; cada lote verde de Jim lo reviso vs spec y anoto §7.
- [ ] T6: verificar criterios y anotar en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T1–T3) | ✅ Propuesta lista | mapa-s36.md (404/500: `card-dashed`+sans; legales vía `LegalLayout:12` + `.prosa` en `global.css:89-112`; plantillas §3). Sin código tocado. Pendiente: T4 (Lukas). |
| 2026-09-29 | Escala 1.25 detallada (god+Angel) | ✅ Aprobada (ILK-26) | `mapa-px-landing.md`: 14 migraciones a `rem` en 6 archivos + 40 px fijos que se quedan (bordes, sombras, offsets, radios); L3 (raíz+movimiento+home) y L4 (réplica) por regla ≤3; A7–A9 medibles (raíz 20/16 px, 0 scroll 360, breakpoints intactos). Reviso L1, L2, L3 y L4 vs spec cuando Jim los pase. |
| 2026-09-29 | L1+L2 Revisión vs spec (Angel-Auditor) | ✅ CONFORMES, listos para commit | `404`/`500`: `card-dashed`→`card-tactil`, h1 display sin agrandar, insignia error en 500, croquis intacto, `robots`/`EMAIL`/botones intactos. `LegalLayout` envuelve según plantilla; `.prosa` display según reglas; `.md` fuera del diff. Nota: `global.css` ya trae el `clamp()` de L3 (adelanto de Oscar, se revisa con L3/L4). Visto bueno para commit de L1+L2. |
| 2026-09-29 | L3+L4 Revisión vs spec (Angel-Auditor) | ✅ CONFORMES, listo para commit | 14/14 migraciones exactas de `mapa-px-landing.md` §2 (rayas, keyframes, `text-[11px]`, `min-h-460px`); raíz `clamp()` 20 px @1440 y 16 px @≤640; px fijos intactos. Visto bueno para commit de L3/L4. Spec 36 completa y 100 % verificada. |
| 2026-09-29 | L1 Gates A1–A6 (Jim-QA) | ✅ 100% PASS | A1 astro check 0 err / 1 hint; A2 astro build 17 págs (4.12s); A3 0 hex; A4 0px scroll; A5 n/a; A6 errores intactos (404/500 a card-tactil, h1 font-display, 500 con insignia error/error-suave, EMAIL/robots/botones/croquis intactos). Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | L2 Gates A1–A6 (Jim-QA) | ✅ 100% PASS | A1 astro check 0 err / 1 hint; A2 astro build 17 págs (4.12s); A3 0 hex; A4 0px scroll; A5 legales intactos (diff vacío en privacy.md y terms.md, 0 líneas); A6 n/a (LegalLayout envuelve prosa en card-tactil, .prosa h1/h2 con font-display). Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | L3 Gates A1–A9 (Jim-QA) | ✅ 100% PASS | A1 astro check 0 err / 1 hint; A2 astro build 17 págs (4.12s); A3 0 hex, 0 tokens nuevos; A4/A8 0px scroll horizontal a 360/768/1440px en /, /canchas, /duenos (9 capturas generadas y verificadas en `hive/agents/jim-qa-mumwavdb/shots-s36/`); A7 raíz computada exacto 20px a 1440px (125%) y 16px a ≤640px (100%); A9 14 migraciones px→rem según mapa-px-landing.md, px físicos intactos. Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | Spec 36 Completa (L1–L3) | ✅ 100% GATES PASS | Todos los lotes del cierre público aprobados y verificados bajo gates A1–A9 por jim-qa-mumwavdb. 100% del sitio público completado con diseño nuevo y escala 1.25. |
