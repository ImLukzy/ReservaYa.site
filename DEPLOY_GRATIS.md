# Despliegue de ReservaYa

Web pública y panel Next en Vercel, API .NET en Render y BD existente en Neon. El traslado del repositorio no aplica cambios al esquema ni apaga servicios remotos.

## Web

En la plataforma web, usar `apps/web` como Root Directory, `npm ci` como instalación, `npm run build` y `npm run start`. Mantener el dominio canónico existente. Configurar `BACKEND_URL` con el origen HTTPS de la API y `JWT_SECRET` con el mismo secreto privado que usa la API; gestionar los valores en el panel de la plataforma, nunca en el repositorio.

`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT` y `NEXT_PUBLIC_WHATSAPP_NUMBER` son públicos y opcionales. API y navegación del navegador usan el origen de la web. Cambiar una variable pública requiere un build nuevo. No exponer `DATABASE_URL`, `BACKEND_URL` ni JWT al cliente.

## API

Render conserva `dockerContext: .`, `dockerfilePath: ./Dockerfile` y health check `/healthz` (ver `render.yaml`). Docker restaura/publica `apps/api/ReservaFacil.Api.csproj`; namespace y DLL siguen siendo ReservaFacil.Api. No ejecutar migraciones ni seed durante el despliegue.

Conservar `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` y la configuración de email vigente. El humano ajusta `FRONTEND_ORIGIN` al origen web único y `PASSWORD_RESET_URL` a `https://dominio-web/reset-password`; revisa `COOKIE_SECURE` según HTTPS y comprueba entrega de email y Google. La web proxya auth/cookies: revisar sus atributos con el origen final.

## Validación y retorno manual

Guardar referencia/configuración del despliegue anterior antes de cambiar dominio o DNS. Probar las 16 páginas públicas, 404, los cinco redirects 301, acceso por rol, login/registro/logout, Google y recuperación. Revisar SEO, sitemap, GA (sin solicitudes en reset-password), CLS y logs. Comprobar que los recursos públicos y `/uploads/*` responden.

El humano valida producción y tráfico antes de apagar el frontend antiguo. Si hay regresión, restaurar el deploy/DNS y la configuración anterior; la BD no se revierte ni modifica. La verificación local no confirma DNS, correo real ni configuración de cuentas externas.

Guías previas conservadas como historia en `docs/specs/archivo`; [spec 51](docs/specs/51-migracion-monorepo.md) detalla las verificaciones.
