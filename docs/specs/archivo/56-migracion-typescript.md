# Especificación: 56 - Migración de la API a TypeScript

## 1. Objetivo

**Estado:** completada 2026-10-08. Corte a NestJS 2026-10-07 23:14 UTC; .NET retirado en 83cdb63; historial de migraciones de producción reconciliado 2026-10-08 (0_baseline + 1_libro_reclamaciones).

**Problema:** `apps/api/Controllers` contiene 20 controladores C# y 106 acciones HTTP; `apps/web` usa Next.js 16.2.9/React 19 y npm. `docs/architecture.md` aún describe EF Core como dueño del esquema y rutas públicas anteriores a `/jugar`. El espejo `apps/web/prisma/schema.prisma` tiene 18 modelos y omite `PartidoAbierto` y `AnotacionPartido`, presentes en `apps/api/Data/AppDbContext.cs`. Su enum Rol incluye PERSONAL heredado: no convertir automáticamente ese dato en un rol permitido. El espejo no prueba cuál es el esquema desplegado ni si Reclamo está aplicado.

**Resultado esperado:** monorepo TypeScript con pnpm workspaces, Turborepo, Next actual y API NestJS/Fastify; Prisma será la autoridad del esquema. Migración gradual con contratos, datos, permisos, sesión y transacciones conservados; .NET permanece disponible hasta demostrar paridad y rollback. Cambiar de lenguaje no garantiza por sí mismo menor latencia.

**Decisión humana recibida por god:** dejan de aplicar las restricciones vinculadas a C# y a EF como dueño del esquema. Su sustitución operativa se propone en §4.9; este documento no modifica CLAUDE.md ni el hook.

## 2. Fuera de alcance

- Rediseñar UI, cambiar precios/roles/reglas de producto, refactorizar contratos públicos o mejorar el esquema de negocio durante el port.
- Borrar datos, renombrar tablas, convertir enums/fechas, regenerar IDs, aplicar pendientes EF o introducir tablas de negocio nuevas.
- Cambiar secretos, leer/editar `.env` real, ejecutar seed, tocar Neon, cambiar hosting o contratar recursos durante esta redacción. No commit/push/tag.
- Retirar multipart o `/uploads` antes del criterio operativo ya definido en `docs/api.md`; no eliminar compatibilidad por preferencia técnica.

**Decisiones de ejecución pendientes:** aprobación de la spec y elección de proveedor/plan/región; acceso a rama de prueba con datos anonimizados; ventana del baseline y responsable de su aplicación. Propuesta de hosting en §4.7; no se requiere resolverla para revisar este documento.

## 3. Archivos afectados

Esta entrega crea solo este archivo. La siguiente tabla describe cambios futuros, condicionados a aprobación.

| Archivo/directorio | Acción futura | Nota |
|---|---|---|
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json` | modificar/crear | Un lockfile, versiones fijadas, scripts por paquete |
| `apps/web/package.json`, configuración y lock npm existente | modificar/retirar al validar | Next16 conservado; migrar postinstall Prisma y tests sin perder cobertura |
| `apps/api/**` | trasladar y crear | C# temporal en `apps/api-dotnet`; Nest ocupa `apps/api` |
| `packages/db/**` | crear | schema, cliente servidor, baseline y comprobaciones de drift |
| `apps/web/prisma/**` | trasladar/reconciliar | No copiar el espejo incompleto como verdad ni ejecutar seed |
| `packages/shared/**`, `packages/config/**` | crear | DTOs zod, configuración TypeScript/ESLint |
| `apps/web/next.config.ts`, `apps/web/proxy.ts`, `apps/web/lib/server-fetch.ts` | modificar | Enrutamiento por método/ruta; proxy conserva guardas |
| `apps/web/app/api/upload/route.ts` | mantener/verificar | Ruta Next existente; no pasar a Nest por wildcard |
| `scripts/start-dev.mjs`, tests del runner, `tests/**` | modificar/crear | Dos APIs en transición, fixtures y paridad |
| `.github/workflows/ci.yml`, Dockerfile, `render.yaml` | modificar | CI por paquete y despliegue separado |
| `CLAUDE.md`, `.claude/settings.json`, `docs/api.md`, `docs/architecture.md`, `DEPLOY_GRATIS.md` | modificar posteriormente | Nuevas reglas y comandos; god coordina hook/config |

## 4. Diseño y lógica

### 4.1 Estructura objetivo y dependencias

```text
apps/
  web/                  # Next16, público/panel; @reservaya/web
  api/                  # Nest + Fastify; @reservaya/api
    src/modules/        # módulos del inventario §4.2
    src/common/         # guards, errores, logging, adaptador de contrato
  api-dotnet/           # temporal; retirado solo en F8
packages/
  db/                   # @reservaya/db; Prisma exclusivamente servidor
    prisma/schema.prisma
    prisma/migrations/0_baseline/migration.sql
    src/
  shared/               # @reservaya/shared; zod + tipos de requests/responses
  config/               # @reservaya/config; tsconfig/eslint por entorno
tests/
  parity/               # matriz método/ruta, fixtures, comparación
  e2e/                  # Playwright por rol
```

Dependencias: web/api → shared/config; api → db. Web mantiene acceso a datos exclusivamente vía API, salvo cualquier uso existente que F0 demuestre y documente. shared no importa db, Node, secretos ni tipos Prisma. DTOs transportables explícitos; no exponer modelos internos como contrato. Config TypeScript estricto con adaptadores Next y Nest separados; no imponer el mismo modo de módulos a ambos.

F0 fija versiones compatibles de Node, pnpm, Turbo, Nest, Fastify, zod y herramientas en lockfile/engines. Mantener inicialmente Prisma6.19.3 (versión actual) y Next16.2.9 para aislar el cambio de arquitectura; una actualización mayor Prisma requiere spec independiente. Migrar cuidadosamente allowScripts a controles pnpm de scripts aprobados, incluidos motores Prisma/sharp; no habilitar scripts globalmente. CI usa instalación congelada. Turbo ordena generate → build según dependencias; dev persistente sin caché. No cachear test de integración, E2E, secretos, outputs privados ni tareas de BD.

### 4.2 Inventario verificado: controlador → módulo, riesgo y orden

Fuente: atributos `[Route]`/`[Http*]` del código, contrastados con `docs/api.md` el 2026-10-07. Hay **20**, no 19: incluir Reclamos y Solicitudes. Listado exhaustivo de acciones declaradas; autorización heredada y parámetros query/body deben capturarse como fixtures en F0. `/healthz` está en Program, fuera de controladores. `/api/upload` pertenece a Next.

F1–F8 corresponden a §4.6. Lecturas públicas de un mismo controlador se portan antes que sus mutaciones; la unidad de cambio es método+ruta.

| Fuente C# | Módulo Nest | Riesgo principal | Orden | Endpoints |
|---|---|---|---|---|
| `AbonosController.cs` | `AbonosModule` | Alto: dinero, cuenta y alcance por sede | F6 | `GET /api/abonos`<br>`POST /api/abonos/abonar`<br>`GET /api/abonos/cuenta`<br>`POST /api/abonos/cuenta` |
| `AuthController.cs` | `AuthModule` | Crítico: tokens, cookies, revocación, Google y recuperación | F3 | `POST /api/auth/login`<br>`POST /api/auth/register`<br>`POST /api/auth/logout`<br>`POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password`<br>`POST /api/auth/refrescar`<br>`GET /api/auth/me`<br>`GET /api/auth/google`<br>`GET /api/auth/google/callback`<br>`POST /api/auth/google/completar` |
| `CajaController.cs` | `CajaModule` | Crítico: caja/stock/movimientos y transacciones | F6 | `GET /api/caja/hoy`<br>`GET /api/caja/sesion`<br>`POST /api/caja/apertura`<br>`POST /api/caja/cierre`<br>`POST /api/caja/movimientos`<br>`GET /api/caja/productos`<br>`POST /api/caja/productos`<br>`PUT /api/caja/productos/{id}`<br>`DELETE /api/caja/productos/{id}` |
| `CanchasController.cs` | `CanchasModule` | Alto: precio/horarios, cupo de prueba, imágenes y propiedad | F2 lecturas públicas; F4 gestión | `GET /api/canchas`<br>`GET /api/canchas/{id}`<br>`POST /api/canchas`<br>`PUT /api/canchas/{id}`<br>`DELETE /api/canchas/{id}`<br>`GET /api/canchas/disponibles`<br>`GET /api/canchas/opciones`<br>`GET /api/canchas/{id}/cotizar`<br>`POST /api/canchas/{id}/imagen`<br>`PUT /api/canchas/{id}/imagen` |
| `ComplejosController.cs` | `ComplejosModule` | Alto: propiedad/publicación/prueba y borrado asociado | F2 lecturas públicas; F5 gestión | `GET /api/complejos`<br>`GET /api/complejos/{id}`<br>`POST /api/complejos`<br>`PUT /api/complejos/{id}`<br>`DELETE /api/complejos/{id}` |
| `EquipoController.cs` | `EquipoModule` | Alto: membresías, invitaciones y cambios de rol/tv | F5 | `GET /api/equipo`<br>`POST /api/equipo`<br>`PUT /api/equipo/{id}`<br>`DELETE /api/equipo/{id}` |
| `HorariosController.cs` | `HorariosModule` | Alto: minutos/día y autorización por sede | F4 antes de reservas | `GET /api/horarios`<br>`PUT /api/horarios` |
| `InvitacionesController.cs` | `InvitacionesModule` | Alto: solo invitado, promoción y revocación | F5 | `GET /api/invitaciones/mias`<br>`POST /api/invitaciones/{id}/aceptar`<br>`POST /api/invitaciones/{id}/rechazar` |
| `MetasController.cs` | `MetasModule` | Alto: scope privado y decimales | F6 | `GET /api/metas`<br>`POST /api/metas`<br>`PATCH /api/metas/{id}`<br>`DELETE /api/metas/{id}` |
| `PartidosController.cs` | `PartidosModule` | Alto: cupo/anotaciones, organizador y modelos ausentes | F2 GET público; F5 resto | `GET /api/partidos`<br>`GET /api/partidos/mios`<br>`POST /api/partidos`<br>`POST /api/partidos/{id}/anotarse`<br>`DELETE /api/partidos/{id}/anotarse`<br>`PUT /api/partidos/{id}/foto`<br>`DELETE /api/partidos/{id}` |
| `PromocionesController.cs` | `PromocionesModule` | Alto: precio, uso limitado y promociones globales | F4 antes de reservas | `GET /api/promociones`<br>`POST /api/promociones`<br>`PUT /api/promociones/{id}`<br>`DELETE /api/promociones/{id}` |
| `ReclamosController.cs` | `ReclamosModule` | Crítico: PII, correlativo anual y reintentos | F6 | `POST /api/reclamos` |
| `ReportesController.cs` | `ReportesModule` | Crítico: agregaciones de dinero y aislamiento entre dueños | F6 | `GET /api/reportes/dashboard`<br>`GET /api/reportes/global` |
| `ResenasController.cs` | `ResenasModule` | Medio: unicidad/propiedad y respuesta de dueño | F2 públicas; F5 resto | `GET /api/resenas/publicas`<br>`POST /api/resenas`<br>`GET /api/resenas`<br>`POST /api/resenas/{id}/responder` |
| `ReservasController.cs` | `ReservasModule` | Crítico: anti-solape, precio/pago y validación | F7 último dominio | `GET /api/reservas`<br>`GET /api/reservas/{id}`<br>`POST /api/reservas/validar`<br>`POST /api/reservas`<br>`PATCH /api/reservas/{id}`<br>`DELETE /api/reservas/{id}` |
| `SancionesController.cs` | `SancionesModule` | Alto: bloqueo y propietario | F5 | `GET /api/sanciones`<br>`POST /api/sanciones`<br>`PATCH /api/sanciones/{id}/desactivar` |
| `SolicitudesController.cs` | `SolicitudesModule` | Crítico: estado derivado, aprobación/rechazo y promoción | F5 | `GET /api/solicitudes`<br>`GET /api/solicitudes/mias`<br>`POST /api/solicitudes`<br>`PATCH /api/solicitudes/{id}/aprobar`<br>`PATCH /api/solicitudes/{id}/rechazar` |
| `SuscripcionesController.cs` | `SuscripcionesModule` | Crítico: vigencia/prueba y aprobación técnica | F5 | `GET /api/suscripciones/estado`<br>`GET /api/suscripciones`<br>`POST /api/suscripciones`<br>`PATCH /api/suscripciones/{id}/aprobar`<br>`PATCH /api/suscripciones/{id}/rechazar`<br>`PATCH /api/suscripciones/{id}/cancelar` |
| `TorneosController.cs` | `TorneosModule` | Alto: cupo, equipos, partidos y gestión | F2 GET públicos; F5 resto | `GET /api/torneos`<br>`GET /api/torneos/{id}`<br>`POST /api/torneos`<br>`PUT /api/torneos/{id}`<br>`DELETE /api/torneos/{id}`<br>`POST /api/torneos/{id}/inscripciones`<br>`POST /api/torneos/{id}/partidos`<br>`PUT /api/torneos/partidos/{partidoId}` |
| `UsuariosController.cs` | `UsuariosModule` | Alto: perfil, edad14, búsqueda, roles y foto | F4 | `GET /api/usuarios/buscar`<br>`GET /api/usuarios`<br>`GET /api/usuarios/clientes`<br>`GET /api/usuarios/{id}/historial`<br>`PATCH /api/usuarios/{id}`<br>`PATCH /api/usuarios/me`<br>`POST /api/usuarios/me/foto`<br>`PUT /api/usuarios/me/foto`<br>`DELETE /api/usuarios/{id}` |

Además portar servicios transversales: JwtService, ValidSessionAuthorization, PasswordResetTokens, GoogleOAuth, EmailSender/InvitacionEmail, MediaPublica/AlmacenR2, ImagenArchivo, PrecioCancha, ComplejoAccess y ConvenioPrueba; middlewares de límite y bloqueo de gestión de Program. Nest controllers delegan a servicios con transacciones explícitas; ningún guard de frontend sustituye scope SQL en API.

### 4.3 Prisma como dueño: baseline sin cambios de negocio

El baseline exige conocer **Neon real** en una fase posterior autorizada. Esta redacción no conecta a Neon. El esquema local contiene 18 modelos; EF mapea 20 tablas de negocio incluyendo partidos/anotaciones. Ese desfase es bloqueo de baseline, no autorización para crear tablas faltantes en producción. Comprobar también Reclamo y el historial `__EFMigrationsHistory`; no aplicar automáticamente la migración histórica pendiente.

1. F0 congela DDL para ambos backends, obtiene respaldo verificable y rama aislada Neon autorizada. Registrar entorno/región y huella del esquema sin secretos ni PII.
2. Reconciliar catálogo vivo y esquema con introspección de solo lectura bajo credencial limitada, ejecutada después de aprobar alcance. Copiar a packages/db nombres exactos de tablas/columnas, enums, tipos timestamp/date, precisiones, defaults, índices únicos, FKs y acciones referenciales. No cambiar PERSONAL, nulabilidad legacy ni `Horario` (requiere @@map). ID nuevo compatible con GUID N de .NET, no pasar a cuid solo porque el espejo lo declara. Conservar semántica aplicativo de actualizadoEn frente a defaults DB.
3. Generar SQL desde vacío hacia schema con `prisma migrate diff` en archivo local; Prisma6 usa `--from-empty --to-schema-datamodel packages/db/prisma/schema.prisma --script`. Validar flags con `pnpm exec prisma migrate diff --help` de la versión fijada antes de ejecutarlo. Añadir al baseline cualquier objeto real no representable en Prisma; nunca ejecutarlo sobre la BD existente.
4. Reconstruir BD desechable desde SQL baseline, comparar catálogo contra origen y demostrar diff sin cambios (más revisión explícita de objetos no representables). Comparar datos/tipos y lectura de ambos backends. No usar shadow database de producción.
5. Solo después del gate y autorización de ejecución: `prisma migrate resolve --applied 0_baseline` con schema/URL directa del entorno correcto. **Escribe `_prisma_migrations` y puede crear su tabla:** no es operación solo lectura ni «cero DDL absoluto». No altera tablas/datos de negocio. Si el humano exige cero escrituras incluso de metadatos, detener la aplicación del baseline y conservar generación offline.
6. Comprobar historial/status y drift tras resolve. EF histórico queda conservado; desactivar toda aplicación automática de migraciones EF. Prisma asume propiedad única al superar este gate. Congelación del esquema de negocio durante toda convivencia; migraciones futuras requieren revisión explícita, fuera de este port.

Prisma6 inicialmente usa DATABASE_URL pooled para consultas y DATABASE_URL_UNPOOLED directa para administración; ambas solo servidor. PrismaClient singleton por proceso, conexiones limitadas por instancia y presupuesto conjunto .NET+TS. No usar migrate reset/db push/seed en producción. [Baseline oficial Prisma](https://docs.prisma.io/docs/orm/v6/prisma-migrate/workflows/baselining).

### 4.4 Contratos, seguridad y transacciones

- **UI:** comportamiento y rutas actuales conservados. zod valida formularios/DTOs compartidos; API vuelve a validar. No aceptar el error zod/Nest por defecto si cambia `{error}` o ProblemDetails actual; filtro de compatibilidad por endpoint. Conservar códigos 200/201/400/401/403/404/409/429/503, campos omitidos/null, orden contractual, fechas, query coercion y cabeceras.
- **Sesión:** cookie `token` HttpOnly, path/Secure/SameSite/expiración/borrado iguales al código actual; JWT HS256 con mismo JWT_SECRET, claims `id,email,nombre,rol,tv,nbf,exp`, TTL7d y tolerancia10s del validador API. No exigir issuer/audience nuevos a sesiones existentes. Validar usuario activo y TokenVersion en BD por solicitud, además del rol/scopes. Probar emisión cruzada .NET→TS y TS→.NET.
- **Auth:** conservar hashes BCrypt/coste10 y prueba de Unicode/hash .NET; dummy hash contra enumeración. Recuperación mantiene formato base64url(payload).HMAC y clave derivada `reservaya:password-reset:v1`, huella SHA256 hexadecimal inicial16, TTL30min, actualización condicionada a hash/tv y uso único. Google pendiente tiene HMAC separado con etiqueta `google-pendiente`, audience específico y TTL10min; no sirve como sesión. Callback conserva mismo origen web y cookies de estado, validación de retorno y Google completar edad14.
- **Revocación/roles:** preservar incrementos tv en logout/reset/bajas según código; promociones por solicitud e invitación aprobadas en spec55 no incrementan tv, refrescar lee rol actual. Rol PERSONAL en DB no debe habilitar panel. ADMIN/SUPERADMIN/TECNICO y membresías se evalúan en API; pruebas 403 cross-owner y recursos legacy globales.
- **Rate limiting:** mismos umbrales y respuestas; normalización IP/forwarded headers solo desde proxies confiables. Durante convivencia evitar que el cambio de backend permita reiniciar contador/burlar límite: asignar conjunto auth a un destino estable y verificar límite agregado; si se necesita almacenamiento distribuido, decisión explícita de infraestructura y contrato, no relajación silenciosa.
- **Dinero/fechas:** operaciones con Prisma.Decimal, serialización numérica compatible con DTO actual sin stringificación automática de Decimal; límites/redondeo de cada endpoint. Fechas civiles no cambian de día por zona; timestamp(3) without time zone se interpreta como en .NET. Reloj inyectable en pruebas de vigencia/prueba/edad/correlativo UTC.
- **Reservas al final:** PostgreSQL SERIALIZABLE encierra lectura de disponibilidad, predicado `existente.inicio < nuevo.fin && existente.fin > nuevo.inicio`, estados ocupantes exactos del código, precio/promoción/sanción/visibilidad, creación y movimientos asociados. Prisma debe conservar tanto POST como PATCH bajo transacción; no separar «consultar disponible» e insertar en dos operaciones externas. Mapear errores de concurrencia al 409 existente. Reintentar solo donde contrato original lo hace y sin repetir efectos externos. Prueba concurrente mezclando .NET/TS en BD aislada: mismo slot, adyacentes, cancelación, validación y cambio de estado; nunca dos reservas ocupantes solapadas. [Transacciones Prisma6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions).
- **Reclamos:** SERIALIZABLE MAX+1 por añoUTC, unicidades y cinco reintentos de conflictos específicos; 503 agotado. No loguear documento/PII. Número solo después del commit.
- **R2/correo:** URLs por prefijo y carpeta usuario/tipo, excepción técnica y reenvío URL existente conservados. Borrado R2 mejor esfuerzo después del commit. Firma de `/api/upload` permanece Next. Multipart Fastify requiere plugin compatible, no Multer Express; preservar límite/deprecation y servir uploads viejos desde .NET. Correos solo después de commit sin envío duplicado por shadow/retry.

### 4.5 Strangler: un destino por método+ruta

Mantener legacy temporal en apps/api-dotnet con imagen desplegable inmutable; Nest en apps/api. Inicialmente todas las rutas van a legacy. Registro versionado de método+ruta→destino; por defecto .NET y listas explícitas TS. No usar prefijos completos mientras haya acciones pendientes del mismo controlador. Prioridad rutas literales (`disponibles`, `mias`, `estado`) antes de `/:id`.

**Navegador:** rewrites exactos anteriores a catch-all sirven cuando todos los métodos de una ruta ya tienen paridad. Los rewrites de Next no seleccionan naturalmente por verbo: para migración parcial de GET/POST en la misma URL, crear proxy servidor con registro método+ruta (route handler/gateway) en fase aprobada. Preservar query, cuerpo/multipart, redirects, Set-Cookie múltiples, status, streaming y timeout; no consumir/reconstruir archivos innecesariamente. La route Next `/api/upload` gana precedencia y no se captura.

**Servidor Next:** `lib/server-fetch.ts` hoy usa BACKEND_URL directamente; debe compartir selección con el proxy y clientes server, sin aplicar caché pública a datos privados ni perder cookie. BACKEND_URL_DOTNET/BACKEND_URL_TS privadas; no publicar origins al cliente. `proxy.ts` hoy solo protege panel: conservar matcher/guardas y no mezclar autorización con routing sin prueba. Si se usa un gateway único como BACKEND_URL, demostrar mismos recorridos browser/server.

Next config rewrites/origins resueltos en build requieren redeploy para cambio y rollback. Probar un interruptor operativo que seleccione legacy desde registro runtime/gateway, o documentar rollback por artefacto/redeploy con tiempo medido. No asumir que cambiar env altera un build ya publicado.

Paridad antes de cada cambio: fixtures anonimizados equivalentes en dos BDs aisladas, mismo reloj, usuarios/roles, headers, query y body. Comparar JSON semántico (incluye tipos/null), códigos y headers/cookies. Normalizar únicamente IDs/fechas aleatorios con regla explícita; comprobar relaciones y formato, no ocultar divergencias. GET shadow permitido solo sin efectos; nunca ejecutar POST/PATCH/DELETE duplicados sobre producción. Cada mutación tiene un único escritor por request.

### 4.6 Fases, criterios de hecho y estimación

Estimación inicial: **10–14 semanas**, un implementador con revisión y QA disponibles; incluye estabilización de dos semanas. No compromiso de calendario; reestimar después de F0 según fixtures y acceso. Los bloques siguientes suman 10–14 semanas, pueden dividirse en cards por dominio.

| Fase | Tiempo | Entrega | Hecho antes de continuar |
|---|---|---|---|
| F0 inventario/contratos/decisiones | 1 semana | Manifiesto106 acciones, fixtures, versiones, proveedor/región, BD de prueba | Cada acción tiene permisos/payload/respuesta y caso negativo; diferencias docs registradas; sin cambios remotos |
| F1 estructura y baseline | 1–2 semanas | pnpm/Turbo/packages, Nest health, legacy separado, baseline revisado | CI por paquete verde; recreación aislada/drift0; resolve solo autorizado y documentado; legado sigue funcionando |
| F2 público lectura | 0.5–1 semana | GET públicos canchas/complejos/resenas/partidos/torneos según atributos reales | Paridad y visibilidad; browser/SSR al mismo destino; rollback de primera ruta ensayado |
| F3 auth | 1–1.5 semanas | Login/register/logout/reset/refrescar/Google/me | Tokens cruzados, cookies, revocación, rate limits, edad14 y reset de un solo uso pasan |
| F4 perfil/R2/gestión base | 1 semana | Usuarios, imágenes, canchas gestión, horarios/promociones | Propiedad, multipart legacy/R2 y precios iguales; no fuga entre sedes |
| F5 equipo/solicitudes/suscripciones | 1.5–2 semanas | Invitaciones, pruebas/vigencia, sanciones, partidos/torneos/resenas restantes, complejos | Roles y tv iguales; concurrencia/cupos, bloqueos/reactivación y correos postcommit pasan |
| F6 caja/abonos/reportes/reclamos | 1–1.5 semanas | Dinero, scope y correlativo | Decimales/stock/cierre/reportes coinciden; reclamaciones concurrentes únicas |
| F7 reservas | 1 semana | Último dominio migrado | SERIALIZABLE mixto y E2E reserva/pago/cancelación/validación verdes |
| F8 estabilizar/retirar legacy | 2 semanas | Todas las rutas TS, observación, docs/CI finales | 14 días sin fallback ni uso multipart legacy para retirar escritura; rollback disponible; lectura uploads con criterio separado |

F8 no elimina automáticamente `/uploads`: si siguen URLs locales, conservar servicio de lectura estático compatible (o migración de objetos aprobada aparte). Eliminar el runtime .NET solo cuando ninguna ruta/archivo dependa de él; conservar imagen y código histórico recuperable durante ventana de rollback. Cada fase exige revisión Kelly, gates Pam y sign-off operativo god conforme a la oficina.

### 4.7 Deploy y región

**Propuesta:** web continúa Vercel; API TS servicio Node/container persistente en Render Virginia, con .NET separado temporalmente. Nest escucha PORT en 0.0.0.0, shutdown graceful y `/healthz` compatible; readiness DB separado y sin detalles privados. Desplegar sin ejecutar migraciones en arranque. Servicio pago sin suspensión si se necesita latencia predecible; precio/plan se confirma antes de contratar.

Neon **us-east-1 es objetivo indicado en el encargo, no región verificada**. F0 verifica proyecto sin exponer conexión. Elegir región cercana en costa este; nombres Render/Fly/Railway no equivalen literalmente a AWS us-east-1 y no demuestran misma red. Medir API→Neon y Next→API, incluidas conexiones frías; si Neon está en otra región, revisar decisión antes del deploy.

| Opción | Ubicación candidata | Ventaja | Coste/limitación operativa |
|---|---|---|---|
| Render | Virginia | Mantiene proveedor, Node/Docker persistente y despliegues sencillos | Dos servicios durante transición; plan con suspensión puede penalizar primer request; confirmar recursos/precio |
| Fly.io | iad, Ashburn | Contenedor persistente y control regional | Más configuración de Machines/red/despliegue; capacidad y coste se validan |
| Railway | US East Virginia, us-east4-eqdc4a | Servicio persistente y configuración monorepo | Facturación/recursos por plan; identificador propio, no AWS us-east-1 |
| Vercel | iad1 | Integración con web; soporte oficial Nest | Ciclo de Functions, límites duración/payload y conexiones según plan; validar adaptador Fastify, multipart y transacciones; no asumir disco persistente |

Fuentes oficiales consultadas: [Render regiones](https://render.com/docs/regions), [Render servicios](https://render.com/docs/web-services), [Fly regiones](https://fly.io/blog/the-region-consolidation-project/), [Railway regiones](https://docs.railway.com/deployments/regions), [Vercel regiones](https://vercel.com/docs/regions), [Nest en Vercel](https://vercel.com/docs/frameworks/backend/nestjs). Estas opciones no autorizan creación ni pago.

### 4.8 Rollback y riesgos

Por ruta: revertir registro a imagen .NET validada, detener nuevos requests TS del dominio, dejar terminar transacciones, comprobar health/session y los flujos afectos. No repetir automáticamente mutaciones tras timeout: consultar resultado antes de reintentar. Revertir también selección SSR; si routing es build-time, redeploy de web conocido. Objetivo rollback ≤15min, demostrado en staging antes de F2 y antes de F7.

No restaurar respaldo ni revertir datos para rollback de aplicación: mismo esquema/contrato permite leer escrituras TS desde legacy. Tras baseline conservar `_prisma_migrations`; no borrarlo para volver a EF. Si cambia accidentalmente esquema o datos, parar rollout y escalar; restauración es incidente con procedimiento separado. Conservar imágenes, registro previo y compatibilidad de JWT/reset/IDs al menos toda estabilización.

| Riesgo | Mitigación / gate |
|---|---|
| Espejo Prisma incompleto o migración Reclamo no aplicada | Catálogo real, reconstrucción aislada y drift0 antes de resolve |
| Baseline altera tablas existentes | SQL revisado; resolve solo metadatos; prohibir deploy baseline sobre origen |
| Cookie/JWT/reset incompatible rompe sesiones y rollback | Emisión/validación cruzada, fixtures criptográficos y Google callback real en staging |
| SSR permanece .NET mientras navegador migra | Registro único y prueba de ambos recorridos |
| Defaults Nest/Prisma cambian JSON, decimal o errores | Adaptador de DTO/errores y matriz completa de paridad |
| Falta scope de propietario o cambio de roles | Fixtures dos dueños/admin/técnico/jugador, 401/403 y legado null |
| Solape/concurrencia o duplicación de dinero/correo | PostgreSQL real aislado; transacciones mixtas; único escritor y efectos postcommit |
| Fastify usa plugin Express incompatible | Adaptador/plugins Fastify y ensayo multipart/cookies. [Nest Fastify](https://docs.nestjs.com/techniques/performance) |
| Sobrecarga de conexiones o servicio dormido | Pool por proceso, presupuesto conjunto, pruebas carga/frío y región comprobada |
| Caché Turbo/Next filtra información | Outputs públicos explícitos, tests con datos sin caché, no-store privado |

### 4.9 Propuesta de nuevas reglas de CLAUDE.md

Texto propuesto para reemplazar árbol/comandos y reglas de esquema **en una tarea futura**, sin editar CLAUDE.md ahora:

> ReservaYa usa pnpm workspaces y Turborepo: apps/web Next16; apps/api NestJS/Fastify; packages/db Prisma, única autoridad del esquema; packages/shared DTOs zod; packages/config configuración común. apps/api-dotnet es legacy temporal y no aplica migraciones.
>
> Implementar solo specs aprobadas y cards asignadas; español; sin commit/push/tag salvo instrucción explícita. Nunca editar/versionar .env real ni secretos/artefactos. Usar pnpm con lockfile congelado. Comandos de paquete: typecheck, lint, test, build; generate de db precede builds; root turbo coordina dependencias.
>
> Se retiran las protecciones específicas de C#/Entities/AppDbContext/Migrations y la autoridad EF. Prisma cambia esquema solo con SQL revisado, pruebas aisladas y ejecución autorizada. Durante spec56 no cambian tablas/datos de negocio: baseline diff offline + resolve autorizado únicamente metadatos. Prohibidos reset/db push/seed en producción. Migraciones futuras tienen autorización y procedimiento propio; no ejecutarlas en app-start.
>
> Cookie HttpOnly y contratos actuales se conservan; API mantiene TokenVersion, propiedad y transacciones serializables. No compartir secretos ni modelos DB con navegador. BLOQUEO-API incluye método/ruta/payload/respuesta. Pam registra §7; god coordina integración, despliegue y actualización del hook.

Actualizar el hook coherentemente con estas reglas; su estado actual no es evidencia de autorización general. Durante este encargo prevalece el límite documental. No persistir «cero migraciones siempre» como política nueva después de la decisión humana.

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos/lint por paquete | pnpm turbo run typecheck lint | 0 errores nuevos; warning seed histórico no se oculta |
| A2 | Builds | pnpm turbo run build; dotnet legacy mientras coexista | 0 errores; Next typegen/generate en orden |
| A3 | Unitarios | Vitest en shared/api/db y web donde migren tests | Reglas dinero/fecha/roles/precios/token cubiertas; pruebas Node existentes preservadas hasta equivalencia |
| A4 | API/paridad | Vitest + supertest sobre NestFastify init y ready; PostgreSQL desechable | Cada acción del manifiesto pasa éxito y errores aplicables, mismo JSON/status/headers. [Pruebas Nest](https://docs.nestjs.com/fundamentals/testing) |
| A5 | E2E | Playwright Chromium: jugador/admin/dueño/técnico, browser y SSR | Login/Google staging/invitación/aprobación/reserva/pago/cancelación/reclamo/R2 pasan |
| A6 | Aislamiento | Pruebas API dos sedes/roles y tokens revocados | 0 fugas; 401/403/404 contractuales |
| A7 | Concurrencia | Requests paralelos .NET/TS en PostgreSQL aislado | 0 solapes, doble cobro, exceso de cupo o correlativos duplicados |
| A8 | Baseline/drift | Catalogación, reconstrucción vacía y diff completo | 0 cambios de negocio y tablas faltantes; metadatos resolve registrados |
| A9 | Routing/rollback | Cambiar ruta canaria y regresar desde browser/SSR | Un destino por request; ≤15min rollback staging |
| A10 | Rendimiento | Mismo hosting/región/dataset; antes/después p50/p95 y errores | p95 no empeora >10% y errores no suben; muestras ≥100 por ruta representativa, frío separado |
| A11 | CI por paquete | Jobs config/shared/db/api/web + paridad PostgreSQL + E2E | Instalación frozen; sin secretos en logs/cache; legacy job hasta F8; todo verde |
| A12 | Retiro legacy | Registro rutas, logs y consulta autorizada URLs antiguas | 14 días sin fallback; ninguna dependencia .NET ni uploads sin alternativa |

CI genera Prisma localmente, aplica baseline solo a PostgreSQL desechable y ejecuta supertest con Fastify inicializado/ready. No conectar CI de PR a Neon producción. Jobs separados permiten identificar paquete que falla; cambios shared/db/config disparan todos los dependientes. Integración/E2E completos antes de cutover aun si Turbo usa filtros. Jobs de deploy son posteriores al gate y aprobación operativa, nunca ejecutan migrate resolve por defecto.

## 6. Checklist

- [ ] T0: aprobación humana de spec56, proveedor/plan/región y cards de implementación.
- [ ] T1: F0 manifiesto, contratos negativos, fixtures anonimizados, versiones y medición inicial.
- [ ] T2: F1 estructura, CI, Nest health, legacy reversible y baseline autorizado.
- [ ] T3: F2 lecturas públicas, selección browser/SSR y primer rollback.
- [ ] T4: F3 auth compatible y sesiones cruzadas.
- [ ] T5: F4 perfil/R2, permisos, horarios/precios.
- [ ] T6: F5 equipo/invitaciones/solicitudes/suscripciones y dominios asociados.
- [ ] T7: F6 caja/abonos/reportes/reclamos con dinero/concurrencia.
- [ ] T8: F7 reservas al final y pruebas mixtas serializables.
- [ ] T9: F8 estabilización, retiro condicionado, docs/CLAUDE/hook y CI finales.
- [ ] T10: Pam verifica criterios, evidencia por fase y registro §7; god coordina despliegue.

## 7. Registro de verificación

Reservado a Pam. Redacción documental no equivale a gates de implementación, baseline aplicado ni aprobación humana.

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
