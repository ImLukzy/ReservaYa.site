# Despliegue de ReservaYa

Repositorio `ImLukzy/ReservaYa.site`, rama `main`: Next.js en Vercel (`apps/web`), API .NET 10 en Render (Dockerfile raíz) y PostgreSQL existente en Neon. Esta guía no aplica cambios remotos; los pasos los ejecuta el humano. Los valores privados se guardan en las plataformas, nunca en el repositorio.

## Vercel: web y panel

En el proyecto conectado a `ImLukzy/ReservaYa.site`:

1. Settings → Build and Deployment: **Root Directory = `apps/web`**, Framework Preset = **Next.js**. Si apunta a la raíz, puede construir la web antigua.
2. Production Branch = `main`. Usar instalación `npm ci`, build `npm run build` y Output Directory predeterminado de Next. Vercel gestiona el arranque; no configurar `npm run start` como paso de despliegue.
3. Asociar `reservaya.site` al proyecto correcto en Domains. Comprobar que el deployment de producción corresponde al commit esperado.
4. Guardar variables de Production (y Preview si se utiliza) y hacer un deployment nuevo. `BACKEND_URL` interviene en los rewrites durante el build; modificarlo sin reconstruir no cambia los destinos existentes.

| Variable | Valor a configurar |
|---|---|
| `BACKEND_URL` | `https://<SERVICIO_API>.onrender.com`, sin `/api` ni barra final |
| `JWT_SECRET` | Secreto privado de al menos 32 caracteres, **idéntico al de Render** |
| `COOKIE_SECURE` | `true` para conservar configuración coherente; Next no la lee, quien crea las cookies es la API en Render |
| `NEXT_PUBLIC_GA_ID` | Opcional; identificador público de Analytics, vacío si no se usa |
| `NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT` | Opcional; contacto/sugerencias, no Libro de reclamaciones |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Opcional; solo dígitos con código de país |

El navegador llama a `/api/*` y `/uploads/*` en `reservaya.site`; Next los reenvía a `BACKEND_URL`. No usar un dominio de Render como URL pública de auth ni exponer JWT/conexiones con el prefijo `NEXT_PUBLIC_`. Las variables públicas se incorporan al build. [Configuración de monorepos en Vercel](https://vercel.com/docs/monorepos).

Quitar las variables heredadas que el código actual no usa: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_PUBLIC_APP_URL`, `NEXT_PUBLIC_RESERVAYA_API_URL`, `NEXT_PUBLIC_RESERVAYA_APP_URL`, `API_PORT`, `API_PREFIX`, `JWT_ACCESS_*`, `JWT_REFRESH_*`, `WEB_ORIGIN`, `S3_*`, `STORAGE_DRIVER` y `DIRECT_DATABASE_URL`. Las conexiones `DATABASE_URL`/`DATABASE_URL_UNPOOLED`, las claves de Resend/Google y `FRONTEND_ORIGIN` pertenecen a Render; no hacen falta para ejecutar la web. Dejar `NODE_ENV` bajo el control de Next/Vercel.

## Render: API .NET

Usar el servicio web Docker conectado a `https://github.com/ImLukzy/ReservaYa.site`, rama `main`, con Root Directory vacío (raíz del repo), Dockerfile `./Dockerfile`, contexto `.` y health check **`/healthz`**. El Dockerfile publica `apps/api/ReservaFacil.Api.csproj`, ejecuta `ReservaFacil.Api.dll` y usa `PORT` que Render inyecta. El runtime define `ASPNETCORE_ENVIRONMENT=Production` en la imagen; no es un servidor Node.

`render.yaml` contiene las siguientes variables de la API:

| Variable | Valor a configurar |
|---|---|
| `DATABASE_URL` | URL **pooled** de la base existente de Neon, con SSL |
| `DATABASE_URL_UNPOOLED` | URL **directa** de esa misma base, con SSL |
| `JWT_SECRET` | Mismo secreto privado de Vercel, ≥32 caracteres; `sync:false`, sin `generateValue` |
| `FRONTEND_ORIGIN` | `https://reservaya.site`; si se añaden otros orígenes, separados por coma, sin rutas |
| `COOKIE_SECURE` | `true` en producción HTTPS |
| `EMAIL_PROVIDER` | `resend` si se envían correos; `log` solo sirve en Development y no entrega correo |
| `RESEND_API_KEY` | Clave privada del proveedor |
| `EMAIL_FROM` | `ReservaYa <no-reply@<DOMINIO_VERIFICADO>>`, sustituir por un remitente verificado |
| `PASSWORD_RESET_URL` | `https://reservaya.site/reset-password`; también determina el origen de retorno tras Google |
| `GOOGLE_CLIENT_ID` | ID del cliente OAuth, opcional si Google está deshabilitado |
| `GOOGLE_CLIENT_SECRET` | Secreto privado OAuth |
| `GOOGLE_REDIRECT_URI` | **`https://reservaya.site/api/auth/google/callback`** |

Registrar esa URL de callback exacta en las URI de redirección autorizadas del cliente de Google. La ruta real es `GET /api/auth/google/callback`, reenviada por Next hacia Render; usar `reservaya.site` conserva la cookie de estado OAuth en el mismo origen del navegador. Las tres variables Google deben estar presentes para habilitar el proveedor. Para correo, la API también exige una `PASSWORD_RESET_URL` válida.

Eliminar del servicio .NET las variables del backend Node anterior: `API_PORT`, `API_PREFIX`, `JWT_ACCESS_*`, `JWT_REFRESH_*`, `WEB_ORIGIN`, `S3_*`, `STORAGE_DRIVER`, `DIRECT_DATABASE_URL`, `NODE_ENV`, `NEXTAUTH_*` y `NEXT_PUBLIC_*`. `PORT` lo gestiona Render; no sustituirlo por `API_PORT`. `DATABASE_URL_UNPOOLED` es el nombre que sí reconoce esta API.

Al actualizar un Blueprint existente, los valores `sync:false` no se reemplazan automáticamente: revisar Environment manualmente y redeployar. [Referencia oficial del Blueprint](https://render.com/docs/blueprint-spec).

## Neon: aplicar LibroReclamaciones una vez

La migración existente es **`20261006133334_LibroReclamaciones`**. Su `Up()` crea solamente `Reclamo` y dos índices únicos. La aplicación no la ejecuta al iniciar y Docker/Vercel no deben ejecutar migraciones ni seed.

Paso manual del humano, desde la raíz del repo y sobre la base correcta:

1. Revisar `apps/api/Migrations/20261006133334_LibroReclamaciones.cs`. Comprobar en el historial de EF (`__EFMigrationsHistory`) que las migraciones anteriores ya están registradas y que esta aún no está aplicada. Si falta ese historial o hay divergencias, detenerse: `database update` también aplicaría migraciones anteriores pendientes, no solo esta tabla.
2. Preparar en el shell privado `JWT_SECRET` y `DATABASE_URL_UNPOOLED` con la conexión directa de Neon. No copiar valores a esta guía, al chat ni a comandos versionados. La API prioriza `DATABASE_URL`: para esta operación debe apuntar también a la conexión directa.
3. Ejecutar manualmente el comando siguiente. **Escribe en Neon**; está documentado aquí, no ejecutado por este trabajo:

```sh
export DOTNET_ROOT="$HOME/.dotnet"
export PATH="$DOTNET_ROOT:$PATH"
export DATABASE_URL="$DATABASE_URL_UNPOOLED"
hive/tools/dotnet-ef/dotnet-ef database update 20261006133334_LibroReclamaciones \
  --project apps/api/ReservaFacil.Api.csproj
```

La herramienta de esa ruta es local del hive (no está versionada); requiere SDK .NET 10 y dotnet-ef 10.0.11. Si no existe en la máquina de despliegue, preparar la misma versión de la herramienta antes del paso. Confirmar después la entrada de la migración y la tabla `Reclamo`; devolver `DATABASE_URL` de Render a la conexión pooled de runtime. No usar `prisma migrate`, `db push`, seed ni un bundle que no haya sido revisado. [Aplicación de migraciones de EF Core](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying).

## Checklist final

- [ ] Vercel usa Root Directory `apps/web`, framework Next.js, rama `main` y deployment nuevo con las variables finales.
- [ ] Render usa el Dockerfile raíz y sus variables .NET; los secretos JWT coinciden entre plataformas.
- [ ] `https://<SERVICIO_API>.onrender.com/healthz` devuelve 200 y `{ "ok": true }`. Este endpoint confirma que la API está disponible; no comprueba tablas ni conexión a Neon.
- [ ] Borrar cookies antiguas de `reservaya.site` y volver a entrar después del cambio de secreto/configuración.
- [ ] Probar `https://reservaya.site/`, `/login` y `/canchas`; la web actual carga y las consultas llegan a la API correcta.
- [ ] Probar login/logout, acceso por rol, Google y correo de recuperación; revisar que el callback vuelve a `reservaya.site` y que las cookies se conservan.
- [ ] Confirmar que la migración está aplicada antes de probar el Libro de reclamaciones en producción.
- [ ] Revisar `/uploads/*`, sitemap, redirects y logs del deployment final. Validar producción antes de retirar servicios anteriores.

Para volver atrás, conservar la referencia del deployment y la configuración previos. Restaurar web/API/configuración si fallan las pruebas; no revertir la base automáticamente. Las comprobaciones del repositorio no verifican las cuentas de Vercel/Render, el DNS ni la entrega real de email.
