# Especificación: 29 — Auditoría de diseño y elevación frontend (impeccable + design-taste-frontend)

> **Estado:** ✅ Cerrada para ejecución — lotes reorganizados a ≤3 archivos cada uno (orden: admin táctil → a11y del panel → Astro) por `dev-claude` (`task-20260928-dev-plan-frontend`), lista para que Oscar-code la retome. **Extensión 2026-09-29:** lotes L7–L12 cubren el resto de `components/b2b/` (590 hex en 14 archivos, medido por jim-qa-b tras L1–L5; línea base 838 → 590 → objetivo 0).
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

Lotes de **≤3 archivos** cada uno, en el orden fijado por god: admin táctil primero (`CronogramaView.tsx` con prioridad y lote propio por su tamaño), luego a11y del panel Next.js, Astro al final. Extensión L7–L12 (2026-09-29, auditor-b por `task-20260929-s29-lotes-extra`): mismo sistema táctil sobre el resto de `components/b2b/` — 590 hex6 medidos por archivo (0 en archivos L1–L5), misma skill y gates que L1–L3.

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
| `reservaya-nextjs-api/components/b2b/TorneosPanel.tsx` | Modificar | Lote propio (536 líneas, 112 hex, 6 sombras difusas): tokenizar brackets/fixture y controles de torneo. | L7 |
| `reservaya-nextjs-api/components/b2b/ReservasPanel.tsx` | Modificar | Tokenizar tabla de reservas y filtros (67 hex, 3 sombras difusas). | L8 |
| `reservaya-nextjs-api/components/b2b/ResenasPanel.tsx` | Modificar | Tokenizar tarjetas de reseñas y ratings (57 hex, 2 sombras difusas). | L8 |
| `reservaya-nextjs-api/components/b2b/ReportesPanel.tsx` | Modificar | Tokenizar métricas y gráficas de reportes (52 hex). | L8 |
| `reservaya-nextjs-api/components/b2b/EquipoPanel.tsx` | Modificar | Tokenizar gestión de equipo/roles (66 hex, 3 sombras difusas). | L9 |
| `reservaya-nextjs-api/components/b2b/MetasPanel.tsx` | Modificar | Tokenizar barras de progreso y metas (56 hex, 2 sombras difusas). | L9 |
| `reservaya-nextjs-api/components/b2b/ComplejosGrid.tsx` | Modificar | Tokenizar grid de tarjetas de complejos (659 líneas, 54 hex). | L9 |
| `reservaya-nextjs-api/components/b2b/DescuentosPanel.tsx` | Modificar | Tokenizar reglas de descuento (44 hex, 1 sombra difusa). | L10 |
| `reservaya-nextjs-api/components/b2b/PreciosEspecialesPanel.tsx` | Modificar | Tokenizar tabla de precios especiales (36 hex). | L10 |
| `reservaya-nextjs-api/components/b2b/HorariosPanel.tsx` | Modificar | Tokenizar editor de horarios (10 hex, 1 sombra difusa). | L10 |
| `reservaya-nextjs-api/components/b2b/OnboardingChecklist.tsx` | Modificar | Tokenizar checklist de onboarding B2B (16 hex, 1 sombra difusa). | L11 |
| `reservaya-nextjs-api/components/b2b/ValidarCodigo.tsx` | Modificar | Tokenizar validación de códigos (11 hex). | L11 |
| `reservaya-nextjs-api/components/b2b/DashboardWidgets.tsx` | Modificar | Tokenizar widgets (40 líneas, 8 hex). | L11 |
| `reservaya-nextjs-api/components/b2b/ComplejosDashboard.tsx` | Modificar | Micro-lote (24 líneas, 1 hex). | L12 |
| `reservaya-nextjs-api/lib/b2b-theme.ts` | Modificar (o borrar) | Limpieza final: centralizar `btnPrimary`/`inputCls`/`labelCls` a tokens y que los paneles los importen (borrar copias locales), o borrar el archivo si L9 lo deja huérfano. Incluye OBS-1. | L13 |

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

### Lote 7 (L7) — `TorneosPanel.tsx` (lote propio, resto B2B)
- **Skill:** `design-taste-frontend` §4.2 *Color Calibration* + §4.4 *Materiality, Shadows, Cards*.
- **Acción:** reemplazo semántico base de L1, extendido a valores solo presentes en el resto B2B — **verificar cada token contra `globals.css`/`tokens.css` antes de usar; si un token no existe, mapear al más cercano existente, nunca inventar clases**: `#0F172A`/`#060C08`/`#060A08`/`#101613`/`#0A1A11`→`text-basalto`; `#475569`/`#64748B`/`#94A3B8`/`#CBD5E1`→`text-pizarra` (texto) o `border-cal` (bordes); `#E7E5E4`/`#E2E8F0`/`#F1F0EE`/`#F5F5F3`→`bg-tiza`/`border-cal`; `#22C55E`/`#16A34A`/`#15803D`/`#008F3B`/`#14532D`/`#0A2E1F`→`bg-cesped`/`hover:bg-cesped-hover`/`text-cesped-hondo`; `#DCFCE7`/`#F0FDF4`/`#4ADE80`→`bg-cesped-suave`; `#3B82F6`/`#1D4ED8`/`#1E3A8A`→`text-cielo-hondo`/`bg-cielo-suave`/`border-cielo`; `#EAB308`/`#A16207`/`#FEF9C3`→tokens sol existentes (`bg-sol-suave`/equivalente verificado); `#3F4A44`→`text-pizarra` (verificar). 6× `shadow-(md|lg|xl)` → sombra dura sin blur; botones a `.btn-tactil`.
- **Criterio medible:** `Select-String '#[0-9a-fA-F]{6}' TorneosPanel.tsx` → 0; `shadow-(sm|md|lg|xl|2xl)` → 0.
- **Gate:** typecheck + lint + build Next.js.

### Lote 8 (L8) — `ReservasPanel.tsx`, `ResenasPanel.tsx`, `ReportesPanel.tsx`
- **Skill:** igual que L7.
- **Acción:** mismo reemplazo semántico que L7 (176 hex: 67+57+52); tarjetas a `.card-tactil`; 5 sombras difusas (3+2+0) → sombra dura; botones a `.btn-tactil`.
- **Criterio medible:** igual que L7, por archivo.
- **Gate:** typecheck + lint + build Next.js.

### Lote 9 (L9) — `EquipoPanel.tsx`, `MetasPanel.tsx`, `ComplejosGrid.tsx`
- **Skill:** igual que L7.
- **Acción:** mismo reemplazo semántico que L7 (176 hex: 66+56+54, `ComplejosGrid.tsx` 659 líneas — el archivo más largo del resto); 5 sombras difusas (3+2+0) → sombra dura; botones a `.btn-tactil`.
- **Criterio medible:** igual que L7, por archivo.
- **Gate:** typecheck + lint + build Next.js.

### Lote 10 (L10) — `DescuentosPanel.tsx`, `PreciosEspecialesPanel.tsx`, `HorariosPanel.tsx`
- **Skill:** igual que L7.
- **Acción:** mismo reemplazo semántico que L7 (90 hex: 44+36+10); 2 sombras difusas (`DescuentosPanel`, `HorariosPanel`) → sombra dura; botones a `.btn-tactil`.
- **Criterio medible:** igual que L7, por archivo.
- **Gate:** typecheck + lint + build Next.js.

### Lote 11 (L11) — `OnboardingChecklist.tsx`, `ValidarCodigo.tsx`, `DashboardWidgets.tsx`
- **Skill:** igual que L7.
- **Acción:** mismo reemplazo semántico que L7 (35 hex: 16+11+8); 1 sombra difusa (`OnboardingChecklist`) → sombra dura.
- **Criterio medible:** igual que L7, por archivo.
- **Gate:** typecheck + lint + build Next.js.

### Lote 12 (L12) — `ComplejosDashboard.tsx` (micro-lote)
- **Skill:** `design-taste-frontend` §4.2 *Color Calibration*.
- **Acción:** 1 hex en 24 líneas → token verificado. Ejecutable junto a L11 en la misma pasada de gates.
- **Criterio medible:** igual que L7.
- **Gate:** typecheck + lint + build Next.js.

### Lote 13 (L13) — limpieza `lib/b2b-theme.ts` + OBS-1 (al final, tras L9)
- **Skill:** `design-taste-frontend` §4.2 *Color Calibration*.
- **Acción:** reescribir las constantes con hex/sombras viejas (`card`, `btnPrimary`, `btnDark`, `btnGhost`, `eyebrow`, `badgeOk`, `badgeBeta`, `theme`) a tokens y añadir `inputCls`/`labelCls` canónicos; los 8 paneles con copias locales (`Abonos`, `Caja`, `ComplejosGrid`, `Descuentos`, `Metas`, `PreciosEspeciales`, más `Config`/`Torneos` con `inputCls`) borran sus copias e importan; si nadie lo usa, borrar el archivo. OBS-1: icono de eliminar `text-cal`→`text-pizarra` en `DescuentosPanel:474` y `PreciosEspecialesPanel:380`.
- **Criterio medible:** `Select-String 'const (btnPrimary|inputCls|labelCls|card) =' components/b2b/` → 0 definiciones locales; A7/A8 siguen en 0.
- **Gate:** typecheck + lint + build Next.js.

> **Nota de conteo:** L1–L6 usan `grep -E`; en Windows/PowerShell el equivalente es `Select-String -Pattern '#[0-9a-fA-F]{6}'`. Línea base global `components/b2b/`: 838 → 590 tras L1–L5 → **0** tras L7–L12 (cierra criterio A7).

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

- [x] **L1: `CronogramaView.tsx`** (prioridad) — implementado por Oscar (hex→tokens, sombras duras, `btn-tactil`). Gates A1–A4, A7, A8 verificados. Re-tokenizado con `shadow-dura`, `shadow-dura-sm`, `shadow-dura-lg`, `var(--basalto)` (0 hex literales).
- [x] **L2: `AbonosPanel.tsx`, `CajaPanel.tsx`, `ConfigPanel.tsx`** — implementado por Oscar (`.card-tactil`, `.btn-tactil`, tokens semánticos, 0 hex huérfanos, 0 sombras difusas). Gates A1–A4, A7, A8 verificados localmente.
- [x] **L3: `GestionCanchasPanel.tsx`, `loading.tsx`** — implementado por Oscar (cierre de tokenización admin, `.card-tactil`, tono='claro' en modal, skeletons sin sombras difusas, 0 hex huérfanos, 0 sombras difusas). Gates A1–A4, A7, A8 verificados localmente.
- [x] **L4: `Modal.tsx`, `Button.tsx`** — implementado por Oscar (trampa de foco cíclica con restauración de foco previo, Escape, touch targets mínimos ≥44x44px en botón y botón de cierre, `focus-visible` accesible, `shadow-dura-lg`). Gates A1–A4 verificados localmente.
- [x] **L5: `Header.astro`, `canchas.astro`** — implementado por Oscar (foco visible y contraste en navegación, botón de cierre accesible con touch target ≥44x44px, foco inicial en diálogo, escape listener y restauración de foco al cerrar, sombra limpia). Gates A5, A6 verificados localmente.
- [ ] **L6: Verificación integral y auditoría de salud final (JIM-QA)** — 10 criterios + matriz Impeccable (objetivo ≥18/20).
- [x] **L7: `TorneosPanel.tsx`** — implementado por Oscar (0 hex, 0 sombras difusas, `.card-tactil`, `.btn-tactil`, soporte Escape en drawer y modales). Gates A1–A4, A7, A8 verificados localmente.
- [x] **L8: `ReservasPanel.tsx`, `ResenasPanel.tsx`, `ReportesPanel.tsx`** — implementado por Oscar (0 hex, 0 sombras difusas, `.card-tactil`, `.btn-tactil`, soporte Escape en modales, estrellas y tarjetas con tokens semánticos). Gates A1–A4, A7, A8 verificados localmente.
- [x] **L9: `EquipoPanel.tsx`, `MetasPanel.tsx`, `ComplejosGrid.tsx`** — implementado (Oscar + dev-claude): 0 hex huérfanos, 0 sombras difusas en los 3 paneles, `.card-tactil`, `.btn-tactil`, modales con tokens semánticos, `lib/b2b-theme.ts` desacoplado de `ComplejosGrid.tsx`. Gates A1–A4, A7, A8 verificados localmente.
- [x] **L10: `DescuentosPanel.tsx`, `PreciosEspecialesPanel.tsx`, `HorariosPanel.tsx`** — implementado por dev-claude (`task-20260929-reparto-pam`): hex→tokens (`text-basalto`, `text-pizarra`, `border-cal`, `bg-tiza`, `bg-cesped-suave`/`text-cesped-hondo`, `bg-error-suave`/`text-error`, `accent-cesped`), tarjetas a `card-tactil`, segmentado y switches a tokens, `shadow-sm`→`shadow-dura-sm`. Se retiró el import de `card`/`btnPrimary` de `lib/b2b-theme.ts` (fuera de alcance, se deja intacto) y se usan clases `card-tactil`/`btn-tactil` directas, igual que L2. Gates A1–A4, A7, A8 verificados localmente.
- [x] **L11: `OnboardingChecklist.tsx`, `ValidarCodigo.tsx`, `DashboardWidgets.tsx`** — implementado por dev-claude (`task-20260929-reparto-pam`): hex→tokens, tarjetas a `card-tactil` (retirada la sombra difusa `shadow-[0_2px_4px_rgba(...)]` de las 3), CTAs a `.btn-tactil`, estados ok/error/advertencia a `cesped-suave`/`error-suave`/`sol-suave`. Gates A1–A4, A7, A8 verificados localmente.
- [x] **L12: `ComplejosDashboard.tsx`** — implementado por dev-claude (misma pasada que L11): 1 hex → `text-pizarra`. Gates A1–A4, A7, A8 verificados localmente.
- [x] **L13: `lib/b2b-theme.ts`** — implementado por dev-claude (`req-20260929-pam-l13`), tras L9 commiteado (`ade7c93`): reescrito `lib/b2b-theme.ts` con solo `inputCls`/`labelCls`/`btnPrimary` tokenizados (se borraron `theme`/`card`/`btnDark`/`btnGhost`/`eyebrow`/`badgeOk`/`badgeBeta`: 0 importadores, código muerto). Los 8 paneles con copia local (`Abonos`, `Caja`, `ComplejosGrid`, `Descuentos`, `Metas`, `PreciosEspeciales`, `Config`, `Torneos`) ahora importan del módulo central; `Config`/`Torneos` conservan su `mt-1.5` vía `cn(inputCls, 'mt-1.5')` para no perder el espaciado. `Caja`/`Metas` conservan su `btnGhost` local (uso único, no en el alcance de centralización). OBS-1: `text-cal`→`text-pizarra` en el ícono de eliminar de `DescuentosPanel.tsx:474` y `PreciosEspecialesPanel.tsx:380`. OBS-3: Escape para cerrar modal en `EquipoPanel.tsx` y `MetasPanel.tsx` (mismo patrón `useEffect`/`keydown` de L8). **Nota para auditor-b:** al converger a un solo `inputCls`/`labelCls`/`btnPrimary`, `ComplejosGrid`/`MetasPanel` pierden su `rounded-xl` (chocaba con el `border-radius: 9999px` de `.btn-tactil`, quedaba mal aplicado) y ganan `font-display`; `ConfigPanel` pierde `font-display font-bold`+`focus:shadow-dura-sm` en sus inputs y pasa a `focus:ring-2 ring-cesped/25` (como el resto) — cambio cosmético menor, intencional de la centralización, no una regresión de comportamiento. Gates A1–A4, A7, A8 verificados localmente (0 definiciones locales restantes).
- [x] **L14 (fix A9, mi parte): `MetasPanel.tsx:348`, `EquipoPanel.tsx:199,363`, `ResenasPanel.tsx:285`, `ReservasPanel.tsx:431`, `TorneosPanel.tsx:270,377,411`** — implementado por dev-claude (`req-20260929-pam-l14`): 8 cierres/ayudas de `h-8 w-8`/`h-9 w-9` a `h-11 w-11` (44px), icono sin cambio. Escape ya existía en los 5 archivos (L8/L9/L13), verificado sin tocar. `CajaPanel`, `ComplejosGrid`, `AbonosPanel`, `CronogramaView` son de Oscar (mismo lote L14, no tocados). Gates A1–A4 verificados localmente.
- [x] **L14 (fix A9, parte Oscar): `ComplejosGrid.tsx`, `AbonosPanel.tsx`, `CajaPanel.tsx`, `CronogramaView.tsx`** — implementado por Oscar (`req-20260929-oscar-l14`): cierres y ayuda a `h-11 w-11` (`btn-tactil`, 44px, preservando iconos); Escape agregado en `ComplejosGrid` (3 modales: renovar, compartir, crear), `AbonosPanel` (modal cuenta) y `CajaPanel` (componente `Modal` con `onCloseRef`), confirmado ya existente en `CronogramaView`. Gates A1–A4 verificados localmente.

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
| 2026-09-29 | L1 `CronogramaView.tsx` (A1–A4, A7, A8) | ✅ PASS | JIM-QA: typecheck 0 err, lint 0 err (2 warnings), test 40/40, build Next OK, 0 hex huérfanos (A7 PASS), 0 sombras difusas (A8 PASS). Re-tokenizado con `shadow-dura*` y `var(--basalto)` (0 hex literales). |
| 2026-09-29 | L2 `AbonosPanel`/`CajaPanel`/`ConfigPanel` (A1–A4, A7, A8) | ✅ PASS (local) | Oscar: typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. 0 hex huérfanos y 0 sombras difusas en los 3 paneles. Solicitado a jim-qa-b. |
| 2026-09-29 | L3 `GestionCanchasPanel`/`loading.tsx` (A1–A4, A7, A8) | ✅ PASS (local) | Oscar: typecheck 0, lint 0, test 40/40, build Next OK. `.card-tactil`, modal tono claro, skeletons sin sombras difusas. 0 hex huérfanos, 0 sombras difusas. |
| 2026-09-29 | L4 `Modal`/`Button` a11y (A1–A4, A9, A10) | ✅ PASS (local) | Oscar: trampa de foco cíclica con restauración, Escape, min-h-[44px]/min-w-[44px] en botones y controles, focus-visible accesible, `shadow-dura-lg`. Fix de foco: `onClose` resguardado en `useRef` con efecto dedicado y dependencia `[open]` para evitar pérdida de foco al teclear (lint 0 err con `react-hooks/refs`). Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. Verificado que `CajaPanel.tsx` no posee `useEffect` de foco/teclado. |
| 2026-09-29 | L5 `Header.astro`/`canchas.astro` (A5, A6) | ✅ PASS (local) | Oscar: foco visible y contraste en nav, dialog con foco inicial y restauración, 0 errores en `astro check`, 17 páginas compiladas en `astro build`. |
| 2026-09-29 | L1–L5 integral jim-qa-b (A1–A6 + conteo hex) | ✅ PASS | jim-qa-b (1 pasada): typecheck 0 err; lint 0 err + 2 warnings conocidos; test 40/40; astro check 0 err/0 warn/1 hint conocido; astro build 17 págs OK. `next build` no verificado (servidor dev usa .next). Hex6: 590 en `components/b2b/` global (archivos fuera de Spec 29: Reportes/Resenas/Reservas/Torneos/ValidarCodigo); 2 en archivos tocados (`Modal.tsx:81,86` variante oscura `#20263a`/`#2b334d`, decisión de god); 0 sombras difusas en tocados; 0× `#1f2a24` literal. |
| 2026-09-29 | L7 `TorneosPanel.tsx` (A1–A4, A7, A8) | ✅ PASS (local) | Oscar: erradicados 78 hex a tokens semánticos (0 hex6/hex3 restantes); 6 sombras difusas migradas a `shadow-dura*` / `.card-tactil`; soporte Escape en modales y drawer de detalle; botones a `.btn-tactil` con touch target accesible. Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. |
| 2026-09-29 | L10 `DescuentosPanel`/`PreciosEspecialesPanel`/`HorariosPanel` (A1–A4, A7, A8) | ✅ PASS (local) | dev-claude: erradicados 100 hex (90 medidos + 10 no contados en gray-*) a tokens semánticos; 1 sombra difusa (`shadow-sm` en `HorariosPanel`) → `.card-tactil`/`shadow-dura-sm`; segmentado, switches, badges y checkboxes a tokens (`accent-cesped`, `bg-error-suave`/`text-error`, `bg-cesped-suave`/`text-cesped-hondo`). Import de `lib/b2b-theme.ts` retirado (archivo no tocado). Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. Solicitado a jim-qa-b. |
| 2026-09-29 | L10 revisión auditor-b (contra spec, tras verde jim-qa-b) | ✅ APROBADO + 1 observación no bloqueante | Diff 92+/92− solo clases, lógica intacta; todos los tokens existen en `globals.css` (`btn-tactil bg-cesped text-tiza` idéntico a L1/L2, contraste 4.96:1 documentado); 0 hex, 0 sombras difusas y 0 `shadow-[...]` arbitrarias en los 3 archivos. OBS-1 (no bloqueante, decisión de god): icono de eliminar en `text-cal` sobre tiza (~1.5:1, igual que el original `#CBD5E1` — sin regresión, pero el mapa L7 sugería `text-pizarra` para usos con significado). Vigilancia: `lib/b2b-theme` aún lo usa `ComplejosGrid` (L9); tras L9 verificar si queda huérfano. Aviso jim-qa-b heredado: `cn` sin usar en `ResenasPanel.tsx:7` (toca a L8/Oscar). |
| 2026-09-29 | L11 `OnboardingChecklist`/`ValidarCodigo`/`DashboardWidgets` (A1–A4, A7, A8) | ✅ PASS (local) | dev-claude: erradicados 35 hex a tokens; 3 sombras difusas arbitrarias (`shadow-[0_2px_4px_...]`, no capturadas por el regex de A8 pero corregidas igual) → `.card-tactil`. Typecheck 0, lint 0 (2 warnings preexistentes + 1 ajeno en `ResenasPanel.tsx` de L8), test 40/40, build Next OK. Solicitado a jim-qa-b. |
| 2026-09-29 | L11+L12 revisión auditor-b (contra spec, tras verde jim-qa-b) | ✅ APROBADO sin observaciones nuevas | Diff 26+/26− solo clases (`OnboardingChecklist`, `ValidarCodigo`, `DashboardWidgets`, `ComplejosDashboard`), lógica intacta; tokens todos en `globals.css`; 0 hex, 0 sombras, 0 `shadow-[...]`; `active:scale` y `hover:shadow-md` erradicados; `amber/red`→`sol-suave+basalto`/`error+tiza` (contrastes documentados). Único `text-cal`: icono decorativo `ScanLine` (mismo patrón que OBS-1, cubierto por decisión pendiente de god). |
| 2026-09-29 | L8 `ReservasPanel`/`ResenasPanel`/`ReportesPanel` (A1–A4, A7, A8) | ✅ PASS (local) | Oscar: erradicados 113 hex (36+37+40 en código activo, 0 hex restantes en los 3 paneles); 5 sombras difusas migradas a `.card-tactil`/`shadow-dura*`; soporte Escape en modales (nueva reserva, responder reseña); estrellas con tokens `sol`/`cal`; tarjetas oscuras con `from-noche to-cesped-hondo`; botones a `.btn-tactil`. Typecheck 0, lint 0 (2 warnings preexistentes, warning de cn removido), test 40/40, build Next OK (Turbopack 5.1s). Solicitado a jim-qa-b. |
| 2026-09-29 | L8 revisión auditor-b (contra spec, tras verde jim-qa-b) | ✅ APROBADO + 1 vigilancia no bloqueante | Diff 146+/130−: clases + 2 `useEffect` Escape (previstos en spec, igual que L4/L5/L7) + micro-ajustes cosméticos (`mt-1`, `font-bold` en badge). Tokens `velo`/`sillar`/`noche` verificados en `globals.css` (`noche #0b1912` fiel a los verdes oscuros originales); `import cn` removido en `ResenasPanel` (cierra aviso); ocupación azul→tarjeta oscura coherente con `acento único`. VIGILANCIA (no bloqueante, para L6/A9): botones de cierre de modales en `h-9 w-9` (36px < 44px, sin regresión — ya medían eso). |
| 2026-09-29 | L9 PARCIAL revisión auditor-b (`ComplejosGrid` solo, tras verde jim-qa-b) | ✅ APROBADO PARCIAL + OBS-2 | Diff 52+/51− solo clases; 0 hex/sombras; `b2b-theme` desimportado (local `btnPrimary` táctil, lo centraliza L13); icono de eliminar en `text-pizarra` (coherente con mapa L7 — apoya resolver OBS-1 hacia `pizarra`). OBS-2 (no bloqueante, decisión de god): 2× `text-amber-600`→`text-sol` en texto `text-xs font-bold` — `sol` sobre tiza ~1.9:1, peor que el original; se sugiere `text-alerta-hondo` (token destinado a texto ámbar, ~7:1). L9 NO completo: `EquipoPanel`/`MetasPanel` (Oscar) pendientes de verde. |
| 2026-09-29 | L9 COMPLETO revisión auditor-b (`Equipo`/`Metas`, tras verde jim-qa-b) | ✅ APROBADO + OBS-3 | Diff 78+/78− por archivo, solo clases, lógica intacta; 0 hex/sombras/arbitrarias; `shadow` plano→`shadow-dura-sm`, `hover:shadow-md`/`shadow-sm`/`shadow-xl` erradicados; `amber-800/red-600`→`basalto`/`error-hondo` (mejoras de contraste); locales `btnPrimary`/`inputCls`/`labelCls` táctiles (alcance L13 ya los cubre). OBS-3 (no bloqueante, decisión de god): modales L9 sin `Escape` (Equipo agregar-miembro, Metas definir-meta, ComplejosGrid renovar/compartir/crear) mientras L7/L8 sí lo tienen — unificar en L6 o mini-lote. Con esto, L9 queda COMPLETO. |
| 2026-09-29 | L13 revisión auditor-b (`b2b-theme` + 8 paneles + Escape, tras verde jim-qa-b) | ✅ APROBADO sin observaciones | `b2b-theme.ts` sin hex (9 constantes viejas→3 tokenizadas); 0 definiciones locales en `b2b` (8 imports verificados por grep — criterio L13 cumplido); OBS-1 aplicado en los 2 iconos; Escape añadido en Equipo/Metas (ComplejosGrid excluido por orden explícita de god). Micro-deltas coherentes: `labelCls` canónico con `font-display`, `inputCls` con `mt-1.5` compensado vía `cn`, `btnPrimary` gana estados disabled. `CronogramaView:883,1222` son sombras duras con `var(--basalto)` (forma L1 aceptada, fuera de alcance). Spec 29 implementada completa (L1–L13); resta L6 integral. |
| 2026-09-29 | L14 PARCIAL revisión auditor-b (5 archivos pam-dev, tras verde jim-qa-b) | ✅ APROBADO PARCIAL sin observaciones | Diff 8+/8−: solo `h-8 w-8`/`h-9 w-9`→`h-11 w-11` en cierres/ayudas (`Metas:348`, `Equipo:199,363`, `Reseñas:285`, `Reservas:431`, `Torneos:270,377,411`); iconos sin cambio; Escape intacto (sin líneas `useEffect` en el diff); `grep h-8/h-9`→0 en los 5. L14 NO completo: `Caja`/`ComplejosGrid`/`Abonos`/`Cronograma` (Oscar) pendientes. |
| 2026-09-29 | L14 COMPLETO revisión auditor-b (parte Oscar, tras verde jim-qa-b) | ✅ APROBADO + OBS-4 | Tamaños a `h-11 w-11` y `grep h-8/h-9`→0 en los 4 archivos; Escape: Abonos 1 modal, Caja con patrón `onCloseRef` anti-robo-de-foco (igual que L4), ComplejosGrid 1 handler para sus 3 modales, Cronograma intacto (Escape ya de L7). OBS-4 (no bloqueante, decisión de god): `CajaPanel:556/697/700` (Quitar/Editar/Eliminar de fila, `p-1`/`p-1.5` sin tamaño) siguen <44px, fuera de lista L14 — incluir en L6 o aceptar. Con esto, L14 queda COMPLETO. |
| 2026-09-29 | L9 completo `EquipoPanel`/`MetasPanel`/`ComplejosGrid` (A1–A4, A7, A8) | ✅ PASS (local) | Oscar: erradicados 176 hex (66+56+54, 0 restantes en los 3 archivos); 8 sombras difusas migradas a `.card-tactil`/`shadow-dura*`; botones a `.btn-tactil`; modales con tokens semánticos; import `b2b-theme` retirado en `ComplejosGrid`. Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK (Turbopack 4.1s). Solicitado a jim-qa-b. |
| 2026-09-29 | L7–L12 resto B2B (especificación) | 📝 SPEC | auditor-b: 14 archivos / 590 hex6 medidos por archivo (0 en L1–L5), 19 sombras difusas (6+5+5+2+1+0), mapa semántico extendido con verificación obligatoria contra `globals.css`/`tokens.css`. L7, L8, L9, L10, L11, L12 implementados al 100%. |
| 2026-09-29 | L13 `lib/b2b-theme.ts` + OBS-1 + OBS-3 (A1–A4, A7, A8) | ✅ PASS (local) | dev-claude (`req-20260929-pam-l13`): `lib/b2b-theme.ts` reescrito a solo `inputCls`/`labelCls`/`btnPrimary` tokenizados (7 exports muertos borrados); 8 paneles importan y borran su copia local (`Select-String` → 0). `Config`/`Torneos` preservan `mt-1.5` vía `cn()`. OBS-1 aplicado (`DescuentosPanel:474`, `PreciosEspecialesPanel:380`). OBS-3 aplicado en `EquipoPanel`/`MetasPanel` (Escape cierra modal, patrón L8); **pendiente**: los 3 modales de `ComplejosGrid` (renovar/compartir/crear) señalados por auditor-b en la misma OBS-3 no estaban en el pedido explícito de god (solo Equipo/Metas) — no tocados, a la espera de instrucción. Cambio cosmético menor documentado en §6 (convergencia de `ComplejosGrid`/`MetasPanel`/`ConfigPanel` al estilo único). Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. Solicitado a jim-qa-b. |
| 2026-09-29 | L6 integral jim-qa-b (A1–A10 + matriz) | ⚠️ **18/20 Excelente con fallos** — A1 PASS, A2 0 err/2 warn, A3 40/40, A5 último 0/0/1 hint (esta pasada pidió install interactivo, no se repitió), A6 17 págs OK, A7 0 hex, A8 0 sombras, A10 sin fallos en texto (OBS-2 resuelto; `sol`/`cal` solo en estrellas decorativas `ResenasPanel:54` e icono `ValidarCodigo:71`). A4 build Next no corrido por jim (orden vigente; Oscar/pam-dev reportan OK). **Fallos A9** (lote de arreglo): 11 cierres <44px — `CajaPanel:110`, `ComplejosGrid:494,562`, `MetasPanel:348` (32px), `EquipoPanel:363`, `ResenasPanel:285`, `ReservasPanel:431`, `TorneosPanel:377,411` (36px), `AbonosPanel:301`, `CronogramaView:886,964` (~28-32px) — más 3 ayudas 36px (`EquipoPanel:199`, `TorneosPanel:270`, `CronogramaView:1093`); `Modal.tsx:107` sí mide 44px. Sin Escape: 3 modales `ComplejosGrid` + modales locales `AbonosPanel`/`CajaPanel` (0 `keydown` en los 3 archivos; resto de paneles con modal sí lo tienen). Matriz: A11y 3.5, Perf 3.5, Theming 4, Responsive 3, Integridad 4. |
| 2026-09-29 | L14 (mi parte, A9) `MetasPanel`/`EquipoPanel`/`ResenasPanel`/`ReservasPanel`/`TorneosPanel` | ✅ PASS (local) | dev-claude (`req-20260929-pam-l14`): `h-8 w-8`→`h-11 w-11` en `MetasPanel.tsx:348`; `h-9 w-9`→`h-11 w-11` en `EquipoPanel.tsx:199,363`, `ResenasPanel.tsx:285`, `ReservasPanel.tsx:431`, `TorneosPanel.tsx:270,377,411` (8 controles, icono sin cambio de tamaño). Verificado `grep -n "h-8 w-8\|h-9 w-9"` → 0 en los 5 archivos. Escape ya presente en los 5 (L8/L9/L13), confirmado sin cambios necesarios. Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. `CajaPanel`/`ComplejosGrid`/`AbonosPanel`/`CronogramaView` son de Oscar (mismo L14). Solicitado a jim-qa-b. |
| 2026-09-29 | L14 (parte Oscar, A9) `ComplejosGrid`/`AbonosPanel`/`CajaPanel`/`CronogramaView` | ✅ PASS (local) | Oscar (`req-20260929-oscar-l14`): cierres y ayuda ampliados a `h-11 w-11` (44px, `btn-tactil`, iconos intactos); soporte `Escape` añadido en `ComplejosGrid` (3 modales: renovar, compartir, crear), `AbonosPanel` (cuenta) y `CajaPanel` (`Modal` con `onCloseRef`), verificado existente en `CronogramaView`. Typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK (Turbopack 4.8s). Solicitado a jim-qa-b. |
