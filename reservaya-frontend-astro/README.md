# ReservaYa Web

Frontend público de ReservaYa construido con Astro. Permite consultar
canchas, iniciar sesión, registrar usuarios y enviar solicitudes de reserva a
la API ASP.NET Core.

## Arquitectura

```text
Astro (sitio público)
        ↓ HTTP + cookies
ASP.NET Core Web API
        ↓ EF Core / Npgsql
PostgreSQL administrado por Neon
```

Next.js conserva temporalmente los dashboards que todavía están en migración.
Astro no consulta Prisma ni PostgreSQL directamente durante el runtime.

## Tecnologías

- Astro 5
- TypeScript estricto
- Tailwind CSS 4
- ASP.NET Core como backend
- EF Core y Npgsql en el backend
- PostgreSQL en Neon

## Requisitos

- Node.js compatible con `package.json`.
- API ejecutándose en `http://localhost:5000`.
- Next.js ejecutándose en `http://localhost:3000` para los paneles no migrados.

## Configuración local

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Astro se ejecuta en `http://localhost:4321`.

Variables principales:

```text
PUBLIC_RESERVAYA_API_URL=http://localhost:5000
PUBLIC_RESERVAYA_APP_URL=http://localhost:3000
PUBLIC_GA_ID=
```

No colocar contraseñas ni `DATABASE_URL` en este proyecto frontend. El archivo
`.env` real está ignorado por Git.

## Rutas públicas

- `/`: portada de ReservaYa.
- `/canchas`: canchas activas y formulario de solicitud.
- `/mis-reservas`: reservas del usuario autenticado.
- `/login`: inicio de sesión contra ASP.NET Core.
- `/register`: registro contra ASP.NET Core.
- `/ayuda`: guía de uso.

## Comandos

```powershell
npm run dev       # desarrollo local
npm run build     # compilación estática de producción
npm run preview   # previsualizar dist/
```

Antes de integrar cambios, ejecutar `npm run build`.

## Estructura objetivo

```text
src/
├── assets/       # imágenes, fuentes y recursos importados
├── components/   # componentes UI reutilizables
├── config/       # configuración pública validada
├── features/     # módulos por dominio: auth, dashboard, reservas
├── hooks/        # comportamiento reutilizable del cliente
├── layouts/      # shell, navegación y footer
├── pages/        # rutas Astro
├── services/     # clientes HTTP
├── store/        # estado global, si es necesario
├── styles/       # Tailwind y estilos globales
├── types/        # contratos TypeScript
└── utils/        # funciones puras
```

La migración a esta organización es gradual para no romper las rutas actuales.
Las decisiones y procedimientos están documentados en [docs/](./docs/).

## Seguridad

- Las sesiones usan cookies gestionadas por ASP.NET Core.
- Las peticiones autenticadas envían `credentials: "include"`.
- No almacenar JWT en `localStorage`.
- No exponer secretos en el frontend, logs o documentación.
- El backend valida permisos, disponibilidad, estados y totales.

## Documentación

- [Arquitectura](./docs/architecture.md)
- [API](./docs/api.md)
- [Desarrollo](./docs/development.md)
- [Despliegue](./docs/deployment.md)
