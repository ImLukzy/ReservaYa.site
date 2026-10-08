# Especificación: 62 - Página del complejo: fotos, ubicación en mapa y ficha completa

Estado: aprobada 2026-10-08 (humano: "haz las dos fases con OpenStreetMap"). Referencia de disposición: página de cancha de CanchasGO, solo estructura, sin su marca.

## 1. Objetivo
**Problema:**
- El perfil público `/c/[slug]` (spec 61) usa la foto de una cancha porque el dueño no puede subir fotos del complejo. El campo `Complejo.fotos String[]` ya existe en `packages/db/prisma/schema.prisma`, pero no se usa en el panel. Además, la subida firmada a R2 (`apps/web/app/api/upload/route.ts`) solo acepta los tipos `cancha`, `perfil` y `partido` (`apps/web/lib/media.ts:3`).
- La ubicación es solo texto (`direccion`, `distrito`): no hay coordenadas ni mapa.

**Resultado esperado:**
- El dueño sube hasta 6 fotos de su complejo, elige la portada y las ordena.
- El dueño marca la ubicación exacta en un mapa dentro del panel, sin salir de la web.
- El perfil público muestra una galería y un mapa integrado con un botón "Cómo llegar".

## 2. Fuera de alcance
- Reserva en la misma página (selector de día y franjas por hora con precio y estado): spec 63, necesita un endpoint público de agenda por cancha (las reservas son por hora, `Reserva.horaInicio Int`).
- Búsqueda de canchas por cercanía ("cerca de mí") y mapa en `/canchas`: se proponen como spec 63, que se apoya en estas coordenadas.
- Fotos por cancha (ya existen).
- Moderación automática de imágenes.

**Decisiones de producto (resueltas 2026-10-08):**
1. **Proveedor del mapa: APROBADO OpenStreetMap.** **Leaflet + OpenStreetMap** para elegir y mostrar el punto. No requiere clave ni tarjeta y es nativo de la página. El botón "Cómo llegar" abre la ruta en Google Maps (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`) solo cuando el usuario lo pide. Alternativa: el mapa de Google integrado (Maps JavaScript API), que requiere una clave de Google Cloud con facturación activa; tiene una cuota gratuita, pero exige tarjeta.
2. **Migración de esquema (aprobada para QA; producción solo con OK explícito del humano en su momento):** columnas nuevas `latitud Float?` y `longitud Float?` en `Complejo`. Se prueban en `qa-migracion-ts` y se aplican con `prisma migrate deploy` en producción, con aprobación humana.
3. **Publicación:** no se vuelve obligatorio (el humano no lo pidió); el panel muestra un aviso «Completa fotos y ubicación» mientras falten.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `packages/db/prisma/schema.prisma` + nueva migración `2_ubicacion_complejo` | modificar / crear | `latitud`, `longitud` |
| `apps/web/lib/media.ts`, `apps/web/app/api/upload/route.ts` | modificar | tipo `complejo` (roles dueño/ADMIN/TECNICO, como `cancha`) |
| `apps/api/src/complejos/complejos.ts` | modificar | aceptar y validar `fotos` (URL de `MEDIA_PUBLIC_URL`, máx. 6) y `latitud`/`longitud` (rango de Arequipa) |
| `apps/api/src/public/read.service.ts` | modificar | perfil público: `fotos`, `latitud`, `longitud` |
| `apps/web/components/b2b/ComplejosGrid.tsx` (+ componentes nuevos) | modificar / crear | galería editable y selector de ubicación en el formulario del complejo |
| `apps/web/app/(public)/c/[slug]/page.tsx` | modificar | galería, mapa y "Cómo llegar" |
| `apps/web/lib/public/scripts/tarjetas.ts` | modificar | portada del complejo en la vista "Por complejos" de `/canchas` |
| tests, `docs/api.md`, `apps/web/.env.example` | modificar | — |

## 4. Diseño y lógica
- **Fotos del complejo:**
  - Arrastrar o seleccionar varias a la vez (máx. 6, JPG/PNG/WebP, mismo tope de tamaño que las canchas).
  - Compresión en el navegador a WebP de ≤ 1600 px antes de subir, para que pese menos en datos móviles.
  - Barra de progreso, reordenar arrastrando o con flechas accesibles, "Usar como portada" (la primera foto es la portada) y eliminar con confirmación.
  - Respaldo en cadena: portada del complejo → foto de una cancha → ilustración.
- **Selector de ubicación (panel):**
  - Mapa Leaflet dentro de la página con un pin que se arrastra.
  - Botón "Usar mi ubicación actual" (geolocalización del navegador, con permiso).
  - Buscador de dirección con botón «Buscar» explícito (sin consultas al teclear: la política de Nominatim prohíbe el autocompletado) y lista de resultados acotada a Arequipa. Las consultas pasan por un proxy de la API autenticado, con caché, cola de 1 consulta por segundo e identificación ReservaYa.
  - Al soltar el pin se propone rellenar `distrito` (geocodificación inversa) si coincide con uno de los 29 de la lista blanca; el dueño confirma.
  - Validación: el punto debe caer dentro del área de Arequipa; si no, aviso y no se guarda.
- **Perfil público (disposición de la referencia, con estilo ReservaYa):**
  - Portada a todo el ancho con la foto principal y un velo oscuro; encima, «Volver a canchas», chips de deportes y superficies, nombre, distrito, valoración, «desde S/ N» y «Ver fotos».
  - Tarjeta «Detalles»: deportes, superficies, precio desde, distrito, techada sí/no y número de canchas.
  - «Canchas de este complejo»: las tarjetas de la spec 60 reutilizadas (mismo componente).
  - Galería con deslizamiento táctil, contador 1/N, flechas y foto a pantalla completa.
  - Mapa estático e interactivo con el pin. El mapa se carga solo al entrar en pantalla (carga diferida), así que no penaliza la carga inicial ni el CLS.
  - Botones "Cómo llegar" (Google Maps con la ruta), "Copiar dirección" y "Compartir".
  - Bloque «¿Problema con tu reserva?»: WhatsApp, llamar y copiar número.
  - Reseñas recientes, con el diálogo de opiniones existente.
  - Móvil: barra fija inferior con «desde S/ N» y «Reservar». Hasta la spec 63, ese botón lleva al flujo actual.
  - Datos estructurados `SportsActivityLocation` con `geo` y `image`, para Google.
- **Invariantes:**
  - Sin claves de pago por defecto.
  - La API sigue tras el secreto de origen (spec 59).
  - Las URL de fotos solo pueden ser del bucket propio.
  - Objetivos táctiles ≥ 44 px; 0 px de desborde.
  - Atribución de OpenStreetMap visible (obligatoria por su licencia).

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate completo | `pnpm exec turbo run build typecheck lint test --force` | 18/18 |
| A2 | Migración | `migrate deploy` en `qa-migracion-ts` + `migrate status` al día; en producción solo con aprobación | pasa |
| A3 | API | tests: fotos ajenas al bucket → 400; más de 6 → 400; coordenadas fuera de Arequipa → 400; perfil público devuelve fotos y coordenadas | pasa |
| A4 | Panel | Playwright: subir 2 fotos, reordenar, elegir portada, mover el pin, "mi ubicación" simulada, guardar | pasa |
| A5 | Perfil | galería y mapa visibles; "Cómo llegar" con lat/lng correctos; CLS ≤ 0,1; desborde 0 px a 360/1280 | pasa |
| A6 | Producción | el humano sube fotos y marca la ubicación de Melgar y lo ve en `/c/<slug>` | pasa |

## 6. Checklist
- [x] T1: migración + API (validaciones, perfil público).
- [x] T2: tipo de subida `complejo` y galería editable.
- [x] T3: selector de ubicación (Leaflet + búsqueda + geolocalización).
- [x] T4: perfil público (galería, mapa, Cómo llegar, JSON-LD) y portada en "Por complejos".
- [x] T5: tests, docs y §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 QA | Pasa (god) | God aplicó `2_ubicacion_complejo` exclusivamente en qa-migracion-ts: 3 migraciones y status «Database schema is up to date» (inbox 16:28). Solo Complejo tiene las dos columnas nuevas. Producción pendiente de autorización humana. |
| 2026-10-08 | A3 | Pasa | Pruebas de fotos ajenas, traversal/extensión, >6, coordenadas inválidas y nulas, conservación de orden, permisos de dueño/TECNICO y contrato público con fotos/coordenadas. API:146/146 en el último gate. |
| 2026-10-08 | Gate sin build | Pasa | Node22 `turbo run typecheck lint test --force`:16/16. Web+runner+motion en un proceso:96/96. `git diff --check` limpio. |
| 2026-10-08 | A1 | Pendiente (god) | Build fuera del sandbox y gate18/18. |
| 2026-10-08 | A4 | Pendiente (god) | Script Playwright preparado `hive/agents/michael-code-muyzrm60/spec62-panel-qa.mjs`, syntax PASS; servidor local QA, QA_ADMIN_EMAIL/PASSWORD, mocks para no escribir DB/R2. Cubre subir2, orden, portada, pin, geolocalización y guardar. No ejecutado en sandbox. |
| 2026-10-08 | A5 / A6 | Pendiente | God mide mapa/galería/Maps/CLS/desborde a360/1280 fuera sandbox; humano prueba producción después de aprobar migración/despliegue. |

**Detalles:** proveedor Nominatim con búsqueda explícita (decisión god16:17; política prohíbe autocompletado), cola1.1s/caché24h/128entradas/5pendientes/autenticación e identificación. Una instancia API para cumplir límite por aplicación. Área operativa rectangular compartida lat[-16.85,-15.70],lng[-72.45,-70.75], no polígono administrativo.

Disposición confirmada god16:19: portada completa; izquierda Detalles→Fotos→Mapa→Contacto→montaje `section#resenas`; derecha sticky Reservar horario con tarjetas reutilizadas de spec60. Galería táctil/contador/barras/fullscreen y barra inferior móvil. Reseñas pertenecen a spec64 (temp), y el widget de franjas a spec63: no implementados aquí.
