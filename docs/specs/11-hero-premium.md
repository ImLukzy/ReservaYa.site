# Especificación: 11 - Hero premium de la landing (`/`)

## 1. Objetivo
**Problema:** el hero de `reservaya-frontend-astro/src/pages/index.astro:36-87` tiene buen tipo, pero falla en carga, foco y accesibilidad:
- **Carga:** 3 fondos enlazados de `images.unsplash.com` a `w=2000` (L38-40), sin `srcset`/`sizes`, sin `width`/`height`, sin `fetchpriority`. Tienen fallback con `onerror` inline. Las slides 2-3 son `loading="lazy"`, pero están dentro del viewport (solo con `opacity-0`), así que se descargan igual al entrar.
- **Parpadeo gris:** mientras carga el fondo, el `<img>` pinta #e5e7eb. Lo causa la regla sin capa `img { background: #e5e7eb }` de `global.css:263-270`, que además gana a cualquier utilitario de Tailwind.
- **Ruido visual:** compiten por atención el handle `@reservaya.pe` (L47), el badge con `animate-ping` (L48-51), tres indicadores de carrusel separados (puntos, barra y contador, L74-80) y el aviso de scroll (L83-86).
- **Accesibilidad:** el carrusel rota cada 6 s y el ken burns dura 22 s en bucle, y solo se detienen con `mouseenter`. No hay forma de pausarlos con teclado ni en táctil (WCAG 2.2.2). Los puntos están en un `role="tablist"` sin `role="tab"` (ARIA inválido) y miden 6 px de alto (WCAG 2.5.8 pide ≥ 24 px). Las 3 imágenes son decorativas pero tienen `alt` descriptivo, así que el lector de pantalla las anuncia.
- **Copy:** el badge (L50) y la meta description (L32) dicen «todo el Perú»; el producto opera en Arequipa (29 distritos).
- **Altura:** `min-h-[94vh]` salta en móvil al ocultarse la barra del navegador.

**Resultado esperado:** los fondos se sirven optimizados desde el propio build (AVIF/WebP, `srcset`), cargando primero el que se ve. No hay parpadeo gris. Hay un solo control de carrusel, compacto y pausable con teclado o táctil. El copy apunta a Arequipa. Hero premium por contención: no se añade ningún efecto nuevo.

## 2. Fuera de alcance
- **Búsqueda dentro del hero** (distrito/deporte → `/canchas?…`): `canchas.astro` no lee parámetros de URL. Va en otra spec.
- **Resto del copy «todo el Perú»:** `layouts/BaseLayout.astro:72`, `index.astro:248,307`, `completar-cuadro.astro:22` y los pines del mapa con distritos de Lima (`index.astro:5-10`).
- **`src/assets/images/*.jpg`** (4 fotos de plantilla, ~20 MB, sin uso). Se limpian en otra spec.
- Reglas de hero en `global.css:526-553` (`kenburns`, `hero-progress`, `text-glow-green`, `text-shadow-hero`), `motion.css`, el `h1` y su animación por letras, la franja de 4 datos (L65-72), el resto de secciones y el panel.
- `astro.config.mjs`, porque está fuera del territorio de la rama. Por eso no se usan imágenes remotas vía `image.domains`.

**Decisiones de producto que requieren aprobación:**
1. **Copy Arequipa:** badge L50 → «Arequipa · Canchas en 29 distritos». Meta L32 → «Reserva canchas en minutos en Arequipa. Sin llamadas, sin WhatsApp. Pago con Yape, tarjeta y QR.»
2. **Fondos locales:** las mismas 3 fotos de Unsplash (licencia Unsplash, uso comercial sin atribución) se descargan a `src/assets/hero/` (~3 JPG, con 2400 px de ancho). Son binarios nuevos en el repo.
3. **Quitar ruido:** se elimina `@reservaya.pe` (L47) y el aviso de scroll se oculta por debajo de `md`.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/assets/hero/aereo.jpg` | crear | Unsplash `photo-1554068865-24cecd4e34b8`, 2400×1600 |
| `reservaya-frontend-astro/src/assets/hero/futbol.jpg` | crear | Unsplash `photo-1574629810360-7efbbe195018`, 2400×1600. Sustituye a `estadio-noche.jpg`: `photo-1508098682722-e99c43a406b2` da 404 en Unsplash (en producción ya caía al `onerror` y repetía la foto 1). Es la foto que el propio código usaba de fallback (L38) |
| `reservaya-frontend-astro/src/assets/hero/padel.jpg` | crear | Unsplash `photo-1622163642998-1ea32b0bbc67`, recortada a 2400×1600 (el original es vertical) |
| `reservaya-frontend-astro/src/pages/index.astro` | modificar | Frontmatter (import de `Picture` y de las 3 fotos). L32 meta, L36 altura, L37-41 fondos, L47 handle, L50 badge, L74-80 control, L83 aviso de scroll. Script del carrusel (L451-477). `<style is:global>` (L394-395) |
| `PLAN_OTRO_AGENTE.md` | modificar | §6: fila del ítem |

## 4. Diseño y lógica
- **Fondos (L37-41):** `import { Picture } from "astro:assets"` y un `map` sobre las 3 fotos. Cada una: `<Picture src alt="" formats={["avif","webp"]} widths={[640,1024,1600,2000]} sizes="100vw" decoding="async">`.
  - Slide 0: `loading="eager" fetchpriority="high"` y `hero-bg is-active opacity-100`.
  - Slides 1-2: `loading="lazy" fetchpriority="low"` y `hero-bg opacity-0`.
  - El contenedor `#hero-slides` lleva `aria-hidden="true"`. Se eliminan los `onerror` inline.
  - La clase `hero-bg` sigue en el `<img>`, así que el script (`.hero-bg`) y el ken burns no cambian.
- **Sin parpadeo gris (`<style is:global>`, L394):** `.hero-bg { background: transparent; }`. Es CSS sin capa con especificidad (0,1,0), así que gana a `img` (0,0,1) de `global.css:263`. Mientras carga se ve el `bg-[#040705]` de la sección.
- **Altura (L36):** `min-h-[94vh]` → `min-h-[94svh]`.
- **Foco (L47-51, L83):**
  - Se elimina el `<p>` de `@reservaya.pe`.
  - Badge: se mantiene el estilo (`border-white/15 bg-black/50 … text-[#4ADE80]`) y el punto `animate-ping`, y cambia el texto (decisión 1).
  - Aviso de scroll: `flex` → `hidden md:flex`.
- **Control único del carrusel (sustituye L74-80):** una píldora `mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/40 py-1.5 pl-1.5 pr-4 backdrop-blur-xl` con este contenido:
  1. `<button id="hero-pause" type="button" aria-pressed="false" aria-label="Pausar fondos">`, 32×32 px, `rounded-full bg-white/10 text-white hover:bg-white/20`, con glifo ❚❚ o ▶.
  2. `#hero-counter` («01 / 03», `tabular-nums text-white/60`).
  3. `#hero-progress` (barra `w-12`).
  4. `#hero-dots` con `role="group" aria-label="Fondos del hero"`. Cada punto es un `<button aria-pressed aria-label="Fondo N de 3">` con área `h-6 min-w-6` y una barra visual interna (`h-1.5`, activa `w-7 bg-[#4ADE80]`, inactiva `w-2 bg-white/30`).
- **Script (L451-477, `<script>` procesado, TS):**
  - Estado `heroPaused`. El clic en `#hero-pause` alterna la pausa, `aria-pressed`, `aria-label` («Pausar fondos» / «Reanudar fondos»), el glifo y el atributo `data-hero-paused` de la `<section>`.
  - `autoHero()` no arranca si está en pausa o con `reduceMotion`.
  - Se pausa en `mouseenter` y `focusin` y se reanuda en `mouseleave` y `focusout`, salvo que la pausa sea manual.
  - Con `visibilitychange` se detiene mientras la pestaña está oculta.
  - `showHero()` actualiza `aria-pressed` de los puntos.
  - Con `reduceMotion`, `#hero-pause` queda con `hidden`, porque no hay nada que se mueva.
- **Pausa visual (`<style is:global>`):** `[data-hero-paused] .hero-bg.is-active, [data-hero-paused] .hero-progress { animation-play-state: paused; }`.
- **API:** ninguna. Sin `BLOQUEO-API`.
- **Invariantes:**
  - El `h1`, su animación `letters` y la franja de datos quedan igual.
  - Los colores cumplen la spec 10: todo texto nuevo lleva su propio `text-*`.
  - Sin `innerHTML` ni `console.*`.
  - Sin scroll horizontal a 375 px.
  - Cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Build | `npm --prefix reservaya-frontend-astro run build` | OK; el HTML de `/` lleva `<picture>` con `source` AVIF y WebP |
| A3 | Carga | Playwright sobre `astro preview`, en `/` | 0 peticiones a `images.unsplash.com`. La primera imagen, `eager` + `fetchpriority=high`. Bytes de fondos a los 3 s: ≤ 300 KB a 375 px, ≤ 900 KB a 1280 px y ≤ 50 % de la línea base T1 |
| A4 | Sin parpadeo | `getComputedStyle(.hero-bg).backgroundColor` | `rgba(0, 0, 0, 0)` |
| A5 | Pausa | Clic en `#hero-pause` → esperar 7 s | El índice no cambia, `animation-play-state` = `paused` y `aria-pressed="true"`. Al reanudar, rota en ≤ 7 s |
| A6 | Teclado y ARIA | Tab hasta un punto → esperar 7 s. Consultar el DOM del hero | No rota con el foco dentro. 0 `[role=tablist]`. Los puntos tienen `aria-pressed`. `#hero-slides[aria-hidden=true]`, imágenes con `alt=""` |
| A7 | Área táctil | `getBoundingClientRect` de los puntos y de `#hero-pause` | ≥ 24×24 px |
| A8 | Movimiento reducido | Playwright con `reducedMotion: "reduce"` | Sin rotación en 7 s; `#hero-pause` oculto |
| A9 | Móvil | 375 px: `scrollWidth <= clientWidth`; alto del hero con `svh` | Sin scroll horizontal |
| A10 | Visual | Capturas antes y después a 375/1280 px (scratchpad) | Revisadas: sin `@reservaya.pe`, un solo control, badge de Arequipa |
| A11 | Alcance | `git status --short` | Solo los archivos de §3 |

## 6. Checklist
- [x] T1: Línea base: build + `astro preview`. Medir peticiones y bytes de fondos a 375/1280 px y tomar capturas (scratchpad).
- [x] T2: Descargar las 3 fotos (mismos IDs, `w=2400&q=85`) a `src/assets/hero/`.
- [x] T3: `index.astro`: frontmatter y fondos con `<Picture>` (L37-41).
- [x] T4: `index.astro`: meta (L32), altura (L36), quitar handle (L47), badge (L50), control único (L74-80) y aviso de scroll (L83).
- [x] T5: `index.astro`: script del carrusel (pausa, foco, visibilidad, `aria-pressed`, `reduceMotion`).
- [x] T6: `index.astro` `<style is:global>`: `.hero-bg { background: transparent }` y la regla de `data-hero-paused`.
- [x] T7: A1–A11, anotar en §7 y actualizar `PLAN_OTRO_AGENTE.md` §6.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | Línea base (T1) | — | Fondos a los 3 s: 1918 KB a 375 y a 1280 px. 2 peticiones a Unsplash (la foto 2 daba 404 y caía al fallback). El aviso de scroll tapaba el contador a 375 px |
| 2026-09-26 | A1 | ✅ | `astro check`: 0 errores, 0 warnings, 2 hints |
| 2026-09-26 | A2 | ✅ | `npm run build`: 21 páginas. `dist/index.html`: 3 `<picture>`, 3 `source` AVIF y 3 WebP, 0 `unsplash` |
| 2026-09-26 | A3 | ✅ | 0 peticiones a Unsplash. Primera imagen `eager` + `fetchpriority=high`. Fondos: 65 KB a 375 px y 444 KB a 1280 px, AVIF (−97 % / −77 % frente a 1918 KB) |
| 2026-09-26 | A4 | ✅ | `.hero-bg` → `rgba(0, 0, 0, 0)` a 375 y 1280 px |
| 2026-09-26 | A5 | ✅ | La pausa congela el índice 7 s, con `animation-play-state: paused` en el fondo y la barra, `aria-pressed=true` y la etiqueta «Reanudar fondos». Al reanudar, rota (375/1280) |
| 2026-09-26 | A6 | ✅ | Con el foco en un punto no rota. 0 `role=tablist`. `aria-pressed` en los puntos, `#hero-slides[aria-hidden=true]`, `alt=""` |
| 2026-09-26 | A7 | ✅ | Puntos y botón de pausa ≥ 24×24 px (375/1280) |
| 2026-09-26 | A8 | ✅ | Con `reducedMotion: reduce`, sin rotación en 7 s y `#hero-pause` en `display: none` |
| 2026-09-26 | A9 | ✅ | 0 px de scroll horizontal a 375 y a 1280 px. `min-height` en `svh` |
| 2026-09-26 | A10 | ✅ | Capturas antes y después (375/1280): sin `@reservaya.pe`, un solo control, badge de Arequipa, aviso de scroll oculto en móvil. Contraste medido del contador y el badge sobre las 3 fotos: peor caso 7.23:1 |
| 2026-09-26 | A11 | ✅ | `git status`: `index.astro`, `src/assets/hero/` (3 JPG), esta spec y `PLAN_OTRO_AGENTE.md` |
| 2026-09-26 | Nota | — | Hay una línea de 1 px más clara en el borde izquierdo del hero a 375 px. Ya existía antes (idéntica con `reduce`) y sale de `transform: scale(1.02)` en `.hero-bg` (`global.css:529`). Queda fuera de alcance |
