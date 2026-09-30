# Especificación: 44 - Entrar con Google y correos que llegan

**Aprobada por Lukas:** 2026-09-30 14:18 («sí», opción 1: la migración la aplica Lukas tras ver el SQL).

## 1. Objetivo
**Problema:** Lukas pidió (2026-09-30) un botón «Continuar con Google» en el login oficial (`reservaya-frontend-astro/src/pages/login.astro`) y correos 100 % funcionales, tomando como modelo `C:/Users/anton/OneDrive/Documentos/Unsa/Universo_Agustino` (informe: `hive/agents/toby-explorador-mumypt8r/universo-agustino.md`; mapa de ReservaYa: `hive/agents/toby-explorador-mumypt8r/spec44-mapa.md`).
- Correos: la API ya envía el de recuperar contraseña con Resend (`backend/ReservaFacil.Api/Services/EmailSender.cs`, cola en `EmailQueue`), pero queda desactivado si faltan las variables.
- Google: no existe. `Usuario.Password` es obligatorio (`Entities.cs:8`) y el registro exige `FechaNacimiento` y `Username` (`AuthController.cs:98-110`), datos que Google no entrega.

**Resultado esperado:**
1. Quien pulsa «Continuar con Google» en `/login` o `/register` entra con su cuenta de Google. Si ya tenía cuenta con ese correo, se vincula. Si es nuevo, completa nacimiento y usuario en un paso corto y queda registrado.
2. El correo de recuperar contraseña llega a la bandeja real.

## 2. Fuera de alcance
Otros proveedores (Facebook, Apple), verificación de correo con código, correos nuevos (bienvenida, confirmación de reserva; pueden ir en otra spec), cambios de roles o de la cookie de sesión.

**Decisiones de producto que requieren aprobación:**
1. **Migración (aprobada por Lukas el 2026-09-30, opción «a»):** una sola, que añade a `Usuario` dos columnas opcionales: `GoogleId` (texto, índice único) y `AvatarUrl` (texto). Para esta spec se permite tocar `Entities.cs`, `AppDbContext.cs`, `Migrations/**` y el espejo `prisma/schema.prisma` (sin `prisma migrate`).
2. **Aplicar la migración a la base de datos:** la API no migra sola al arrancar. `dotnet ef database update` contra Neon lo ejecuta Lukas (o autoriza a god a hacerlo) después de revisar el script SQL que genera `dotnet ef migrations script`.
3. Aprobar la spec.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `backend/ReservaFacil.Api/Entities.cs` | modificar | `Usuario.GoogleId?`, `Usuario.AvatarUrl?` |
| `backend/ReservaFacil.Api/AppDbContext.cs` | modificar | índice único en `GoogleId` |
| `backend/ReservaFacil.Api/Migrations/<fecha>_GoogleLogin.cs` | crear | con `dotnet ef migrations add GoogleLogin` (solo generar; no `database update`) |
| `prisma/schema.prisma` | modificar | espejo de las 2 columnas |
| `backend/ReservaFacil.Api/Controllers/AuthController.cs` | modificar | 3 endpoints nuevos (§4) |
| `backend/ReservaFacil.Api/Services/GoogleOAuth.cs` | crear | intercambio de código y validación del `id_token` |
| `backend/ReservaFacil.Api/Program.cs` | modificar | leer `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`; sin ellas, Google queda desactivado y se registra en el log, como hoy con el correo |
| `reservaya-frontend-astro/src/pages/login.astro:16-17`, `register.astro:16-17` | modificar | botón «Continuar con Google» y separador «o» |
| `reservaya-frontend-astro/src/pages/completar-registro.astro` | crear | nacimiento + usuario para cuentas nuevas de Google |

## 4. Diseño y lógica
- **API (flujo de servidor, como Universo):**
  - `GET /api/auth/google?returnUrl=` → guarda `state` (aleatorio, cookie HttpOnly de 10 min) y `returnUrl` validado; redirige a Google con `scope=openid email profile`.
  - `GET /api/auth/google/callback` → compara `state`; cambia el `code` por tokens en `https://oauth2.googleapis.com/token`; valida el `id_token` con las claves públicas de Google (OpenID Connect de `Microsoft.IdentityModel`, que ya viene con `JwtBearer`: sin paquetes nuevos): emisor `accounts.google.com`, audiencia `GOOGLE_CLIENT_ID`, `email_verified = true`.
    - Existe usuario con ese `GoogleId` → sesión.
    - Existe usuario con ese correo → guarda `GoogleId` (vincula) → sesión.
    - No existe → no crea nada todavía: firma un token de registro pendiente (10 min, con correo, nombre, `sub` y foto) y redirige a `${PUBLIC_APP_URL}/completar-registro?t=…`.
    - La sesión se emite con el `SetTokenCookie` actual (`AuthController.cs:274-287`) y redirige al `returnUrl` o al inicio del rol.
  - `POST /api/auth/google/completar` `{ t, fechaNacimiento, username }` → mismas validaciones que el registro (`AuthController.cs:98-110`); crea el usuario con `Password` = hash BCrypt de 32 bytes aleatorios (entra con Google o con «olvidé mi contraseña»), `GoogleId` y `AvatarUrl`; emite la cookie.
  - Errores → `${PUBLIC_APP_URL}/login?error=google` con un mensaje claro en el login.
- **Correos:** sin código nuevo. Lukas pone en el `.env` de la API: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (dominio verificado en Resend) y `PASSWORD_RESET_URL=http://localhost:4321/reset-password`. Al arrancar, la API debe registrar «Email de recuperación de contraseña: resend».
- **Google Cloud (lo hace Lukas):** cliente OAuth «Aplicación web»; origen `http://localhost:4321`; URI de redirección = el valor exacto de `GOOGLE_REDIRECT_URI` (en local: `http://localhost:5000/api/auth/google/callback`).
- **Invariantes:** la API sigue siendo la única autoridad; el cliente nunca lee el JWT; `returnUrl` solo acepta orígenes permitidos; nadie lee ni cita valores del `.env`; multitenancy intacto.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | API compila | `dotnet build` del proyecto | 0 errores |
| A2 | Panel y landing | gates del panel + `astro check`/`build` | 0 errores |
| A3 | Migración revisada | `dotnet ef migrations script` solo añade 2 columnas nulas y 1 índice | nada más |
| A4 | Seguridad | revisión god línea por línea: `state`, audiencia, emisor, `email_verified`, `returnUrl`, token pendiente firmado y con caducidad | cumple |
| A5 | Google de punta a punta | Lukas, en su navegador: cuenta nueva → completar registro → dentro; cuenta existente → vinculada → dentro | funciona |
| A6 | Correo real | Lukas pide «olvidé mi contraseña» con su correo | llega a la bandeja |

## 6. Checklist
- [ ] Lukas: `.env` (Resend y Google) y cliente OAuth.
- [x] Migración generada y revisada (A3) → Lukas la aplica (pendiente de aplicar).
- [x] Endpoints API + `GoogleOAuth.cs`.
- [x] Botón en login/registro + `completar-registro.astro`.
- [ ] Gates, revisión de seguridad y §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 | ✅ | god: `dotnet build` compilación correcta, 0 avisos |
| 2026-09-30 | A2 | ✅ | landing: astro check 0 errores · build 18 páginas (nueva `completar-registro`); el panel no cambia en esta spec |
| 2026-09-30 | A3 | ✅ | `hive/agents/oscar-code-mumyo7te/s44-migracion.sql`: 2 columnas nulas + índice único filtrado + fila de historial. Sin aplicar (lo hace Lukas) |
| 2026-09-30 | A4 | ✅ | revisión god línea por línea; god corrigió: `MapInboundClaims = false` en los 2 lectores de tokens (sin eso `sub`/`email` salían nulos y nadie podía entrar), `redirect_uri` fijo → `GOOGLE_REDIRECT_URI`, token pendiente con clave derivada propia, vínculo solo si `GoogleId` es nulo (entidad rastreada; inactiva u otra cuenta de Google → error), destino tras entrar = `landing/login?google=ok` (la landing lleva a cada rol) y origen de la landing tomado de `PASSWORD_RESET_URL` (FRONTEND_ORIGIN es una lista CORS) |
| 2026-09-30 | UI | ✅ | Playwright 360/1440 en `/login`, `/register`, `/completar-registro`, `/login?error=google`: 0 px de scroll lateral, botón 52/64 px con el logo «G» de Google, aviso de error visible |
| 2026-09-30 | A5, A6 | pendiente | Lukas: aplicar la migración, poner `.env` (Google y Resend) y probar con su cuenta |
