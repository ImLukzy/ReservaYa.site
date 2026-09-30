# Especificación: 47 — Landing con el estilo de Universo Agustino e «Iniciar sesión» visible

> **Estado:** ✅ Pedido directo de Lukas (2026-09-30): «que hagas aparecer de nuevo lo de "iniciar sesión" y que sigas mejorando el diseño de la página… tal como hemos trabajado en UniversoAgustino, casi similar pero con el contexto de la página».
> **Referencia:** landing de Universo (`apps/web/src/components/landing/*`, `styles/ui.css`), capturada a 1280 px el 2026-09-30.

## 1. Objetivo
**Problema:**
1. **No hay «Iniciar sesión» visible.** El commit `b1c8f85` (spec 42, N1) quitó de `Header.astro` el botón de invitado `<a href="/login" data-solo="invitado">Entrar</a>`. En escritorio el acceso quedó dentro del desplegable «Dueños» («Entrar al panel», `Header.astro:29`); en móvil, al final del menú (`:157-159`).
2. **La portada se lee como documento, no como la landing de Universo.** `pages/index.astro`: títulos alineados a la izquierda sin antetítulo (`:114`, `:140`, `:163`, `:186`, `:201`); «Para el resto del partido» es una lista de líneas (`:188-196`); las preguntas son filas con borde fino (`:203-213`); la banda de dueños es una fila plana (`:217-225`); glifos «→» como iconos (`:153`, `:167`), que prohíbe la regla 8 de la skill.

3. **Fallo previo hallado al verificar:** en `scripts/menu.ts` (spec 42), con ratón el `mouseenter` abre «Jugar»/«Dueños» y el `click` que sigue lo vuelve a cerrar: en escritorio, un clic parecía no hacer nada.

**Resultado esperado:** cabecera como `LandingNav` de Universo (enlaces junto a la marca; a la derecha, píldora verde «Iniciar sesión» visible para invitados en todos los anchos). La portada adopta los patrones de Universo con la identidad «Tablero de cancha»: títulos centrados con antetítulo, filas de funciones con panel ilustrado, preguntas en tarjetas táctiles con icono y categoría, y banda de cierre oscura. 0 px de desborde a 375 px, CLS < 0.02, sin cambios de lógica ni de `fetch`.

## 2. Fuera de alcance
- Pie de página: la spec 42 lo dejó compacto por pedido de Lukas («no pongas tanto contenido importante en la barra inferior»).
- Otras páginas (`/canchas`, `/duenos`, `/sortear`…): el componente de preguntas queda listo para reutilizarlas en otra tanda.
- Panel Next, API y datos. El texto de las preguntas (spec 45, verificado contra el código) no cambia.

**Decisiones tomadas por defecto (se cambian si Lukas lo pide):**
1. Etiqueta «Iniciar sesión» (la que usó Lukas); en celular, píldora compacta del mismo texto.
2. Maquetas esquemáticas (barras y siluetas) en lugar de datos de ejemplo, para cumplir «sin cifras ni ejemplos inventados» (regla 10).
3. MAYÚSCULAS solo en la clase `.eyebrow` (antetítulo), como en Universo; se actualiza la regla 8.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `src/components/Header.astro` | modificar | Enlaces junto a la marca; acciones a `HeaderAcciones.astro`; menú móvil con «Iniciar sesión» |
| `src/components/HeaderAcciones.astro` | crear | «Publicar mis canchas» (xl), «Iniciar sesión» (invitado), cuenta (usuario), botón de menú |
| `src/components/inicio/SeccionTitulo.astro` | crear | Antetítulo + h2 + bajada, centrado o a la izquierda, tono claro u oscuro |
| `src/components/inicio/FilaFuncion.astro` | crear | Panel ilustrado + título + 2 puntos con check + CTA; alterna lados |
| `src/components/inicio/Maqueta{Partido,Equipos,Torneo}.astro` | crear | Ilustraciones esquemáticas `aria-hidden` |
| `src/components/inicio/PreguntasTactiles.astro` | crear | `<details>` en tarjeta táctil con icono, categoría y chevron con resorte |
| `src/components/ui/Icon.astro` | modificar | + `flecha`, `calendario`, `ticket`, `billete`, `grupo`, `trofeo` (Lucide) |
| `src/styles/tokens.css` | modificar | `.eyebrow`, `.panel-tactil`, `--shadow-dura-cesped` |
| `src/pages/index.astro` | modificar | Secciones con los componentes nuevos |
| `docs/skills/astro-landing.md` | modificar | Regla 8: `.eyebrow`, `.panel-tactil` y componentes de `inicio/` |
| `src/scripts/menu.ts` | modificar | El clic tras el hover confirma en vez de cerrar |

## 4. Diseño y lógica
- **Cabecera:** `[Marca · Canchas · Jugar▾ · Dueños▾ · Ayuda] ··· [Publicar mis canchas (xl)] [Iniciar sesión]`. La píldora de invitado se pinta visible desde el HTML (`data-solo="invitado"`, sin `hidden`) y `scripts/sesion.ts` la oculta si hay sesión, como el botón original: sin salto para el caso más común. IDs y `data-*` de `sesion.ts` y `menu.ts` intactos.
- **Títulos:** `.eyebrow` = Barlow Condensed 12 px, 700, mayúsculas, `letter-spacing: 0.18em`, `pizarra` (en oscuro, `niebla`); h2 `font-display` 30→48 px, centrado, `text-wrap: balance`.
- **Cómo funciona:** 3 tarjetas táctiles iguales con número en círculo `cesped-suave`.
- **Deportes y distritos:** títulos centrados; «→» → `Icon flecha`; chips centrados y «Ver los 29 distritos» debajo.
- **Para el resto del partido:** 3 `FilaFuncion` alternadas; panel `.panel-tactil` (radio 2 rem, borde 2 px, sombra dura 6 px) teñido `cesped-suave` / `cielo` / `miel-suave`; puntos tomados del copy verificado de la spec 45.
- **Preguntas:** tarjetas con icono `cesped-hondo`, categoría en `.eyebrow` y pregunta en negrita; chevron gira 180° con `--ease-resorte`.
- **Cierre de dueños:** banda `bg-noche` centrada; píldora `bg-sol text-basalto` (7.96:1) + «Ver planes» `tiza`.
- **Héroe:** el buscador lleva sombra dura en césped (`shadow-dura-cesped`), firma del panel principal de Universo.
- **Invariantes:** tokens de color de `tokens.css`, motion por tokens (spec 46), objetivos táctiles ≥ 44 px, `prefers-reduced-motion`, 0 cambios en `fetch`/scripts de datos.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro | `astro check` + `astro build` | 0 errores |
| A2 | Motion | `node scripts/motion-tokens.mjs --check` | exit 0 |
| A3 | «Iniciar sesión» | Playwright sin sesión a 375 y 1280: enlace visible en la cabecera → `/login` | visible en ambos |
| A4 | Móvil | 375 px en `/`: `scrollWidth − clientWidth` | 0 px |
| A5 | CLS | `node reservaya-nextjs-api/scripts/cls.mjs --landing` | < 0.02 |
| A6 | Menús | Desplegables y menú móvil abren y cierran; «Iniciar sesión» del menú móvil → `/login` | pasa |
| A7 | Preguntas | Clic en una tarjeta → se abre la respuesta; chevron rota | pasa |
| A8 | Capturas | `/` completa a 375 y 1280 revisada a ojo contra Universo | sin cortes ni solapes |
| A9 | Tamaño | Componentes nuevos | < 150 líneas |

## 6. Checklist
- [x] L1: Cabecera + `HeaderAcciones.astro` (+ arreglo de `menu.ts`).
- [x] L2: `.eyebrow`, `.panel-tactil`, `SeccionTitulo.astro`, iconos.
- [x] L3: `FilaFuncion.astro` + 3 maquetas.
- [x] L4: `PreguntasTactiles.astro`.
- [x] L5: Cómo funciona, deportes, distritos, cierre y héroe en `index.astro`.
- [x] L6: Skill + verificación A1–A9 en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 Astro | ✅ | `astro check`: 0 errores, 0 warnings; `npm run build`: 18 páginas |
| 2026-09-30 | A2 Motion | ✅ | `node scripts/motion-tokens.mjs --check`: OK (el chevron usa `ease-resorte duration-(--dur-resorte)`) |
| 2026-09-30 | A3 «Iniciar sesión» | ✅ | Playwright, `astro preview` :4400, sin sesión: visible a 375 (44 px de alto) y 1280, `href="/login"`; menú móvil también. Con `/api/auth/me` simulado con usuario: se oculta y aparece la cuenta («Prueba QA») |
| 2026-09-30 | A4 Móvil | ✅ | 375 px: 0 px de desborde en `/` y en las 16 páginas del build, todas con «Iniciar sesión» visible |
| 2026-09-30 | A5 CLS | ✅ | `cls.mjs --landing`: `/` 0.0025 (375) y 0.0021 (1440); `/canchas` 0.0195 y 0.0041 (API apagada: estado de error). Con sesión simulada: 0.0031 |
| 2026-09-30 | A6 Menús | ✅ | «Jugar» y «Dueños» abren con clic y cierran con Esc (antes del arreglo, el clic tras el hover los cerraba: ✗ en la primera pasada); menú móvil abre y cierra |
| 2026-09-30 | A7 Preguntas | ✅ | Clic → `open` y respuesta visible; chevron `rotate: 180deg` a 375 y 1280 |
| 2026-09-30 | A8 Capturas | ✅ | `/` completa a 1280 (8 vistas) y 375 (10 vistas) revisadas junto a la landing de Universo: cabecera con píldoras, títulos centrados, filas alternadas, preguntas en tarjetas, banda verde. Sin cortes ni solapes |
| 2026-09-30 | A9 Tamaño | ✅ | `Header.astro` 148, `HeaderAcciones` 38, `inicio/*` 23–39 líneas; `index.astro` 226 → 198 |
| 2026-09-30 | Errores de página | ✅ | 0 en todas las pasadas |

## 8. Tanda 2 — `/duenos`, `/sortear`, `/canchas` (pedido de Lukas 2026-09-30: «sí»)
**Problema:** las tres páginas usaban antetítulos hechos a mano (MAYÚSCULAS + `tracking-wider` + « · »), «✓» como icono y preguntas con su propio estilo. En `/duenos` había módulos sin iconos, sello «CANCHA VERIFICADA» en mayúsculas decorativas, un «7» gigante de fondo y ningún cierre. `/canchas` decía «Reserva al instante», que es falso: el complejo confirma cada reserva (preguntas de la spec 45).

| Archivo | Cambio |
|---|---|
| `components/inicio/BandaCierre.astro` | nuevo: banda de cierre reutilizable; la portada pasa a usarla |
| `components/inicio/SeccionTitulo.astro` | `nivel={1}` para usarlo como cabecera de página |
| `components/ui/Icon.astro` | + `grafico`, `pantalla`, `documento`, `mezclar`, `copiar` |
| `lib/estilos.ts` | + `NUMERO_PASO` (círculo numerado de pasos) |
| `pages/duenos.astro` | `.eyebrow`, checks con icono, «Cómo empiezas» con `shadow-dura-cesped`, módulos con icono en 3 columnas (Reservas y Torneos a dos), preguntas en tarjetas, `BandaCierre` «Crear mi cuenta» / WhatsApp; fuera el sello y el «7» |
| `components/Planes.astro` | cabecera con `SeccionTitulo`; «Recomendado» con `.eyebrow` |
| `pages/sortear.astro` | cabecera `SeccionTitulo` (h1), pasos 1–3 con `NUMERO_PASO`, preguntas en tarjetas (textos intactos, categoría e icono por `map`). Script sin cambios |
| `pages/canchas.astro` | `.eyebrow`, cifras en píldoras debajo del título, buscador con `shadow-dura-cesped`, «Precios publicados» en lugar de «Reserva al instante», `#resumen` con 2 líneas reservadas hasta `lg` |
| `layouts/BaseLayout.astro` | precarga `barlow-condensed-700` en lugar de `-600` |
| `reservaya-nextjs-api/scripts/cls.mjs` | `--rutas` para medir cualquier lista de páginas |

**Hallazgos al medir:** (1) mi primera versión de `/canchas` subió el CLS a 0.398 a 1440 px: las píldoras, más anchas, no cabían junto al título con la fuente de respaldo y saltaban de línea al llegar Barlow → cifras siempre debajo. (2) Los `h1`/`h2` usan Barlow Condensed 700–900 (archivo 700), pero se precargaba el 600: con red lenta el título cambiaba de alto (0.215 en `/duenos`, 0.077 en `/completar-cuadro` a 375 px, variable entre pasadas).

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 Astro | ✅ | `astro check`: 0 errores, 0 warnings; build 18 páginas; `motion-tokens --check` OK |
| 2026-09-30 | A5 CLS (8 páginas) | ✅ | `cls.mjs --landing --rutas /,/canchas,/duenos,/sortear,/completar-cuadro,/torneos,/ayuda,/login`: 3 pasadas seguidas con 16/16 en umbral; última: 375 px 0.0000–0.0011, 1440 px 0.0001–0.0039 (antes del arreglo: `/` 0.0025, `/canchas` 0.0186) |
| 2026-09-30 | A4 Móvil | ✅ | 16 páginas a 375 px: 0 px de desborde, «Iniciar sesión» visible, 0 errores de página |
| 2026-09-30 | `/sortear` funcional | ✅ | 5 invitados → contador (5) → 2 equipos → «Copiar» cambia a «Copiado»; 8 preguntas en tarjetas se abren |
| 2026-09-30 | `/duenos` | ✅ | 7 módulos con icono, 8 preguntas en tarjetas, cierre «Crear mi cuenta» → `/register?plan=dueno`, WhatsApp `target=_blank rel=noopener` |
| 2026-09-30 | `/canchas` | ✅ | `#resultados` termina de cargar (`aria-busy=false`, estado de error con la API apagada); «Precios publicados» visible |
| 2026-09-30 | Regresión portada | ✅ | `qa47.mjs` 20/20 |
| 2026-09-30 | Capturas | ✅ | Antes/después a 1280 y 375 de las tres páginas, revisadas: sin cortes ni solapes |
| 2026-09-30 | Reglas | ✅ | 0 `uppercase`/`tracking-wider`/«✓» en las tres páginas y `Planes.astro` |

## 9. Tanda 3 — `/completar-cuadro`, `/torneos`, `/ayuda`, `/login` (pedido de Lukas 2026-09-30: «sigue»)
| Archivo | Cambio |
|---|---|
| `pages/completar-cuadro.astro` | Cabecera `SeccionTitulo` (h1); filtro `bg-tiza shadow-dura-cesped`. Script y diálogos sin cambios |
| `pages/torneos.astro` | Insignia y «Arequipa» con `.eyebrow`; h1 como `/canchas`; «¿Organizas un torneo?» → `BandaCierre` |
| `pages/ayuda.astro` | Cabecera `SeccionTitulo` (h1), pasos con `NUMERO_PASO`, + las 8 preguntas del jugador en tarjetas |
| `lib/preguntas.ts` | nuevo: `PREGUNTAS_JUGADOR` (texto idéntico al de la spec 45), única fuente para portada y `/ayuda` |
| `components/AuthCard.astro` | Tarjeta con `shadow-dura-cesped`; «★ RESERVAYA AREQUIPA» → `.eyebrow`; «✓» → `Icon ok` (login, registro y contraseña) |
| `components/ui/BotonGoogle.astro` | nuevo: «Continuar con Google» en píldora y como `<button type="button">`; lo usan `login` y `register` (SVG ya no duplicado) |
| 7 archivos (`estilos.ts` AVISO, `PatronCancha`, `CroquisCancha`, `AuthCard`, `duenos`, `filas.ts`) | 17 radios inexistentes → `rounded-control`/`rounded-surface` |

**Fallos previos hallados:** (1) «Continuar con Google» era un `<a>` sin `href`: no recibía foco con Tab, así que no se podía entrar con Google usando solo el teclado. (2) `tokens.css` borra la escala de radios de Tailwind (`--radius-*: initial`, spec 20) y 17 usos de `rounded-sm|lg|xl|2xl` no generaban CSS: avisos de error/ok, panel oscuro del login, croquis y patrón de cancha tenían esquinas rectas sin querer.

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 Astro | ✅ | `astro check` 0/0; build 18 páginas; `motion-tokens --check` OK; `.rounded-{,l-,r-}{control,surface}` presentes en el CSS; 0 `rounded-(sm…4xl)` en `src/` |
| 2026-09-30 | A5 CLS (10 páginas) | ✅ | `cls.mjs --landing --rutas` con `/`, `/canchas`, `/duenos`, `/sortear`, `/completar-cuadro`, `/torneos`, `/ayuda`, `/login`, `/register` y `/forgot-password`: 3 pasadas con 20/20 en umbral; máximo 0.0039 (`/torneos` 1440) |
| 2026-09-30 | A4 Móvil | ✅ | 16 páginas a 375 px: 0 px de desborde, «Iniciar sesión» visible, 0 errores |
| 2026-09-30 | Google | ✅ | `/login` y `/register`: `<button type=button>`, se alcanza con Tab, Enter → `/api/auth/google?returnUrl=%2Fcanchas` (interceptado, sin salir a Google) |
| 2026-09-30 | `/ayuda` | ✅ | 8 preguntas en tarjetas; se abren |
| 2026-09-30 | `/completar-cuadro` | ✅ | «Publicar partido» abre y cierra el diálogo |
| 2026-09-30 | `/torneos` | ✅ | Cierre «Ver cómo funciona» → `/duenos#torneos` |
| 2026-09-30 | Radios | ✅ | Panel del login 12 px; icono de módulo en `/duenos` 12 px |
| 2026-09-30 | Regresión | ✅ | `qa47.mjs` 20/20; `qa47b.mjs` 0 ✗ |
| 2026-09-30 | Capturas | ✅ | 5 páginas a 1280 y 375 + héroe de portada, revisadas |
