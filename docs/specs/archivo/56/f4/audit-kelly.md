# Informe de Auditoría de Seguridad: Spec 56 F4 (Gestión en NestJS)

- **Auditor:** Kelly-Auditor (`kelly-muvkk07m`)
- **Fecha:** 2026-10-07
- **Fase auditada:** Spec 56 F4 — Endpoints de Gestión y Mutaciones (Canchas, Horarios, Promociones, Usuarios, Media)
- **Alcance del diff:** `apps/api/src/management/**`, `apps/api/src/app.module.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/package.json`, `scripts/f4-parity.mjs`, `tests/legacy-auth-host/Program.cs`, `docs/specs/archivo/56/f4/**`.
- **Dictamen:** **APTO para integrar a `main`**

---

## 1. Resumen Ejecutivo

Se auditó en modo **solo lectura** la implementación de la Fase F4 de la migración a TypeScript/NestJS, cubriendo los 20 endpoints de gestión administrativa y mutaciones (E026–E028, E032–E033, E043–E044, E059–E062, E098–E106).

El código analizado presenta una arquitectura sólida, con controles rigurosos de multitenancy, serialización transaccional ante condiciones de carrera, prevención de borrado destructivo con claves foráneas, saneamiento exhaustivo de subidas y URLs de media (incluyendo mitigación del IDOR de borrado), y limitación de tasa en búsquedas.

Se identificó **1 hallazgo de severidad MEDIA** circunscrito al script de pruebas de paridad (`scripts/f4-parity.mjs`) relativo a la resiliencia en la limpieza de bases de datos efímeras ante desconexiones de red, y **2 hallazgos de severidad BAJA** en aspectos de diseño y paginación futura.

Las **14 divergencias de paridad detectadas** (donde NestJS retorna `403 Forbidden` y el legacy C# retornaba `200/201`) corresponden a tokens con `tokenVersion` revocado: representan una **mejora de seguridad intencional y aprobada** que soluciona en NestJS el bypass crítico auditado en .NET.

---

## 2. Evaluación de Controles Críticos de Seguridad

### 2.1 Roles, Autenticación y Multitenancy
- **Extracción de Sesión:** `Access.session(r)` invoca `auth.session(r)`, validando obligatoriamente que el usuario exista, esté activo (`activo: true`) y que `c.tv === u.tokenVersion`. Cualquier token revocado o usuario inactivo es rechazado inmediatamente con `401 Unauthorized`.
- **Matriz de Roles:** Restringido estrictamente a `managementRoles = ['ADMIN', 'SUPERADMIN', 'TECNICO']` (`apps/api/src/management/access.ts:13`). Usuarios con rol `USUARIO` reciben `403 Forbidden` de manera consistente en todas las mutaciones.
- **Multitenancy y Aislamiento por Dueño:**
  - `Access.owner(r, complejoId)` verifica que para roles no técnicos (`TECNICO`), el `duenoId` del complejo coincida exactamente con `actor.id` o el actor sea miembro activo (`miembroActivo: true`) (`access.ts:32-35`).
  - Las operaciones entre complejos ajenos (*cross-owner*) devuelven sistemáticamente `403 Forbidden`.
  - Los usuarios `SUPERADMIN` no tienen pase libre global: están restringidos exclusivamente a sus propios complejos o sedes donde sean miembros activos.
- **Transferencia de Canchas:** En `PUT /api/canchas/:id`, la reasignación de una cancha a otro complejo (`complejoId`) exige verificar que el actor sea dueño del complejo destino y que dicho complejo disponga de cuota disponible en su suscripción o convenio de prueba (`canchas.ts:74-88`).

### 2.2 Transacciones, Concurrencia y Carreras (TOCTOU)
- **Nivel de Aislamiento:** Las mutaciones críticas de canchas (`POST /api/canchas`, `PUT /api/canchas/:id`, `DELETE /api/canchas/:id`) y horarios (`PUT /api/horarios`) se ejecutan dentro de `prisma.$transaction` con `isolationLevel: 'Serializable'` (`canchas.ts:25, 71, 116`, `horarios.ts:30`).
- **Control de Cuotas de Prueba:** En `POST /api/canchas`, la verificación del límite de 1 cancha para convenios de prueba (`ConvenioPrueba.Activo`) y la consulta de canchas existentes (`tx.cancha.findFirst`) se ejecutan dentro del cliente transaccional `tx`. Esto elimina condiciones de carrera tipo TOCTOU (Time-Of-Check to Time-Of-Use) donde dos peticiones concurrentes pudieran crear más canchas de las autorizadas.
- **Mapeo de Conflictos:** Errores de concurrencia y serialización (`P2034`, Postgres `40001`) son interceptados por `databaseError()` y mapeados limpiamente a `409 Conflict` (`errors.ts:15-18`).

### 2.3 Eliminación y Protección de Integridad Referencial (FK)
- **Protección Previa en Aplicación:** `DELETE /api/canchas/:id` realiza un conteo previo de reservas asociadas (`reserva.count`) antes de proceder con el borrado (`canchas.ts:118`).
- **Defensa en Profundidad (BD):** Si existieran reservas concurrentes o restricciones adicionales, `foreignKeyError()` intercepta violaciones de clave foránea de Prisma (`P2003`) y códigos SQL de Postgres (`23503`, `23001` NoAction) (`errors.ts:2-8`), retornando `409 Conflict` con un mensaje amigable: *"No se puede eliminar: tiene reservas asociadas. Desactívala en su lugar."*
- **Usuarios con Reservas:** `DELETE /api/usuarios/:id` impide la eliminación de usuarios con reservas o relaciones activas, devolviendo `409 Conflict` (`usuarios.ts:169-174`).

### 2.4 Seguridad en Media y Almacenamiento (Cloudflare R2 / S3)
- **Validación de URLs y Claves:** `mediaUrl()` (`media.ts:9-25`) valida:
  - Coincidencia exacta del origen con `MEDIA_PUBLIC_URL`.
  - Bloqueo de secuencias de path traversal (`..`, `\`, `%`, `//`).
  - Lista blanca de extensiones de imagen (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`).
  - Prefijo de autoría obligatorio (`uploads/<tipo>/<userId>/`), mitigando por diseño el ataque de adopción de URLs ajenas e IDOR de eliminación auditado en la tarjeta previa de R2.
- **Subida Multipart Segura:**
  - Inspección de magic bytes en el buffer crudo mediante `imageExtension(buffer)` (`media.ts:79-84`), ignorando cabeceras `Content-Type` potencialmente falsificadas.
  - Límite de tamaño estricto: máximo 3 MB por archivo (`media.ts:86`) y límite de 3.5 MB a nivel de petición Fastify (`controller.ts:46`).
- **Ciclo de Vida de Eliminación:**
  - La llamada a `Media.remove()` para eliminar imágenes sustituidas o eliminadas en R2 se ejecuta **estrictamente después del commit** exitoso de la transacción en base de datos (`canchas.ts:94, 126`, `usuarios.ts:145`).
  - Los fallos de borrado en S3 están encapsulados en `try/catch` con estrategia best-effort, evitando que un fallo transitorio de red con el bucket aborte una transacción ya confirmada o retorne 500 al cliente.
- **Aislamiento en Tests:** Los tests unitarios y de paridad apuntan exclusivamente a un servidor fake local de S3 (`tests/fake-s3`) con credenciales ficticias; nunca interactúan con buckets reales de Cloudflare R2.

### 2.5 Búsqueda de Usuarios y Rate Limiting
- **Protección DoS / Scraping:** `GET /api/usuarios/buscar` (`usuarios.ts:9-12`) exige una consulta mínima de 2 caracteres e implementa limitación de tasa por ventana deslizante mediante `RateLimiter`: máximo **30 solicitudes por minuto por dirección IP**. Exceder el umbral responde con `429 Too Many Requests`.

### 2.6 Paridad 1:1 vs Legacy
- **Edad Mínima en Perfil:** `PatchMe` (`usuarios.ts:108`) valida una edad mínima de 5 años (`addYears(today, -5)`). Aunque el registro público exige 14 años, esta cota de 5 años es un reflejo exacto 1:1 de la regla legacy en `PerfilReglas.cs`, aceptada intencionalmente para garantizar paridad histórica y evitar regresiones en perfiles existentes.
- **Cooldown de Nombre de Usuario:** Se aplica la restricción anual (`addYears(cambiadoEn, 1)`) antes de permitir un cambio adicional de nombre de usuario (`usuarios.ts:105-106`).

---

## 3. Divergencias de Paridad Analizadas

En el reporte de paridad (`docs/specs/archivo/56/f4/parity-results.json`), de 142 casos ejecutados:
- **128 casos:** Paridad estricta **PASS** (100% idénticos en status, headers y body).
- **14 casos:** Catalogados como `SECURITY_DIVERGENCE`.
- **0 fallos.**

### Detalle de las 14 Divergencias:
Los 14 casos corresponden a los escenarios `*-tv-revocado` en rutas protegidas por rol:
- `E026-tv-revocado` (POST /api/canchas)
- `E027-tv-revocado` (PUT /api/canchas/:id)
- `E028-tv-revocado` (DELETE /api/canchas/:id)
- `E032-tv-revocado` (POST /api/canchas/:id/imagen)
- `E033-tv-revocado` (PUT /api/canchas/:id/imagen)
- `E044-tv-revocado` (PUT /api/horarios)
- `E060-tv-revocado` (POST /api/promociones)
- `E061-tv-revocado` (PUT /api/promociones/:id)
- `E062-tv-revocado` (DELETE /api/promociones/:id)
- `E099-tv-revocado` (GET /api/usuarios)
- `E100-tv-revocado` (GET /api/usuarios/clientes)
- `E101-tv-revocado` (GET /api/usuarios/:id/historial)
- `E102-tv-revocado` (PATCH /api/usuarios/:id)
- `E106-tv-revocado` (DELETE /api/usuarios/:id)

**Dictamen sobre la divergencia:** En el backend legacy .NET, `[Authorize(Roles = "...")]` no invocaba `ValidSessionRequirement` debido a que ASP.NET Core omitía `DefaultPolicy`, respondiendo erróneamente `200 OK` o `201 Created` ante tokens revocados. NestJS valida correctamente `tokenVersion` en `Access.session()` y responde `403 Forbidden`. **Estas 14 divergencias son una corrección de seguridad legítima y quedan totalmente APROBADAS.**

---

## 4. Tabla de Hallazgos

| ID | Severidad | Ubicación | Descripción y Escenario de Fallo | Recomendación / Mitigación |
|---|---|---|---|---|
| **H-01** | **MEDIO** | `scripts/f4-parity.mjs:188` | **Falta de reintentos/reconexión en DROP de base de datos fixture ante desconexión de red:**<br>Durante la ejecución del harness contra Neon, si la base de datos devuelve un timeout ("Can't reach database server"), la conexión del cliente `admin` de Prisma se corrompe. El bloque `finally` intenta ejecutar `DROP DATABASE "${dbName}" WITH (FORCE)` sobre la misma conexión rota, falla, y no reintenta ni recrea un cliente limpio. Esto ocasiona que bases efímeras `f4_fixture_*` queden huérfanas en el cluster de QA y requieran limpieza manual. | Envolver la eliminación en un bucle de reintentos (ej. 3 intentos espaciados 1-2s) y, en caso de fallo por desconexión, instanciar un cliente Prisma fresco contra la base administrativa para emitir el `DROP DATABASE`. |
| **H-02** | **BAJO** | `apps/api/src/management/usuarios.ts:18` | **Listado de clientes con `take: 200` fijo sin soporte de paginación:**<br>`GET /api/usuarios/clientes` retorna un máximo estático de 200 registros sin cursor ni offset. Para complejos con alta afluencia de clientes, los clientes a partir del 201 quedarán invisibles en la respuesta. | Adecuado para el alcance actual de paridad 1:1, pero se recomienda agregar paginación basada en cursor (`cursor` / `take`) en una tarjeta futura de producto. |
| **H-03** | **BAJO** | `apps/api/src/management/media.ts:40` | **Instanciación perezosa `S3Client` sin ciclo de vida explícito:**<br>`this.client ??= new S3Client(...)` inicializa el cliente en la primera eliminación de archivo. Aunque opera adecuadamente en entornos Node de proceso único, carece de gestión explícita de hooks de cierre (`onModuleDestroy`). | Funcional y seguro para el despliegue actual; formalizar el ciclo de vida en caso de requerir reconfiguraciones dinámicas. |

---

## 5. Verificación de Reglas del Piso y Límites

- **Modo Solo Lectura:** El auditor no realizó modificaciones en `apps/api/src/**/*.ts` ni en el código productivo.
- **Git y Migraciones:** No se ejecutaron migraciones de base de datos (`prisma migrate`, `dotnet ef`). Ningún commit, push o tag fue ejecutado.
- **Archivos Protegidos:** `prisma/legacy-migrations`, esquemas y contratos permanecen inalterados.

---

## 6. Conclusión y Recomendación

La implementación de la fase F4 cumple con todos los estándares de seguridad, aislamiento multitenant y consistencia transaccional requeridos para su promoción. El único hallazgo medio se limita al script de pruebas y no compromete el entorno de producción.

**Dictamen Final: APROBADO para merge a `main`.**
