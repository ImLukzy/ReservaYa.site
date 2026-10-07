# F3 — autenticación Nest

Estado: implementación, verificaciones locales y paridad QA completas; clon limpio pendiente. No se declara F3 terminada.

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
- Regresión F2 Node 22.20: 38/38 PASS. Clon limpio: pendiente.

## Límites

No hay tráfico productivo, despliegue, commit ni push. Routing web conserva .NET. El proveedor de correo de Nest es una interfaz capturable sin envío real en F3; un adaptador productivo debe habilitarse antes del cambio de tráfico. El host de pruebas contiene endpoints auxiliares únicamente fuera de la aplicación Nest y del servicio .NET productivo.
