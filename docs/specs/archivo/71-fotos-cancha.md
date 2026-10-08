# Especificación: 71 - Hasta 5 fotos por cancha en el panel

Estado: aprobada 2026-10-08 (humano: "tienes que permitir subir siquiera 5 fotos de la cancha en el dashboard, arregla eso, depura código que después quede muerto y commit").

## 1. Objetivo
**Problema:** el formulario de cancha del panel (`apps/web/components/features/GestionCanchasPanel.tsx`) solo admite una foto (`Cancha.imagen`, subida por `POST /api/canchas/:id/imagen`, `apps/api/src/management/controller.ts:13-14`, `canchas.ts`). El esquema ya tiene `Cancha.fotos String[] @default([])` sin uso.

**Resultado esperado:** el dueño sube hasta 5 fotos por cancha, las ordena y elige portada, con el mismo editor que las fotos del complejo (`apps/web/components/complejos/FotosEditor.tsx`, spec 62: compresión WebP, progreso, reordenar, eliminar con confirmación). La portada sigue siendo la imagen de la cancha en `/canchas` y en la ficha; en la tarjeta de la cancha de `/c/<slug>` se pueden pasar sus fotos.

## 2. Fuera de alcance
- Cambios de esquema (no hacen falta: `Cancha.fotos` existe). Sin migraciones.
- Galería del complejo (retirada en la spec 70).

**Decisiones:** `imagen` se mantiene como portada = `fotos[0]` (compatibilidad con catálogo, correos y datos existentes). Si una cancha tiene `imagen` y `fotos` vacío, el editor la muestra como primera foto.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/management/canchas.ts`, `controller.ts` | modificar | aceptar `fotos` (máx. 5, JPG/PNG/WebP del bucket propio, misma validación que complejos) y fijar `imagen = fotos[0] ?? null`; `canchaShape` devuelve `fotos` |
| `apps/api/src/public/read.service.ts` (`canchaDto`, perfil) | modificar | exponer `fotos` |
| `apps/web/components/complejos/FotosEditor.tsx` | modificar | parámetros `max` y `tipo` de subida (`cancha`) |
| `apps/web/components/features/GestionCanchasPanel.tsx` | modificar | reemplazar el campo de una foto por `FotosEditor` (máx. 5) |
| `apps/web/components/complejos/CanchasPerfil.tsx` / tarjeta | modificar | carrusel táctil ligero de las fotos de la cancha con contador, sin CLS |
| Código que quede sin uso | borrar | p. ej. `POST /api/canchas/:id/imagen` y `subirImagenCancha` si nadie los usa; knip limpio |
| tests, `docs/api.md` | modificar | — |

## 4. Diseño y lógica
- Validación en API: >5 fotos → 400; URL fuera del bucket → 400; propiedad de la cancha como hoy (dueño/TECNICO).
- Objetivos táctiles ≥ 44 px; 0 px de desborde 360/1280.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate | turbo (god) | 18/18 |
| A2 | API | tests: 5 fotos OK y `imagen` = primera; 6 → 400; host ajeno → 400; ajena → 403 | pasa |
| A3 | Panel | Playwright local (subida simulada, sin R2 real): subir 5, reordenar, portada, guardar | pasa |
| A4 | Ficha | la tarjeta de la cancha en `/c/<slug>` pasa sus fotos; desborde 0 | pasa |
| A5 | Código muerto | knip/git grep sin restos del flujo de una foto | pasa |

## 6. Checklist
- [x] T1 API · [x] T2 editor en panel · [x] T3 carrusel en ficha · [x] T4 borrar muerto · [x] T5 tests/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|

| 2026-10-08 | A1 | Local 16/16 tipos/lint/tests; build pendiente god fuera del sandbox | `hive/agents/michael-code-muyzrm60/spec71-checks.log`, API 224/224; suite nativa web+scripts 116/116 |
| 2026-10-08 | A2 | Pasa: crear/editar cinco, portada, seis/host/formato inválidos 400, cancha ajena 403, TECNICO, retirar/guardar fallido/legado | `apps/api/src/management/fotos-cancha.test.ts`; perfil público expone fotos en `complejo-publico.test.ts` |
| 2026-10-08 | A3/A4 | Implementado; ejecución y capturas pendientes QA externo | Script `hive/agents/michael-code-muyzrm60/spec71-fotos-qa.mjs`, sintaxis válida; login QA_ADMIN, SPEC71_SLUG publicado con cancha de ≥2 fotos, localhost; no simula agenda, rechaza cookies por localStorage, mock de subida/guardado sin DB/R2; captura panel/ficha 360/1280 |
| 2026-10-08 | A5 | Pasa knip 6.39.0 en caché y búsqueda de restos del flujo de una foto vacía | `spec71-knip-offline.log`; `pnpm dlx knip@6` no pudo resolver registry (EAI_AGAIN), cancelado sin reintentar; retirados cuatro exports de tipos sin consumidores encontrados por knip |

La portada histórica ya guardada se conserva como primera foto cuando la galería está vacía. Nuevas URLs ajenas siguen rechazándose; conservar/reordenar esa foto histórica no concede acceso a otra URL externa. `imagen` de `CanchaBody` sigue consumido por las solicitudes de nuevos centros; no se retiró ese contrato independiente.

| 2026-10-08 | A1/A3/A4 · verificación god previa a los ajustes | God confirmó gate 18/18, API 224 y script panel/ficha con WebP real; PNG 1×1 anterior no decodificaba | Inbox `2026-10-08T17-57-56-650Z-96b3db` |
| 2026-10-08 | Ajuste 1 · errores en español | Decodificación y preparación se traducen; FotosEditor muestra mensajes propios por etapa, sin exponer mensajes crudos del navegador | `comprimir-foto.ts`, `FotosEditor.tsx`; tres pruebas de traducción y compresión pasan |
| 2026-10-08 | Ajuste 2 · Reservar de las tarjetas | Enlace `/c/<slug>?cancha=<id>#reservar`; clic normal actualiza URL con replaceState y el widget por evento validado, sin recarga. Móvil abre el widget. Clic con modificadores mantiene enlace nativo. Retirado reservaPublicaHref y reemplazada su prueba | `CanchasPerfil.tsx`, `ReservaWidget.tsx`, `complejo-publico.ts`, `sitio.test.mjs`; git grep del helper antiguo vacío |
| 2026-10-08 | Gate tras ajustes | Local 16/16; API 224/224; pruebas nativas 119/119; knip 6.39.0 y diff --check limpios. Build y repetición del navegador pendientes god | Logs `spec71-ajustes-checks.log`, `spec71-ajustes-native.log`, `spec71-ajustes-knip.log` en carpeta privada |

El script de QA genera ahora WebP válido en canvas; incluye archivo inválido con mensaje español, clic de tarjeta, preselección y prueba de conservación del documento. Mantiene agenda real y consentimiento rechazado. Sintaxis verificada; ampliaciones del script pendientes de ejecutar fuera del sandbox.
| 2026-10-08 | A1, A3, A4 (tras ajustes) | Pasa | god: gate 18/18 (API 224, web 104); `spec71-fotos-qa.mjs` local contra QA (datos temporales restaurados): cinco subidas, reordenar, portada, guardar, imagen inválida con mensaje en español, Reservar de la tarjeta elige la cancha en el widget sin recargar, carrusel y desborde 0 a 360/1280. |
