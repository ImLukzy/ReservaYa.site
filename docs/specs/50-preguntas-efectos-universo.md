# Especificación: 50 — Efectos de «Preguntas frecuentes» como en Universo Agustino

> **Estado:** ✅ Pedido directo de Lukas (2026-09-30): «aplica los efectos que tiene la parte de "Ayuda / Preguntas frecuentes" de Universo Agustino a mi proyecto de ReservaYa».
> **Referencia:** Universo `apps/web/src/components/landing/LandingFAQ.tsx`, `components/Accordion.tsx`, `components/landing/Reveal.tsx`, `lib/motion.ts` (`SPRING` 400/30).

## 1. Objetivo
**Problema:** `components/inicio/PreguntasTactiles.astro` (spec 47) copia el aspecto, pero no el comportamiento de Universo:
| Efecto | Universo | ReservaYa |
|---|---|---|
| Entrada | `Reveal`: sube 20 px con resorte, una vez, al entrar 80 px en pantalla | `seccion-entra` atado al scroll (`motion.css:75-84`) |
| Abrir/cerrar | alto + opacidad con resorte en los dos sentidos | solo anima al abrir (`motion.css:103-120`); cierra de golpe |
| Exclusivo | un ítem abierto a la vez | varios abiertos |
| Estado inicial | primera pregunta abierta (`defaultOpen={0}`) | todas cerradas |
| Respuesta | `leading-relaxed`, icono de 24 px | interlineado normal, icono de 20 px |

**Resultado esperado:** las preguntas de portada, `/duenos`, `/sortear` y `/ayuda` se comportan como las de Universo, sin `framer-motion`: `<details name>` nativo (exclusivo), `::details-content` con `interpolate-size` y el resorte de la spec 46 en los dos sentidos, y un `.revelar` de una sola vez con IntersectionObserver.

## 2. Fuera de alcance
- El resto de secciones sigue con `seccion-entra`. Textos de las preguntas.
- Navegadores sin `interpolate-size` o sin `details[name]`: abren de golpe y permiten varias abiertas (comportamiento nativo, sin romper nada).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `src/styles/motion.css` | modificar | `::details-content` con transición de alto/opacidad (abrir y cerrar); `.revelar` |
| `src/scripts/revelar.ts` | crear | IntersectionObserver `rootMargin -80px`, una vez |
| `src/layouts/BaseLayout.astro` | modificar | Importa `revelar.ts` |
| `src/components/inicio/PreguntasTactiles.astro` | modificar | `name` (exclusivo), primera abierta, icono 24 px, `leading-relaxed`, `.revelar` |
| `src/pages/{index,duenos,sortear,ayuda}.astro` | modificar | El bloque de preguntas usa `.revelar` en lugar de `seccion-entra` |

## 4. Diseño
- **Resorte:** `block-size` y `transform` con `var(--dur-resorte) var(--ease-resorte)`; opacidad con `--ease-salida` (como el `SPRING` de Universo, que también anima el alto).
- **Sin JS o con movimiento reducido:** `.revelar` solo oculta dentro de `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`; si falta IntersectionObserver, el script muestra todo.
- **CLS:** `.revelar` solo anima `opacity` y `transform`; la primera pregunta abierta viene así desde el HTML.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro | `astro check` + build + `motion-tokens --check` | 0 errores |
| A2 | Exclusivo | Abrir la 3.ª cierra la 1.ª | 1 abierta |
| A3 | Primera abierta | Al cargar | `open` en la 1.ª |
| A4 | Cierre animado | Alto de `::details-content` muestreado al cerrar | baja en pasos, no de golpe |
| A5 | Revelar | Bloque con `opacity 0` fuera de pantalla → `1` al entrar; sin JS visible | pasa |
| A6 | CLS / desborde | `cls.mjs --landing` 10 páginas; 16 páginas a 375 px | < 0.02; 0 px |
| A7 | Regresión | `qa47`, `qa47b`, `qa47c` | 0 ✗ |

## 6. Checklist
- [x] T1: CSS + script + layout.
- [x] T2: `PreguntasTactiles` + 4 páginas.
- [x] T3: Verificación A1–A7 en §7 y skill.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 Astro | ✅ | `astro check` 0 errores, 0 warnings; build 18 páginas; `motion-tokens --check` OK |
| 2026-09-30 | A2 Exclusivo | ✅ | `qa50.mjs` en `/`, `/duenos`, `/sortear`, `/ayuda`: abrir la 3.ª deja abiertas `[2]` |
| 2026-09-30 | A3 Primera abierta | ✅ | Las 4 páginas cargan con abiertas `[0]` (HTML: un solo `<details name="preguntas" open>`) |
| 2026-09-30 | A4 Cierre y apertura animados | ✅ | Cierre: 204 → 80 px en 20 pasos. Apertura: 80 → pico 207 → 204 px (sobrepaso del resorte 400/30, como el `SPRING` de Universo) |
| 2026-09-30 | A5 Revelar | ✅ | Fuera de pantalla `opacity 0`; al entrar, `opacity 1` + `.visible` (4 páginas). Sin JS: `opacity 1`. Movimiento reducido: `opacity 1` desde el inicio. Teclado: Enter abre |
| 2026-09-30 | A6 CLS / desborde | ✅ | `cls.mjs --landing` 10 páginas × 375/1440: 3 pasadas 20/20, máximo 0.0005. 16 páginas a 375 px: 0 px, 0 errores |
| 2026-09-30 | A7 Regresión | ✅ | `qa47` 20/20, `qa47b` 0 ✗, `qa47c` 0 ✗ (las pruebas de apertura usan ahora la 2.ª pregunta, porque la 1.ª ya viene abierta) |
| 2026-09-30 | Capturas | ✅ | Sección de preguntas de la portada a 1280 y 375, comparada con la de Universo |
