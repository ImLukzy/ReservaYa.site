# F8 — variables para sustituir .NET por Nest en el mismo servicio

Preparación para `reservaya-api`: cambiar `dockerfilePath` de `./Dockerfile` a `./Dockerfile.api`; rollback: restaurar `./Dockerfile`. Sin ejecutar cambios en Render, Vercel ni Neon. Verificado contra código fuente, sin leer valores desplegados. «Sí» significa necesaria para la función indicada, aunque `/healthz` responda sin ella.

| Variable Nest | Equivalente .NET real | Obligatoria | Si falta |
|---|---|---|---|
| `DATABASE_URL` | `DATABASE_URL` (fallback .NET: `DATABASE_URL_UNPOOLED`) | Sí, negocio | Prisma falla al consultar; Nest no usa el fallback de .NET. Debe ser URL PostgreSQL, no cadena Npgsql. |
| `DATABASE_URL_UNPOOLED` | Mismo nombre | No, runtime; sí, herramientas DB | Conexión directa para Prisma CLI; no sustituye `DATABASE_URL` en Nest. |
| `JWT_SECRET` | Mismo nombre | Sí, sesiones; ≥32 caracteres | Firma/verificación falla; conservar la clave para sesiones existentes. |
| `COOKIE_SECURE` | Mismo nombre, AuthController | Sí, cookies cross-site HTTPS | Sin override usa protocolo de request y SameSite=Lax; con override habilita Secure/SameSite=None. |
| `EMAIL_PROVIDER` | Mismo nombre | Sí, recuperación por Resend | No se configura envío Resend. |
| `EMAIL_FROM` | Mismo nombre | Sí, recuperación por Resend | Proveedor no configurado. |
| `RESEND_API_KEY` | Mismo nombre | Sí, recuperación por Resend | Proveedor no configurado. |
| `PASSWORD_RESET_URL` | Mismo nombre | Sí, recuperación y origen web correcto | Recuperación deshabilitada; OAuth vuelve a origen local por defecto y enlaces de equipo usan origen público por defecto. |
| `GOOGLE_CLIENT_ID` | Mismo nombre | Sí, Google OAuth | Google deshabilitado; endpoints responden 503. |
| `GOOGLE_CLIENT_SECRET` | Mismo nombre | Sí, Google OAuth | Google deshabilitado. |
| `GOOGLE_REDIRECT_URI` | Mismo nombre | Sí, Google OAuth | Google deshabilitado. |
| `MEDIA_PUBLIC_URL` | Mismo nombre, MediaPublica | Sí, URLs R2 | Validación de URLs de medios rechaza URLs R2; borrado R2 no identifica claves. |
| `R2_ENDPOINT` | Mismo nombre, AlmacenR2 | Sí, borrado R2 | Omite borrado remoto, conserva objetos reemplazados. |
| `R2_ACCESS_KEY_ID` | Mismo nombre, AlmacenR2 | Sí, borrado R2 | Omite borrado remoto. |
| `R2_SECRET_ACCESS_KEY` | Mismo nombre, AlmacenR2 | Sí, borrado R2 | Omite borrado remoto. |
| `R2_BUCKET_NAME` | Mismo nombre, AlmacenR2 | Sí, borrado R2 | Omite borrado remoto. |
| `PORT` | `PORT` → Dockerfile calcula `ASPNETCORE_URLS` | Sí, Render lo inyecta | Nest usa puerto 5200; inválido impide arranque. |
| `NODE_ENV` | `ASPNETCORE_ENVIRONMENT` (entorno runtime) | No; imagen fija producción | Sin variable no habilita correo log por esta vía. |
| `ASPNETCORE_ENVIRONMENT` | Mismo nombre | No | Nest solo lo consulta para correo log de desarrollo; no configura runtime Node. |
| `FRONTEND_ORIGIN` | Mismo nombre, CORS en Program.cs | No, Nest actual no lo consulta | No hay configuración CORS equivalente en Nest; llamadas del mismo origen vía Next siguen el proxy. |
| `LEGACY_WEB_ROOT` | `IWebHostEnvironment.WebRootPath` (`wwwroot`), sin env equivalente | No; necesaria si se usa raíz local distinta | Escritura/borrado local usa `cwd/wwwroot`; no habilita lectura estática `/uploads`. |

**Antes del cambio:** no renombrar variables de negocio: Program.cs lee env directamente, no `ConnectionStrings__*` ni `Jwt__*`. Añadir `DATABASE_URL` si .NET dependía solo de `DATABASE_URL_UNPOOLED`; añadir `NODE_ENV` solo si se sobrescribe el valor de producción de la imagen. `LEGACY_WEB_ROOT` es nueva y condicional; no resuelve por sí sola la compatibilidad de archivos locales. Mantener `ASPNETCORE_ENVIRONMENT` de producción para rollback y nunca habilitar correo log de desarrollo. Confirmar las variables funcionales anteriores sin exponer sus valores.

**Puerto y salud:** Dockerfile.api arranca `node apps/api/dist/main.js`; main lee `process.env.PORT` y escucha `0.0.0.0`. Render puede sobrescribir el default de imagen. GET `/healthz` existe y devuelve `{ ok: true }` sin DB: sirve para liveness, no certifica acceso a DB. No hay migraciones al arrancar. Pendiente operativo: lectura de `/uploads` locales y CORS directo si se requieren; cambiar el Dockerfile no los implementa.
