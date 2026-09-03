# Despliegue

## Componentes

En producción se recomienda publicar:

1. `dist/` de Astro detrás de Nginx.
2. Next.js como servicio independiente mientras termina la migración.
3. ASP.NET Core detrás de Nginx o un reverse proxy administrado.
4. PostgreSQL en Neon, sin modificar migraciones desde el frontend.

## Variables de producción

Configurar en el entorno de compilación:

```text
PUBLIC_RESERVAYA_API_URL=https://api.example.com
PUBLIC_RESERVAYA_APP_URL=https://app.example.com
```

La API debe permitir mediante CORS los orígenes reales de Astro y Next.js.
También deben revisarse `Secure`, `SameSite` y el dominio de la cookie JWT
cuando los servicios usen dominios distintos.

El archivo `deploy/nginx-https.conf` es una referencia inicial. Antes de
usarlo, sustituir dominios de ejemplo, certificados y upstreams por los valores
del servidor real.
