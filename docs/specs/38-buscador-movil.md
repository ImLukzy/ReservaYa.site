# Especificación: 38 - Buscador de la home en 1 columna en celular

> **Estado:** ✅ **Aprobada por Lukas (ILK-33, «sí»).**
> **Origen:** QA de god con Playwright: a 360 px el buscador del hero va en 2 columnas y trunca selects («Todo Arequ…», «Todo deport…») y parte «Buscar canchas». El mismo defecto está en los filtros de `canchas.astro:51` (`grid-cols-2` sin `sm:`).

---

## 1. Objetivo

**Problema:** `index.astro:63` y `canchas.astro:51` usan `grid-cols-2` desde 0 px: a 360/390 px las celdas son angostas y los selects truncan su texto (pedido ILK-33).

**Resultado esperado:** a 360 y 390 px ambos formularios van en 1 columna (sin texto truncado, botón en 1 línea, 0 scroll horizontal); desde `sm` vuelven a 2 columnas; lógica y destinos intactos.

---

## 2. Fuera de alcance

- Lógica, destinos (`action="/canchas"`), opciones, validaciones.
- Cambiar copy, botones o estilos fuera del grid.
- Backend, panel, migraciones.

**Decisiones de producto que requieren aprobación:** ninguna (Lukas aprobó en ILK-33).

---

## 3. Archivos afectados (1 lote)

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-frontend-astro/src/pages/index.astro` | Modificar | `:63` `grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-1` | L1 |
| `reservaya-frontend-astro/src/pages/canchas.astro` | Modificar | `:51` `grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[...]` (misma receta) | L1 |

---

## 4. Diseño y lógica

### Lote 1 (L1, Oscar) — 1 columna en celular
- **Acción:** en ambos formularios, la rejilla pasa a 1 columna por defecto y 2 desde `sm`; el `lg:` queda igual. El botón ya se estira en su celda; el campo `f-q` (`canchas.astro:52`) pasa de `col-span-2` a `sm:col-span-2` (en grilla de 1 columna el `col-span-2` crea pista implícita; hallazgo QA god).
- **Criterio medible:** a 360 y 390 px ningún select con texto truncado ni botón en 2 líneas; 0 scroll horizontal; `astro check` + `astro build` en verde.
- **Gate:** `astro check` + `astro build` + capturas 360/390.

**Invariantes:** 0 lógica; 0 hex; 0 cambios fuera de las dos clases de grid.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Astro build | `npm --prefix reservaya-frontend-astro run build` | 0 errores (17 págs) |
| A3 | Sin truncado | Capturas a 360 y 390 px de `/` y `/canchas` | 0 selects truncados, botón en 1 línea |
| A4 | Sin *scroll* horizontal | Capturas a 360 y 390 px | 0 px extra |
| A5 | Lógica intacta | Diff | 0 líneas fuera de las 2 clases de grid |

---

## 6. Checklist

- [x] T1: defecto verificado en código (`index.astro:63`, `canchas.astro:51`, QA Playwright de god).
- [x] T2: 1 lote de 2 archivos para Oscar (§3–§4).
- [x] T3: criterios medibles con gates (§5).
- [x] T4: aprobada por Lukas (ILK-33).
- [ ] T5: con verde de Jim, reviso vs spec y anoto §7.
- [ ] T6: verificar criterios y anotar en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T1–T4) | ✅ Lista y aprobada | QA god (Playwright, 360 px); `grid-cols-2` en `index.astro:63` y `canchas.astro:51` verificado en código. Sin código tocado. |
| 2026-09-29 | L1 Revisión+QA vs spec (Angel-Auditor) | ✅ CONFORME | Grids a `grid-cols-1 sm:grid-cols-2` (+`sm:col-span-2` en `f-q`) en ambos formularios; Playwright god OK (360/390 1 col, 768 2 col, 1440 5 col); `astro build` 17 págs verde (verificado por mí); `astro check` no disponible en este entorno (pide instalar `@astrojs/check`, sin aprobación para instalar). Visto bueno para commit de L1. |
| 2026-09-29 | Gates + QA Playwright (god) | ✅ PASS | astro check 0 err / 0 warn; build 17 páginas. Viewport real: `/` y `/canchas` a 360 y 390 → 1 columna, 0 overflow, campos ≥288 px en /canchas; 768 → 2 columnas; 1440 → home 1, /canchas 5. |
