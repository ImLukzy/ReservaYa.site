# Documentación de ReservaYa

Esta carpeta concentra la documentación técnica del frontend Astro:

- [Arquitectura](./architecture.md): responsabilidades y límites entre Astro,
  Next.js y ASP.NET Core.
- [API](./api.md): variables, endpoints y códigos de error.
- [Desarrollo](./development.md): instalación, ejecución y validación local.
- [Despliegue](./deployment.md): publicación estática, reverse proxy y cookies.

## Estructura objetivo

```text
src/
├── assets/       # imágenes, fuentes y recursos importados
├── components/   # UI reutilizable
├── config/       # configuración pública validada
├── features/     # módulos por dominio (auth, dashboard, reservas)
├── hooks/        # comportamiento reutilizable del cliente
├── layouts/      # shell, navegación y footer
├── pages/        # rutas Astro
├── services/     # clientes HTTP
├── store/        # estado global, si el crecimiento lo requiere
├── styles/       # Tailwind y estilos globales
├── types/        # contratos TypeScript
└── utils/        # funciones puras
```

Astro conserva `src/pages` como convención de routing. La reorganización de
componentes se hará por módulo cuando cada dashboard se migre, evitando
movimientos masivos que rompan rutas existentes.
