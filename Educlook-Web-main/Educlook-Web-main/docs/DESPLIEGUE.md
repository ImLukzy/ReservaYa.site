# Despliegue

Guia de despliegue para entorno de produccion.

## Requisitos
- Node.js LTS
- Servidor con HTTPS
- Variables de entorno configuradas

## Build
1. `npm ci`
2. `npm run build`
3. Servir carpeta `dist/`

## Infraestructura
- Configuracion base en `deploy/nginx-https.conf`
- Guia en `deploy/HTTPS-SETUP.md`
