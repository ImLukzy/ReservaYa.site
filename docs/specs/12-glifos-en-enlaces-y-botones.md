# Especificación: 12 - Glifos y etiquetas dentro de enlaces y botones heredan el color del control

## 1. Objetivo
**Problema:** la capa base de `reservaya-frontend-astro/src/styles/global.css` (TYPOGRAPHY, `span, li, em { color: var(--text-soft) }`) pinta de #8A938D todo `<span>` sin clase de color, también dentro de `<a>` y `<button>`. Las flechas, iconos y fragmentos de etiqueta no toman el color del control: en el CTA principal del hero, «Buscar canchas →» sale con la flecha gris sobre verde. El escaneo de `src/**/*.astro` encuentra 29 nodos estáticos:

| Superficie | Nodos (archivo:línea) | Hoy | Tras el fix |
|---|---|---|---|
| CTA verde #22C55E, texto blanco | `404.astro:12`, `500.astro:12`, `completar-cuadro.astro:31`, `duenos.astro:60,302,438`, `index.astro:75,406`, `mis-reservas.astro:15` | #8A938D · 1.39:1 | #FFF · 2.28:1 (igual que la etiqueta) |
| CTA verde #16A34A, texto blanco | `canchas.astro:97`, `completar-cuadro.astro:73,164`, `forgot-password.astro:26`, `login.astro:47`, `register.astro:74,104` | #8A938D · 1.04:1 | #FFF · 3.30:1 |
| Enlace/botón sobre oscuro | `Footer.astro:16` (✉ ↗), `BaseLayout.astro:310` (icono del nav), `BaseLayout.astro:340` («Mi cuenta»), `completar-cuadro.astro:32`, `duenos.astro:422`, `forgot-password.astro:36` | #8A938D · 6.0–6.6:1, pero con otro color que la etiqueta | Color del control: #FFF, `text-white/90` o #4ADE80 (≥ 11:1) |
| Botón/enlace claro | `login.astro:55` (◔◔), `sortear.astro:84` (◔◔), `sortear.astro:109` (⨯), `mejoras.astro:42` (➤) | #8A938D · 2.61–3.16:1 | Color del control: #101613 18.32, #15803D 4.79/4.14, #8A938D (sin cambio) |

Hay además spans creados por script dentro de botones que caen en el mismo caso: `sortear.astro:192-195` (`plus` y `label` en un botón `text-[#15803D]`), hoy 3.02:1 y 4.79:1 tras el fix.

Aparte, un avatar con fondo propio y sin color de texto: `duenos.astro:397` (`bg-[#22C55E] font-black`, inicial del testimonio) → #8A938D sobre verde, 1.39:1.

**Resultado esperado:** todo `span`/`em`/`strong` sin clase de color dentro de un enlace o botón toma el color del control. Ningún nodo empeora su contraste.

## 2. Fuera de alcance
- **Contraste de marca del CTA verde:** texto blanco sobre #22C55E da 2.28:1 en todas las etiquetas. Este fix alinea los glifos con esa etiqueta, pero cambiar el verde o el color del texto es una decisión de diseño aparte (p. ej. #15803D + blanco = 5.02:1).
- **Token `--text-soft` (#8A938D) sobre fondo claro:** 3.16:1 en blanco. Afecta a ~30 spans/li fuera de controles: `duenos.astro:133,321,324`, `index.astro:284-388`, `jugador/perfil.astro:76-85`, `precios.astro:31,34`, `register.astro:57,65`, `torneos.astro:42`, `canchas.astro:73`, `completar-cuadro.astro:95` y `mejoras.astro:38`. Es un cambio del sistema de diseño y va en su propia spec.
- **Microcopy sobre oscuro fuera de controles** (`Footer.astro:18-67`, `index.astro:144,185,224,408`, `duenos.astro:83,440`): hoy da 6.0–6.6:1 en gris. Si heredara el `text-white/35-40` del contenedor, bajaría a 3.66–3.83:1, así que se deja como está.
- Etiquetas de los pines del mapa (`index.astro:272-276`, 6.2:1) y su copy de Lima: pendiente de la spec 11 §2.
- Spans del anuncio (`BaseLayout.astro:263-276`): ya los colorea `#announcement-bar .ann-text`. `BaseLayout.astro:286` es `sr-only`.
- `motion.css`, tokens `:root`, el panel Next.

**Decisiones de producto que requieren aprobación:** ninguna. El avatar de `duenos.astro:397` sigue el patrón del resto de avatares verdes (`bg-[#22C55E] text-white`, como `duenos.astro:250` e `index.astro:335`).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/styles/global.css` | modificar | G3 en el `@layer base` de TYPOGRAPHY, junto a las reglas de la spec 10 |
| `reservaya-frontend-astro/src/pages/duenos.astro` | modificar | L397: añadir `text-white` al avatar |
| `docs/skills/astro-landing.md` | modificar | Regla 8: añadir la excepción de controles |
| `PLAN_OTRO_AGENTE.md` | modificar | §6: fila del ítem |

## 4. Diseño y lógica
- **G3 (`global.css`, `@layer base` de TYPOGRAPHY, después de G2 de la spec 10):**
  ```css
  /* Controles: iconos y fragmentos de etiqueta heredan el color del enlace o botón. */
  :is(a, button) :is(span, em, strong) {
    color: inherit;
  }
  ```
  - Especificidad (0,0,2), mayor que `span`/`em`/`strong` (0,0,1), en la misma capa. Cualquier `text-*` del propio span sigue ganando (capa `utilities`).
  - No toca `p`/`li` ni los textos fuera de controles.
  - Las reglas sin capa ganan igual que hoy: `#announcement-bar .ann-text` y `.letters .ch`.
  - Cubre también los spans creados por script (`sortear.astro:192-195`) sin tocar su JS.
- **Avatar (`duenos.astro:397`):** `…rounded-full bg-[#22C55E] font-black` → añadir `text-white`.
- **Skill (`astro-landing.md`, regla 8):** «…corta la herencia, salvo `span/em/strong` dentro de headings (spec 10) y de enlaces o botones (spec 12)».
- **API:** ninguna. Sin `BLOQUEO-API`.
- **Invariantes:** ningún `text-*` explícito cambia de efecto. No se toca ningún script. Sin scroll horizontal a 375 px. Cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Build | `npm --prefix reservaya-frontend-astro run build` | OK |
| A3 | Herencia en controles | Playwright sobre `astro preview` (375 y 1280 px), en `/`, `/duenos`, `/canchas`, `/login`, `/register`, `/forgot-password`, `/404`, `/completar-cuadro`, `/sortear`, `/mejoras`, `/mis-reservas` y `/torneos`: todo `a span, button span, a em, button em, a strong, button strong` sin clase `text-*` tiene el mismo `color` computado que su `a`/`button` más cercano | 100 % de los nodos |
| A4 | Sin regresión | Snapshot del `color` computado de `h1–h6, p, span, li, em, strong` antes (T1) y después, en las mismas páginas y anchos | El diff solo contiene nodos dentro de `a`/`button` y el avatar de `duenos.astro:397` |
| A5 | Contraste no empeora | Para cada nodo del diff: contraste frente al primer fondo opaco de sus ancestros, antes y después | después ≥ antes en el 100 % |
| A6 | Avatar | `duenos.astro:397` → `color` computado | `rgb(255, 255, 255)` |
| A7 | Móvil | 375 px: `scrollWidth <= clientWidth` en las páginas de A3 | Sin scroll horizontal |
| A8 | Alcance | `git status --short` | Solo los archivos de §3 |

## 6. Checklist
- [x] T1: Línea base: build + `astro preview` (backend falso :5999 para `/canchas`, como en la spec 10). Snapshot A4 y capturas de 375/1280 px del hero, el footer y `/login`.
- [x] T2: `global.css`: G3.
- [x] T3: `duenos.astro:397`: `text-white`.
- [x] T4: `docs/skills/astro-landing.md`: regla 8.
- [x] T5: A1–A8, anotar en §7, actualizar `PLAN_OTRO_AGENTE.md` §6 y rebuild sin `PUBLIC_RESERVAYA_API_URL`.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | Línea base (T1) | — | 12 páginas × 375/1280 px, 3150 nodos: solo 4/214 spans de controles heredan el color del control. Avatar de `/duenos` en #8A938D |
| 2026-09-26 | A1 | ✅ | `astro check`: 0 errores, 0 warnings |
| 2026-09-26 | A2 | ✅ | `npm run build`: 21 páginas. Build final sin `PUBLIC_RESERVAYA_API_URL` (0 apariciones de `localhost:5999`) |
| 2026-09-26 | A3 | ✅ | 214/214 spans sin color propio dentro de `a`/`button` tienen el color del control. Extra: `/500` 8/8 y los spans creados por script en `/sortear` (`+`, «Agregar…») en #15803D, igual que el botón |
| 2026-09-26 | A4 | ✅ | Diff de 238 nodos: 100 % dentro de `a`/`button` o del avatar. 0 fuera |
| 2026-09-26 | A5 | ✅ | Contraste no empeora en ningún nodo visible. Fondo tomado del primer ancestro opaco, o del primer stop opaco si es degradado. Los `sr-only` quedan excluidos |
| 2026-09-26 | A6 | ✅ | Avatar de `duenos.astro:397`: `rgb(255, 255, 255)` (3 testimonios × 2 anchos) |
| 2026-09-26 | A7 | ✅ | 0 px de scroll horizontal a 375 px en las 12 páginas |
| 2026-09-26 | A8 | ✅ | `git status`: `global.css`, `duenos.astro`, `astro-landing.md`, `PLAN_OTRO_AGENTE.md` y esta spec |
| 2026-09-26 | Visual | ✅ | CTA «Buscar canchas →» del hero: la flecha sale blanca, igual que la etiqueta |
