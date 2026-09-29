# Especificación: 34 - Identidad v2 (paleta por deporte + elementos firma)

> **Estado:** ✅ **Aprobada por Lukas (2026-09-29, «sí» en ILK-16):** (1) paleta por deporte tal cual §4.1 (vóley `mar`, básquet `miel`, pádel `lima`, tenis `arcilla`, losa `losa`; fútbol `cesped`); (2) cinta de pitazo **en movimiento** con gate `prefers-reduced-motion`; (3) la identidad v2 llega al panel en una **spec hija aparte**.
> **Origen:** Pedido de Lukas vía god (`req-20260929-angel-spec34`): «colores buenos… diseños locos que agarren a la gente, que parezca algo nuevo e innovador, no tan básico».
> **Design Read** (`design-taste-frontend` §0.B): *landing de consumo para jugadores y dueños de canchas en Arequipa, con lenguaje táctil neo-brutalista de tablero, apoyada en tokens Tailwind v4 + display Barlow Condensed + textura solo CSS.*

---

## 1. Objetivo

**Problema:** la identidad actual (specs 20/26) tiene un solo acento (`cesped`) para todo: fútbol, vóley, básquet, pádel, tenis y losa se ven iguales. El inventario de Toby (`hive/agents/toby-explorador-mumypt8r/mapa-s33.md` §2) confirma 0 colores huérfanos: los únicos 6 hex fuera de `tokens.css` son sombras duras con valores de `basalto`/`cesped` (`estilos.ts:16`, `completar-cuadro:54,103`, `sortear:27,290`), migrables a `shadow-dura*`. El mismo mapa trae un bug real: `estilos.ts:8` usa `hover:bg-cesped-hover` y `estilos.ts:11` usa `hover:bg-error-hondo`, tokens que no existen en `tokens.css`, así que Tailwind los descarta en silencio y esos hovers no hacen nada. La landing es coherente pero plana de color: nada distingue un deporte de otro ni hay un gesto visual memorable propio.

**Resultado esperado:** cada deporte tiene su tinta con contraste AA medido, más 5 elementos firma aplicados primero en la landing Astro, sin romper specs 26/27/32/33: `cesped` sigue siendo la única acción global, todo movimiento con gate `prefers-reduced-motion`, 0 fotos de stock y 0 hex fuera de `tokens.css`. Aprobación de Lukas requerida antes de tocar código.

---

## 2. Fuera de alcance

- Escribir código o aplicar tokens: esta spec es 100% propuesta (`docs/specs/34-identidad-v2.md` es el único archivo que cambia aquí).
- `reservaya-nextjs-api/**` (panel): la identidad v2 llega al panel en una spec posterior, cuando la landing esté aprobada y mergeada.
- Backend, endpoints o contratos de datos.
- Fotografía real o imágenes de stock (regla Spec 32 §2, vigente: sin herramienta de generación disponible, todo es CSS + croquis aprobado).
- Cambiar copy, IA, slugs o lógica de Spec 33: los lotes de esta spec esperan al merge de Spec 33 (comparten archivos) y solo visten encima.
- Migraciones o esquema de BD (regla permanente).

**Decisiones de producto que requieren aprobación (de Lukas, antes de cualquier lote):**
1. La paleta por deporte propuesta (§4, tabla de tintas): tonos exactos sí o ajustes.
2. La cinta de pitazo con marquee en la home (§4, firma 3): movimiento continuo sí o solo gesto estático.
3. Extender la identidad v2 al panel Next en una spec hija sí o quedarse solo en landing.

---

## 3. Archivos afectados (propuesta de lotes, ningún archivo tocado todavía)

Lotes de ≤3 archivos, secuenciales (L1 primero: todo cuelga de los tokens), para Oscar. Ningún lote pisa archivos de otro lote en paralelo porque no hay paralelo: el orden es L1 → L2 → L3 → L4.

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-frontend-astro/src/styles/tokens.css` | Modificar | 11 tokens nuevos (5 tintas + 5 fondos suaves + `error-hondo`) con comentarios de contraste | L1 |
| `reservaya-frontend-astro/src/lib/estilos.ts` | Modificar | Arreglar hovers rotos: `:8` → `hover:bg-cesped-hondo`; `:11` → `hover:bg-error-hondo` (token nuevo); criterio: 0 clases de color sin token | L1 |
| `reservaya-frontend-astro/src/components/ui/PatronCancha.astro` | Modificar | Variante `tinta` por deporte vía `data-deporte` (mismo croquis, otro color) | L2 |
| `reservaya-frontend-astro/src/components/CintaPitazo.astro` | Crear | Cinta marquee única con nombres de distritos/deportes (firma 3) | L2 |
| `reservaya-frontend-astro/src/components/ui/SlotBoard.astro` | Modificar | Adoptar cambio sin dueño: punto con pulso, h2 display, flecha, rótulo «Tablero en vivo» (decisión L2) | L2 |
| `reservaya-frontend-astro/src/pages/index.astro` | Modificar | Tarjetas de deportes con su tinta + cinta bajo el hero (firmas 1, 3) | L3 |
| `reservaya-frontend-astro/src/pages/canchas.astro` | Modificar | Chip de deporte en su tinta + número de cancha fantasma (firmas 1, 5; la fila la arma `filaCancha`, ver L3) | L3 |
| `reservaya-frontend-astro/src/scripts/filas.ts` | Modificar | Solo `filaCancha`: clases + `data-deporte` (desde `cancha.tipo`) + número fantasma; 0 fetch/lógica (cambio permitido, ver L3) | L3 |
| `reservaya-frontend-astro/src/pages/duenos.astro` | Modificar | Sello de complejo verificado + marcador gigante (firmas 2, 4) | L4 |
| `reservaya-frontend-astro/src/pages/torneos.astro` | Modificar | Banda en tinta del deporte del torneo destacado (firma 1) | L4 |
| `reservaya-frontend-astro/src/components/Planes.astro` | Modificar | Plan destacado con borde en tinta fútbol (firma 1, sin cambiar precios) | L4 |

---

## 4. Diseño y lógica (dirección propuesta, diales heredados)

**Diales:** `DESIGN_VARIANCE: 8` · `MOTION_INTENSITY: 5` · `VISUAL_DENSITY: 5` (los de Spec 32/33, orden de Lukas; la identidad viste el mundo existente, no lo reemplaza). Skills: `impeccable` (modo *Persuade*, comandos `colorize` + `bolder`), `design-taste-frontend` (§4.2 calibración de color, §4.8 visual real, §9 pre-flight) y `frontend-design` (dirección audaz con ejecución precisa).

### 4.1 Paleta por deporte (10 tokens nuevos, contraste AA)

Regla madre: **`cesped` sigue siendo la única acción** (botones, focos, enlaces de acción). Las tintas de deporte son identidad y mobiliario (franjas, chips, fondos de tarjeta, croquis), nunca color de botón ni de estado. `error`/`alerta` no se tocan. Deportes desde `TIPOS` de `src/lib/arequipa.ts:13-22` (Fútbol/Fútbol 5/Fútbol 7 comparten tinta; 6 tintas en total contando `cesped`).

| Deporte | Token acento | Tiza encima | Token suave (fondo) | Texto sobre suave |
|---|---|---|---|---|
| Fútbol | `cesped` existente | 4.97 medido (spec 20) | `cesped-suave` existente | `cesped-hondo` 5.7 medido |
| Vóley | `mar` `#0E5A86` | 7.4 | `mar-suave` `#DFEDF6` | `basalto` >10 |
| Básquet | `miel` `#9E6200` | 5.0 | `miel-suave` `#F6EBD0` | `basalto` >12 |
| Pádel | `lima` `#4E6E00` | 5.9 | `lima-suave` `#EAF2D2` | `basalto` >10 |
| Tenis | `arcilla` `#A83A1F` | 6.3 | `arcilla-suave` `#F9E4D8` | `basalto` >10 |
| Losa | `losa` `#3E5C6B` | 7.1 | `losa-suave` `#E2EAF0` | `basalto` >10 |

Notas: ratios calculados por esta spec con la fórmula WCAG y verificados por god el 2026-09-29 (todos ≥ 4.5, suaves/basalto ≥ 12), salvo `miel`, que es valor nuevo de este ajuste y se verifica en el gate A4 antes de mergear L1. Básquet usa `miel` (dorado oscuro) en vez del `brasa` original: `brasa` `#B34A12` y `arcilla` `#A83A1F` son casi indistinguibles (mismo matiz rojizo, y `arcilla` roza además a `error` `#B42318`); el dorado separa básquet de tenis por familia de color (oro contra rojo arcilla) manteniendo AA con tiza. `arcilla` se parece a `error` en familia: por eso `arcilla` nunca aparece cerca de formularios ni mensajes de error (solo chips y bandas de deporte, siempre con la etiqueta del deporte al lado). Los fondos suaves siempre llevan texto `basalto`, nunca texto en tinta clara. La familia `alerta`/`alerta-suave`/`alerta-hondo` y `sol-suave` (sin uso según mapa-s33 §2.1, con contrastes aprobados) quedan en reserva y no se reutilizan como tintas de deporte (`alerta` sobre tiza no llega a AA para texto). Una vista, una tinta: en una misma pantalla no conviven dos acentos de deporte (excepción: la tarjeta de cada deporte en su sección usa la suya; el resto de la página queda en `cesped`/neutros).

### 4.2 Cinco elementos firma

1. **Franja de deporte.** La franja de césped cortado de spec 26 se generaliza: cada banda de deporte pinta su franja en su tinta (mismo CSS `repeating-linear-gradient`, otro token). Se aplica en el hero de `duenos` (tinta del deporte principal del complejo, fútbol por defecto), la banda de torneos y las tarjetas de deporte de la home.
2. **Sello de complejo verificado.** Insignia CSS (borde doble + `font-display`, rotación leve de -6deg, `aria-hidden` si es decorativa o con texto real si acredita): «CANCHA VERIFICADA» en `duenos` y fichas de complejo. Sin SVG dibujado a mano, sin imagen.
3. **Cinta de pitazo.** Una sola cinta marquee por página (máx. 1, regla §5 de la skill) con distritos (`DISTRITOS`) o verbos del servicio, bajo el hero de la home. Animación solo `transform` (translateX), colapsa a estática con `prefers-reduced-motion: reduce`. Si Lukas rechaza el movimiento (decisión §2.2), la cinta queda como banda estática.
4. **Marcador gigante.** Numerales tabulares oversize en `font-display` como mobiliario de sección (`tinta/10` de opacidad, `aria-hidden`, fondo absoluto dentro de sección con `overflow-hidden`, sin mover layout). La landing es estática: solo se permiten conteos derivables en build, es decir `.length` de consts y arrays presentes en el propio archivo (`DISTRITOS.length` = 29, `TIPOS.length` = 8, `distritosTop.length`, `pasos.length`, `modulos.length`, `preguntas.length`). Prohibidos: totales de usuarios, reservas, jugadores, canchas activas, cifras de negocio o cualquier número que no salga de un array del archivo.
5. **Número de cancha fantasma.** En tarjetas de resultado de `/canchas`, el índice de la cancha en display enorme tras el contenido (dato real del orden, no inventado), en la tinta de su deporte a baja opacidad. Cambio permitido: las filas las arma `filaCancha` (`src/scripts/filas.ts:84-132`, DOM sin `innerHTML`); solo se tocan clases, se agrega `data-deporte` desde `cancha.tipo` (ya leído en `filas.ts:88`) y el elemento del número. 0 fetch, 0 lógica, 0 parseo. Nota: `filaCancha` también la usa el tablero de la home (`tablero.ts:100`), así que el vestuario aplica a ambos tableros a la vez.

### Lote 1 (L1, Oscar) — tokens + hovers rotos de botones
- **Acción:** sumar a `tokens.css` los 10 tokens de §4.1 más `error-hondo` `#8F1B13` (tiza encima 9.0 calculado, a verificar en A4), con comentario de uso y ratio (mismo formato que los existentes). En `estilos.ts`: `hover:bg-cesped-hover` pasa a `hover:bg-cesped-hondo` (token real, tiza encima 6.6) y `hover:bg-error-hondo` queda funcionando con el token nuevo. Hoy ambos hovers están muertos (Tailwind descarta clases sin token) y afectan a los 11 archivos que usan `BOTON`. Ningún otro archivo cambia.
- **Criterio medible:** `astro check` + `astro build` en verde; script de contraste (gate A4) con los 6 pares acento/tiza ≥ 4.5, los 5 suaves/basalto ≥ 7 y `error-hondo`/tiza ≥ 4.5; grep de clases de color sin token en `estilos.ts` (`cesped-hover`, otros `hover:bg-*` sin token) → 0 coincidencias.
- **Gate:** `astro check` + `astro build` + script de contraste.

### Lote 2 (L2, Oscar) — componentes firma
- **Acción:** `PatronCancha` acepta `data-deporte` y pinta el croquis en la tinta correspondiente (mismos trazos, `currentColor` o utilidades por token, 0 hex); crear `CintaPitazo.astro` (marquee con gate de movimiento, `aria-hidden`, contenido desde `DISTRITOS`/`TIPOS`).
- **Decisión SlotBoard (cambio sin dueño, se adopta):** el tablero «Libres hoy» conserva punto con pulso, h2 display, flecha y rótulo «Tablero en vivo». Criterio: el rótulo es veraz porque los datos se piden al cargar (`tablero.ts:130` ejecuta `elegir(hora, false)` al iniciar, con `GET /api/canchas/disponibles`); el pulso lleva `motion-safe:animate-pulse` y `aria-hidden`. Si el fetch al cargar desapareciera en el futuro, el rótulo se retira.
- **Criterio medible:** igual que L1 + 0 hex en ambos archivos + animación 100% con gate.
- **Gate:** `astro check` + `astro build`.

### Lote 3 (L3, Oscar) — home + buscador
- **Acción:** `index.astro`: tarjetas de «Todos los deportes» con franja en su tinta + `CintaPitazo` bajo el hero (una sola). `canchas.astro` + `filas.ts`: chip de deporte en su tinta (vía `data-deporte` en `filaCancha`) + número fantasma por tarjeta. Cambio permitido en `filas.ts`: solo clases y el atributo `data-deporte` en la plantilla de fila; el fetch, el parseo y el orden de `canchas.ts`/`tablero.ts` quedan intactos. Copy, filtros y lógica intactos.
- **Criterio medible:** igual que L1 + captura 1440/375 sin scroll horizontal + una sola tinta por vista fuera de la sección de deportes.
- **Gate:** `astro check` + `astro build`.

### Lote 4 (L4, Oscar) — dueños + torneos + planes
- **Acción:** `duenos.astro`: sello verificado + marcador gigante con conteos reales. `torneos.astro`: banda en tinta del deporte destacado. `Planes.astro`: plan destacado con borde en tinta fútbol; precios, notas y CTAs intactos. Requiere el merge previo de Spec 33 L3 (mismos archivos).
- **Criterio medible:** igual que L3 + diff sin líneas de datos/precios/enlaces tocadas.
- **Gate:** `astro check` + `astro build`.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Astro build | `npm --prefix reservaya-frontend-astro run build` | 0 errores (17 págs) |
| A3 | Identidad intacta | `grep` de hex fuera de `tokens.css` en archivos tocados | 0 hex, 0 tokens fuera de §4.1 |
| A4 | Contraste AA medido | Script node que calcula ratios de los pares de §4.1 | acento/tiza ≥ 4.5, suave/basalto ≥ 7 |
| A5 | Sin *scroll* horizontal | Captura a 375px y 1440px por página tocada | 0px extra (línea base spec 26/28) |
| A6 | Motion con gate | Inspección de animaciones añadidas (cinta, reveals) | 100% con `motion-safe`/`motion-reduce` o `prefers-reduced-motion`, solo `transform`/`opacity` |
| A7 | Pre-flight skills | Revisión contra `design-taste-frontend` §14 (subconjunto: eyebrows ≤ 1/3 secciones, marquee ≤ 1/página, 0 em-dash en copy nuevo, sin fotos, sin puntos decorativos, sin franjas de lugar/hora) | 0 violaciones |

---

## 6. Checklist

- [x] T1: inventario de color (mapa-s33.md de Toby recibido: 0 huérfanos, 6 hex de sombras migrables, 4 tokens en reserva, bug `cesped-hover`/`error-hondo` en `estilos.ts`).
- [x] T2: paleta por deporte con ratios calculados (§4.1) + 5 elementos firma (§4.2) + lotes ≤3 archivos secuenciales para Oscar (§3–§4).
- [x] T3: criterios medibles con gates (§5, incluye script de contraste A4 y pre-flight A7).
- [x] T4: decisiones §2 aprobadas por Lukas (paleta, cinta con/sin movimiento, alcance panel).
- [ ] T5: con «aprobado», despachar L1 a Oscar; cada lote verde de Jim lo reviso vs spec y anoto §7.
- [ ] T6: verificar criterios y anotar en §7.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Redacción (T1–T3) | ✅ Propuesta lista | Inventario grep propio (19 tokens + 6 hex de sombras en `estilos.ts:16`, `completar-cuadro:54,103`, `sortear:27,290`); `TIPOS` (`arequipa.ts:13-22`); diales y reglas de specs 26/27/32/33; skills `impeccable`, `design-taste-frontend`, `frontend-design` leídas. Sin código tocado. Pendiente: T4 (Lukas). |
| 2026-09-29 | Mapa Toby recibido (T1) | ✅ Spec actualizada | `mapa-s33.md` confirma 0 colores huérfanos (6 hex son sombras `basalto`/`cesped` migrables a `shadow-dura*`) y 4 tokens en reserva (`alerta`, `alerta-suave`, `alerta-hondo`, `sol-suave`); corrijo conteo de §1/§7 y agrego a L1 el bug real (`estilos.ts:8,11` llaman tokens inexistentes `cesped-hover`/`error-hondo`, descartados en silencio). Reserva `alerta`/`sol-suave` anotada como no reutilizable para tintas. |
| 2026-09-29 | 3 ajustes god pre-aprobación (T4) | ✅ Spec actualizada, sigue Propuesta | (1) `filas.ts` entra a L3 como cambio permitido (filas de `/canchas` las arma `filaCancha:84-132`; solo clases + `data-deporte`, 0 lógica; también viste el tablero de la home vía `tablero.ts:100`). (2) Básquet pasa de `brasa` a `miel` `#9E6200` (tiza 5.0): el brasa era indistinguible de `arcilla` y rozaba `error`; `miel` nuevo se verifica en A4. (3) Marcador gigante limitado a `.length` de consts del archivo (`DISTRITOS`, `TIPOS`, `pasos`, `modulos`, `preguntas`, `distritosTop`); prohibidos usuarios/reservas/cifras de negocio. Contrastes verificados por god (≥4.5, suaves/basalto ≥12). |
| 2026-09-29 | Hover de botones a L1 (god) | ✅ Spec actualizada, sigue Propuesta | `BOTON.primario:8` → `hover:bg-cesped-hondo` (tiza 6.6); `BOTON.peligro:11` → token nuevo `error-hondo` `#8F1B13` (tiza 9.0 calculado, A4 lo verifica); L1 pasa a 11 tokens y criterio «0 clases de color sin token en `estilos.ts`». |
| 2026-09-29 | SlotBoard a L2 (god) | ✅ Se adopta, sigue Propuesta | Cambio sin dueño adoptado en L2 (3 archivos): rótulo «Tablero en vivo» veraz (fetch al cargar en `tablero.ts:130`), pulso con `motion-safe` y `aria-hidden`; si el fetch al cargar desaparece, el rótulo se retira. |
