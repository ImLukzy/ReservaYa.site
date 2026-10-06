# Especificación: 17 - Scroll de la rueda del ratón sin retardo (landing)

## 1. Objetivo
**Problema:** al girar la rueda del ratón, la landing tarda en responder. `reservaya-frontend-astro/src/scripts/smooth-wheel.ts`, cargado en todas las páginas desde `layouts/BaseLayout.astro:442-444`, hace tres cosas:
- Captura `wheel` con `{ passive: false }` y `e.preventDefault()`, lo que anula el scroll nativo.
- Anima la posición a mano en cada frame con `LERP = 0.075`: el 90 % del recorrido tarda unos 30 frames y el reposo unos 60.
- Llama a `window.scrollTo(0, current)` en cada frame. Como el `<html>` tiene `scroll-smooth` (y `global.css` `scroll-behavior: smooth`), cada llamada abre además un scroll suave nativo que la siguiente interrumpe, y eso suma retraso y tirones.

También rompe el momentum de los touchpads, y hace un `getComputedStyle` por ancestro en cada evento.

Medido con Playwright (Chromium, 1280×900, build de producción):

| Página | Rueda | 90 % del recorrido | Estable |
|---|---|---|---|
| `/` | 100 px / 400 px | 600 / 927 ms | 737 / 1017 ms |
| `/duenos` | 100 px / 400 px | 464 / 833 ms | 694 / 923 ms |
| `/canchas` | 100 px / 400 px | 452 / 633 ms | 693 / 783 ms |

**Resultado esperado:** la rueda usa el scroll nativo del navegador, que ya es suave en Chrome, Edge, Firefox y Safari, y responde en 1-2 frames.

## 2. Fuera de alcance
- `scroll-behavior: smooth` (`global.css:93-101` y la clase `scroll-smooth`) se mantiene: solo afecta a anclas y a scroll programático (`smoothScrollToHash`), no a la rueda. Con `prefers-reduced-motion` ya se anula (`motion.css`).
- Los demás scripts de scroll ya estaban optimizados y no se tocan:
  - las palabras con scroll de `BaseLayout.astro`, con `requestAnimationFrame` y listener `passive`;
  - `reveal.ts`, con `IntersectionObserver`;
  - `motion.ts`, que solo aplica el tilt con el ratón.
- El panel Next no intercepta `wheel` (grep sin coincidencias).

**Decisiones de producto que requieren aprobación:** ninguna (el usuario pidió el arreglo).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/scripts/smooth-wheel.ts` | eliminar | Scroll secuestrado |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | modificar | Quitar el `<script>import '../scripts/smooth-wheel.ts'</script>` (L442-444) |
| `reservaya-frontend-astro/docs/architecture.md` | modificar | L17: sin `smooth-wheel`; convención «no interceptar `wheel`» |
| `PLAN_OTRO_AGENTE.md` | modificar | §6: fila del ítem |

## 4. Diseño y lógica
- **UI:** scroll nativo. El navegador aplica su propio desplazamiento suave de rueda y respeta el momentum del touchpad y la configuración de accesibilidad del sistema.
- **Invariantes:** anclas y `scrollIntoView({ behavior: "smooth" })` siguen suaves. No cambia ningún estilo.
- **API:** ninguna.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro | `astro check` y `build` | 0 errores |
| A2 | Latencia de la rueda | Playwright: `mouse.wheel(0, 100/400)` en `/`, `/duenos` y `/canchas`; tiempo hasta el 90 % y hasta estabilizarse | ≤ 50 ms (antes 450-1017 ms) |
| A3 | Sin tirones | 30 eventos de rueda seguidos: intervalos entre frames y *long tasks* | p95 ≤ 17 ms; 0 ms de long tasks |
| A4 | Sin secuestros | `grep` de `wheel`/`onWheel`/`lenis` en la landing y el panel | 0 coincidencias |

## 6. Checklist
- [x] T1: Medir la línea base.
- [x] T2: Eliminar `smooth-wheel.ts` y su import.
- [x] T3: A1–A4 y `architecture.md`.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | Línea base | — | 90 % del recorrido en 452-927 ms y reposo en 693-1017 ms (tabla del §1) |
| 2026-09-26 | A1 | ✅ | `astro check` 0 errores; build de 22 páginas |
| 2026-09-26 | A2 | ✅ | `/`: 28 ms (100 px) y 30 ms (400 px) · `/duenos`: 19 / 19 ms · `/canchas`: 16 / 13 ms. El 90 % y el reposo coinciden (1-2 frames) |
| 2026-09-26 | A3 | ✅ | `/` y `/duenos`: 239 frames, p95 10.1 ms, máximo 20 ms, 0 ms de long tasks |
| 2026-09-26 | A4 | ✅ | 0 coincidencias en `reservaya-frontend-astro/src` ni en `app`, `components` y `lib` del panel |
