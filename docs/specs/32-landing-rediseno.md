# Especificación: 32 - Rediseño de la landing con las skills de diseño

> **Estado:** ✅ **Aprobada por Lukas (2026-09-29): "dale, full estético, innovador".** Decisiones §2: (1) croquis a gran escala en el hero — sí; (2) quitar "Libres mañana" de login/register; (3) distritos: top curado + "ver todos". Diales subidos por orden de Lukas: `DESIGN_VARIANCE: 8` · `MOTION_INTENSITY: 5` (con `prefers-reduced-motion`) · `VISUAL_DENSITY: 5`.
> **Origen:** Orden de Lukas vía god (`req-20260929-pam-s32`): "mejora el diseño, usa las skills que instalé, la página parece muy básica". Aplica `impeccable` (critique + new-work), `design-taste-frontend` y `frontend-design` sobre `reservaya-frontend-astro` (inicio, `/canchas`, login/register).

---

## 1. Objetivo

**Problema:** la landing es funcionalmente completa (spec 20-28) pero visualmente plana — evidencia concreta de una ronda de capturas en vivo (`localhost:4321`, escritorio 1440px) y lectura del código fuente:

1. **El hero no tiene ningún elemento visual real** (`src/pages/index.astro:39-61`): fondo `bg-noche` sólido + título + subtítulo + formulario en una tarjeta blanca. Viola `design-taste-frontend` §4.8: *"Hero needs a real visual. Text + gradient blob is not a hero."* Además deja mucho espacio vertical muerto entre el formulario y el borde de la sección (el hero mide ~320px de alto en un viewport de 900px).
2. **"Cómo funciona" (`index.astro:63-76`) es el patrón prohibido de 3 tarjetas idénticas en columna**, solo con un número (1/2/3) como único elemento visual. `design-taste-frontend` §9.C: *"NO 3-column equal feature cards... banned."*
3. **Repetición de familia de layout**: "Todos los deportes" (`index.astro:78-93`) y "Cobertura en los 29 distritos" (`index.astro:95-112`) son la MISMA familia (h2 + subtexto + lista de chips) una justo debajo de la otra, solo alternando fondo blanco/`cielo`. `design-taste-frontend` §4.7: *"Section-Layout-Repetition Ban... that family can appear at most ONCE."* Además, 29 chips de distrito de un tirón es el anti-patrón "Wall of Options" del checklist de carga cognitiva de `impeccable/critique.md`.
4. **Bug real confirmado en vivo** (no solo estético): el widget "Libres mañana" reutilizado en login/register (`src/components/AuthTablero.astro`) se renderiza roto en escritorio — el nombre del deporte ("Tenis", "Básquet", "Fútbol") se superpone sobre el texto de la fila ("08:00 Golazo Cancha Tenis A…"). Capturado en `/login` y `/register` a 1440px. El propio comentario del archivo (`AuthTablero.astro:2-6`) admite haber detectado este recorte a 1024px y lo resolvió ocultando el panel por debajo de `xl` (1280px) — pero la prueba en vivo de esta spec muestra que **1280/1440px tampoco alcanza**: la columna real (~512px con la tarjeta de login al lado) sigue siendo más angosta que el grid de 6 columnas que arma `filaCancha` en `src/scripts/filas.ts:93,136` (`sm:grid-cols-[3.5rem_3.5rem_minmax(0,1.3fr)_minmax(0,1fr)_4rem_6rem]`, activo desde 640px de **viewport**, no de columna). Mezclar el tablero de disponibilidad en el flujo de login además es, por sí solo, ruido de conversión (Nielsen #8, Aesthetic and Minimalist Design).
5. **Cero imágenes/ilustración en toda la página de inicio.** La única firma visual propia (el "croquis de cancha" de spec 24/31) no aparece nunca en el marketing de la home, solo como *fallback* de foto en tarjetas de cancha.

No hay capturas móviles fiables en esta ronda: la herramienta de navegador de esta sesión no respetó el `resize_window` a 390×844 (la captura salió con el layout de escritorio de 1440px de todas formas — limitación de la herramienta, no del sitio). El comportamiento móvil ya verificado en specs 26/28 (0 *scroll* horizontal a 375px, Playwright) se toma como línea base; cada lote de esta spec repite esa verificación al implementarse.

**Resultado esperado:** la landing gana una dirección visual concreta y distintiva —evolucionando la paleta de spec 26 (`cesped`/`noche`/`cielo`) y el lenguaje táctil de spec 27 (`card-tactil`, `btn-tactil`, `chip-tactil`, sombras duras)— sin reemplazarlas: un hero con presencia visual real, sin patrones de sección prohibidos ni repetidos, y sin el bug de superposición en las páginas de cuenta. Aprobación de Lukas requerida antes de tocar código.

---

## 2. Fuera de alcance

- Escribir código de ningún lote: esta spec es 100% diagnóstico y propuesta (`docs/specs/32-landing-rediseno.md` es el único archivo que cambia aquí).
- `reservaya-nextjs-api/**` (panel admin/jugador) — cubierto por spec 29; esta spec es solo `reservaya-frontend-astro/src/**` y `public/**` (límite explícito de god).
- Backend, endpoints o contratos de datos: ningún lote propuesto los toca.
- Generación de fotografía real de canchas (no hay herramienta de generación de imágenes disponible en este entorno) — se propone usar y escalar el croquis ya aprobado (spec 24/31) en vez de fotos de stock genéricas o divs simulando capturas de pantalla (`design-taste-frontend` §4.8, §9.E prohíbe ambas).

**Decisiones de producto que requieren aprobación (de Lukas, antes de cualquier lote):**
1. Dirección visual del hero (§4, Lote L1): escalar el croquis de cancha como fondo decorativo del hero, en vez de una imagen de stock o dejarlo como está.
2. Qué hacer con "Libres mañana" en login/register (§4, Lote L4): quitarlo (login/register quedan enfocados solo en el formulario, sin tablero) vs. rediseñarlo a una sola columna angosta que sí quepa sin superponerse.
3. Reducir la lista de 29 distritos de la home a un top curado + "ver todos" (§4, Lote L2), en vez de imprimir los 29 de un tirón.

---

## 3. Archivos afectados (propuesta de lotes, ningún archivo tocado todavía)

Lotes de ≤3 archivos, pensados para repartirse entre dos desarrolladores (pam-dev / Oscar) sin que ambos toquen el mismo archivo en paralelo. `index.astro` es un solo archivo con las 7 secciones de la home: sus lotes (L1, L2) son secuenciales, no paralelos entre sí.

| Archivo | Acción | Propósito | Lote |
|---|---|---|---|
| `reservaya-frontend-astro/src/pages/index.astro` | Modificar | Hero: visual real (croquis a escala), disciplina de `viewport` (§4.7), CTA sin cambiar el formulario/lógica. | L1 |
| `reservaya-frontend-astro/src/components/ui/PatronCancha.astro` | Crear | Versión decorativa a gran escala del croquis (spec 24/31) para el fondo del hero — reutiliza los mismos tokens (`cesped`, `cesped-suave`), no inventa colores. | L1 |
| `reservaya-frontend-astro/src/pages/index.astro` | Modificar | "Cómo funciona" a composición asimétrica (rompe el patrón de 3 tarjetas iguales); fusiona/diferencia "Todos los deportes" vs. "Distritos" (top curado + "ver todos"). | L2 |
| `reservaya-frontend-astro/src/components/AuthTablero.astro` | Modificar | Arreglar o simplificar el tablero de login/register: columna angosta de una sola fila por cancha (sin el grid de 6 columnas), o retirarlo (según decisión §2.2). | L3 |
| `reservaya-frontend-astro/src/scripts/filas.ts` | Modificar | Si se conserva el tablero angosto: nueva variante de `filaCancha` sin el `sm:grid-cols-[...]` de 6 columnas para el contexto de cuenta. | L3 |
| `reservaya-frontend-astro/src/pages/login.astro` | Modificar | Ajustar el layout de 2 columnas si `AuthTablero` se retira o se angosta (según decisión §2.2). | L4 |
| `reservaya-frontend-astro/src/pages/register.astro` | Modificar | Mismo tratamiento que `login.astro`. | L4 |
| `reservaya-frontend-astro/src/pages/canchas.astro` | Modificar | Pulir la tabla de resultados con el mismo lenguaje visual del hero rediseñado (menor prioridad, al final). | L5 |

---

## 4. Diseño y lógica (dirección visual propuesta)

**Design Read** (formato `design-taste-frontend` §0): *Plataforma deportiva de reserva de canchas en Arequipa, tablero de cancha neo-brutalista táctil (spec 27), con una sola paleta (césped/basalto/tiza + noche/cielo de spec 26). Persuade en la home, Operate en `/canchas`.*

**Diales:** `DESIGN_VARIANCE: 6` (igual que spec 29, mantiene coherencia entre panel y landing) · `MOTION_INTENSITY: 3` (sin cinemática, solo el `btn-press`/`btn-tactil` ya existente) · `VISUAL_DENSITY: 5`.

### Lote 1 (L1) — Hero con visual real
- **Skill:** `design-taste-frontend` §4.7 *Layout Discipline* (hero cap de `pt-24`, headline ≤2 líneas, máx. 4 elementos de texto — ya se cumple) + §4.8 *Image & Visual Asset Strategy* (hero necesita un visual real).
- **Acción:** crear `PatronCancha.astro`: el mismo croquis de perímetro/línea media/círculo central (spec 24/31, `bg-cesped-suave`, `border-cesped/40`) pero a escala grande (ocupando buena parte del ancho del hero), como capa decorativa `aria-hidden` detrás o al lado del formulario de búsqueda — **no** reemplaza el `SlotBoard` (que sigue siendo el dato real de "libres ahora"), lo acompaña. Sin SVG externo, sin foto de stock, sin dependencia nueva — mismos tokens. Subir ligeramente la escala tipográfica del `<h1>` dentro del rango sugerido (`text-4xl md:text-5xl lg:text-6xl`) ya que hoy usa `text-3xl lg:text-4xl`, en el extremo bajo.
- **Criterio medible:** captura visual del hero sin espacio muerto entre el formulario y el borde de la sección; `astro check`/`astro build` en verde; 0 tokens de color nuevos (`grep` de hex fuera de `tokens.css` en el archivo → 0).
- **Gate:** `astro check` + `astro build`.

### Lote 2 (L2) — "Cómo funciona" + consolidar deportes/distritos
- **Skill:** `design-taste-frontend` §4.7 *Layout Discipline* (Section-Layout-Repetition Ban, ban de 3 columnas iguales) + `impeccable/critique.md` (Cognitive Load Checklist, "Wall of Options").
- **Acción:** "Cómo funciona" pasa de 3 columnas idénticas a una composición asimétrica (p. ej. paso 1 destacado con el croquis en miniatura, pasos 2-3 agrupados) — mantiene el mismo copy, no se inventa nada nuevo (regla de spec: el copy sale de datos ya existentes). "Todos los deportes" y "Distritos" dejan de ser el mismo patrón repetido: distritos pasa a un top curado (p. ej. los distritos con canchas activas) + enlace "ver los 29 distritos" hacia `/canchas`, evitando imprimir 29 chips de un tirón.
- **Criterio medible:** inspección de que no hay dos secciones consecutivas con la misma familia de layout; `astro check`/`astro build` en verde.
- **Gate:** `astro check` + `astro build`.

### Lote 3 (L3) — Arreglo del tablero en cuentas (bug real)
- **Skill:** `design-taste-frontend` §4.4 *Materiality, Shadows, Cards* + Nielsen #8 (Aesthetic and Minimalist Design, ver la decisión 2 del §2).
- **Acción:** según la decisión de Lukas en §2: (a) si se conserva, `AuthTablero.astro` pasa a una sola fila por cancha sin el grid de 6 columnas que fuerza el `sm:` de `filas.ts` (una variante angosta de `filaCancha`, ver §3); (b) si se retira, `AuthTablero.astro` se borra y `login.astro`/`register.astro` quedan a una sola columna centrada (lote 4).
- **Criterio medible:** captura en `/login` y `/register` a 1280px y 1440px sin texto superpuesto (antes: roto en ambos).
- **Gate:** `astro check` + `astro build`.

### Lote 4 (L4) — Layout de `login.astro`/`register.astro`
- **Skill:** `design-taste-frontend` §4.7 (disciplina de layout de una sola columna si se retira el tablero).
- **Acción:** depende de la decisión de L3. Si se retira `AuthTablero`, ambas páginas pasan de `grid` de 2 columnas a una tarjeta centrada de ancho máximo (`max-w-md`), sin tocar el formulario ni la lógica de auth.
- **Criterio medible:** `astro check`/`astro build` en verde; 0 cambios en la lógica de envío de formularios.
- **Gate:** `astro check` + `astro build`.

### Lote 5 (L5) — `/canchas` (menor prioridad, al final)
- **Skill:** `design-taste-frontend` §4.4.
- **Acción:** alinear la tabla de resultados con el lenguaje visual que salga de L1/L2 (p. ej. si el hero incorpora el croquis, usarlo también como estado vacío de "sin resultados" — ya cubierto en parte por spec 31 en el panel, aquí es el equivalente en Astro vía `EmptyState.astro`, ya existente, sin tocarlo).
- **Criterio medible:** `astro check`/`astro build` en verde.
- **Gate:** `astro check` + `astro build`.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Astro build | `npm --prefix reservaya-frontend-astro run build` | 0 errores |
| A3 | Sin 3-columnas-iguales ni layout repetido consecutivo | Inspección de `index.astro` por sección | 0 secciones consecutivas de la misma familia |
| A4 | Hero con visual real | Captura del hero | Croquis/patrón visible, sin espacio muerto entre form y borde |
| A5 | Sin *scroll* horizontal | Captura a 375px y 1440px | 0px de `scrollWidth` extra (línea base spec 26/28) |
| A6 | Tablero de cuentas sin superposición | Captura en `/login`, `/register` a 1280px y 1440px | 0 texto superpuesto (hoy: roto) |
| A7 | Identidad spec 26/27 intacta | `grep` de hex fuera de `tokens.css` en archivos tocados | 0 tokens nuevos, 0 hex huérfanos |

---

## 6. Checklist
- [x] T1: diagnóstico con 1 ronda de capturas (escritorio; móvil con limitación de herramienta anotada en §1) + lectura de código de `index.astro`, `AuthTablero.astro`, `filas.ts`, `tablero.ts`.
- [x] T2: dirección visual concreta citando `design-taste-frontend`/`impeccable` sección por hallazgo.
- [x] T3: lotes ≤3 archivos repartibles entre dev-claude y Oscar (§3), sin colisión de archivos en paralelo.
- [x] T4: criterios medibles (§5).
- [x] T5: mandar esta spec a auditor-b.
- [ ] T6: avisar a god con el resumen y esperar aprobación de Lukas antes de cualquier lote.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | Diagnóstico (T1-T2) | ✅ Completo | Capturas en vivo a 1440px de `/`, `/canchas`, `/login`, `/register` (claude-in-chrome); bug de superposición confirmado 2 veces (login y register); código fuente leído (`index.astro`, `AuthTablero.astro:2-6`, `filas.ts:93,136`, `tablero.ts`). Móvil: `resize_window` a 390×844 no cambió el render capturado (misma resolución 1568×772 reportada en ambos intentos) — limitación de la herramienta de esta sesión, anotada, no bloquea el diagnóstico de escritorio. |
| 2026-09-29 | Revisión auditor-b (alcance, lotes, criterios, Spec 26/27) | ✅ APROBADA con 3 micro-correcciones | Alcance acotado (§2 respeta límites de god: solo Astro+`public/`, sin backend, sin fotos); lotes ≤3 sin choques (L1/L2 secuenciales en `index.astro`, L4 depende de L3, archivos distintos en paralelo); A1–A7 medibles; Spec 26/27 intactas (mismos tokens, croquis 24/31, sin dependencias). Corregido: `(yo/Oscar)`→`(pam-dev/Oscar)`, `§2.2`→`decisión 2 del §2`, T5 marcado (spec recibida). Archivos citados verificados existentes. Las 3 decisiones del §2 quedan a god/Lukas. |
| _Pendiente_ | A1-A7 | | Se verifican cuando Lukas apruebe y se ejecuten los lotes. |
