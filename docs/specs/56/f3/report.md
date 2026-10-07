# F3 — autenticación Nest

Estado: F3 integrada en `main` (`b25c728`), auditoría Kelly APTO según god. Correcciones posteriores de correo y caché implementadas; gates finales solicitados.

## Alcance

Diez rutas E005–E014: login, registro, logout, recuperación y reset, refrescar, perfil, Google, callback y completar registro. JWT HS256 con la clave compartida, claims `id/email/nombre/rol/tv`, vigencia siete días y tolerancia diez segundos. Cookie `token` HttpOnly, path `/`, SameSite/Secure según configuración y borrado equivalente al legado. Sesiones revocadas mediante `tokenVersion`; reset con HMAC, huella de contraseña y actualización condicionada de un solo uso. Registro limita edad a catorce años y conserva validaciones y límites de intentos.

Correcciones Kelly F2: identidad PERSONAL se degrada a USUARIO; promociones se leen en páginas explícitas de 200 sin truncar resultados ni alterar prioridad.

## Pruebas

- Build, tipos y lint Nest: PASS local. Vitest: 12/12 PASS, incluyendo firmas, expiración, separación de tokens pendientes, reset y límites.
- Host `tests/legacy-auth-host`: build PASS; usa AuthController, JwtService, GoogleOAuth y autorización .NET reales sin modificar sus fuentes. Aviso NU1900: consulta de vulnerabilidades no disponible por red local.
- `scripts/f3-parity.mjs --confirm-qa-migracion-ts`: PASS con Node 22.20: 39/39 casos, las diez rutas E005–E014 cubiertas. Crea una base vacía efímera dentro de QA, aplica baseline y datos ficticios; elimina la base al finalizar.
- Primer gate Node 22.20: 29/31 casos de paridad y 6/6 escenarios cruzados PASS. Dos divergencias al borrar cookies OAuth (SameSite añadido por Fastify) corregidas; segunda ejecución 39/39 PASS.
- Sesiones cruzadas, logout cruzado, reset cruzado de un solo uso y rate limit: 6/6 PASS en primer gate.
- Google usa claves RSA ficticias y HTTP en memoria/local. Correo capturado. No se llama a Google ni Resend reales.
- Regresión F2 Node 22.20: 38/38 PASS. Clon limpio de las correcciones posteriores: pendiente de confirmación de god.

## Límites

No hay tráfico productivo, despliegue, commit ni push. Routing web conserva .NET. El proveedor de correo admite Resend mediante configuración de entorno; las verificaciones sustituyen el transporte por un fake y nunca envían correos reales. El host de pruebas contiene endpoints auxiliares únicamente fuera de la aplicación Nest y del servicio .NET productivo.

## Hallazgos Kelly — cierre posterior a integración

`MailProvider` usa `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` y valida `PASSWORD_RESET_URL`, igual que la selección de proveedor .NET. Envía HTTP POST a Resend con autorización Bearer, timeout de diez segundos y campos from/to/subject/text/html. Proveedor incompleto o desconocido queda desactivado; `log` solo funciona en desarrollo. Fallos del transporte se registran sin respuesta del proveedor, credenciales ni enlace. La respuesta de recuperación conserva su cola asíncrona y `{ok:true}`.

Asunto, texto y HTML se comparan íntegramente con `tests/fixtures/password-reset-email.json`, generado por `PasswordResetEmail.Build` real con valores ficticios, incluyendo caracteres HTML, Latin-1 y emoji. Regeneración sin base de datos ni red: `dotnet tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll --email-template` después de build.

Google guarda las claves públicas JWKS en memoria según `Cache-Control: max-age`, resta `Age` y no retiene respuestas `no-store`/`no-cache` ni aquellas sin TTL. Al vencer, exige renovar las claves; no acepta una copia vencida si falla el proveedor. Solicitudes simultáneas comparten una consulta pendiente.

El límite de intentos permanece en memoria por proceso, igual que el legado: se pierde al reiniciar y no se comparte entre réplicas. Antes de escalar a varios procesos se necesitará almacenamiento compartido para conservar un límite global.

Pruebas adicionales sin red: transporte Resend fake, selección de proveedor, fallos redactados, plantilla completa y caché JWKS (vigencia, expiración, Age, no-store/no-cache, concurrencia y fallo de renovación). Build, tipos, lint y 29/29 tests locales Node 22.20 PASS; gate final externo pendiente. No se inició F4.
