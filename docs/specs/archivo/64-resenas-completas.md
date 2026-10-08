# Especificación: 64 - Reseñas completamente funcionales

Estado: aprobada 2026-10-08 (humano: "haz completamente funcional lo de las reseñas, crea otro agente").

## 1. Objetivo
**Problema:** las reseñas existen a medias:
- El jugador califica desde una reserva completada (`apps/web/components/features/CalificarBtn.tsx`, `POST /api/resenas`, `apps/api/src/resenas/resenas.ts:15-25`).
- El dueño responde desde su panel (`apps/web/components/b2b/ResenasPanel.tsx`, `POST /api/resenas/:id/responder`).
- La lectura pública es `GET /api/resenas/publicas` (`apps/api/src/public/read.service.ts:155`).

Faltan piezas:
- Al crear, la reseña se devuelve sin autor (`resenas.ts:22` no incluye `usuarioByUsuarioId`).
- El perfil público `/c/[slug]` solo muestra "Aún no tiene reseñas" o el promedio: no hay lista con autor, fecha, estrellas, comentario ni respuesta del dueño.
- No se puede calificar desde la página del complejo.
- No se puede editar ni borrar la propia reseña desde el perfil.
- No hay distribución de estrellas, orden ni paginación.

**Resultado esperado:** en la página del complejo se ven las reseñas como en la referencia (inicial del autor en círculo, nombre, fecha, estrellas, comentario y respuesta del dueño), con resumen y paginación. Quien ya jugó allí califica, edita o borra su reseña desde la misma página. El dueño responde, edita la respuesta y recibe aviso de reseñas nuevas en el panel.

## 2. Fuera de alcance
- Reseñas por cancha (siguen siendo por complejo).
- Moderación automática con IA.
- Fotos en reseñas.
- Cambios de esquema: `Resena` ya tiene `puntuacion`, `comentario`, `respuestaDueno` y `creadoEn`, con única por complejo y usuario.
- La maquetación general de `/c/[slug]`, que la hace la spec 62 (Michael, en paralelo). Aquí solo se crea la sección de reseñas como componente y se monta en la página con un cambio mínimo.

**Decisiones de producto que requieren aprobación:** ninguna. Privacidad: en público se muestra el nombre como "Nombre I." (inicial del apellido), nunca el email.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/resenas/resenas.ts` | modificar | `create` devuelve el autor; `DELETE /api/resenas/:id` (autor o ADMIN/SUPERADMIN); `PUT /api/resenas/:id/responder` para editar la respuesta; `GET /api/resenas/mia?complejoId=` → `{ puedeCalificar, motivo, resena }` |
| `apps/api/src/public/read.service.ts` (`resenas`) | modificar | paginación (`cursor`/`limite` ≤ 20), orden (`recientes`, `mejor`, `peor`), resumen `{ promedio, total, distribucion: {1..5} }`, autor como "Nombre I.", `respuestaDueno` |
| tests de API | crear / modificar | reglas de §4 |
| `apps/web/components/public/resenas/*` | crear | `ResenasSeccion` (resumen + lista + paginación), `ResenaItem`, `FormResena` (estrellas accesibles + comentario ≤ 500) |
| `apps/web/app/(public)/c/[slug]/page.tsx` | modificar (mínimo) | montar `ResenasSeccion` |
| `apps/web/components/features/CalificarBtn.tsx`, `apps/web/components/b2b/ResenasPanel.tsx` | modificar | reutilizar `FormResena`; editar la respuesta; contador "sin responder" |
| `docs/api.md` | modificar | endpoints |

## 4. Diseño y lógica
- **Quién puede calificar:** un usuario con sesión iniciada y al menos una reserva `COMPLETADA` en ese complejo (regla actual). Una reseña por usuario y complejo; volver a enviar la edita. El autor puede borrarla.
- **En el perfil:**
  - **Sin sesión:** "Inicia sesión para calificar" con `returnUrl` a la página.
  - **Con sesión pero sin haber jugado:** texto "Podrás calificar después de jugar aquí".
  - **Puede calificar:** se abre el formulario en la misma página.
  - **Ya tiene reseña:** se muestra "Tu reseña", con "Editar" y "Eliminar" (con confirmación).
- **Lista:**
  - Resumen con el promedio grande, las estrellas, el total y barras de distribución 5→1.
  - Orden: Recientes, Mejor valoradas o Peor valoradas.
  - Cada reseña: círculo con la inicial (color derivado del nombre), "Nombre I.", fecha en hora de Perú (`es-PE`), estrellas, comentario y, si existe, la respuesta del dueño en un bloque con sangría ("Respuesta de <complejo>").
  - Paginación con "Ver más reseñas", sin saltos de diseño (CLS).
- **Dueño:** responde o edita la respuesta (≤ 500 caracteres) y ve un contador de reseñas sin responder en el menú del panel ("Opiniones").
- **Coherencia:** el promedio y el total de las tarjetas de `/canchas` y del perfil salen de la misma fuente.
- **Seguridad:**
  - El comentario se muestra como texto, nunca como HTML.
  - Límite de 10 envíos de reseña por hora por usuario (`RateLimiter`).
  - La API sigue tras el secreto de origen (spec 59).
- **Accesibilidad:** las estrellas son un grupo de radio con teclado y `aria-label` ("4 de 5"); objetivos táctiles ≥ 44 px.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate completo | `pnpm exec turbo run build typecheck lint test --force` (god, fuera del sandbox) | 18/18 |
| A2 | API | tests: calificar sin reserva completada → 403; crear devuelve autor; editar; borrar propia 200 / ajena 403; responder y editar respuesta solo el dueño; pública paginada con distribución y "Nombre I." sin email | pasa |
| A3 | Web | tests de componentes/lógica: estados sin sesión / no jugó / puede / ya calificó; ordenar; ver más | pasa |
| A4 | E2E local | Playwright con un usuario QA con reserva completada (o datos de QA): calificar, editar y borrar en `/c/<slug>`; el dueño responde en el panel y la respuesta aparece en el perfil | pasa |
| A5 | Producción | el humano ve las reseñas en `/c/<slug>` | pasa |

## 6. Checklist
- [x] T1: API (autor en create, borrar, editar respuesta, `mia`, pública paginada con resumen).
- [x] T2: componentes `ResenasSeccion` / `ResenaItem` / `FormResena`.
- [x] T3: montaje en `/c/[slug]` y reutilización en el panel y en `CalificarBtn`.
- [x] T4: tests, docs y §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 | PASS | `apps/api` vitest 140/140 (nuevo `src/resenas/resenas.test.ts`, 14 casos: 403 sin reserva completada, create con autor, editar, puntuación entera/≤ 500/429 a la 11.ª, borrar propia 200 · ajena 403 · dueño 200 · otro dueño 403, responder/editar solo dueño, `mia`, pública paginada por cursor con distribución y «Nombre I.» sin email, orden mejor/peor, 400/404, 401 sin sesión). Tipos y lint API OK. |
| 2026-10-08 | A3 | PASS | `apps/web` `npm test` 89/89 (nuevo `lib/public/resenas.test.mjs`, 9 casos: estados sin sesión / no jugó / puede / ya calificó / error, URL de orden, ver más con cursor sin duplicados, returnUrl, fecha es-PE en hora de Lima). Tipos y lint web OK. |
| 2026-10-08 | A4 | PASS | Playwright (Chrome) web :3000 → API :5200 sin ORIGIN_SECRET → rama QA `ep-gentle-surf` (no producción), complejo `melgar` con datos `e2e64-*` temporales (borrados al terminar): 18/18 pasos — anónimo ve CTA con returnUrl, resumen 4.0/7, ver más 5→7, orden peor, estrellas con flechas, calificar (Juan P., HTML como texto, total 8), editar, contador «sin responder» en Opiniones, dueño responde y edita, respuesta visible en el perfil, 0 px de desborde a 360 y 1280, 0 objetivos < 44 px en la sección, borrar con confirmación (total 7). Capturas `hive/agents/worker-resenas/resenas-{360,1280}.png` y `resenas-anonimo-{360,1280}.png`. |
| 2026-10-08 | A1 | pendiente | Gate completo con build: god, fuera del sandbox. |
| 2026-10-08 | Decisión | — | DELETE: ADMIN/SUPERADMIN solo borran reseñas de complejos de los que son dueños (`Access.owner`, multitenancy); TECNICO cualquiera. El perfil no expone el id del complejo: `publicas` y `mia` aceptan `slug`, y `mia` devuelve el `complejoId` para el POST. La respuesta pública ya no incluye `usuario.id`; `/canchas` usa `autor`. |

