# Arquitectura de ReservaYa

## Objetivo

Astro es la aplicación web pública de ReservaYa. Presenta la marca, ayuda a los
usuarios a encontrar canchas y consume la API mediante HTTP. La lógica de
negocio y el acceso a datos no viven en Astro.

```text
Usuario
  ↓
Astro (sitio público)
  ↓ HTTP + cookies
ASP.NET Core API :5000
  ↓
EF Core / Npgsql
  ↓
PostgreSQL administrado por Neon
```

Durante la transición, Next.js conserva los dashboards que todavía no se han
migrado a Astro. Ambos frontends consumen la misma API.

## Responsabilidad de cada carpeta

- `src/pages`: composición de páginas y rutas Astro.
- `src/components`: componentes visuales reutilizables.
- `src/features`: módulos de negocio que agrupan UI, servicios y tipos.
- `src/services`: clientes HTTP; nunca consultar Prisma o PostgreSQL desde el
  navegador.
- `src/config`: lectura y validación de variables `PUBLIC_*`.
- `src/types`: contratos TypeScript compartidos por el frontend.
- `src/hooks`: comportamiento reutilizable del cliente cuando sea necesario.
- `src/layouts`: shell global, navegación y footer.
- `src/styles`: Tailwind y estilos globales.
- `docs`: decisiones, API, desarrollo y despliegue.

Las capas nuevas se incorporan gradualmente. Las páginas existentes pueden
seguir usando componentes de `src/components` hasta completar la migración.

## Flujo de autenticación

1. Astro envía las credenciales a `POST /api/auth/login`.
2. ASP.NET Core establece la cookie HttpOnly.
3. Las solicitudes posteriores usan `credentials: "include"`.
4. La API autoriza cada operación y filtra los datos por usuario.
5. Astro nunca guarda el JWT en `localStorage` ni expone contraseñas.
