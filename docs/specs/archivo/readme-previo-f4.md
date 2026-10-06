# ReservaYa

Plataforma web para descubrir canchas deportivas y gestionar reservas. El
proyecto **ReservaYa** separa la
experiencia pública, los paneles operativos y la API central.

## Objetivo

Ofrecer una experiencia rápida y segura para:

- Consultar canchas deportivas disponibles.
- Registrar usuarios e iniciar sesión.
- Solicitar, consultar y cancelar reservas.
- Administrar canchas y reservas desde un panel B2B.
- Consultar reportes globales con permisos de superadministrador.

## Arquitectura

```text
Astro (B2C público :4321)
          │ HTTP + cookies
          ▼
ASP.NET Core Web API (:5000)
          │ EF Core / Npgsql
          ▼
PostgreSQL (Neon)

Next.js (panel B2B :3000)
          └──────────────► ASP.NET Core Web API
```

### Aplicaciones

- `reservaya-frontend-astro/`: sitio público estático y flujos B2C.
- `reservaya-nextjs-api/`: paneles Next.js, cliente de API y Prisma para
  operaciones de datos/migraciones.
- `reservaya-nextjs-api/backend/ReservaFacil.Api/`: API ASP.NET Core,
  autenticación JWT, autorización por roles y reglas de reservas.

## Stack tecnológico

### Frontend

- Astro 5
- Next.js 16
- React 19
- TypeScript estricto
- Tailwind CSS 4

### Backend y datos

- ASP.NET Core 10
- Entity Framework Core 10
- Npgsql
- PostgreSQL
- Prisma 6 para el panel y migraciones
- JWT con cookies HttpOnly
- BCrypt para contraseñas

## Roles y seguridad

- `USUARIO`: consulta canchas y administra sus propias reservas.
- `ADMIN`: gestiona canchas y reservas operativas.
- `SUPERADMIN`: administra usuarios y accede a reportes globales.

La autorización se aplica en tres niveles: proxy/layouts de Next.js,
controladores ASP.NET Core y validación de sesión mediante `tokenVersion`.
Nunca deben almacenarse tokens en `localStorage` ni publicarse secretos.

## URLs locales

| Servicio | URL |
|---|---|
| Sitio Astro | http://localhost:4321 |
| Panel Next.js | http://localhost:3000 |
| API ASP.NET Core | http://localhost:5000 |

## Instalación local

Requisitos: Node.js, .NET SDK 10 y PostgreSQL/Neon configurado.

### Sitio público Astro

```powershell
cd reservaya-frontend-astro
npm install
Copy-Item .env.example .env
npm run dev
```

Variables principales:

```text
PUBLIC_RESERVAYA_API_URL=http://localhost:5000
PUBLIC_RESERVAYA_APP_URL=http://localhost:3000
PUBLIC_GA_ID=
```

### Panel Next.js

```powershell
cd reservaya-nextjs-api
npm install
Copy-Item .env.example .env
npm run dev
```

Configura `JWT_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED` y las variables
de origen/API indicadas en `.env.example`.

### API .NET

```powershell
cd reservaya-nextjs-api/backend/ReservaFacil.Api
dotnet run
```

La API carga su configuración desde el entorno y/o el archivo `.env` del
proyecto `reservaya-nextjs-api`. No subas credenciales reales al repositorio.

## Rutas principales

### Astro B2C

`/`, `/canchas/`, `/login/`, `/register/`, `/mis-reservas/`,
`/forgot-password/`, `/ayuda/`, `/legal/privacy/`, `/legal/terms/`

### Next.js B2B

`/dashboard`, `/dashboard/canchas`, `/dashboard/reservas`,
`/dashboard/mi-partido`, `/admin`, `/admin/canchas`, `/admin/reservas`,
`/superadmin`, `/superadmin/canchas`, `/superadmin/usuarios`,
`/superadmin/reportes`

### API

- `/api/auth`: login, registro, logout y sesión actual.
- `/api/canchas`: consulta y administración de canchas.
- `/api/reservas`: creación y gestión de reservas.
- `/api/usuarios`: administración de usuarios.
- `/api/reportes`: dashboards y reportes globales.

## Comandos de validación

```powershell
# Astro
cd reservaya-frontend-astro
npm run build

# Next.js
cd reservaya-nextjs-api
npm run lint
npm run build

# API
cd reservaya-nextjs-api/backend/ReservaFacil.Api
dotnet build
```

## Despliegue

El sitio Astro genera una salida estática en `dist/`, lista para servir con
Nginx. El panel Next.js y la API .NET deben desplegarse como servicios
independientes, con variables de entorno seguras, HTTPS, CORS restringido y
PostgreSQL administrado.

## Control de versiones

```powershell
git add .
git commit -m "Descripción clara del cambio"
git push
```

La rama principal del repositorio es `main`.

## Equipo

- Leonel Franz Portillo Castillo
- Antony Kevin Huayhua Chaco
- Lukas Antonio Melgar Casimiro
- Kelvin Alexis Pinto Quispe

Proyecto académico y profesional desarrollado en 2026.
