# Especificación: 70 - "Reservar" del catálogo lleva a la ficha del complejo

Estado: aprobada 2026-10-08 (humano: "el botón de reserva me tiene que dirigir a la pestaña del centro deportivo que creamos", con capturas de `/canchas` y `/c/<slug>`).

## 1. Objetivo
**Problema:** en `/canchas`, "Reservar" de cada tarjeta lleva al flujo antiguo `/dashboard/canchas?...` (`urlReservar`, `apps/web/lib/public/scripts/canchas.ts` y `tablero.ts`). La ficha `/c/<slug>` (specs 62/63) ya tiene el widget "Reservar horario", pero el catálogo no la usa: `GET /api/canchas/disponibles` no devuelve `complejo.slug`.

**Resultado esperado:** "Reservar" (vista por canchas), "Ver canchas" (vista por complejos) y el tablero por horas llevan a `/c/<slug>` con la cancha preseleccionada en el widget (y fecha/hora si el filtro las tiene), anclado en `#reservar`.

**Ampliación (humano, 2026-10-08):** "que tampoco sea tan angosto, hazlo un poco más ancho, que quede bien, y responsivo". En `/c/<slug>` el contenido usa `max-w-page` y el widget `Reservar horario` queda estrecho (3 franjas por fila apretadas, días con scroll). Ensanchar la ficha (contenedor más ancho que `max-w-page` en escritorio, p. ej. ~1280–1360 px) y dar más ancho a la columna de reserva (p. ej. `minmax(0,1.6fr)_minmax(22rem,1fr)`), con franjas que se reacomoden por ancho disponible. Responsivo 360/390/768/1024/1280/1536: 0 px de desborde, objetivos ≥ 44 px, CLS ≤ 0,1.

**Ampliación 2 (humano, 2026-10-08):** "quita esta sección, que no aparezca la foto del centro deportivo" (captura de la tarjeta «Fotos de <complejo> (N)»). Quitar de `/c/<slug>` la sección `#fotos` con `GaleriaComplejo` y el botón «Ver fotos» de la portada que apunta a ella. La foto de portada del encabezado y la subida de fotos en el panel se mantienen. Si `GaleriaComplejo` queda sin uso, borrarlo.

## 2. Fuera de alcance
- Canchas sin complejo (legado): siguen con el flujo actual.
- Cambios de esquema.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/public/read.service.ts` (`canchaDto`) | modificar | añadir `complejo.slug` (público, ya expuesto en `/c/<slug>`) |
| `apps/web/lib/public/scripts/canchas.ts`, `tablero.ts`, `filas.ts` | modificar | `urlReservar` → `/c/<slug>?cancha=<id>&fecha=&inicio=&fin=#reservar` cuando hay slug |
| `apps/web/components/public/reserva/ReservaWidget.tsx`, `c/[slug]/page.tsx` | modificar | leer `cancha`/`fecha`/`inicio`/`fin` iniciales (ya existe para el retorno del login: reutilizar) |
| tests, `docs/api.md` | modificar | — |

## 4. Diseño y lógica
- Parámetros inválidos o de otra cancha se ignoran (el widget arranca con la primera cancha y hoy).
- En la vista por complejos el botón dice "Reservar" y va a `/c/<slug>#reservar`.
- Móvil: tras cargar, el widget queda visible (ancla o barra inferior).

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate | turbo (god) | 18/18 |
| A2 | API | test: `disponibles` incluye `complejo.slug` | pasa |
| A4 | Ancho y responsivo | capturas de `/c/<slug>` a 360/768/1024/1280/1536; desborde 0 px; franjas legibles sin apretarse | pasa |
| A5 | Sin galería | `/c/<slug>` sin sección «Fotos de…» ni botón «Ver fotos»; sin enlaces rotos a `#fotos`; knip limpio | pasa |
| A3 | Web | tests de `urlReservar`; Playwright: clic en "Reservar" de una tarjeta con complejo → `/c/<slug>` con esa cancha seleccionada; sin complejo → flujo actual | pasa |

## 6. Checklist
- [x] T1 API slug · [x] T2 enlaces · [x] T3 preselección · [x] T4 ficha más ancha · [x] T5 quitar galería · [x] T6 tests/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|

| 2026-10-08 | A1 | Parcial: 16/16 typecheck/lint/test; build pendiente god fuera del sandbox | `hive/agents/michael-code-muyzrm60/spec70-checks.log`; API 209/209 |
| 2026-10-08 | A2 | Pasa: disponibles devuelve complejo.slug | `apps/api/src/public/disponibles-cerca.test.ts` |
| 2026-10-08 | A3 | Pruebas de enlaces y parámetros pasan; navegador pendiente QA | `apps/web/lib/public/reservar-ficha.test.mjs`; suite nativa 116/116; script `hive/agents/michael-code-muyzrm60/spec70-ficha-qa.mjs` |
| 2026-10-08 | A4 | Implementado; capturas/desborde/objetivos/CLS pendientes QA | Script anterior, anchos 360/390/768/1024/1280/1536; requiere SPEC70_SLUG con ≥2 canchas activas y SPEC70_BASE localhost |
| 2026-10-08 | A5 | Galería y enlace retirados, componente eliminado sin referencias; knip no instalado | `pnpm exec knip` devuelve comando no encontrado; pendiente comprobación externa |
| 2026-10-08 | A1 | Pasa | god: `turbo run build typecheck lint test --force` 18/18 (API 209, web 101). |
| 2026-10-08 | A3 | Pasa | god local contra QA (2.ª cancha asignada temporalmente y restaurada): clic en "Reservar" → `/c/<slug>?cancha=…#reservar` con la cancha preseleccionada; móvil 360 abre la hoja "Reservar horario" con agenda real 200. |
| 2026-10-08 | A4, A5 | Pasa | god Chrome 360/768/1024/1280/1536: desborde 0 px, 0 botones < 44 px en `#reservar`, columna de reserva 366–495 px (5 franjas por fila a 1536), sin `#fotos` ni «Ver fotos». |
