# Especificación: 33 - Extensión del rediseño al resto de la landing

> **Estado:** ✅ Aprobada por Lukas (2026-09-29: "sí"). Colores y elementos firma: los define la Spec 34 (identidad v2); aquí solo tokens semánticos.
> **Origen:** Orden de Lukas vía god (`req-20260929-auditorb-s33`, ritmo acelerar): llevar la dirección de Spec 32 (croquis, táctil, `VARIANCE 8`, `MOTION 5` con `reduced-motion`) a las páginas que Spec 32 no cubrió. Base: mapa landing de dwight (`inform-pam-mapa-landing-s32`) + escaneo estructural propio de las 9 páginas restantes.

---

## 1. Objetivo

**Problema:** Spec 32 rediseñó `index`, `canchas`, `login`/`register`, `404`/`500` (más `EmptyState`/`CroquisCancha` compartidos en Spec 31). Quedan 9 páginas con el lenguaje anterior: h1 `text-3xl lg:text-4xl` sin escala display, secciones `max-w-texto` planas sin ritmo de eyebrows, formularios sin `card-tactil`, y 2 herramientas interactivas (`completar-cuadro` 365 líneas, `sortear` 318 líneas) con fetch inline que hay que modernizar visualmente sin tocar.

**Resultado esperado:** todo `reservaya-frontend-astro/src/pages/**` habla el mismo idioma Spec 32 (croquis/Patrón, táctil, eyebrows, diales 8/5 con `reduced-motion`), con 0 regresiones de lógica/fetch y 0 tokens nuevos. Aprobación de Lukas requerida antes de tocar código.

---

## 2. Fuera de alcance

- Escribir código de ningún lote: esta spec es 100% diagnóstico y propuesta (`docs/specs/33-landing-resto.md` es el único archivo que cambia aquí).
- `reservaya-nextjs-api/**` — cubierto por Spec 29.
- Backend, endpoints o contratos: ningún lote toca los `fetch` inline (`completar-cuadro`, `sortear`, `forgot/reset-password`, `mejoras`); solo maquetación alrededor.
- Páginas ya cubiertas por Spec 31/32 (`index`, `canchas`, `login`, `register`, `404`, `500`).
- Fotografía real o imágenes de stock (regla Spec 32 §2, vigente).

**Decisiones de producto que requieren aprobación (de Lukas, antes de cualquier lote):**
1. `MOTION 5` en herramientas interactivas: animar el sorteo/resultados (`sortear`, `completar-cuadro`) vs. mantenerlas sobrias con solo transiciones táctiles. **→ Decidido (god, por "diseños locos que agarren" de Lukas): animar, con `prefers-reduced-motion`.**
2. `duenos`: rediseñar `Planes.astro` incluido (verificado uso único en `duenos.astro:74`, sin impacto cruzado) vs. solo la página. **→ Decidido: incluir `Planes.astro`.**
3. `torneos`: mantener `EmptyState` estático actual vs. destacar torneos reales (sin backend nuevo). **→ Decidido: destacar torneos reales solo si ya existe un endpoint público; si no, `EmptyState` llamativo y `BLOQUEO-API` anotado.**

---

## 3. Archivos afectados (propuesta de lotes, ningún archivo tocado todavía)

Lotes de ≤3 archivos, conjuntos disjuntos: dwight-scout (L1+L2, 403 líneas simples) y Oscar (L3+L4, 806 líneas con las 2 interactivas) trabajan en paralelo sin tocar el mismo archivo.

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-frontend-astro/src/pages/forgot-password.astro` | Modificar | Auth resto (78 líneas): alinear con `AuthCard` renovado (L3/L4 de Spec 32) — eyebrow, escala h1, tarjeta. | L1 |
| `reservaya-frontend-astro/src/pages/reset-password.astro` | Modificar | Auth resto (110 líneas): mismo tratamiento; fetch de reseteo intacto. | L1 |
| `reservaya-frontend-astro/src/pages/ayuda.astro` | Modificar | Contenido angosto (37 líneas): ritmo de eyebrows + tarjeta táctil. | L2 |
| `reservaya-frontend-astro/src/pages/libro-reclamaciones.astro` | Modificar | Formulario legal (74 líneas): `card-tactil`, inputs del sistema; sin tocar campos ni envío. | L2 |
| `reservaya-frontend-astro/src/pages/mejoras.astro` | Modificar | Formulario sugerencia (104 líneas): mismo tratamiento; fetch intacto. | L2 |
| `reservaya-frontend-astro/src/pages/duenos.astro` | Modificar | Marketing dueños (92 líneas): hero con dirección Spec 32 + secciones panel/preguntas. | L3 |
| `reservaya-frontend-astro/src/components/Planes.astro` | Modificar | Precios (uso único verificado en `duenos.astro:74`): tarjetas táctiles (según decisión §2.2). | L3 |
| `reservaya-frontend-astro/src/pages/torneos.astro` | Modificar | Marketing torneos (31 líneas): eyebrow + CTA organiza (según decisión §2.3). | L3 |
| `reservaya-frontend-astro/src/pages/completar-cuadro.astro` | Modificar | Partidos abiertos (365 líneas, fetch publicar/anotarse): solo maquetación + motion con gate. | L4 |
| `reservaya-frontend-astro/src/pages/sortear.astro` | Modificar | Sorteador (318 líneas, fetch buscar usuarios): solo maquetación + motion con gate. | L4 |

---

## 4. Diseño y lógica (dirección propuesta, diales de god)

**Diales:** `DESIGN_VARIANCE: 8` · `MOTION_INTENSITY: 5` (orden de god para el resto; Spec 32 usó 6/3) — toda animación con gate `prefers-reduced-motion` (`motion-safe:`/`motion-reduce:`, patrón ya aceptado en L1/L5 de Spec 32) y solo `transform`/`opacity` (sin CLS).

### Lote 1 (L1, dwight-scout) — `forgot-password` + `reset-password`
- **Skill:** `design-taste-frontend` §4.7 *Layout Discipline* + lenguaje `AuthCard` de Spec 32 L3/L4.
- **Acción:** eyebrow + h1 `font-display` en escala, tarjeta del formulario a `card-tactil`; el `fetch` y los estados de aviso quedan idénticos. Nota (mapa dwight-b verificado): el h1 lo renderiza `AuthCard` desde el prop `titulo` de cada página — se edita el `titulo` por página, no `AuthCard`.
- **Criterio medible:** `astro check`/`astro build` en verde; diff sin líneas `fetch`/`API` tocadas; 0 hex.
- **Gate:** `astro check` + `astro build`.

### Lote 2 (L2, dwight-scout) — `ayuda` + `libro-reclamaciones` + `mejoras`
- **Skill:** `design-taste-frontend` §4.7 + §4.5 *Interactive UI States* (inputs/botones del sistema).
- **Acción:** ritmo de eyebrows, `card-tactil` en formularios, inputs a `inputCls`-equivalente Astro; campos, validaciones y envíos intactos.
- **Criterio medible:** igual que L1.
- **Gate:** `astro check` + `astro build`.

### Lote 3 (L3, Oscar) — `duenos` + `Planes.astro` + `torneos`
- **Skill:** `impeccable` §Modes → *Persuade* + `design-taste-frontend` §4.8 (visual real: croquis/`PatronCancha` en hero de dueños).
- **Acción:** hero de dueños con presencia visual, `Planes` a tarjetas táctiles, `torneos` con CTA organiza (según decisiones §2.2–§2.3); enlaces de `Footer.astro` (`/duenos`, `/duenos#planes`) intactos.
- **Criterio medible:** igual que L1 + captura del hero sin espacio muerto.
- **Gate:** `astro check` + `astro build`.

### Lote 4 (L4, Oscar) — `completar-cuadro` + `sortear`
- **Skill:** `design-taste-frontend` §4.5 + `MOTION 5` con gate (según decisión §2.1).
- **Acción:** maquetación táctil de paneles de publish/join y del sorteador; **prohibido tocar** los `fetch`, el parseo de jugadores y el algoritmo de sorteo — solo clases y contenedores; motion solo con `motion-safe`.
- **Criterio medible:** igual que L1 + `grep fetch` idéntico antes/después por archivo.
- **Gate:** `astro check` + `astro build`.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Astro build | `npm --prefix reservaya-frontend-astro run build` | 0 errores (17 págs) |
| A3 | Identidad intacta | `grep` de hex en archivos tocados | 0 hex, 0 tokens nuevos |
| A4 | Sin *scroll* horizontal | Captura a 375px y 1440px | 0px extra (línea base spec 26/28) |
| A5 | Lógica/fetch intactos | Diff por lote | 0 líneas `fetch`/`API`/algoritmo tocadas |
| A6 | Motion con gate | Inspección de animaciones añadidas | 100% con `motion-safe`/`motion-reduce` o `prefers-reduced-motion` |
| A7 | Dirección Spec 32 | Inspección visual por página | Eyebrows, táctil y escala display reconocibles |

---

## 6. Checklist
- [x] T1: mapeo base (dwight S32 + escaneo propio: 9 páginas, líneas y estructuras verificadas).
- [x] T2: lotes ≤3 archivos, disjuntos, repartidos dwight-scout (L1+L2) / Oscar (L3+L4).
- [x] T3: criterios medibles (§5) con gates de god (0 hex, tokens existentes, build verde).
- [x] T4: mandar esta spec a auditor-b (auto: la redacta auditor-b por `req-20260929-auditorb-s33`).
- [x] T5: avisar a god en 3 líneas y esperar aprobación de Lukas antes de cualquier lote.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Mapeo + redacción (T1–T4) | ✅ Completo | 9 páginas medidas (`completar-cuadro` 365 … `torneos` 31); `Planes.astro` uso único (`duenos.astro:74`); fetch inline localizados (`completar-cuadro:187,231,337`, `sortear:173`, `forgot:58`, `reset:88`, `mejoras:51,82`) para blindarlos en L4/L1/L2. |
| _Pendiente_ | A1–A7 | | Se verifican cuando Lukas apruebe y se ejecuten los lotes. |
