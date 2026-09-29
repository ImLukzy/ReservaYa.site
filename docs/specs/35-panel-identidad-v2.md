# Especificación: 35 - Panel con identidad v2 (hija de Spec 34)

> **Estado:** ✅ **Aprobada por Lukas (2026-09-29, «sí» en ILK-22):** jugador con tintas por deporte; B2B a 0 hex con `cesped` como único acento (sin tintas deportivas); técnico neutro con sus hex a tokens (L4). Al cerrar: levantar el proyecto en localhost para que Lukas lo vea.
> **Origen:** Decisión 3 de Spec 34 (aprobada por Lukas 2026-09-29, commit `df657d1`): la identidad v2 llega al panel en una spec hija. Pedido de god (`req-20260929-angel-s35`) con orden propuesto por el mapa de Toby (`hive/agents/toby-explorador-mumypt8r/mapa-panel.md`).
> **Design Read** (`design-taste-frontend` §0.B + `impeccable` modo *Operate*): *panel autenticado de reservas (jugador que opera sus canchas, dueño que opera su negocio), con el sistema de tokens de `globals.css`, donde la marca vive en detalles precisos, no en decoración.*

---

## 1. Objetivo

**Problema:** la landing va a identidad v2 (Spec 34 aprobada) y el panel autenticado quedaría en v1, con deuda de color medida por Toby (mapa-panel §4): 70 hex en 8 páginas. El dashboard de jugador (7 págs) está 100% tokenizado y listo para tintas por deporte (solo 2 sombras `#1f2a24` en `carne/page.tsx:25` y `perfil/page.tsx:45`); el B2B concentra su identidad en `lib/b2b-theme.ts` pero `admin/page.tsx` tiene 56 hex y `NovedadesView.tsx` 11 (verificado por grep 2026-09-29); el técnico es gris Tailwind interno.

**Resultado esperado:** el jugador ve sus deportes en su tinta (misma paleta §4.1 de Spec 34), el B2B queda en 0 hex usando tokens de `app/globals.css` (acento `cesped`, sin tintas deportivas: es herramienta de trabajo, modo *Operate*), y el técnico queda sin identidad deportiva pero sin hex (tokens neutros en L4). Sin tocar sesión, permisos ni lógica.

---

## 2. Fuera de alcance

- `lib/session.ts`, `lib/permissions.ts`, layouts con `requireRole`: ni una línea.
- Lógica, fetch, handlers, validaciones o copy de negocio en ningún archivo.
- `app/(dashboard)/tecnico/usuarios/page.tsx` (1 hex, deuda menor registrada en L4): fuera de los lotes de esta spec.
- `app/(auth)/**`: tokenizado y sin hex; no se toca.
- Backend, endpoints o contratos; migraciones o esquema de BD (regla permanente).
- Landing Astro (specs 32/33/34 la cubren).

**Decisiones de producto que requieren aprobación (de Lukas, antes de cualquier lote):**
1. Que el B2B conserve `cesped` como único acento (sin tintas por deporte) por ser herramienta de trabajo: si Lukas quiere tintas también en el panel del dueño, se redacta un L4 nuevo.

---

## 3. Archivos afectados (propuesta de lotes, ningún archivo tocado todavía)

Lotes de ≤3 archivos, secuenciales (L1 primero: todo cuelga de los tokens), para Oscar. Rutas de componentes según mapa-panel §2 (Oscar las confirma en el lote).

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-nextjs-api/app/globals.css` | Modificar | Espejar 10 tokens de Spec 34 §4.1 (5 tintas + 5 suaves; el resto ya existe) | L1 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/carne/page.tsx` | Modificar | Sombra `:25` a token (`shadow-dura` equivalente o var de token) | L1 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/perfil/page.tsx` | Modificar | Sombra `:45` a token | L1 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | Modificar | Pasar el tipo de cancha al chip de deporte | L2 |
| `reservaya-nextjs-api/components/features/CanchaCard.tsx` | Modificar | Chip de deporte en su tinta (mapa-panel §2 fila 23) | L2 |
| `reservaya-nextjs-api/components/ui/Badge.tsx` | Modificar | Variante de badge por tinta de deporte (mapa-panel §2 fila 23) | L2 |
| `reservaya-nextjs-api/app/(dashboard)/admin/page.tsx` | Modificar | 56 hex → tokens `globals.css`; mismos datos de KPIs/gráficos | L3 |
| `reservaya-nextjs-api/app/(dashboard)/admin/novedades/NovedadesView.tsx` | Modificar | 11 hex → tokens; misma estructura | L3 |
| `reservaya-nextjs-api/lib/b2b-theme.ts` | Modificar | Centralizar acento B2B en `cesped` (sin tintas deportivas) | L3 |
| `reservaya-nextjs-api/app/(dashboard)/tecnico/centros/page.tsx` | Modificar | 7 hex → tokens (incluye `#A16207` → `text-basalto` sobre `bg-sol-suave`); sin tintas deportivas | L4 |
| `reservaya-nextjs-api/app/(dashboard)/tecnico/page.tsx` | Modificar | 2 hex → tokens; sin tintas deportivas | L4 |
| `reservaya-nextjs-api/app/(dashboard)/tecnico/suscripciones/page.tsx` | Modificar | 2 hex → tokens; sin tintas deportivas | L4 |

---

## 4. Diseño y lógica (dirección propuesta)

**Diales (panel, modo *Operate*):** `DESIGN_VARIANCE: 4` · `MOTION_INTENSITY: 3` · `VISUAL_DENSITY: 6` — el panel opera, no persuade: sin marquee, sin marcador gigante, sin sellos. Las tintas deportivas aparecen solo en el dashboard del jugador (chip de deporte, insignias), nunca como color de acción (el CTA sigue `cesped`) ni en el B2B.

### Lote 1 (L1, Oscar) — tokens + 2 sombras
- **Acción:** espejar en `globals.css` los 10 tokens de Spec 34 §4.1 (mismo nombre/valor que `tokens.css`; `error-hondo` ya existe en el panel); migrar las 2 sombras duras a token.
- **Criterio medible:** `typecheck` + `lint` + `test` + `build` en verde; grep de hex en los 3 archivos → 0.
- **Gate:** gates del panel + grep 0 hex.

### Lote 2 (L2, Oscar) — jugador con tintas
- **Acción:** el chip de deporte de cada tarjeta (`CanchaCard` vía `Badge`) pinta la tinta del `tipo` de la cancha (mapa-panel §2 fila 23: `tipoCanchaLabel`, `etiquetasJugador`); resto de la vista en tokens actuales.
- **Criterio medible:** igual que L1 + verificación visual por deporte (fútbol→`cesped`, vóley→`mar`, básquet→`miel`, pádel→`lima`, tenis→`arcilla`, losa→`losa`).
- **Gate:** gates del panel + revisión visual.

### Lote 3 (L3, Oscar) — B2B a tokens
- **Acción:** `admin/page.tsx` (56 hex) y `NovedadesView.tsx` (12 hex) migran a tokens `globals.css` según el catálogo de `mapa-hex-panel.md` §2 (verdes→familia `cesped`, grises→`pizarra`/`basalto`/`cal`, amarillos→`sol`/`sol-suave`, botones→`btnPrimary` de `b2b-theme.ts`); `b2b-theme.ts` centraliza el acento en `cesped`. KPIs, gráficos y datos idénticos.
- **Resolución «sin token» (10 ocurrencias, 0 tokens nuevos):** 6 pasos de gradientes legacy en `admin/page` (`#0A2E1F`, `#0A2415`, `#14532D`) → gradiente eliminado, superficie sólida `bg-noche` con `border-2 border-basalto`; 3 neones `#4ADE80` → chip `bg-sol/20 text-sol` o `text-cesped` (sin exponer `--accent-neon`); `#A16207` de `tecnico/centros:105` → `text-basalto` sobre `bg-sol-suave` en el L4.
- **Criterio medible:** igual que L1 + grep de hex en B2B tocado → 0 + diff sin lógica (0 fetch/handlers).
- **Gate:** gates del panel + grep 0 hex.

### Lote 4 (L4, Oscar) — técnico a tokens neutros (sin identidad deportiva)
- **Acción:** `tecnico/centros`, `tecnico/page` y `tecnico/suscripciones` (11 hex) migran a tokens según `mapa-hex-panel.md` §2 (oscuros→`bg-noche`, acentos→`border-cesped`/`text-cesped-hondo`, aviso→`bg-sol-suave` + `text-basalto`). Neutro no es deuda de color: cero tintas deportivas en el técnico. Nota: `tecnico/usuarios/page.tsx` (1 hex `#15803D`→`text-cesped-hondo`) queda como deuda menor para un micro-lote futuro, fuera de esta spec.
- **Criterio medible:** igual que L1 + grep de hex en técnico tocado → 0 + diff sin lógica.

**Invariantes:** sesión y permisos intactos; roles (`USUARIO`, `ADMIN`, `SUPERADMIN`, `TECNICO`); técnico sin tintas deportivas; B2B sin tintas deportivas; 0 hex nuevos en todo el panel.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests panel | `npm --prefix reservaya-nextjs-api test` | todos en verde |
| A4 | Build panel | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Sin hex | `grep` de hex en archivos tocados | 0 hex fuera de `globals.css` |
| A6 | Tintas jugador | Revisión visual por deporte en `/dashboard/canchas` | tinta correcta por tipo (6/6) |
| A7 | Lógica intacta | Diff por lote | 0 líneas de fetch/handlers/validaciones tocadas |

---

## 6. Checklist

- [x] T1: mapa-panel de Toby leído (70 hex en 8 págs; jugador tokenizado; B2B en `b2b-theme.ts`; técnico neutro).
- [x] T2: orden por mapa (jugador → B2B → técnico neutro tokenizado) + lotes ≤3 archivos secuenciales para Oscar (§3–§4).
- [x] T3: criterios medibles con gates del panel (§5).
- [x] T4: aprobación de Lukas (decisión §2.1 incluida) antes de cualquier lote.
- [x] T5: lotes ejecutados por Oscar; cada lote verde de Jim revisado vs spec y anotado en §7.
- [x] T6: criterios verificados y anotados en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T1–T3) | ✅ Propuesta lista | mapa-panel.md (70 hex: `admin/page` 56, técnico 12, jugador 2 sombras); `NovedadesView.tsx` 12 hex verificados (11 líneas, L67 doble); `b2b-theme.ts` y tokens `globals.css` (`error-hondo` ya existe; faltan las 10 tintas) verificados. Sin código tocado. Pendiente: T4 (Lukas). |
| 2026-09-29 | Mapa hex→token recibido (L3) | ✅ Spec actualizada | `mapa-hex-panel.md`: 80 hex analizados, 70 mapeables + 10 «sin token» resueltos sin tokens nuevos (6 gradientes→`bg-noche`, 3 neones→chip `sol`/`cesped`, `#A16207` queda en técnico neutro). L3 de Spec 35 actualizado con el catálogo. |
| 2026-09-29 | 2 ajustes god (L3+L4) | ✅ Spec actualizada, sigue Propuesta | Conteos y tabla de Toby como criterio de L3 (Novedades 12); `#A16207`→L4; nuevo L4 con `tecnico/centros`, `tecnico/page`, `tecnico/suscripciones` (11 hex→tokens neutros, 0 tintas deportivas); `tecnico/usuarios` (1 hex) deuda menor fuera de spec. |
| 2026-09-29 | L1+L2 Revisión vs spec (Angel-Auditor) | ✅ CONFORMES, listos para commit | L1: 10 tintas espejadas en `globals.css` (`:root` + `@theme`, mismos valores Spec 34); sombras `carne:25`/`perfil:45` a `shadow-dura-lg`/`sm`. L2: `Badge` con 6 variantes deportivas (`text-basalto` sobre suaves, regla §4.1 de Spec 34 cumplida; variantes viejas intactas); `CanchaCard` mapea `cancha.tipo` a variante y sombra hover a token (page sin cambios porque ya recibía el tipo). 0 lógica/fetch/handlers. Visto bueno para commit de L1+L2. |
| 2026-09-29 | L3+L4 Revisión vs spec (Angel-Auditor) | ✅ CONFORMES, listos para commit | 59/59 líneas solo clases en 5 archivos; 0 hex restantes; 0 tintas deportivas. Correspondencia exacta con `mapa-hex-panel.md`: `NovedadesView` 12/12 a tokens; gradientes→`bg-noche`; neón→chip `sol`/`cesped`; `#A16207`→`text-basalto` sobre `bg-sol-suave`; técnico a tokens neutros. Handlers, hrefs, estado y permisos intactos. Visto bueno para commit de L3+L4. Spec 35 completa sus 4 lotes. |
| 2026-09-29 | L1 Gates A1–A7 (Jim-QA) | ✅ 100% PASS | A1 typecheck 0 err; A2 lint 0 err / 2 warn conocidos; A3 test 40/40 PASS; A4 next build 0 err; A5 0 hex en globals.css, carne/page.tsx, perfil/page.tsx; A6 n/a; A7 sombras migradas a shadow-dura-lg/sm, 0 lógica tocada. Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | L2 Gates A1–A7 (Jim-QA) | ✅ 100% PASS | A1 typecheck 0 err; A2 lint 0 err / 2 warn conocidos; A3 test 40/40 PASS; A4 next build 0 err; A5 0 hex en CanchaCard.tsx y Badge.tsx; A6 6/6 deportes mapeados a su tinta (fútbol, vóley, básquet, pádel, tenis, losa) con texto basalto sobre suave (>14:1 AAA); A7 0 líneas de fetch/lógica tocadas. Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | L3 Gates A1–A7 (Jim-QA) | ✅ 100% PASS | A1 typecheck 0 err; A2 lint 0 err / 2 warn conocidos; A3 test 40/40 PASS; A4 next build 0 err; A5 0 hex en admin/page.tsx (56 hex erradicados) y NovedadesView.tsx (11 hex erradicados); A6 sin tintas deportivas (modo Operate, acento cesped); A7 0 líneas de lógica/fetch tocadas. Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | L4 Gates A1–A7 (Jim-QA) | ✅ 100% PASS | A1 typecheck 0 err; A2 lint 0 err / 2 warn conocidos; A3 test 40/40 PASS; A4 next build 0 err; A5 0 hex en centros (7 hex), page (2 hex) y suscripciones (2 hex); A6 técnico neutro (0 tintas deportivas); A7 aviso con bg-sol-suave + text-basalto, 0 lógica tocada. Verificado por jim-qa-mumwavdb. |
| 2026-09-29 | Spec 35 Completa (L1–L4) | ✅ 100% GATES PASS | Todos los 4 lotes del panel aprobados y verificados bajo gates A1–A7 por jim-qa-mumwavdb. Deuda de color del panel (78 hex) erradicada. |
