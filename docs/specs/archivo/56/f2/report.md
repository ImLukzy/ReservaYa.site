# F2 — lecturas públicas (RYS-70)

Estado: implementación y verificación completadas. Paridad HTTP38/38 PASS y gates en clon limpio Node22.20 PASS, confirmados por god. Auditoría Kelly pendiente. No tráfico productivo dirigido a Nest, despliegue nuevo, commit ni push.

## Alcance y contratos

Siete acciones F0: E024, E025, E029, E030, E031, E052 y E066. Complejos/torneos, partidos/mios, reseñas privadas, autenticación y mutaciones permanecen fuera del módulo. BACKEND_URL/rewrites web no cambian.

Se conserva distinción entre listado general/detalle de canchas y vitrina visible: publicados habilitados por suscripción vigente o prueba30d de dueño noUSUARIO; legacy sin complejo visible. Propias exige identidad firmada y filtra dueño/membresía activa; TECNICO global. Middleware de dueño vencido aplica en listado/detalle que no llevan AllowAnonymous en legacy. JWT opcional HS256 respeta cookie→Bearer, expiración/nbf y tolerancia10s; no se crean endpoints de autenticación. Como en AllowAnonymous legacy, tv/activo no se verifican aquí.

Cotización usa Decimal y prioridad cancha/complejo/global/fecha reciente, franjas, fechas anuales y días; cobra cada bloque iniciado de60min como el fuente legacy. Money se devuelve string2decimales. Excepción verificada: partido.precio se mantiene número porque FlexibleDecimalConverter escribe número. Reseñas públicas no incluyen email, promedio redondea ties-to-even; UTC omite ceros fraccionales finales como System.Text.Json.

DbService crea un PrismaClient por proceso bajo demanda y lo cierra al terminar; /health sigue funcionando sin conexión. Binding inválido reproduce ProblemDetails y content-type; traceId aleatorio normalizado solo después de validar formato.

## Tabla de paridad

| Método+ruta | Acción | Estado |
|---|---|---|
| GET /api/canchas | E024 | PASS |
| GET /api/canchas/{id} | E025 | PASS |
| GET /api/canchas/disponibles | E029 | PASS |
| GET /api/canchas/opciones | E030 | PASS |
| GET /api/canchas/{id}/cotizar | E031 | PASS |
| GET /api/partidos | E052 | PASS |
| GET /api/resenas/publicas | E066 | PASS |

## Evidencia y ejecución

God confirmó en Node22.20: build API4/4tareas, typecheck/lint, tests8/8, dotnet Release sin errores (NU1900 por red). La primera ejecución del fixture detectó campo monto inexistente en Suscripcion antes de comparar; base temporal borrada. Campo retirado; harness ahora typecheck PASS contra tipos Prisma reales. No se afirma paridad a partir de unit tests.

Harness en scripts/f2-parity.mjs: carga solo TEST_DATABASE_URL_UNPOOLED de qa.env, crea base vacía temporal en QA, aplica baseline e inserta datos ficticios F0, llama .NET y Nest sobre esa misma base sin mutaciones HTTP, compara status/cuerpo completo y headers content-type/cache-control/set-cookie. Solo traceId se normaliza; no se convierten tipos, fechas, dinero o nulls. Se elimina base temporal y se detiene únicamente .NET iniciado por el harness. ContentRoot temporal de .NET evita leer .env real. Puertos aislados15100, Nest usa inject sin puerto. No exporta datos de la copia productiva QA.

Comandos de red/gates solicitados a god:

```sh
pnpm exec turbo run build --filter=@reservaya/api
pnpm --filter @reservaya/api typecheck
pnpm --filter @reservaya/api lint
pnpm --filter @reservaya/api test
dotnet build apps/api-dotnet -c Release
node scripts/f2-parity.mjs --confirm-qa-migracion-ts
```

God confirmó38/38 con Node22.20: todas las acciones/casos F0 y extras comparan status/cuerpo/headers, BD temporal eliminada. Conteo por acción: E0249, E0253, E0299, E0302, E0315, E0525, E0665. Clon limpio detectó typecheck db antes de generar cliente; Turbo ahora depende de generate del mismo paquete además de ^generate. Repetición en clon limpio PASS: frozen install, typecheck, lint, tests, build API/web y smoke sharp PNG1x1. Resultados HTTP en parity-results.json. Producción no se usa desde sandbox ni se enruta a Nest; corte posterior corresponde a god/humano.

## Hallazgos Kelly F1 cerrados

.gitignore protege *.env/qa.env/.qa-env y conserva .env.example; CI contents:read; carpetas legacy vacías retiradas; catch db-qa redacta stack/message/String. Verificados git check-ignore, git diff --check y node --check. No se repite reconciliación F1.

Sharp: el host detecta libvips global8.18.7 y trata de compilar desde fuente; CI/clon usan SHARP_IGNORE_GLOBAL_LIBVIPS=1 antes de instalación, conservando binarios opcionales del lock y allowlist acotada. Se comprueba PNG1x1. [Instalación oficial sharp](https://sharp.pixelplumbing.com/install/). Paridad se ejecuta con ambos procesos TZ=UTC; Partidos sigue calendario local del host como DateTime.Today legacy.
