# F5 — equipo, solicitudes, suscripciones y dominios restantes en Nest

Estado: 43 acciones implementadas en `apps/api`. Paridad estricta y gates en verde (ver Verificación). No hay tráfico productivo, commit ni push.

## Alcance

| Dominio | Acciones | Código |
|---|---|---|
| Complejos (gestión) | E034–E038 | `src/complejos/complejos.ts` |
| Equipo | E039–E042 | `src/equipo/equipo.ts` |
| Invitaciones | E045–E047 | `src/equipo/equipo.ts` |
| Partidos (resto) | E053–E058 | `src/partidos/partidos.ts` |
| Reseñas (resto) | E067–E069 | `src/resenas/resenas.ts` |
| Sanciones | E076–E078 | `src/sanciones/sanciones.ts` |
| Solicitudes | E079–E083 | `src/solicitudes/solicitudes.ts` |
| Suscripciones | E084–E089 | `src/suscripciones/suscripciones.ts` |
| Torneos (resto) | E090–E097 | `src/torneos/torneos.ts` |

Registro en `src/domains.module.ts`. Helpers de compatibilidad .NET en `src/management/legacy.ts`: `Enum.TryParse(ignoreCase)` (nombres, enteros y banderas con coma), `DateTime.TryParse(RoundtripKind)` conservando el tipo de fecha en la respuesta, `TimeSpan.TryParse` limitado a un día, redondeo bancario de `Math.Round`, normalización de distritos y slug.

Cambios en código compartido:
- `Access.actor(r, roles, expired)`: con `expired=false` replica la exclusión de `/api/suscripciones` del middleware de panel vencido. `owner`/`member` aceptan `blocked` (`incluirBloqueados` del legado).
- `MailProvider`: `queue()` replica `EmailQueue` (cola de 500, descarta lleno, errores solo en log); `deliver()` envía un mensaje genérico; `configured()` replica el registro de Resend del legado. El correo de recuperación conserva su contrato y tests.
- `Media.store()` extraído de `upload()` para el multipart heredado de partidos.
- `BindingFilter` responde con el status de la excepción; `validation()` reutiliza el formato ProblemDetails.
- `tests/legacy-auth-host/Program.cs`: bandera `F5_QA_FIXTURE` y prefijo `f5_fixture_`; el middleware del host ahora excluye `/api/suscripciones`, como `apps/api-dotnet/Program.cs`.
- `scripts/f2-parity.mjs`: la guarda «ruta fuera de alcance» apuntaba a rutas que ahora son F5; ahora usa rutas F6/F7 (`/api/caja/hoy`, `/api/reservas`, `/api/abonos`, `/api/metas`, `/api/reportes/dashboard`).
- `src/app.test.ts`: la frontera de rutas no implementadas usa `/api/caja/hoy` en lugar de `/api/complejos`.

## Contratos conservados

- Orden de validaciones, códigos y mensajes exactos del legado, incluidos 404 `SIN_CUENTA` con `codigo`/`correoEnviado`, 422 del equipo y 409 de solicitudes.
- Navegaciones como en EF: una reseña nueva devuelve `usuario: null`, sanciones creadas o desactivadas devuelven `complejo: ""` y `usuario: null`, `complejoNombre` solo se rellena cuando el legado tenía el complejo cargado (crear y aprobar suscripción).
- `POST /api/partidos` usa `[FromForm]`: multipart o urlencoded, nombres sin distinguir mayúsculas, primer valor. Errores de enlace de `cuposTotales`/`precio` responden ProblemDetails 400. Otro tipo de contenido, como JSON, enlaza un formulario vacío y responde 400 «Título de 3 a 80 caracteres», igual que el legado. Foto por URL propia (`uploads/partido/<id>/`) o multipart heredado con `Deprecation: true`.
- Promoción a ADMIN al aceptar invitación y a SUPERADMIN al aprobar solicitud sin incrementar `tokenVersion`. Al quitar al último equipo de un ADMIN, este baja a USUARIO e incrementa `tokenVersion`.
- Correos después del commit: la invitación (aviso o registro) se encola tras guardar la membresía. Respeta el tope de tres correos por destinatario y día. El aviso de rechazo de solicitud se envía tras confirmar la transacción y solo con un proveedor real; si falla, `emailEnviado: false` y el rechazo se mantiene.

## Divergencias intencionales

1. **Sesión revocada (ya aceptada).** En las rutas con `Roles`, el legado omite `ValidSession` y acepta tokens con `tokenVersion` revocada. Nest responde 403 «Sin permisos» sin efectos, correos ni borrados en R2. Son 28 casos `SECURITY_DIVERGENCE`, fuera del conteo estricto.
2. **Cupos bajo concurrencia (endurecimiento).** `anotarse` y `inscripciones` bloquean la fila del partido o torneo (`SELECT … FOR UPDATE`) en una transacción antes de contar. En la prueba con cinco solicitudes simultáneas y cupo 2, el legado guardó 4/2 anotaciones y 5/2 inscripciones; Nest guardó 2/2 y respondió 409 «El partido ya está lleno» / «Cupo máximo alcanzado» al resto. Las ejecuciones secuenciales son idénticas.
3. **Aprobar suscripción** marca VENCIDA a la anterior, activa y publica en una sola transacción (el legado lo hacía en dos escrituras). El resultado observable es el mismo.
4. Sin ejercitar en paridad. Un valor numérico de enum no definido (`nivel: "7"`) se rechaza como inválido; en el legado acaba en error 500 de base de datos. Igual que en F4, no se replican los ProblemDetails por tipos JSON incorrectos en cuerpos `[FromBody]`.

## Verificación (Node 22.20.0, pnpm 10.18.3, dotnet 10.0.401)

```
pnpm exec turbo run build typecheck lint test --filter=@reservaya/api --force
  Tasks: 7 successful, 7 total · Test Files 6 passed · Tests 71 passed (71)
node scripts/f5-parity.mjs --confirm-qa-migracion-ts
  F5 strict parity 304/304; intentional security divergences 28; informative 2; failures 0
node scripts/f2-parity.mjs --confirm-qa-migracion-ts      F2 parity 38/38
node scripts/f3-parity.mjs --confirm-qa-migracion-ts      F3 parity 39/39; cross 6/6
f4-parity.mjs de HEAD (copia en otro puerto, salida fuera del repo)
  F4 strict parity 128/142; intentional security divergences 14; failures 0
dotnet build tests/legacy-auth-host -c Release -p:EnableSourceControlManagerQueries=false   0 errores
```

`docs/specs/56/f5/parity-results.json` guarda cada caso: 43 acciones × (nominal, sin sesión, tv revocado y rol no permitido si la ruta tiene roles), más casos negativos de propiedad entre sedes, validación, bloqueo por vencimiento, correos, multipart y concurrencia. Cada comparación incluye status, cuerpo, `content-type`, `Deprecation`, todas las columnas de trece tablas, borrados en el S3 local ficticio y correos capturados. Los estados esperados de F0 se exigen cuando el id coincide. Normalización explícita: GUID N nuevos (también dentro de slug y ruta de upload), marcas de tiempo de la petición tras comprobar ±120 s, `traceId` tras validar formato W3C o id de Kestrel, segundos Unix del nombre de archivo heredado.

El runner crea `f5_fixture_<hex>` en la rama `qa-migracion-ts` y siembra datos ficticios una vez. Luego restaura con una sola llamada `f5_seed.restore()` desde un esquema interno de esa base efímera: la ejecución completa tardó 543 s con unos 110 ms de latencia a Neon. Borra la base con `DROP … WITH (FORCE)`: tres intentos, con un cliente nuevo en cada uno. También responde a SIGINT/SIGTERM; se comprobó con una interrupción real (base eliminada, host detenido, carpeta temporal borrada). Opción `--only=E054,…` para iterar; escribe `parity-partial.json`.

## Límites y notas

- Sin producción, seed, Resend, Google ni R2 reales. El correo se captura en memoria en ambos backends y el S3 es local y ficticio. No se tocaron `apps/api-dotnet` ni `apps/web`.
- La conexión a Neon (5432) no pasa por el proxy del sandbox. Los runners de paridad y el gate de Turbo, que no reenvía `TMPDIR`, se ejecutaron fuera del sandbox.
- Durante esta tarea otro agente modificó en paralelo archivos F4 (`management/usuarios.ts`, `management/controller.ts`, `management.test.ts`, `scripts/f4-parity.mjs`, `scripts/f4-cleanup*.mjs`, `docs/specs/56/f4/*`). No los toqué. Los 71 tests incluyen sus cambios; la regresión F4 se ejecutó con el runner de HEAD.
