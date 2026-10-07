# F6 — caja, abonos, metas, reportes y libro de reclamaciones en Nest

Estado: 20 endpoints (22 acciones del manifiesto F0) implementados en `apps/api`. Paridad estricta y gates en verde (ver Verificación). Sin tráfico productivo, commit ni push.

## Alcance

| Dominio | Acciones | Código |
|---|---|---|
| Abonos | E001–E004 | `src/abonos/abonos.ts` |
| Caja (sesión, movimientos, productos) | E015–E023 | `src/caja/caja.ts` |
| Metas | E048–E051 | `src/metas/metas.ts` |
| Reclamos | E063 | `src/reclamos/reclamos.ts` |
| Reportes | E064–E065 | `src/reportes/reportes.ts` |

Helpers de dinero en `src/caja/money.ts`. Registro en `src/domains.module.ts`. Tests en `src/caja/finance.test.ts`.

Cambios en código compartido (mínimos y aditivos):
- `src/app.ts`: `rawBody: true`. Nest ya registraba ese mismo parser JSON; ahora además guarda los bytes. El resto del comportamiento no cambia.
- `src/domains.module.ts`: cinco controladores y servicios.
- `tests/legacy-auth-host/Program.cs`: bandera `F6_QA_FIXTURE`, prefijo `f6_fixture_` y `AddMemoryCache()` (Reportes usa `IMemoryCache`).
- `scripts/db-qa.mjs`: acción `deploy --confirm-qa-migracion-ts` (`migrate deploy` + `status`, solo URLs TEST de `hive/qa.env`).
- `scripts/f2-parity.mjs`: la guarda «ruta fuera de alcance» usa ahora una ruta centinela (`/api/fuera-de-alcance`). F6 implementa caja/abonos/metas/reportes y Michael está implementando `/api/reservas` (F7) en paralelo.

## Dinero: decimales exactos

- Nunca se usa coma flotante binaria. El cuerpo JSON se vuelve a leer desde los bytes con `JSON.parse` y el `source` del literal (Node 22). Cada número conserva su texto exacto y pasa a `Prisma.Decimal`. Ejemplo: `0.1250000000000000000001` o `12345678.125000000000000001` llegan intactos.
- Equivalente a `FlexibleDecimalConverter`: acepta número o string con `NumberStyles.Float|AllowThousands` (`" 1,250.50 "`, `"1e2"`). Si falla responde el mismo ProblemDetails que .NET: `request` requerido más `$.campo` (o `$.items[0].precio`), con «Valor numérico inválido» o «Se esperaba un número».
- Los nombres de propiedad se comparan sin distinguir mayúsculas; gana el último duplicado, como en `JsonSerializerDefaults.Web`.
- `Math.Round(x, 2, AwayFromZero)` equivale a `toDecimalPlaces(2, ROUND_HALF_UP)`. El abono no redondea en el legado, pero `numeric(10,2)` y el formato `"0.00"` redondean igual; Nest redondea antes de escribir y el resultado es idéntico. El promedio de reportes divide con 40 dígitos significativos antes de redondear (decimal .NET tiene 28–29).
- Las respuestas dan el dinero como string `"0.00"`, como `DtoFormat.Money`.

## Contratos conservados

- `ComplejoAccess.PrimeroAsync` (complejo propio más antiguo, luego membresía, luego el primero global solo para TECNICO). En productos y metas ajenos: PUT/PATCH responden 404 y DELETE responde 200 sin mutar.
- Abonos usa su propio alcance: incluye complejos bloqueados y TECNICO ve todos. Reportes usa `IdsAsync` sin bloqueados. El panel vencido responde 403 «Suscríbete…» en todas las rutas autenticadas.
- Caja «hoy» toma el inicio del día de Lima (UTC−5). En un ticket con el mismo producto repetido, cada línea valida contra el stock ya descontado (el mismo rastreo de entidades que EF). Si el ticket se rechaza, la sesión de caja que se abrió automáticamente queda abierta, igual que en el legado.
- Reportes: caché de canchas activas de 60 s, orden de las últimas reservas `creadoEn desc, fecha desc`, top 5 con orden estable, agrupación por estado en el orden del enum de PostgreSQL. `ReservaDto` y `UsuarioReservaDto` se reproducen exactos.
- Reclamos: DataAnnotations con los mensajes exactos y en el orden de declaración. El límite de 10 envíos por IP y hora se aplica después de la validación del modelo. Número `AAAA-NNNNNN`, `fecha` en formato «O» (7 decimales), id GUID con guiones. Ningún dato personal se registra en logs ni en errores.

## Divergencias intencionales

1. **Sesión revocada (ya aceptada).** En las rutas con `Roles`, Nest responde 403 «Sin permisos» sin efectos. Son 16 casos `SECURITY_DIVERGENCE`, fuera del conteo estricto.
2. **Concurrencia de caja (endurecimiento, informativa).** Apertura, cierre, movimientos y abonos bloquean la fila del complejo con `SELECT … FOR NO KEY UPDATE` dentro de una transacción. Venta de productos y PUT de producto bloquean además la fila del producto (`FOR UPDATE`). Stock, movimientos y sesión se escriben en una sola transacción. Prueba con 5 peticiones simultáneas por escenario:

| Escenario | Legado (.NET) | Nest |
|---|---|---|
| Venta de 1 unidad, stock 2 | 3×201 + 2×400: **3 ventas con stock 2** (sobreventa) | 2×201 + 3×400 «Stock insuficiente», stock 0 |
| Apertura de caja | 5×201, **5 cajas abiertas** | 1×201 + 4×409 |
| Cierre de caja | 4×200 + 1×400 (cierres repetidos, montoFinal pisado) | 1×200 + 4×400 «No hay una caja abierta» |
| Movimiento sin caja abierta | 5 cajas creadas | 1 caja, 5 movimientos |
| Abono sin caja abierta | 5 cajas abiertas | 1 caja, total exacto 35.00 |
| Reclamo (5 envíos, primer número del año) | 1×201 + **4×500**, solo correlativo 1 | 5×201, correlativos 1–5 únicos y sin huecos |

   Las ejecuciones secuenciales son idénticas al legado. Los resultados del legado varían entre ejecuciones (en la primera corrida: 5 ventas con stock 2 y 5 cierres 200).
3. **Reclamos:** misma estrategia que el legado: SERIALIZABLE, MAX+1 por año UTC y cinco intentos ante 40001 o 23505 en `Reclamo_numero_key` / `Reclamo_anio_correlativo_key`, con espera de 25·n ms. Si se agotan, 503. En la prueba concurrente el legado no llegó a reintentar: respondió 500 a 4 de 5 envíos. Probablemente el error de PostgreSQL llega envuelto a más de un nivel de `InnerException`; no se investigó porque `apps/api-dotnet` está fuera de alcance. Nest reintenta y registra los cinco. Las peticiones secuenciales coinciden con el legado (201 nominal, menor con apoderado y segundo número del año: PASS).
4. **Sin ejercitar en paridad** (igual que F4/F5): errores de tipo JSON en enteros o strings (el texto de .NET incluye `LineNumber`/`BytePositionInLine`) y montos que desbordan `numeric(10,2)` (500 en ambos lados, con cuerpos distintos). Un valor de enum numérico no definido (`metodoPago:"9"`) se rechaza con 400; en el legado acaba en error 500.

## Tabla Reclamo (desbloqueo aprobado por el humano, solo QA)

- `packages/db/prisma/schema.prisma`: modelo `Reclamo` idéntico a `Migrations/20261006133334_LibroReclamaciones.cs` + Designer (26 columnas, `numeric(12,2)`, `timestamp(3)`, pk `Reclamo_pkey`, únicos `Reclamo_numero_key` y `Reclamo_anio_correlativo_key`, sin defaults).
- `packages/db/prisma/migrations/1_libro_reclamaciones/migration.sql`: generado con `prisma migrate diff` desde el schema de HEAD; revisado contra el SQL de EF.
- Aplicada en `qa-migracion-ts` con `node scripts/db-qa.mjs deploy --confirm-qa-migracion-ts`: «All migrations have been successfully applied», status «Database schema is up to date!», `db-qa drift` → «No difference detected. QA drift 0».
- **Producción: pendiente**, con aprobación humana aparte (nota en `docs/specs/56/f1/baseline-runbook.md`). No se tocó `apps/api-dotnet/Migrations` ni se ejecutó seed.
- El host legado .NET lee y escribe la tabla: los casos 201 de E063 pasan en ambos backends.

## Verificación (Node 22.20.0, pnpm 10.18.3, dotnet 10.0.401)

```
pnpm exec turbo run build typecheck lint test --filter=@reservaya/api
  Tasks: 7 successful, 7 total · Test Files 9 passed · Tests 95 passed (95)
node scripts/f6-parity.mjs --confirm-qa-migracion-ts
  F6 strict parity 206/206; intentional security divergences 16; informative 6; blocked 0; failures 0
node scripts/f3-parity.mjs --confirm-qa-migracion-ts      F3 parity 39/39; cross 6/6
node --test scripts/f6-cleanup.test.mjs                   pass 3, fail 0
dotnet build tests/legacy-auth-host -c Release -p:EnableSourceControlManagerQueries=false   0 errores
node scripts/db-qa.mjs drift                              QA drift 0
```

El conteo de tests incluye los de reservas que Michael (F7) está escribiendo en paralelo en el mismo árbol. La regresión completa F2–F5 la ejecuta god, por orden del humano. Primer intento de F2 con la guarda anterior: falló porque `/api/reservas` ya existe (F7); la guarda ya está corregida.

`docs/specs/56/f6/parity-results.json` guarda cada caso: 20 endpoints × (nominal, sin sesión, tv revocado y rol no permitido si la ruta tiene roles), casos negativos de propiedad entre sedes y de miembro/plataforma, validación, bloqueo por vencimiento, literales decimales exactos, límite de reclamos por IP (11 envíos) y concurrencia. Cada comparación incluye status, cuerpo, `content-type` y todas las columnas de 11 tablas (el dinero se compara como texto exacto). Normalización: GUID N/D nuevos, marcas de tiempo de la petición (±120 s) y `traceId`.

El runner crea `f6_fixture_<12hex>` en la rama QA, aplica `0_baseline` y `1_libro_reclamaciones`, siembra datos ficticios una vez y restaura con `f6_seed.restore()`. Borra la base con `DROP … WITH (FORCE)` (tres intentos, cliente nuevo en cada uno, guarda de nombre) y también al recibir SIGINT/SIGTERM. Opción `--only=E019,…` para iterar.

## Límites

- Sin producción, seed, Google, Resend ni R2 reales. No se tocaron `apps/api-dotnet` ni `apps/web`.
- La conexión a Neon y Turbo/vitest se ejecutaron fuera del sandbox (el proxy no deja pasar el puerto 5432 y Turbo no reenvía `TMPDIR`).
- No toqué los archivos de Michael (`sanciones`, `torneos`, `reservas`, `f5-parity.mjs`). En `app.test.ts` se conserva su versión.
