# Especificación: 29 — Auditoría de diseño y elevación frontend (impeccable + design-taste-frontend)

> **Estado:** ✅ Cerrada para ejecución — lotes reorganizados a ≤3 archivos cada uno (orden: admin táctil → a11y del panel → Astro) por `dev-claude` (`task-20260928-dev-plan-frontend`), lista para que Oscar-code la retome.
> **Origen:** Directiva de god/Lukas (2026-09-28) mediante `task-20260928-skills-auditor`. Auditoría técnica y estética rigurosa combinando el marco diagnóstico de `impeccable` (A11y, Performance, Theming, Responsive, Implementation Integrity) y la disciplina anti-slop de `design-taste-frontend` sobre el monorepo ReservaYa.

---

## 1. Objetivo

### Design Read (Lectura de Diseño — design-taste-frontend §0)
> **"Reading this as: Plataforma deportiva de gestión y reserva de canchas («Tablero de cancha»), con un lenguaje neo-brutalista táctil y sobrio (inspirado en Universo Agustino), apoyado en tipografías Barlow + Barlow Condensed, bordes definidos de 2px en tono tinta/basalto (`#1f2a24`), sombras duras mecánicas (sin desenfoque: `[2px_2px_0_0_#1f2a24]`, `[4px_4px_0_0_#1f2a24]`), feedback físico en botones (`active:translate(2px, 2px)`) y paleta de contrastes nítidos basada en césped, sillar y basalto."**

### Diales de Diseño (The Three Dials)
- **`DESIGN_VARIANCE: 6`** — Estructura sobria de tablero operativo deportivo; balance asimétrico controlado pero con orden táctil estricto.
- **`MOTION_INTENSITY: 3`** — Micro-interacciones mecánicas de pulsación física (`btn-press`), sin transiciones cinemáticas ni desenfoques decorativos innecesarios.
- **`VISUAL_DENSITY: 5`** — Alta legibilidad y escaneo rápido para jugadores y dueños de complejos; densidad equilibrada entre fichas deportivas y tablas de agenda.

### Problema (Hallazgos del Diagnóstico Impeccable)
1. **Deuda técnica de theming en el módulo B2B/Admin (~160 valores hex huérfanos):**
   - En `components/b2b/` (`AbonosPanel.tsx`, `CajaPanel.tsx`, `ConfigPanel.tsx`, `GestionCanchasPanel.tsx`, `CronogramaView.tsx`), persisten más de 160 declaraciones directas de colores hexadecimales (`#E7E5E4`, `#0F172A`, `#94A3B8`, `#22C55E`, `#FFF7ED`, `#BFDBFE`, `#EFF6FF`). Esto fragmenta la identidad de marca entre el área pública/jugador (100% tokenizada) y el área de administración.
2. **Sombras difusas de IA y micro-interacciones no táctiles (Anti-Slop violation):**
   - En paneles B2B y en `app/(dashboard)/loading.tsx`, se siguen usando sombras difusas estándar (`shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xl`) en lugar de las sombras duras sin blur del sistema (`shadow-[4px_4px_0_0_#1f2a24]`).
   - Botones en B2B utilizan `active:scale-[0.98]` en lugar del desplazamiento mecánico `active:translate(2px, 2px)` de Universo Agustino (`.btn-press` / `.btn-tactil`).
3. **Bordes y radios inconsistentes:**
   - Componentes B2B usan bordes delgados de 1px (`border border-[#E7E5E4]`) en vez del borde de 2px tinta/basalto (`border-2 border-basalto`), perdiendo el peso físico del sistema.
4. **Accesibilidad (A11y) y estados de foco:**
   - Diálogos y modales en Astro (`canchas.astro`, `completar-cuadro.astro`) y Next.js (`Modal.tsx`) requieren asegurar atrapamiento de foco accesible, cierre con tecla Escape y atributos `aria-labelledby` rigurosos.
   - Indicadores de foco en botones oscuros y celdas del cronograma deben garantizar contraste mínimo WCAG AA (>= 4.5:1) con `focus-visible:ring-2 focus-visible:ring-basalto focus-visible:ring-offset-2`.
5. **Touch Targets en dispositivos móviles (Responsive Design):**
   - Controles de filtrado de horas y botones de navegación de días en el cronograma deben cumplir con el área mínima táctil de 44x44px.

### Resultado esperado
- Erradicación total de los ~160 colores hex huérfanos en `components/b2b/`, sustituyéndolos por tokens semánticos nativos de `globals.css` y `tokens.css`.
- Unificación total de sombras duras táctiles (`0 blur`) y click mecánico en todo el admin y loading states.
- Cero regresiones en lógica de negocio, contratos de API ni TypeScript/Lint gates.
- Puntuación de salud Impeccable elevada a rango **Excelente (18+/20)**.

---

## 2. Fuera de alcance

- Modificar la lógica de negocio de C# backend, esquemas OpenAPI o Prisma.
- Cambiar los contratos de datos entre Astro y Next.js.
- Alterar los flujos de autenticación o endpoints existentes.
- Añadir nuevas librerías CSS o dependencias npm.
- Modificar las pantallas del jugador o landing que ya fueron verificadas y aprobadas en Spec 27.

---

## 3. Archivos afectados

Lotes de **≤3 archivos** cada uno, en el orden fijado por god: admin táctil primero (`CronogramaView.tsx` con prioridad y lote propio por su tamaño), luego a11y del panel Next.js, Astro al final.

| Archivo | Acción | Propósito en Spec 29 | Lote |
|---|---|---|---|
| `reservaya-nextjs-api/components/b2b/CronogramaView.tsx` | Modificar | Prioridad máxima: reemplazar hex huérfanos y sombras/botones difusos por el sistema táctil; ~1236 líneas, lote propio. | L1 |
| `reservaya-nextjs-api/components/b2b/AbonosPanel.tsx` | Modificar | Reemplazar hex huérfanos por tokens, aplicar `card-tactil`, bordes 2px y sombras duras. | L2 |
| `reservaya-nextjs-api/components/b2b/CajaPanel.tsx` | Modificar | Tokenizar métricas y modales de caja, sustituir `shadow-xl` por sombra dura. | L2 |
| `reservaya-nextjs-api/components/b2b/ConfigPanel.tsx` | Modificar | Adaptar formularios de configuración al sistema táctil (borde 2px, inputs y botones). | L2 |
| `reservaya-nextjs-api/components/b2b/GestionCanchasPanel.tsx` | Modificar | Tokenizar tarjetas de canchas y estado de complejos, retirar hex directos. | L3 |
| `reservaya-nextjs-api/app/(dashboard)/loading.tsx` | Modificar | Sustituir `shadow-sm` y `bg-white` por `card-tactil` / tokens semánticos en skeletons. | L3 |
| `reservaya-nextjs-api/components/ui/Modal.tsx` | Modificar | Asegurar trampa de foco A11y, tecla Escape y contraste táctil de botones. | L4 |
| `reservaya-nextjs-api/components/ui/Button.tsx` | Modificar | Asegurar touch-target >= 44px en móviles y feedback mecánico uniforme. | L4 |
| `reservaya-frontend-astro/src/components/Header.astro` | Modificar | Asegurar estados de foco visibles y contraste en navegación táctil. | L5 |
| `reservaya-frontend-astro/src/pages/canchas.astro` | Modificar | Pulir diálogos modales para soporte accesible completo (Escape, foco, aria). | L5 |

---

## 4. Diseño y lógica

Cada lote cita la **sección exacta** de la skill a leer (nunca `reference/` completo) — global en `~/.claude/skills/<skill>/SKILL.md`.

### Lote 1 (L1) — `CronogramaView.tsx` (prioridad, admin táctil)
- **Skill:** `design-taste-frontend` §4.2 *Color Calibration* (reemplazo semántico de hex) + §4.4 *Materiality, Shadows, Cards* (sombras duras, `card-tactil`).
- **Acción:** reemplazo semántico de colores (`#0F172A`/`#060C08`→`text-basalto`; `#475569`/`#64748B`/`#94A3B8`→`text-pizarra`; `#E7E5E4`/`#D6D3D1`→`border-cal`/`border-2 border-basalto`; `#22C55E`/`#16A34A`/`#15803D`→`bg-cesped`/`hover:bg-cesped-hover`/`text-cesped-hondo`; `#DCFCE7`→`bg-cesped-suave`; `#BFDBFE`/`#EFF6FF`/`#2563EB`→`bg-cielo-suave`/`border-cielo`/`text-cielo-hondo`; `#FFF7ED`/`#EA580C`→`bg-alerta-suave`/`text-alerta-hondo`; `#FEF9C3`→`bg-sol-suave`); tooltips/popovers/modales a sombra dura sin blur; botones a `.btn-tactil`.
- **Criterio medible:** `grep -E "#[0-9a-fA-F]{3,6}" CronogramaView.tsx` → 0 (salvo `#1f2a24` de sombra fija); `grep -E "shadow-(sm|md|lg|xl|2xl)"` → 0.
- **Gate:** typecheck + lint + build Next.js.

### Lote 2 (L2) — `AbonosPanel.tsx`, `CajaPanel.tsx`, `ConfigPanel.tsx` (admin táctil)
- **Skill:** `design-taste-frontend` §4.2 *Color Calibration* + §4.5 *Interactive UI States* (botones/inputs con feedback mecánico).
- **Acción:** mismo reemplazo semántico que L1; tarjetas de resumen a `.card-tactil` (`border-2 border-basalto bg-tiza shadow-[4px_4px_0_0_#1f2a24]`); `active:scale-[0.98]` → `.btn-tactil`/`active:translate(2px,2px)`.
- **Criterio medible:** igual que L1, por archivo.
- **Gate:** typecheck + lint + build Next.js.

### Lote 3 (L3) — `GestionCanchasPanel.tsx`, `app/(dashboard)/loading.tsx` (admin táctil, cierre)
- **Skill:** `design-taste-frontend` §4.4 *Materiality, Shadows, Cards*.
- **Acción:** tokenizar tarjetas de canchas/estado de complejos; skeletons de `loading.tsx` de `shadow-sm`/`bg-white` a `card-tactil`/tokens.
- **Criterio medible:** igual que L1/L2.
- **Gate:** typecheck + lint + build Next.js.

### Lote 4 (L4) — `Modal.tsx`, `Button.tsx` (a11y del panel Next.js)
- **Skill:** `impeccable` §Modes → *Operate* (el panel es una superficie de tarea, prioriza escaneo/consistencia sobre expresión) + `design-taste-frontend` §4.5 *Interactive UI States*.
- **Acción:** trampa de foco y `Escape` en `Modal.tsx`; `min-h-[44px]`/`min-w-[44px]` y `focus-visible:ring-2 focus-visible:ring-basalto focus-visible:ring-offset-2` en `Button.tsx` y controles de `CronogramaView` (día/semana/mes, flechas de fecha).
- **Criterio medible:** inspección de devtools a 375px (touch targets ≥44×44) + verificación de foco/Escape; gate final de accesibilidad vía `/web-interface-guidelines` (lo corre JIM-QA).
- **Gate:** typecheck + lint + test + build Next.js + `/web-interface-guidelines`.

### Lote 5 (L5) — `Header.astro`, `canchas.astro` (Astro, al final)
- **Skill:** `impeccable` §Modes → *Persuade* (landing pública) + `design-taste-frontend` §4.4 *Materiality, Shadows, Cards*.
- **Acción:** foco visible y contraste en navegación de `Header.astro`; diálogos `<dialog>` de `canchas.astro` con `Escape`, foco inicial y `aria-labelledby`.
- **Criterio medible:** `astro check` 0 errores; inspección de foco/Escape en diálogos.
- **Gate:** `astro check` + `astro build` + `/web-interface-guidelines`.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos Next.js | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint Next.js | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests Next.js | `npm --prefix reservaya-nextjs-api run test` | 40/40 pasando |
| A4 | Build Next.js | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Astro check | `npm --prefix reservaya-frontend-astro run astro -- check` | 0 errores |
| A6 | Build Astro | `npm --prefix reservaya-frontend-astro run build` | 0 errores |
| A7 | 0 Hex huérfanos en B2B | `grep -E "#[0-9a-fA-F]{3,6}" components/b2b/*.tsx` | 0 coincidencias (excepto comentarios justificativos o sombras fijas `#1f2a24`) |
| A8 | 0 Sombras difusas | `grep -E "shadow-(sm|md|lg|xl|2xl)" components/b2b/*.tsx` | 0 coincidencias |
| A9 | Touch targets mínimos | Inspección visual / devtools en móviles 375px | >= 44x44px en controles principales |
| A10 | Contraste de texto AA | Verificación de ratios sobre sillar/tiza | >= 4.5:1 (texto normal) y >= 3:1 (texto grande) |

---

## 6. Checklist de implementación (para Oscar-code)

- [ ] **L1: `CronogramaView.tsx`** (prioridad) — hex→tokens, sombras duras, botones táctiles. Gates A1–A4, A7, A8.
- [ ] **L2: `AbonosPanel.tsx`, `CajaPanel.tsx`, `ConfigPanel.tsx`** — mismo reemplazo + `.card-tactil`. Gates A1–A4, A7, A8.
- [ ] **L3: `GestionCanchasPanel.tsx`, `loading.tsx`** — cierre de tokenización admin. Gates A1–A4, A7, A8.
- [ ] **L4: `Modal.tsx`, `Button.tsx`** — trampa de foco, Escape, touch targets 44px. Gates A1–A4, A9, A10, `/web-interface-guidelines`.
- [ ] **L5: `Header.astro`, `canchas.astro`** — foco/contraste nav, diálogos accesibles. Gates A5, A6, `/web-interface-guidelines`.
- [ ] **L6: Verificación integral y auditoría de salud final (JIM-QA)** — 10 criterios + matriz Impeccable (objetivo ≥18/20).

---

## 7. Registro de verificación y evaluación Impeccable

### Evaluación Diagnóstica Inicial (Línea Base Spec 29)

| # | Dimensión Impeccable | Puntuación (0–4) | Hallazgo Clave |
|---|---|---|---|
| 1 | **Accessibility (A11y)** | 3 / 4 | Buena semántica y landmarks; falta pulir trampa de foco y Escape en modales Astro. |
| 2 | **Performance** | 3.5 / 4 | Optimizado en Spec 28 (SSR deduplicado y concurrente); skeletons listos. |
| 3 | **Theming & Tokens** | 2 / 4 | Área pública/jugador 100% limpia, pero B2B acumula ~160 hex huérfanos y sombras difusas. |
| 4 | **Responsive Design** | 3.5 / 4 | Cero scroll horizontal a 375px; controles de calendario requieren asegurar touch-target >= 44px. |
| 5 | **Implementation Integrity** | 3 / 4 | Lenguaje «Tablero de cancha» consolidado en jugador; pendiente unificar en paneles admin. |
| **Total** | | **15 / 20** | **Buena (Aceptable alta — deuda concentrada en B2B)** |

### Verificación Posterior (Post-implementación del Trío)

| Fecha | Lote / Criterio | Resultado | Evidencia |
|---|---|---|---|
| _Pendiente_ | L1 `CronogramaView.tsx` (A1–A4, A7, A8) | | |
| _Pendiente_ | L2 `AbonosPanel`/`CajaPanel`/`ConfigPanel` (A1–A4, A7, A8) | | |
| _Pendiente_ | L3 `GestionCanchasPanel`/`loading.tsx` (A1–A4, A7, A8) | | |
| _Pendiente_ | L4 `Modal`/`Button` a11y (A1–A4, A9, A10) | | |
| _Pendiente_ | L5 `Header.astro`/`canchas.astro` (A5, A6) | | |
| _Pendiente_ | Score Impeccable Final | | Objetivo: >= 18 / 20 (Excelente) |
