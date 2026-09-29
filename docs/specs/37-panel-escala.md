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

## 3. Archivos afectados (13 lotes, ningún archivo tocado todavía)

Lotes ≤3 archivos, agrupados por carpeta, en orden mecanismo → densidad → jugador → compartidos → B2B → técnico. Base: `mapa-px-panel.md` (151 migran, 104 fijos). Criterio god: migran 82 textos + 19 espaciados fuera de zonas densas; anchos/altos solo de cabeceras/tarjetas/formularios; `min-w` de tablas quedan px dentro de `.densidad-fija`; `HORA_PX=52` es lógica JS y no se toca.

| Lote | Archivos (tope 3) | Ocurrencias | Orden |
|---|---|---|---|
| L1 | `app/globals.css` | mecanismo (clamp + `.densidad-fija`) | mecanismo |
| L2 | `components/b2b/CronogramaView.tsx`, `CajaPanel.tsx`, `AbonosPanel.tsx` | wrap 3 vistas; migran cabeceras (~5); `HORA_PX`/`h-580`/`min-w` intactos | densidad |
| L3 | `dashboard/carne/page.tsx`, `dashboard/perfil/page.tsx`, `features/CanchaCard.tsx` | ~8 (anchos tarjeta + textos) | jugador |
| L4 | `dashboard/reservas/page.tsx`, `features/CalificarBtn.tsx`, `ui/Input.tsx` | wrap tabla + 2 textos | jugador/compartido |
| L5 | `ui/Button.tsx`, `ui/Modal.tsx`, `layout/Sidebar.tsx` | ~12 (44/48 controles, 260/88 shell) | compartidos |
| L6 | `admin/page.tsx`, `admin/novedades/NovedadesView.tsx`, `b2b/ConfigPanel.tsx` | ~17 (textos + col 240) | B2B |
| L7 | `features/GestionCanchasPanel.tsx`, `b2b/ComplejosDashboard.tsx`, `b2b/ComplejosGrid.tsx` | ~11 (textos + tarjeta 280/220) | B2B |
| L8 | `b2b/DescuentosPanel.tsx`, `b2b/EquipoPanel.tsx`, `b2b/MetasPanel.tsx` | 15 (textos + tarjeta 380) | B2B |
| L9 | `b2b/PreciosEspecialesPanel.tsx`, `b2b/ReportesPanel.tsx`, `b2b/ResenasPanel.tsx` | ~22 (textos + gap) | B2B |
| L10 | `b2b/ReservasPanel.tsx`, `b2b/TorneosPanel.tsx`, `b2b/ValidarCodigo.tsx` | 10 (textos) | B2B |
| L11 | `b2b/OnboardingChecklist.tsx`, `b2b/DashboardWidgets.tsx` | 4 (textos) | B2B |
| L12 | `features/ClientesPanel.tsx`, `features/SuscripcionesPanel.tsx` | `min-w` 760 quedan px + wrap | B2B tablas |
| L13 | `tecnico/centros/page.tsx`, `tecnico/usuarios/page.tsx` | `min-w` 720/820 quedan px, sin wrap | técnico |

---

## 4. Diseño y lógica (dirección propuesta)

### Lote 1 (L1, Oscar) — mecanismo
- **Acción:** en `globals.css` (capa base): `html { font-size: clamp(100%, 0.75rem + 0.3906vw, 112.5%) }` + utilidad `.densidad-fija` que congela la escala dentro de su subárbol: como `text-sm`, `p-4`, `gap-2` de Tailwind v4 son `rem` (leen `var(--spacing)` y `var(--text-*)`, no el `font-size` del contenedor), fijar `font-size` no basta. Definición: `.densidad-fija { --spacing: 4px; --text-xs: 12px; --text-sm: 14px; --text-base: 16px; --text-lg: 18px; font-size: 16px; }`. Ojo: los tokens del proyecto en `@theme inline` sí se incrustan en cada utilidad; si alguna tabla densa usa uno de ellos en `rem`, se anota en el lote y se fija su valor allí.
- **Criterio medible:** raíz computada 16 px @1024, ~17.6 px @1440, 18 px @≥1536; a 1536 px, un `<td>` con `text-sm` dentro de `.densidad-fija` computa 14 px con la raíz en 18 px; `typecheck`/`lint`/`test`/`build` en verde.
- **Gate:** gates del panel.

### Lote 2 (L2, Oscar) — densidad B2B: Cronograma + Caja + Abonos
- **Acción:** envolver cada vista en `.densidad-fija`; migrar solo textos de cabecera fuera de tablas (Caja ~4, Abonos 1). Intactos: `HORA_PX=52` (lógica JS, override de god sobre la recomendación del mapa), `h-[580px]`, `min-w-[560px]` de tablas, paddings de fila.
- **Criterio medible:** horas visibles del cronograma y filas de Caja/Abonos idénticas a baseline a 1280; gates del panel en verde.

### Lotes L3–L13 (Oscar) — réplica por carpeta según tabla §3
- **Acción:** migrar textos/espaciados a `rem` y anchos de cabeceras/tarjetas/formularios según `mapa-px-panel.md`; `min-w` de tablas quedan px + wrap `.densidad-fija` (L4 reservas, L12); técnico L13 sin wrap. Override registrado: el mapa §5 pedía parametrizar `HORA_PX`; god lo prohíbe por ser lógica de posicionado.
- **Criterio medible:** por lote: gates del panel + conteo de ocurrencias migradas igual al de §3 + 0 scroll horizontal a 360/1280 en las vistas tocadas.

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
| A9 | Inventario px | `mapa-px-panel.md` vs diff por lote | 0 px fuera de lista; conteo por lote igual a §3 |

---

## 6. Checklist

- [x] T1: inventario px→rem (`mapa-px-panel.md`: 151 migran, 104 fijos; tablas densas identificadas).
- [x] T2: 13 lotes ≤3 archivos por carpeta, orden mecanismo→técnico (§3).
- [x] T3: criterios medibles con gates (§5).
- [x] T4: aprobada por Lukas (ILK-29).
- [ ] T5: revisar por tandas verdes de Jim (A=L1–L2, B=L3–L6, C=L7–L10, D=L11–L13): una fila en §7 + inform a god por tanda, ≤8 llamadas por tanda; entre tandas no hacer nada.
- [ ] T6: verificar criterios y anotar en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T2–T4) | ✅ Lista y aprobada | Cita ILK-29; `clamp(100%, 0.75rem + 0.3906vw, 112.5%)` verificado por cuenta (16 @1024, 18 @1536); densidad ≤1 fila; `mapa-px-panel.md` pendiente para T1/L2. Sin código tocado. |
| 2026-09-29 | Fix `.densidad-fija` (god) | ✅ Spec actualizada | `font-size` solo no frena el zoom (utilidades v4 son `rem` de `:root`): `.densidad-fija` fija `--spacing` y `--text-*`; caveat `@theme inline` anotado para el lote; A7b medible (`td` 14 px @1536 con raíz 18 px). |
| 2026-09-29 | Tanda A Revisión vs spec (Angel-Auditor) | ✅ CONFORME | L1 verificada (clamp + `.densidad-fija` exactos) + L2: 8/8 líneas solo clases (3 wraps + 5 textos cabecera a `rem`); `HORA_PX`/`h-580`/`min-w` intactos; 0 lógica. |
| 2026-09-29 | Criterio de lotes (god + mapa) | ✅ 13 lotes numerados | 82 textos + 19 espaciados fuera de densas; anchos solo cabeceras/tarjetas/forms; `min-w` tablas en px + wrap; `HORA_PX` intacto (override god); orden mecanismo→técnico con conteos §3. god despacha a Oscar. |
| 2026-09-29 | L1 Gates A1–A5/A7b/A8/A9 (Jim-QA) | ✅ 100% PASS | A1 typecheck 0 err; A2 lint 0 err / 2 warn conocidos; A3 test 40/40 PASS; A4 next build 0 err; A5 raíz clamp(100%, 0.75rem + 0.3906vw, 112.5%) = 16px @1024, ~17.6px @1440, 18px @≥1536; A7b .densidad-fija fija --spacing y --text-* (td con text-sm computa 14px con raíz 18px a 1536px); A8 0 lógica tocada; A9 mecanismo L1 en globals.css según spec. Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | L2 Gates A1–A4/A7/A8/A9 (Jim-QA) | ✅ 100% PASS | A1 typecheck 0 err; A2 lint 0 err / 2 warn conocidos; A3 test 40/40 PASS; A4 next build 0 err; A7 .densidad-fija envuelve CronogramaView, CajaPanel y AbonosPanel (densidad intacta, 0 dif de filas visibles a 1280); A8 HORA_PX=52, h-580, min-w-560 y lógica 100% intactos; A9 5 textos de cabecera migrados px→rem (Caja 4, Abonos 1). Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | Tanda A Completa (L1–L2) | ✅ 100% GATES PASS | Mecanismo de escala fluida (.densidad-fija) y primeras 3 vistas densas B2B verificadas en verde. Notificado a god y angel-auditor. |


