# Informe de Auditoría de Seguridad: Spec 56 F5 (Dominios Restantes en NestJS)

- **Auditor:** Kelly-Auditor (`kelly-muvkk07m`)
- **Fecha:** 2026-10-07
- **Fase auditada:** Spec 56 F5 — Complejos, Equipo, Invitaciones, Partidos, Reseñas, Sanciones, Solicitudes, Suscripciones, Torneos (43 acciones)
- **Alcance del diff:** `apps/api/src/<dominio>/` (`complejos`, `equipo`, `partidos`, `resenas`, `sanciones`, `solicitudes`, `suscripciones`, `torneos`), `apps/api/src/domains.module.ts`, `apps/api/src/domains.test.ts`, `apps/api/src/management/{legacy,access,media,module}.ts`, `apps/api/src/auth/providers.ts`, `scripts/f5-parity.mjs`, `scripts/f5-cleanup.mjs`, `tests/legacy-auth-host/**`.
- **Dictamen:** **APTO para integrar a `main`**

---

## 1. Resumen Ejecutivo

Se auditó en modo **solo lectura** la implementación de la Fase F5 de la migración a TypeScript/NestJS, que abarca 43 acciones de negocio distribuidas en 9 dominios operativos: Complejos (E034–E038), Equipo (E039–E042), Invitaciones (E045–E047), Partidos (E053–E058), Reseñas (E067–E069), Sanciones (E076–E078), Solicitudes (E079–E083), Suscripciones (E084–E089) y Torneos (E090–E097).

El código analizado presenta una arquitectura robusta, con controles exhaustivos de multitenancy por dueño y sede, prevención de escalación de privilegios, validación de autoría en media, mecanismos de control de concurrencia mediante transacciones serializables y bloqueo pesimista de filas (`SELECT FOR UPDATE`), así como despacho seguro de correos exclusivamente tras la confirmación de la base de datos.

Se identificaron **2 observaciones de severidad BAJA** relacionadas con paginación futura. No se identificaron hallazgos bloqueantes ni medios en el código de producción.

Las **28 divergencias de sesión revocada** y las **divergencias de endurecimiento de cupos y atomicidad transaccional** frente al backend legacy .NET representan **mejoras de seguridad y consistencia transaccional legítimas y aprobadas**.

---

## 2. Evaluación de Controles Críticos de Seguridad

### 2.1 Roles, Autenticación (`tokenVersion`) y Multitenancy
- **Extracción de Sesión:** `Access.actor(r, roles, expired)` invoca `auth.session(r)`, validando obligatoriamente que el usuario exista, esté activo (`activo: true`) y que `c.tv === u.tokenVersion`. Tokens con versión revocada reciben `401 Unauthorized`.
- **Matriz de Roles:**
  - `managementRoles = ['ADMIN', 'SUPERADMIN', 'TECNICO']` aplicado en mutaciones administrativas de complejos, equipo, torneos y reseñas.
  - Sanciones acotadas exclusivamente a `['SUPERADMIN', 'TECNICO']` (`sanciones.ts:13`).
  - Solicitudes: aprobación y rechazo restringidos exclusivamente a `['TECNICO']` (`solicitudes.ts:31, 55, 68`).
  - Usuarios con rol `USUARIO` reciben `403 Sin permisos` de forma consistente ante intentos de manipulación administrativa.
- **Multitenancy y Aislamiento de Sedes:**
  - `Access.owner(a, complejoId)` valida que para actores no técnicos el complejo pertenezca al actor (`duenoId === a.id`). Intentos de acceso o modificación entre sedes ajenas (*cross-owner*) devuelven sistemáticamente `403 Sin permisos`.
  - Los usuarios `SUPERADMIN` (dueños) operan estrictamente dentro del perímetro de sus propios complejos.
  - Los administradores de sede (`ADMIN`) operan restringidos a complejos donde tienen membresía activa (`complejoMiembro.activo: true`).

### 2.2 Ciclo de Vida de Solicitudes y Suscripciones
- **Solicitudes de Centro (`solicitudes.ts`):**
  - Creación (`create`): Solo permitida para rol `USUARIO`. Exige aceptación de convenio (`aceptaConvenio: true`). Dentro de transacción serializable verifica que el usuario no tenga ya un centro registrado. Crea complejo no publicado y 1 cancha inactiva.
  - Aprobación (`approve`): Exclusiva de `TECNICO`. Ejecutada en transacción con `isolationLevel: 'Serializable'`. Valida que el centro tenga exactamente 1 cancha inactiva y que el solicitante no tenga otro centro. Activa la cancha, publica el complejo y promueve el rol del usuario a `SUPERADMIN`.
  - **Manejo de Sesión en Promoción:** Se mantiene el `tokenVersion` intacto para permitir que la sesión web continúe activa y refresque su cookie con el nuevo rol mediante `POST /api/auth/refrescar` (`requiereRefrescarSesion: true`), en estricto cumplimiento del diseño Spec 55 F1.
  - Rechazo (`reject`): Exclusivo de `TECNICO`. En transacción serializable elimina la cancha y el complejo sin dejar huérfanos.
- **Suscripciones (`suscripciones.ts`):**
  - Convenio de prueba de 30 días (`creadoEn + 30 días`) para complejos de dueños aprobados, limitando a 1 cancha permitida.
  - Acceso a panel vencido: `Access.actor(r, undefined, false)` permite a dueños con complejos vencidos acceder a `/api/suscripciones` para consultar estado y solicitar renovación.
  - Aprobación atómica (`approve`): En una sola transacción marca las suscripciones activas previas como `VENCIDA`, activa la nueva suscripción y publica el complejo, eliminando la ventana de inconsistencia del legado.

### 2.3 Seguridad en Invitaciones de Equipo (`equipo.ts`)
- **Prevención de IDOR:** `Invitaciones.accept` y `Invitaciones.reject` validan la cláusula `where: { id, usuarioId: a.id, activo: false }`. Es criptográfica y relacionalmente imposible que un usuario acepte o rechace la invitación de otro (devuelve `404`).
- **Prevención de Escalación de Privilegios:**
  - No permite invitar cuentas que ya sean `SUPERADMIN`, `TECNICO`, que tengan centro propio o solicitud en revisión (`fail(422)`).
  - Aceptar una invitación solo promueve `USUARIO` a `ADMIN`.
- **Revocación de Rol al Salir:** Al eliminar a un miembro activo (`Equipo.delete`), si el usuario era `ADMIN` y no tiene otros equipos activos ni centros propios, es degradado a `USUARIO` y se **incrementa `tokenVersion: { increment: 1 }`**, invalidando de inmediato cualquier sesión activa con privilegios de administración.
- **Anti-Spam y Enumeración:**
  - Máximo 30 invitaciones por hora por dueño.
  - Máximo 3 correos diarios por destinatario (`invitar-correo:${email}`).
  - Peticiones repetidas sobre una invitación ya enviada retornan `200` con `existente: true` sin reexpedir correos.

### 2.4 Sanciones y Bloqueo (`sanciones.ts`)
- Restringidas a `['SUPERADMIN', 'TECNICO']`.
- Niveles tipados: `ADVERTENCIA` y `BLOQUEO`.
- Prevención de duplicados: Devuelve `409 Conflict` si ya existe una sanción activa del mismo nivel para el usuario en dicho complejo.
- Desactivación protegida: Solo el dueño del complejo que emitió la sanción o personal técnico puede desactivarla.

### 2.5 Concurrencia y Control de Cupos
- **Partidos (`partidos.ts:75`):**
  - `Partidos.join` ejecuta una transacción con bloqueo pesimista explícito a nivel de fila: `SELECT "id" FROM "PartidoAbierto" WHERE "id" = ${id} FOR UPDATE`.
  - La verificación de cupos disponibles (`total < p.cuposTotales`) se realiza tras adquirir el bloqueo, garantizando que peticiones concurrentes no sobrepasen el cupo.
- **Torneos (`torneos.ts:72`):**
  - `Torneos.enroll` adquiere igualmente bloqueo de fila: `SELECT "id" FROM "Torneo" WHERE "id" = ${id} FOR UPDATE` antes de verificar `cupoMax`.
- **Efectos Secundarios Post-Commit:**
  - Eliminación de imágenes en S3/R2 se ejecuta estrictamente tras la confirmación de la base de datos (`await this.media.remove(...)`).
  - Las notificaciones por correo (`MailProvider.queue` y `deliver`) se encolan o despachan después del commit. Fallos en el proveedor de correo son capturados en log y no abortan la transacción ni retornan error 500 al cliente.

---

## 3. Análisis de Divergencias de Paridad

En el reporte de paridad (`docs/specs/archivo/56/f5/parity-results.json`), sobre un total de 334 casos evaluados:
- **304 casos:** Paridad estricta **PASS** (100% idénticos en status, headers, body y efectos en BD).
- **28 casos:** Clasificados como `SECURITY_DIVERGENCE`.
- **2 casos:** Clasificados como `INFO` (concurrencia legacy).
- **0 fallos.**

### 3.1 Sesión Revocada (28 Casos `*-tv-revocado`)
En controladores con atributos `[Authorize(Roles = "...")]` en C# (Equipo, Sanciones, Torneos), el framework ASP.NET Core omitía `ValidSessionRequirement`. NestJS valida de forma centralizada `tokenVersion` en `Access.actor()`, devolviendo `403 Forbidden` ante tokens revocados.
- **Dictamen:** **APROBADO.** Corrige la vulnerabilidad crítica de sesión revocada auditada previamente.

### 3.2 Endurecimiento de Cupos bajo Concurrencia (`E055` y `E095`)
- En el backend legacy, bajo 5 solicitudes concurrentes con cupo para 2 participantes, la condición de carrera admitía 4 o 5 registros (`stored: 4/2` y `stored: 5/2`).
- En NestJS, gracias a `SELECT FOR UPDATE`, exactamente 2 solicitudes son admitidas y las 3 restantes reciben `409 Conflict` (*"El partido ya está lleno"* / *"Cupo máximo alcanzado"*).
- **Dictamen:** **APROBADO.** Preserva la integridad referencial y las reglas de negocio del sistema; no altera el comportamiento secuencial nominal.

### 3.3 Aprobación Atómica de Suscripción (`E087`)
- En C#, la caducidad de la suscripción anterior y la activación de la nueva se realizaban en dos escrituras separadas sin transacción envolvente. En NestJS, se consolidaron dentro de `db.$transaction()`.
- **Dictamen:** **APROBADO.** Elimina ventanas de inconsistencia sin alterar el contrato observable de la API.

---

## 4. Tabla de Hallazgos y Observaciones

| ID | Severidad | Ubicación | Descripción | Recomendación |
|---|---|---|---|---|
| **OBS-01** | **BAJO** | `apps/api/src/sanciones/sanciones.ts:25` | **Listado de sanciones con `take: 200` fijo sin soporte de cursor:**<br>`GET /api/sanciones` retorna un máximo de 200 registros sin parámetros de paginación. En sedes con histórico extenso, sanciones antiguas no serán visibles. | Adecuado para paridad 1:1; añadir soporte de cursor en tarjeta futura de producto. |
| **OBS-02** | **BAJO** | `apps/api/src/torneos/torneos.ts:31` | **Listado de torneos sin límite `take` explícito:**<br>`GET /api/torneos` lista todos los torneos del complejo sin límite superior. Aunque el volumen por sede es bajo, se recomienda acotar en el futuro. | Añadir paginación o límite de seguridad en iteraciones futuras. |

---

## 5. Verificación de Reglas del Piso y Pruebas Ejecutadas

- **Modo Solo Lectura:** Cero modificaciones en archivos de producto por parte del auditor.
- **Git y Migraciones:** Cero migraciones de base de datos (`prisma migrate`, `dotnet ef`). Cero commits, pushes o tags.
- **Pruebas Locales Ejecutadas:**
  - `pnpm --filter @reservaya/api test`: 6 suites, **71/71 tests PASS** (incluyendo `domains.test.ts` y `management.test.ts`).
  - `pnpm --filter @reservaya/api build`: compilación TypeScript limpia (0 errores).
  - `pnpm --filter @reservaya/api typecheck`: 0 errores de tipos.
  - `pnpm --filter @reservaya/api lint`: 0 advertencias o errores ESLint.
  - `dotnet build tests/legacy-auth-host -c Release`: 0 errores.
  - `scripts/f5-parity.mjs --smoke-sigterm`: aborta con señal SIGTERM, ejecuta `DROP DATABASE` seguro y limpia temporales.
  - `git diff --check`: limpio.

---

## 6. Conclusión y Recomendación

La implementación de la fase F5 de la Spec 56 cumple íntegramente con los requisitos de seguridad, aislamiento multitenant, control de concurrencia y paridad funcional. Las divergencias identificadas constituyen mejoras de seguridad y estabilidad transaccional que resuelven defectos conocidos del sistema legado.

**Dictamen Final: APROBADO para merge a `main`.**
