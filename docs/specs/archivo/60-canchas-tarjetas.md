# Especificación: 60 - /canchas como cuadrícula de tarjetas

Estado: aprobada 2026-10-08 (humano: "mejora la pestaña de canchas, quiero que salga así", con captura de referencia).

## 1. Objetivo
**Problema:** `/canchas` muestra los resultados como filas de tabla (hora, complejo, deporte, precio) en `apps/web/app/(public)/canchas/content.tsx:73-86`, pintadas por `apps/web/lib/public/scripts/canchas.ts`. El humano quiere una cuadrícula de tarjetas con foto, como la captura de referencia.

**Resultado esperado:** los resultados se ven como tarjetas en cuadrícula (1 columna en móvil, 2 en tablet y 3 en escritorio), con conmutador "Por canchas / Por complejos", orden y tarjetas promocionales propias intercaladas. Los filtros, los datos y la API no cambian.

## 2. Fuera de alcance
- API y contratos (`/api/canchas/disponibles`, `/api/resenas/publicas`). Si falta un dato: `BLOQUEO-API` y no inventarlo.
- La marca, el logo, los textos y los anuncios de la captura de referencia, que son de otra empresa (CanchasGO). Solo se toma la disposición; las promos son de ReservaYa.
- El formulario de filtros superior, la `BandaCierre` y el diálogo de opiniones (se reutilizan).

**Decisiones de producto que requieren aprobación:** ninguna. Las tarjetas promocionales enlazan a páginas propias existentes (`/jugar#partidos`, `/duenos`).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/web/app/(public)/canchas/content.tsx` | modificar | contenedor de cuadrícula, conmutador, esqueletos de tarjeta |
| `apps/web/lib/public/scripts/canchas.ts` | modificar | pintar tarjetas en vez de filas; agrupar por complejo; intercalar promos |
| `apps/web/components/public/…` (nuevo si conviene) | crear | piezas de tarjeta reutilizables |
| tests junto a lo cambiado | crear / modificar | lógica de agrupado e intercalado |

## 4. Diseño y lógica
- **Tarjeta de cancha** (de arriba abajo):
  - Foto `cancha.imagen` con relación fija y un respaldo si es null.
  - Insignia de deporte arriba a la izquierda (p. ej. F7, Vóley, Pádel) desde `tipo`, e insignia "Techada" arriba a la derecha si `techada`.
  - Nombre del complejo en negrita y nombre de la cancha debajo.
  - Distrito con punto verde.
  - Estrellas + promedio + "(N reseñas)", abriendo el diálogo `#opiniones` existente.
  - Chips de superficie (`superficie`).
  - Pie con precio `S/ N` + "/60 min" (o el total estimado si hay filtro de hora) y botón verde "Reservar" con icono, que lleva al mismo destino que hoy.
- **Promos:** tarjeta de foto a toda la altura con insignia "Próximamente" o una llamada propia. Intercalar 1 cada ~5 tarjetas, como máximo 2. Deben ser decorativas para lectores de pantalla o tener un texto claro, y no cuentan en el total.
- **Conmutador "Por canchas / Por complejos":** botones segmentados con `aria-pressed`. "Por complejos" agrupa por `complejo` con una tarjeta por complejo (foto, nombre, distrito, nº de canchas, precio desde y botón "Ver canchas" que filtra con `q`).
- **Encabezado de resultados:** "N complejos · M canchas" a la izquierda; conmutador y "Ordenar por" a la derecha (el orden actual se mantiene).
- **Estados:** esqueletos con la misma forma de tarjeta (sin CLS, ver spec 47); vacío y error como hoy.
- **Estilo:** tokens y clases existentes (`card-tactil`, `BOTON`, colores cesped/tiza/noche), leer `docs/skills/panel-next.md`. Objetivos táctiles ≥ 44 px (spec 58).
- **Invariantes:** sin cambios de API; 0 px de desborde a 360/390/768/1280; los enlaces de reserva siguen funcionando; CLS de `/canchas` ≤ 0,1.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos, lint y tests web | `npm --prefix apps/web run typecheck`, `run lint`, `test` | 0 errores |
| A2 | Gate completo | `pnpm exec turbo run build typecheck lint test --force` (fuera del sandbox, god) | 18/18 |
| A3 | Aspecto | Capturas a 360/768/1280 de "Por canchas" y "Por complejos" comparables con la referencia | aprobado por el humano |
| A4 | Responsivo y táctil | Playwright: desborde 0 px; botones y conmutador ≥ 44×44 | pasa |
| A5 | Funcional | Filtros, orden, opiniones y "Reservar" funcionan como antes | pasa |
| A6 | CLS | `node apps/web/scripts/cls.mjs --landing` o una medición equivalente en `/canchas` | ≤ 0,1 |

## 6. Checklist
- [x] T1: tarjeta de cancha y esqueleto.
- [x] T2: cuadrícula, encabezado y conmutador.
- [x] T3: vista por complejos.
- [x] T4: promos intercaladas.
- [x] T5: tests y capturas; verificar criterios y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A1 | pasa | `typecheck` 0 errores; `lint` 0 avisos; `test` 77/77 (7 nuevos en `lib/public/tarjetas.test.mjs`) — worker-canchas-tarjetas |
| 2026-10-08 | A4 | pasa | Playwright (Chrome) a 360/390/768/1280 en ambas vistas: desborde 0 px; 0 objetivos < 44×44 en tarjetas, conmutador y orden; 1/1/2/3 columnas. Script `hive/agents/worker-canchas-tarjetas/qa/verificar.mjs` — worker-canchas-tarjetas |
| 2026-10-08 | A5 | pasa | Misma corrida con API local NestJS: orden menor/mayor precio y en URL; filtro deporte; diálogo de opiniones abre y cierra con Escape; "Reservar" → `/dashboard/canchas?fecha&horaInicio&horaFin&complejoId`; "Por complejos" → `vista=complejos`; "Ver canchas" filtra `q` y vuelve a "Por canchas" — worker-canchas-tarjetas |
| 2026-10-08 | A3 | pendiente humano | Capturas en `hive/agents/worker-canchas-tarjetas/qa/capturas/canchas-{canchas,complejos}-{360,768,1280}.png` |
| 2026-10-08 | A2, A6 | pendiente god | Gate turbo y CLS fuera del sandbox |
| 2026-10-08 | A2 | Pasa | god en main con spec 61: gate 18/18 (API 126, web 80). |
| 2026-10-08 | A3 | Pasa | Humano: "sí, apruebo el diseño". |
| 2026-10-08 | A6 | Pasa | god local, Chrome: CLS de `/canchas` 0,0000 a 360 y 1280; desborde 0 px. |
