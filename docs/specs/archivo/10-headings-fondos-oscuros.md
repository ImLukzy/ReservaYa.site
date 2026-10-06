# Especificación: 10 - Headings legibles sobre fondos oscuros (global + secciones)

## 1. Objetivo
**Problema:** `reservaya-frontend-astro/src/styles/global.css:208-234` fija el color en `@layer base` directamente sobre el elemento: `h1–h5` y `strong` → `--text-main` (#101613), `p` → `--text-muted` (#5B6660), `span, li, em` → `--text-soft` (#8A938D). Como el color se fija en el propio nodo, **no se hereda** el `text-white` / `text-[#4ADE80]` del contenedor: todo título sin clase de color dentro de una superficie oscura sale con la paleta clara.
- Los 25 `h1–h6` estáticos sobre fondo oscuro ya traen `text-white` (escaneo de `src/**/*.astro`).
- Fallan 13 títulos: `<p>` que hacen de título (`font-bold|black`, `text-lg…2xl`) y `<span>` de cifras dentro de títulos. Contraste actual entre 1.52:1 y 3.40:1 para los `<p>` (AA pide 4.5:1); las cifras salen grises dentro de un título blanco o verde. Inventario en §4.

**Resultado esperado:** los 13 títulos toman el color que ya declara su contenedor oscuro (contraste ≥ 9:1, salvo H7 ≥ 3:1 como texto grande), sin cambiar ningún color de las superficies claras. Queda un mecanismo global (`.on-dark`) para que no se repita.

## 2. Fuera de alcance
- **Panel Next** (`reservaya-nextjs-api/app`, `components`): escaneado y sin defectos. `app/globals.css` no colorea `h*`/`p` (heredan de `body`) y los 11 títulos sobre fondo oscuro tienen color propio claro, lo heredan del contenedor o están en una tarjeta blanca.
- **Microcopy sobre fondo oscuro que no es título** (sigue en #8A938D, legible ≥ 6:1): `components/Footer.astro:16-67`, `layouts/BaseLayout.astro:310,340`, `pages/index.astro:47,124,165,204,388`, `pages/duenos.astro:397,422,440`. Tiene el mismo origen, pero va en otra spec.
- **Títulos `<p>` sobre fondo claro** que no heredan `text-[#101613]` (p. ej. `duenos.astro:96`, sale #5B6660, ≈5.5:1). Es legible y es otro problema.
- Tokens `:root`, modo oscuro del sistema y `src/styles/motion.css` (`.letters .ch` ya usa `color: inherit`).
- Reescribir la capa base (quitar el color de `p`/`span`): cambiaría todos los textos de la web clara.

**Decisiones de producto que requieren aprobación:** ninguna. Las cifras H4 y H8–H11 pasan del gris al color que ya declara su título.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/styles/global.css` | modificar | G1 + G2 dentro del `@layer base` de TYPOGRAPHY (después de `strong`, L230-233). Actualizar el comentario de L177 |
| `reservaya-frontend-astro/src/pages/index.astro` | modificar | Añadir la clase `on-dark` en C1 (L172) y C2 (L211) |
| `reservaya-frontend-astro/src/pages/duenos.astro` | modificar | `on-dark` en C3 (L64), C4 (L86), C5 (L104), C6 (L114), C7 (L158), C8 (L198), C9 (L228) y C10 (L350) |
| `reservaya-frontend-astro/src/pages/jugador/perfil.astro` | modificar | `on-dark` en C11 (L29) |
| `reservaya-frontend-astro/src/pages/canchas.astro` | modificar | C12: añadir `on-dark` al string de `h.className` (L249, script `is:inline`, JS plano) |
| `docs/skills/astro-landing.md` | modificar | Regla 8: convención para contenedores oscuros |
| `PLAN_OTRO_AGENTE.md` | modificar | §6: fila del ítem |

## 4. Diseño y lógica
- **UI (global), `global.css`, dentro del bloque `@layer base` de TYPOGRAPHY:**
  ```css
  /* Títulos: span/em/strong internos heredan el color del heading. */
  :is(h1, h2, h3, h4, h5, h6) :is(span, em, strong) {
    color: inherit;
  }

  /* Superficie oscura: estos textos heredan el color que declara el
     contenedor (text-white, text-white/60…) en vez de la paleta clara. */
  .on-dark :is(h1, h2, h3, h4, h5, p, span, li, em, strong) {
    color: inherit;
  }
  ```
  - G1 (`.on-dark`): especificidad (0,1,1), mayor que la de `h1`/`p`/`span` (0,0,1), y en la misma capa `base`. Cualquier `text-*` que tenga el propio elemento sigue ganando porque la capa `utilities` va después (`tailwind.css` se importa antes que `global.css` en `BaseLayout.astro:7-8`). La lista replica exactamente los selectores de la capa base.
  - G2 (spans dentro de headings): especificidad (0,0,2). Hoy no cambia nada visible, porque el único `span` sin color dentro de un heading (`duenos.astro:53`) usa `text-transparent`. Evita que vuelva a pasar lo que obligó a añadir `.letters .ch { color: inherit }`.
  - Comentario de L177: «…las secciones oscuras usan colores explícitos; si un contenedor oscuro tiene textos sin clase de color, lleva `on-dark`».
- **UI (secciones): `on-dark` va en el contenedor oscuro más interno**, no en la `<section>`. Así ninguna superficie clara anidada puede quedar con texto blanco sobre blanco. Verificado: dentro de C1–C12 solo hay un nodo claro, `duenos.astro:206` (`bg-white text-black`), y ya trae su color.

| # | Ruta | Elemento (archivo:línea) | Contenedor | Fondo ref. | Hoy | Después |
|---|---|---|---|---|---|---|
| H1 | `/` | `<p class="font-bold">` «Cancha Norte — F5» (`index.astro:174`) | C1 `index.astro:172` | #0B100C | #5B6660 · 3.21 | #FFF · 19.20 |
| H2 | `/` | `<p class="mt-4 text-lg font-black">` «¡Reserva confirmada!» (`index.astro:213`) | C2 `index.astro:211` | #0B100C | #5B6660 · 3.21 | #FFF · 19.20 |
| H3 | `/` | `#ticket-code` `text-2xl font-black` (`index.astro:217`) | C2 | #040605 | #5B6660 · 3.40 | #FFF · 20.32 |
| H4 | `/duenos` | `[data-count="2500"]`, `[data-count="500"]` dentro de `p.text-white` (`duenos.astro:65,67`) | C3 `duenos.astro:64` | #000 | #8A938D (cifra gris en título blanco) | #FFF · 21.00 |
| H5 | `/duenos` | `<p class="px-2 text-sm font-black">` marca «Reserva» (`duenos.astro:87`) | C4 `duenos.astro:86` | #081009 | #5B6660 · 3.23 | #FFF · 19.29 |
| H6 | `/duenos` | KPI `<p class="mt-1 text-2xl font-black">S/ <span data-count="41322">` (`duenos.astro:106`) | C5 `duenos.astro:104` | #060C08 | p 3.30 · span #8A938D | #FFF · 19.74 |
| H7 | `/duenos` | `<p class="text-xl font-black">` «S/ 112» (`duenos.astro:114`) | C6 `duenos.astro:114` | #0A2E1F→#16A34A | 2.47→1.81 | #FFF · 14.75→3.30 (texto grande) |
| H8 | `/duenos` | `#reg-pct` dentro de `p.text-[#4ADE80]` (`duenos.astro:169`) | C7 `duenos.astro:158` | #000 | #8A938D | #4ADE80 · 12.05 |
| H9 | `/duenos` | `#owner-income` dentro de `p.text-3xl.font-black.text-[#4ADE80]` (`duenos.astro:200`) | C8 `duenos.astro:198` | #000 | #8A938D | #4ADE80 · 12.05 |
| H10 | `/duenos` | `#ticket-total` dentro de `span.text-xl.font-black.text-[#4ADE80]` (`duenos.astro:238`) | C9 `duenos.astro:228` | #000 | #8A938D | #4ADE80 · 12.05 |
| H11 | `/duenos` | `#insc-val` / `#insc-total` dentro de `strong.text-[#EAB308]` / `strong.text-white` (`duenos.astro:351`) | C10 `duenos.astro:350` | #0E0B00 | #8A938D | #EAB308 · 10.27 / #FFF · 19.69 |
| H12 | `/jugador/perfil` | `<p class="text-3xl">◔` + `<p class="mt-2 text-sm font-bold">` «Arma tu identidad de jugador» (`perfil.astro:30-31`) | C11 `perfil.astro:29` | #0A2E1F→#14532D | 2.47→1.52 | #FFF · 14.75→9.11 |
| H13 | `/canchas` (vista «Por complejos») | `p.font-black` con el nombre del complejo, creado por script (`canchas.astro:250`) | C12 `canchas.astro:249` | #0A1A11 | #5B6660 · 3.01 | #FFF · 17.97 |

- **Efectos colaterales (esperados, dentro de C1, C2 y C4):** estos textos pasan de #8A938D al color que declara su contenedor: `index.astro:183` (`text-white/50`, 5.36:1), `index.astro:186` (`/60`, 7.21:1), `index.astro:214` (`/45`, 4.55:1), `duenos.astro:90` (`/55`, 6.21:1). Todos ≥ 4.5:1. Además, detectado al verificar: el avatar «J» de `duenos.astro:94` (`bg-[#22C55E]`, sin color propio; el escaneo tomó `text-[11px]` por un color) pasa de #8A938D (1.4:1) a blanco (2.3:1), como el resto de avatares verdes del sitio.
- **Descartado:** un selector automático `.text-white :is(…)`. En `/duenos`, la sección `bg-black text-white` de L73 contiene una maqueta clara (`bg-[#F5F5F3]`, L94), y cualquier `bg-white` anidado sin color propio quedaría blanco sobre blanco.
- **API:** ninguna. Sin `BLOQUEO-API`.
- **Invariantes:** no se tocan los tokens `:root`, `motion.css` ni el panel. Los `text-*` de cada elemento siguen mandando. El script de `canchas.astro` sigue siendo JS plano (skill Astro, regla 1). Cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A2 | Build | `npm --prefix reservaya-frontend-astro run build` | OK |
| A3 | JS inline de `/canchas` | extraer los `<script>` sin `src` de `dist/canchas/index.html` → `node --check` a cada uno | 0 errores |
| A4 | Contraste de títulos | Script Playwright (scratchpad) sobre `astro preview` en 375 y 1280 px: en H1–H13, `color` computado == `color` del padre, y contraste frente al fondo de ref. de §4 ≥ 4.5:1 (≥ 3:1 si ≥ 24 px, o ≥ 18.66 px en negrita) | 13/13 |
| A5 | Sin regresión en superficies claras | Snapshot JSON del `color` computado de todos los `h1–h6, p, span, li, em, strong` en `/`, `/duenos`, `/canchas`, `/jugador/perfil`, `/precios` y `/login`, antes (T1) y después | el diff solo contiene los nodos de H1–H13 y los 4 efectos de §4 |
| A6 | Alcance | `git status --short` | solo los 7 archivos de §3 (más los que ya estaban: `CLAUDE.md`, `.claude/`, `.idea/`); nada en `reservaya-nextjs-api/` |
| A7 | Panel | No se toca → no aplican `typecheck`/`lint`/`test` del panel | — |

## 6. Checklist
- [x] T1: Línea base. Backend falso en :5999 (CORS `*`): `GET /api/canchas/disponibles` → `{canchas:[{cancha:{id:1,nombre:"Cancha 1",tipo:"FUTBOL_5",precioPorHora:80,complejoId:1,complejo:{nombre:"Complejo Demo",distrito:"Cercado"}}}]}`, resto → 200 `{}`. Build con `PUBLIC_RESERVAYA_API_URL=http://localhost:5999` + `astro preview`. Guardar snapshot A5 y capturas de 375/1280 px en el scratchpad.
- [x] T2: `global.css`: G1 + G2 en el `@layer base` de TYPOGRAPHY y comentario de L177.
- [x] T3: `index.astro`: `on-dark` en L172 y L211.
- [x] T4: `duenos.astro`: `on-dark` en L64, L86, L104, L114, L158, L198, L228 y L350.
- [x] T5: `jugador/perfil.astro`: `on-dark` en L29.
- [x] T6: `canchas.astro:249`: añadir `on-dark` a `h.className`.
- [x] T7: `docs/skills/astro-landing.md`, regla 8: «Contenedor oscuro: color explícito en cada texto o `on-dark` en el contenedor; la capa base de `global.css` fija color en `h1–h5, p, span, li, em, strong` y corta la herencia».
- [x] T8: Repetir el build con el backend falso y ejecutar A4 y A5. Después, rebuild **sin** `PUBLIC_RESERVAYA_API_URL`.
- [x] T9: A1–A3 y A6. Anotar en §7 y actualizar `PLAN_OTRO_AGENTE.md` §6.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | Línea base | 0/26 | Script de contraste antes del cambio: los 13 títulos fallan en 375 y 1280 px (reproduce el defecto) |
| 2026-09-26 | A1 | ✅ | `astro check`: 0 errores, 0 warnings, 8 hints |
| 2026-09-26 | A2 | ✅ | `npm run build`: 21 páginas. Build final sin `PUBLIC_RESERVAYA_API_URL` (0 apariciones de `localhost:5999` en `dist/canchas`) |
| 2026-09-26 | A3 | ✅ | 7 `<script>` inline de `dist/canchas/index.html` → `node --check`: 0 fallos |
| 2026-09-26 | A4 | ✅ | Playwright + backend falso :5999: 26/26 (13 títulos × 375/1280 px). Color == color del padre y contraste ≥ umbral |
| 2026-09-26 | A5 | ✅ | Snapshot de 2304 nodos × 6 páginas × 2 anchos: 70 diferencias = H1–H13 + 4 efectos de §4 + avatar «J» (`duenos.astro:94`, anotado en §4). 0 en superficies claras |
| 2026-09-26 | A6 | ✅ | `git status`: 5 archivos de `reservaya-frontend-astro/src` + `docs/skills/astro-landing.md` + `PLAN_OTRO_AGENTE.md` + esta spec; nada en `reservaya-nextjs-api/` |
| 2026-09-26 | Visual | ✅ | Capturas antes/después (375/1280) y recortes de `/duenos`, `/canchas` y `/jugador/perfil`: títulos en blanco sobre fondo oscuro |
