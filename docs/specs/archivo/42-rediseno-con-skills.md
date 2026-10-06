# Especificación: 42 - Rehacer los .astro con las skills de diseño

**Aprobada por Lukas:** 2026-09-30 01:35 («que encuadre bien todo, y añade scroll suaves y estilos a todo», con captura del inicio a ~1745 px). Añadidos F0 y F7–F9.

## 1. Objetivo
**Problema:** Lukas (ILK-34, 2026-09-30) pidió «cambia los códigos que tienen .astro» y «usa las skills instaladas (obligatorio)», y eligió seguir con Astro y rehacer los 32 `.astro` con las skills. Hoy las mejoras se deciden a ojo, sin una guía común.
**Resultado esperado:** los 32 `.astro` (15 páginas, 15 componentes, 2 layouts) pasan por las skills `design-taste-frontend`, `frontend-design` e `impeccable`, en 6 lotes. Además se aplican 3 mejoras del panel que salieron de la misma auditoría. Mismo contenido, rutas y funciones; mejor jerarquía, ritmo, color y movimiento.

## 2. Fuera de alcance
Textos (copy), rutas, fetch y lógica de los scripts, API, `prisma/**`, `.env`, dependencias nuevas, colores o fuentes nuevos (solo los tokens de `global.css` y `globals.css`), migrar a Next. No se repite lo ya cerrado en las Specs 32–38 (identidad, escala fluida, hero, auth, legales, errores, buscador móvil).

**Decisiones de producto que requieren aprobación:** aprobar la spec. Dentro de estas reglas, god aprueba cada lote sin volver a preguntar.

## 3. Archivos afectados
### Fase 1: mejoras ya auditadas (propuestas de Oscar y Angel, verificadas por god)
| # | Archivo | Cambio | Skill + sección |
|---|---|---|---|
| F1 | `reservaya-frontend-astro/src/pages/canchas.astro:71-75` y `src/scripts/filas.ts` | las filas nuevas de `#resultados` entran una vez (opacidad + `translateY`, retraso leve en las primeras); nada bajo `prefers-reduced-motion`. El punto «Tablero en vivo» (`:31`) deja de pulsar para siempre: pulso finito o fijo tras cargar | design-taste-frontend §5 Motion, §6 Reduced Motion; frontend-design Motion |
| F2 | `reservaya-frontend-astro/src/pages/index.astro:64-66` | etiquetas visibles y compactas en los 3 selects del buscador (hoy `etiquetaOculta`) | design-taste-frontend §4.6 Data & Form Patterns; impeccable clarify |
| F3 | `reservaya-frontend-astro/src/pages/canchas.astro:43-47` | la fila de datos (distritos, tipos, reserva al instante) se ve compacta también en celular (hoy `hidden` hasta `lg`) | design-taste-frontend §4.7 Layout Discipline |
| F4 | `reservaya-nextjs-api/app/(dashboard)/admin/page.tsx:162-199` | «Ingresos del mes» se queda como único bloque oscuro; «Hoy» pasa a superficie clara; «Pendientes hoy» gana acento `sol-suave`/`sol` | impeccable Operate; design-taste-frontend §4.4 |
| F5 | `reservaya-nextjs-api/components/layout/Sidebar.tsx:268-279` | separador con línea solo entre los bloques mayores; los grupos internos se separan con espacio y rótulos pequeños; orden, enlaces y permisos iguales | design-taste-frontend §4.3, §4.7 |
| F6 | `reservaya-nextjs-api/app/(dashboard)/admin/page.tsx:218-249` | «Ahora» deja `bg-red-500` por `arcilla` o `basalto` con etiqueta «Ahora»; el divisor `border-gray-100` pasa a `cal` | design-taste-frontend §4.2; frontend-design Color |
| F0 | `reservaya-frontend-astro/src/components/ui/SlotBoard.astro:31` y `src/scripts/filas.ts:93-140` | **urgente (captura de Lukas):** en el tablero «Libres hoy» a ~1745 px la insignia del deporte se sale por arriba de la fila, el distrito se parte en 2 líneas y se sale por abajo, y asoma un «0» del número de fondo en el borde derecho. Causa probable: filas de alto fijo (`h-24`/`sm:h-16`) con la raíz fluida al 125 %. Las filas crecen con su contenido (alto mínimo en vez de fijo), el distrito se corta con `truncate` en una línea, y el número de fondo no asoma | design-taste-frontend §4.7 Layout Discipline |
| F7 | `reservaya-frontend-astro/src/styles/global.css:17` y `src/styles/motion.css` | scroll suave en todo el sitio: se mantiene `scroll-behavior: smooth` (solo sin reduced-motion), se suma `scroll-padding-top` igual al alto del header fijo, y cada sección entra una vez al aparecer en pantalla (opacidad + `translateY` corto, con IntersectionObserver o `animation-timeline: view()` con alternativa). Nada bajo `prefers-reduced-motion` | design-taste-frontend §5, §6; frontend-design Motion |
| F8 | `reservaya-frontend-astro/src/styles/tokens.css:171` (`.chip-tactil`, usada en `index.astro:167`) | alto mínimo de 44 px (hoy 34 px a 360 y 41.5 a 1440; QA de Jim) | web-interface-guidelines |
| F9 | `reservaya-frontend-astro/src/pages/canchas.astro:85,92` | `overscroll-behavior: contain` en los diálogos `#opiniones` y `#opiniones-lista` (QA de Jim) | web-interface-guidelines |
| F10 | `reservaya-frontend-astro/src/pages/index.astro:195`, `duenos.astro:163`, `sortear.astro:70` (y cualquier acordeón de `ayuda.astro`) | Lukas (01:45): «añade scroll suaves al desplegar las preguntas». Cada `<details>` se abre y se cierra con una transición suave de alto y opacidad (CSS `interpolate-size: allow-keywords` + `::details-content`, y un script mínimo con la Web Animations API donde el navegador no lo soporte); el ícono gira; al abrir, si la respuesta queda fuera de pantalla, se desplaza suave hasta verla. Una regla común en `src/styles/motion.css`, no por página. Nada bajo `prefers-reduced-motion` | design-taste-frontend §5; frontend-design Motion |
| F11 | `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx:146`, `dashboard/mi-partido/page.tsx:152` | la misma transición de F10 en los 2 `<details>` del panel (regla en `app/globals.css`) | igual que F10 |
| N1 | `reservaya-frontend-astro/src/components/Header.astro`, `Footer.astro`, nuevo `src/scripts/menu.ts` | Lukas (02:12, captura del pie): «no pongas tanto contenido importante en la barra inferior; las secciones importantes deben entrar por la barra superior; acomódalos de manera inteligente». Arriba: Canchas · Jugar ▾ (Partidos abiertos, Armar equipos, Torneos) · Dueños ▾ (Publicar mis canchas, Planes y precios, Entrar al panel → `/login`) · Ayuda · cuenta; en celular, panel de menú. Abajo: marca + contacto + fila legal (con Libro de reclamaciones visible). Detalle: `hive/agents/god/briefs/s42-oscar-navegacion.md` | design-taste-frontend §4.3, §4.5, §4.7, §5; impeccable Operate |

### Fase 2: lotes por archivo (Oscar audita y aplica; god aprueba cada lote)
| Lote | Archivos (`reservaya-frontend-astro/src/`) |
|---|---|
| L1 | `layouts/BaseLayout.astro`, `components/Header.astro`, `components/Footer.astro`, `components/Marca.astro` |
| L2 | `pages/index.astro`, `components/CintaPitazo.astro`, `components/ui/SlotBoard.astro`, `components/ui/PatronCancha.astro` |
| L3 | `pages/canchas.astro`, `components/ui/CroquisCancha.astro`, `components/ui/EmptyState.astro`, `components/ui/Badge.astro` |
| L4 | `pages/duenos.astro`, `components/Planes.astro`, `pages/torneos.astro`, `pages/completar-cuadro.astro`, `pages/sortear.astro` |
| L5 | `pages/login.astro`, `pages/register.astro`, `pages/forgot-password.astro`, `pages/reset-password.astro`, `components/AuthCard.astro`, `components/ui/Field.astro`, `components/ui/Select.astro`, `components/ui/Button.astro`, `components/ui/Icon.astro` |
| L6 | `pages/ayuda.astro`, `pages/mejoras.astro`, `pages/libro-reclamaciones.astro`, `pages/404.astro`, `pages/500.astro`, `layouts/LegalLayout.astro` |

## 4. Diseño y lógica
- **Método por lote:** Oscar lee la sección necesaria de `C:/Users/anton/.claude/skills/{design-taste-frontend,frontend-design,impeccable}/SKILL.md`, escribe en su carpeta una tabla (archivo:línea · problema · cambio · skill + sección), la aplica y corre los gates. god revisa el diff y hace QA en Playwright antes del commit.
- **UI:** solo estilo, orden visual y movimiento. Nada de funciones, textos ni elementos nuevos, salvo etiquetas visibles (F2) y la leyenda «Ahora» (F6).
- **Movimiento:** una entrada orquestada por vista, no microanimaciones sueltas; todo desactivado con `prefers-reduced-motion`.
- **Invariantes:** contraste ≥ 4.5:1 (≥ 3:1 en texto grande); controles ≥ 44 px; foco visible; 0 scroll lateral a 360 px; escala fluida (Spec 36/37), `.densidad-fija` y `HORA_PX=52` intactos.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Landing | `astro check` + `build` | 0 errores |
| A2 | Panel (F4–F6) | `typecheck` · `lint` · `test` · `build` | 0 errores; avisos ≤ los de hoy |
| A3 | Sin scroll lateral | Playwright 360/768/1440 en las páginas del lote | 0 px |
| A4 | Contraste y foco | Jim o god con el script de contraste | ≥ 4.5:1; foco visible |
| A5 | Movimiento accesible | Playwright con `reducedMotion: 'reduce'` | sin animaciones |
| A6 | Trazabilidad | cada cambio cita skill + sección en la tabla del lote | 100 % |

## 6. Checklist
- [ ] Fase 1: F0 (primero), F1–F3, F7–F9 en la landing; F4–F6 y F11 en el panel. F10 en la landing.
- [ ] L1 · [ ] L2 · [ ] L3 · [ ] L4 · [ ] L5 · [ ] L6.
- [ ] Gates y §7 por lote.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | N1 defectos | ✅ | Oscar-2 (codex): `menu.ts` aria-expanded sigue el estado, Escape cierra y devuelve el foco, el menú del celular bloquea el scroll del fondo, «Canchas» primero en celular, enlaces del pie ≥ 44 px. god: astro check 0 · build 18 páginas · Playwright 360/768/1440/1745 0 px; Enter → aria-expanded=true, Escape → false con foco en el botón; celular → aria-expanded=true y body overflow hidden |
| 2026-09-30 | F4–F6, F11 | ✅ | Oscar-2: `/admin` con «Hoy» en superficie clara, «Pendientes hoy» en `sol-suave`, marca «Ahora» en `arcilla` con etiqueta, divisor `cal`; Sidebar con separadores solo entre bloques mayores; `<details>` del panel con despliegue suave en `globals.css`. god: typecheck 0 · lint 0 errores (2 avisos de antes) · test 40/40 · build 0. Sin QA visual con sesión (sin cuentas) |
