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
| `reservaya-frontend-astro/src/styles/global.css` | Modificar | `.prosa h1/h2` a `font-display` (reglas mapa-s36 §3) | L2 |

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

### Lote 3 (L3, Oscar) — escala 1.25 del sitio público (pedido de Lukas)
- **Acción:** efecto «zoom 125 %» sin `zoom` CSS: la raíz escala de forma fluida y todo lo que está en `rem` (texto, espaciado, contenedores de Tailwind v4) crece con ella. Dirección: `html { font-size: clamp(100%, 0.8rem + 0.5vw, 125%) }` en `src/styles/global.css` (100 % a ≤640 px, 125 % a ≥1440 px). Los tamaños fijos en `px` que no escalan (`text-[NNpx]`, `max-w-[NNNpx]`, alturas fijas) se pasan a `rem` según el mapa de Toby `mapa-px-landing.md`. Angel detalla criterios aquí.
- **Criterio medible:** a 1440 px la raíz mide 20 px y las secciones crecen ×1.25; a 360 px sin scroll horizontal y gutter de 16 px; breakpoints intactos (media queries en rem usan 16 px); 0 hex; contraste sin cambios.
- **Gate:** `astro check` + `astro build` + capturas 360/768/1440.

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

---

## 6. Checklist

- [x] T1: mapa-s36 leído (4 páginas, plantillas exactas de layout y `.prosa`).
- [x] T2: 2 lotes ≤3 archivos secuenciales para Oscar (§3–§4).
- [x] T3: criterios medibles con gates (§5).
- [ ] T4: aprobación de Lukas antes de cualquier lote.
- [ ] T5: con «aprobado», despachar L1 a Oscar; cada lote verde de Jim lo reviso vs spec y anoto §7.
- [ ] T6: verificar criterios y anotar en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T1–T3) | ✅ Propuesta lista | mapa-s36.md (404/500: `card-dashed`+sans; legales vía `LegalLayout:12` + `.prosa` en `global.css:89-112`; plantillas §3). Sin código tocado. Pendiente: T4 (Lukas). |
