# Especificación: 37 - Escala inteligente del panel

> **Estado:** ✅ **Aprobada por Lukas (ILK-29):** «aplica el zoom de manera inteligente, no exactamente 1.25, sino que se vea más cerca y a la vez bien».
> **Origen:** Pedido de god (`req-20260929-angel-s37`). Aplica al panel Next (`reservaya-nextjs-api`).
> **Dirección god:** raíz fluida en `app/globals.css`, 100 % hasta ~1024 px y tope ~112.5 % en ≥1536 px; tablas/listas densas conservan densidad; cabeceras, tarjetas y formularios crecen.

---

## 1. Objetivo

**Problema:** el panel se ve lejos en pantallas grandes; un 1.25 plano rompería la densidad de las tablas de trabajo (reservas, caja, agenda).

**Resultado esperado:** el panel se acerca de forma inteligente: raíz fluida 100 %→112.5 % (16 px a 1024, ~17.6 px a 1440, 18 px a ≥1536); las zonas densas fijan 16 px y pierden ≤1 fila visible a 1280; cabeceras, tarjetas y formularios crecen con la raíz. Sin tocar lógica.

---

## 2. Fuera de alcance

- `lib/session.ts`, `lib/permissions.ts`, lógica, fetch, validaciones.
- Tintas deportivas nuevas o cambios de color (spec 35 los cerró).
- Landing Astro (spec 36).
- Backend, migraciones.

**Decisiones de producto que requieren aprobación:** ninguna (Lukas aprobó en ILK-29).

---

## 3. Archivos afectados (propuesta de lotes, ningún archivo tocado todavía)

Lotes ≤3 archivos, secuenciales, para Oscar. El inventario px→rem lo trae `mapa-px-panel.md` de Toby (en redacción al cerrar esta spec; L2 cita su sección al llegar).

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-nextjs-api/app/globals.css` | Modificar | Raíz `clamp()` + utilidad `.densidad-fija { font-size: 16px }` | L1 |
| Tablas densas (tope 3 archivos, según `mapa-px-panel.md`) | Modificar | Aplicar `.densidad-fija` a contenedores de tablas/listas densas | L2 |

---

## 4. Diseño y lógica (dirección propuesta)

### Lote 1 (L1, Oscar) — mecanismo
- **Acción:** en `globals.css` (capa base): `html { font-size: clamp(100%, 0.75rem + 0.3906vw, 112.5%) }` + utilidad `.densidad-fija` que congela la escala dentro de su subárbol: como `text-sm`, `p-4`, `gap-2` de Tailwind v4 son `rem` (leen `var(--spacing)` y `var(--text-*)`, no el `font-size` del contenedor), fijar `font-size` no basta. Definición: `.densidad-fija { --spacing: 4px; --text-xs: 12px; --text-sm: 14px; --text-base: 16px; --text-lg: 18px; font-size: 16px; }`. Ojo: los tokens del proyecto en `@theme inline` sí se incrustan en cada utilidad; si alguna tabla densa usa uno de ellos en `rem`, se anota en el lote y se fija su valor allí.
- **Criterio medible:** raíz computada 16 px @1024, ~17.6 px @1440, 18 px @≥1536; a 1536 px, un `<td>` con `text-sm` dentro de `.densidad-fija` computa 14 px con la raíz en 18 px; `typecheck`/`lint`/`test`/`build` en verde.
- **Gate:** gates del panel.

### Lote 2 (L2, Oscar) — densidad preservada
- **Acción:** aplicar `.densidad-fija` a los contenedores de tablas/listas densas que indique `mapa-px-panel.md` (tope 3 archivos; candidatas: reservas, caja, agenda). Cabeceras, tarjetas y formularios crecen con la raíz sin tocarlos.
- **Criterio medible:** a 1280, filas visibles por tabla densa difieren ≤1 vs baseline (con `.densidad-fija` verificada por A7b); 0 scroll horizontal a 360 y 1280; diff sin lógica.
- **Gate:** gates del panel + capturas 360/1280/1440.

**Invariantes:** 0 lógica; 0 colores nuevos; `.densidad-fija` solo en zonas densas (el resto escala).

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests panel | `npm --prefix reservaya-nextjs-api test` | todos en verde |
| A4 | Build panel | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Raíz fluida | `font-size` computado de `html` | 16 @1024, ~17.6 @1440, 18 @≥1536 |
| A6 | Sin *scroll* horizontal | Capturas a 360 y 1280 | 0 px extra |
| A7 | Densidad | Filas visibles por tabla densa a 1280 vs baseline | difieren ≤1 |
| A7b | `.densidad-fija` congela | `<td>` con `text-sm` dentro de `.densidad-fija` a 1536 px | computa 14 px con raíz en 18 px |
| A8 | Lógica intacta | Diff por lote | 0 líneas de lógica/fetch tocadas |
| A9 | Inventario px | `mapa-px-panel.md` (pendiente Toby) vs diff | 0 px fuera de lista |

---

## 6. Checklist

- [ ] T1: inventario px→rem (`mapa-px-panel.md` de Toby en redacción; parcial: `clamp()` verificado por cuenta).
- [x] T2: lotes ≤3 archivos secuenciales para Oscar (§3–§4).
- [x] T3: criterios medibles con gates (§5).
- [x] T4: aprobada por Lukas (ILK-29).
- [ ] T5: con mapa listo, completar L2 y despachar L1; cada lote verde de Jim lo reviso vs spec y anoto §7.
- [ ] T6: verificar criterios y anotar en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T2–T4) | ✅ Lista y aprobada | Cita ILK-29; `clamp(100%, 0.75rem + 0.3906vw, 112.5%)` verificado por cuenta (16 @1024, 18 @1536); densidad ≤1 fila; `mapa-px-panel.md` pendiente para T1/L2. Sin código tocado. |
| 2026-09-29 | Fix `.densidad-fija` (god) | ✅ Spec actualizada | `font-size` solo no frena el zoom (utilidades v4 son `rem` de `:root`): `.densidad-fija` fija `--spacing` y `--text-*`; caveat `@theme inline` anotado para el lote; A7b medible (`td` 14 px @1536 con raíz 18 px). |
