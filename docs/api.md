# Integración con la API

## Variables públicas de Next (build-time)

Configuración de ejemplo: `apps/web/.env.example`. El runner usa `apps/web/.env` solo en ejecución local; la API hereda esas variables. Para `dev:api` solo, proporcionarlas en el entorno del shell. La resolución privada `BACKEND_URL` y JWT se configura en servidor.
| Variable | Uso | Local |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | Google Analytics (opcional) | vacío |
| `NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT` | Receptor de formularios de contacto/mejoras (opcional) | vacío |
| `NEXT_PUBLIC_MEDIA_URL` | Host público del bucket R2 de imágenes, sin barra final | requerido para subir imágenes |

La API .NET sigue siendo la autoridad de datos y sesión. `BACKEND_URL` solo configura el rewrite en el servidor Next; no se expone al cliente.

Nunca `DATABASE_URL` ni secretos aquí: todo `NEXT_PUBLIC_*` puede terminar en el cliente.

## Endpoints de las páginas públicas y del jugador
| M | Ruta | Sesión | Página |
|---|---|---|---|
| POST | `/api/auth/login` · `/api/auth/register` · `/api/auth/logout` | — | login, register, layout (el registro no recoge género: spec 16) |
| GET | `/api/auth/me` | sí | layout, perfil, mejoras |
| POST | `/api/auth/forgot-password` `{ email }` | — | forgot-password: 200 `{ ok }` exista o no la cuenta · 400 correo inválido · 429 límite (spec 15) |
| POST | `/api/auth/reset-password` `{ token, password }` | — | reset-password: 200 `{ ok }` y cierra todas las sesiones · 400 `Enlace inválido o vencido` / contraseña < 6 · 429 (enlace de 30 min, un solo uso, token en `#t=`) |
| GET | `/api/canchas/disponibles` · `/api/canchas/opciones` | — | canchas |
| GET | `/api/resenas/publicas` | — | canchas |
| GET | `/api/reservas` | sí | perfil |
| PATCH | `/api/usuarios/me` | sí | perfil |
| PUT | `/api/usuarios/me/foto` `{ url }` | sí | perfil (URL ya subida a R2) |
| POST | `/api/usuarios/me/foto` | sí | heredado multipart (disco de Render, efímero); la UI ya no lo usa |
| GET | `/api/usuarios/buscar` | sí | sortear |
| GET / POST | `/api/partidos` | GET — / POST sí | completar-cuadro |
| GET | `/api/partidos/mios` | sí | mis-partidos |
| POST / DELETE | `/api/partidos/{id}/anotarse` | sí | completar-cuadro, mis-partidos |
| DELETE | `/api/partidos/{id}` | sí | mis-partidos |

## Imágenes en Cloudflare R2

Flujo: `uploadToR2(file, tipo)` (`apps/web/lib/upload-r2.ts`) → `POST /api/upload` (route handler de Next, estático: se sirve antes del rewrite `/api/:path*`, no llega a la API .NET) → `PUT` directo del navegador a R2 → endpoint PUT de la API con la URL pública. La API solo acepta URLs que empiezan por `MEDIA_PUBLIC_URL` + `/`.

| M | Ruta | Sesión | Body | Respuesta |
|---|---|---|---|---|
| POST | `/api/upload` (Next) | sí (cookie; 401 si no) | `{ filename, contentType, size, tipo: 'cancha'\|'perfil'\|'partido' }`; JPG/PNG/WEBP/GIF, ≤3 MB; `cancha` solo ADMIN/SUPERADMIN/TECNICO | `{ uploadUrl, publicUrl, key }`, firma 300 s con `Content-Type` y `Content-Length` firmados; clave `uploads/<tipo>/<userId>/<ms>-<uuid8>-<slug>.<ext>` · 400 datos · 403 rol · 503 sin variables R2 |
| PUT | `/api/canchas/{id}/imagen` | ADMIN/SUPERADMIN/TECNICO con permiso sobre la cancha | `{ url }` | `{ ok, cancha }` · 400 URL inválida · 403 · 404 · 503 sin `MEDIA_PUBLIC_URL` |
| PUT | `/api/usuarios/me/foto` | sí | `{ url }` | `{ ok, fotoUrl }` · 400 · 503 |
| PUT | `/api/partidos/{id}/foto` | organizador o TECNICO | `{ url }` | `{ ok, partido }` · 400 · 403 · 404 · 503 |
| POST | `/api/partidos` | sí | multipart; campo `fotoUrl` (R2) en lugar de `foto` | 201; 400 `URL de imagen inválida` |

Al reemplazar una imagen (PUT `{url}` o multipart) o al eliminar una cancha o un partido, la API borra del bucket el objeto anterior si su URL empieza por `MEDIA_PUBLIC_URL/uploads/` (`Services/AlmacenR2.cs`, `DeleteObject`). Se hace después de guardar en BD y es mejor esfuerzo: si R2 falla o faltan `R2_*` en la API, solo queda un aviso en el log (`R2 no se pudo borrar {Clave}` / `R2 sin configurar`) y el objeto huérfano. Las rutas `/uploads/...` locales se siguen borrando del disco como antes.

Propiedad: una URL R2 **nueva** (distinta de la guardada) solo se acepta si su clave es de la carpeta del usuario: `uploads/perfil/<userId>/` en `PUT /api/usuarios/me/foto`; `uploads/partido/<userId>/` en `POST /api/partidos` (`fotoUrl`) y `PUT /api/partidos/{id}/foto`; `uploads/cancha/<userId>/` en `PUT /api/canchas/{id}/imagen`, `PUT`/`POST /api/canchas` (`imagen`) y `POST /api/solicitudes`. TECNICO puede usar cualquier `uploads/partido/` o `uploads/cancha/`. Si no, 400. Reenviar la URL ya guardada (p. ej. al editar otros campos de la cancha) no se revalida. Además el borrado solo actúa sobre claves `uploads/<tipo>/` del tipo de la entidad. Así nadie puede adoptar la URL de otro y provocar que la API borre ese objeto.

Los POST multipart heredados (`/api/canchas/{id}/imagen`, `/api/usuarios/me/foto`, `foto` en `/api/partidos`) siguen funcionando por compatibilidad, pero escriben en `wwwroot/uploads` de Render (efímero). Responden con la cabecera `Deprecation: true` y registran `LegacyUploadUsed {Endpoint} {UserId}` (warning). La web ya no los usa: todo pasa por `lib/upload-r2.ts`.

### Plan de retiro de /uploads

1. **Observar (ahora).** Multipart marcado con `Deprecation: true` y log `LegacyUploadUsed`. Vigilar en los logs de Render que no aparezca durante al menos 2 semanas (solo clientes viejos o scripts lo llamarían).
2. **Quitar la escritura.** Eliminar los tres POST multipart (o devolver `410 Gone`) y el campo `foto` de `POST /api/partidos`. `UseStaticFiles` de `/uploads` se mantiene: aún hay URLs `/uploads/...` en BD.
3. **Quitar la lectura.** Cuando una consulta de solo lectura confirme que ninguna fila de `Cancha.Imagen`, `Usuario.FotoUrl` ni `PartidoAbierto.FotoUrl` empieza por `/uploads/` (los dueños vuelven a subir o se dejan sin imagen), retirar `UseStaticFiles` de `/uploads`, `ImagenArchivo.GuardarVersionadaAsync` y el borrado local. Sin migraciones: solo código.

## Errores
| Código | Significado | Qué hace la UI |
|---|---|---|
| 400 | Datos inválidos, fuera de horario | Mensaje `error` de la API |
| 401 | Sin sesión | Redirige a `/login?returnUrl=…` (perfil muestra aviso) |
| 403 | Sin permiso / otra sede | Mensaje `error` |
| 409 | Conflicto (horario tomado, username usado) | Mensaje `error` |
| 429 | Demasiados intentos de login | "Espera 15 minutos" |


## Convenio de prueba de dueños (sin migración)
- `POST /api/auth/register`: siempre crea USUARIO. `planDueno` y `aceptaConvenio` ya no forman parte del DTO y no elevan el rol. El convenio se acepta al solicitar el centro (spec55).
- `POST /api/complejos`: gestión autenticada; alta publicada y prueba automática derivada de `CreadoEn + 30 días`, sin aprobación técnica. Una cuenta sin suscripción activa no crea otro complejo.
- `POST /api/canchas`: en prueba permite máximo una cancha (409 para segunda), bajo transacción SERIALIZABLE para solicitudes simultáneas; complejo vencido sin suscripción vigente devuelve403. Los conflictos de serialización devuelven409 para revisar/reintentar.
- `GET /api/suscripciones/estado`: propios/membresías (TECNICO ve todos); `{ok, complejos:[{complejoId,nombre,enPrueba,diasRestantes,pruebaHasta,activa,vencida,bloqueada,canchasPermitidas,puedeCrearCancha}]}`. ACTIVA vigente tiene prioridad sobre prueba. No filas de prueba en Suscripcion.
- `POST /api/suscripciones`: flujo existente PENDIENTE; `PATCH /api/suscripciones/{id}/aprobar`: técnico activa, publica y calcula vigencia desde aprobación. Mientras está pendiente no desbloquea.
- Visibilidad y reservas: Publicado y (prueba no vencida o suscripción ACTIVA vigente). Bloqueo derivado en lectura, sin cron, sin cambiar Activa de la cancha; se revierte al activar suscripción. Middleware limita APIs de gestión cuando todos los complejos de acceso están bloqueados; cuenta y suscripciones permanecen accesibles. Panel reemplaza contenido por solicitud al bloquearse todos, y muestra días de prueba cuando procede.
- Limitación de auditoría: checkbox validado en la petición; el esquema no guarda fecha, versión ni evidencia de aceptación. No hay migración ni endpoint separado aceptar-convenio. Complejos existentes también usan su CreadoEn original: no se reinicia el plazo al desplegar.

## Libro de reclamaciones (RYS-12)
- `POST /api/reclamos`, público, independiente de sesión y convenio del dueño. Límite: 10 envíos por IP/hora (en memoria por instancia, patrón existente). No se envía al receptor opcional de contacto.
- JSON: `nombre,email,documentoTipo` (`DNI|CE`), `documento,domicilio,telefono,menor` (booleano); si menor: `apoderado,apoderadoDocumento,apoderadoDomicilio,apoderadoTelefono`; `bienTipo` (`Servicio|Producto`), `bienDescripcion,monto` (número nullable en soles, máximo dos decimales), `tipo` (`RECLAMO|QUEJA`), `detalle,pedido,medioRespuesta` (`Correo electrónico|Carta al domicilio`). Fecha, número y estado los asigna el servidor.
- `201 {ok:true,numero:"2026-000001",fecha:"...Z",plazoRespuestaDiasHabiles:15}` únicamente después del commit. `400`: validación; `429`: límite; `503`: agotados cinco reintentos de concurrencia. Errores de validación automática también pueden usar ProblemDetails de ASP.NET.
- Número anual según año UTC de recepción, MAX(correlativo)+1 dentro de SERIALIZABLE, índices únicos en número y (año,correlativo), reintentos 40001/23505 sobre esos índices. Un rollback no consume número. No se ofrece eliminación de registros ni consulta pública de datos personales.
- El formulario conserva número, fecha UTC, copia completa y plazo improrrogable de 15 días hábiles; permite descargar texto y bloquea otro envío tras confirmar. No se promete email automático ni fecha límite calculada sin calendario de feriados. La respuesta del proveedor se conserva como campos opcionales; este alcance no añade su panel de gestión.
- Despliegue: requiere aplicar la única migración `LibroReclamaciones` por el humano. Se generó para revisión; este trabajo no la aplica ni escribe en Neon. Prisma contiene únicamente el espejo textual de la entidad.

Referencia del plazo: [Indecopi — cambios del Reglamento del Libro de Reclamaciones](https://www.gob.pe/institucion/indecopi/noticias/641594-modifican-reglamento-del-libro-de-reclamaciones-para-que-proveedores-atiendan-reclamos-y-quejas-de-clientes-en-15-dias-habiles). El sitio es ficticio: no muestra razón social, RUC, domicilio del proveedor ni banco de datos inventados (RYS-9).

## Solicitudes jugador → dueño (spec 55, F1)

Sin migraciones. Pendiente = centro no publicado cuyo dueño conserva rol USUARIO; los centros no publicados de dueños existentes no entran en la cola técnica. Una solicitud crea un centro y exactamente una cancha inactiva.

| Método y ruta | Sesión/rol | Payload | Respuesta |
|---|---|---|---|
| `POST /api/solicitudes` | USUARIO | `{complejo:{nombre,direccion,distrito,telefono?,email?,descripcion?},cancha:{nombre,tipo,precioPorHora,capacidad,descripcion?,techada?,superficie?,imagen?},aceptaConvenio:true}` | `201 {ok:true,solicitud}`; 400 datos/convenio/distrito/imagen inválidos; 409 centro pendiente/aprobado existente o concurrencia |
| `GET /api/solicitudes/mias` | USUARIO/SUPERADMIN | — | `200 {ok:true,solicitud:Solicitud|null}`; solo último centro propio. Null significa sin solicitud actual: nunca enviada o rechazada; no hay historial persistente |
| `GET /api/solicitudes` | TECNICO | — | `200 {ok:true,solicitudes:Solicitud[]}`, solo pendientes ordenadas por recepción; incluye solicitante |
| `PATCH /api/solicitudes/{id}/aprobar` | TECNICO | — | `200 {ok:true,solicitud,requiereRefrescarSesion:true}`; 404 inexistente; 409 ya revisada/estructura inválida/concurrencia |
| `PATCH /api/solicitudes/{id}/rechazar` | TECNICO | `{motivo}` no vacío, máximo 2000 caracteres | `200 {ok:true,estado:"RECHAZADA",emailEnviado:boolean}`; 400 motivo inválido; 404 inexistente; 409 ya revisada/datos asociados/concurrencia |
| `POST /api/auth/refrescar` | autenticado vigente | — | `200 {ok:true,usuario:{id,nombre,email,rol}}` y nueva cookie HttpOnly de sesión; lee rol/versión actuales de BD |

`Solicitud = {id,estado:"PENDIENTE"|"APROBADA",creadoEn,complejo:{id,nombre,direccion,distrito,ciudad,telefono,email,descripcion,publicado},cancha:CanchaDto|null}`. Solo la cola técnica añade `solicitante:{id,nombre,email}`. `tipo` es un valor de TipoCancha (p.ej. FUTBOL5). Ciudad siempre Arequipa, distrito validado contra los 29 existentes. Id, slug, dueño, fechas, publicación y actividad se asignan en servidor; se ignoran valores que el cliente intente aportar en esos campos.

- Todas las rutas autenticadas conservan 401 sin sesión y 403 por rol/sesión revocada. Ningún jugador puede revisar solicitudes propias/ajenas como técnico; mias filtra directamente por DuenoId de la sesión, sin IDs externos ni membresías.
- Alta, aprobación y rechazo usan SERIALIZABLE. Alta revisa que no exista ningún centro propio; dos solicitudes simultáneas no pueden confirmarse. Conflicto PostgreSQL40001/23505 devuelve409 para recargar/reintentar. Rechazo también convierte FK23503 en409 y conserva los datos si no se puede borrar.
- Aprobación publica el centro, activa su única cancha, reinicia CreadoEn/ActualizadoEn a UTC actual y cambia el usuario a SUPERADMIN. **Decisión god:** no incrementa TokenVersion en esta promoción. El JWT anterior permanece USUARIO hasta refrescar; el polling puede consultar la aprobación. Refrescar nunca confía en el rol del JWT y no omite ValidSessionHandler. Las demás revocaciones conservan su incremento de versión.
- Rechazo borra primero las canchas y después el centro, confirma la transacción y luego intenta email con motivo. Si el proveedor falla o está desactivado/en modo log devuelve emailEnviado=false sin deshacer el rechazo. No persiste motivo/historial/notificaciones; el jugador puede volver a solicitar. Un fallo de email no significa solicitud todavía pendiente.
- `GET /api/suscripciones/estado` incluye para el jugador su centro pendiente con `pendiente:true,estadoSolicitud:"PENDIENTE",enPrueba:false,puedeCrearCancha:false,bloqueada:true`; aún no arranca la prueba. La prueba empieza al aprobar y mantiene 30 días/una cancha.
- **BLOQUEO-3:** Activa=false también significa desactivación voluntaria, no existe un discriminador fiable de revisión pendiente. Se aplica la alternativa aprobada: nuevas canchas de centros con suscripción vigente conservan activación normal, sin revisión adicional; no se reactivan canchas que el dueño desactivó. La primera cancha se activa al aprobar la solicitud. Prueba/vencimiento/403 vigentes de RYS-27 se mantienen.
- El PUT de complejos y la aprobación/creación de suscripciones no publican solicitudes de jugadores: requieren pasar primero por la aprobación de solicitudes. El alta de complejos/canchas sigue reservada a roles de gestión y técnico; register deja de ser una vía de elevación directa.
