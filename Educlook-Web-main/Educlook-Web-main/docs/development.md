# Guía de desarrollo

## Requisitos

- Node.js compatible con la versión declarada en `package.json`.
- API ASP.NET Core ejecutándose en `http://localhost:5000`.
- Next.js ejecutándose en `http://localhost:3000` para las áreas aún no migradas.

## Instalación y ejecución

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Astro queda disponible en `http://localhost:4321`.

## Validación

Antes de abrir un cambio:

```powershell
npm run build
```

El build genera `dist/`, que es un artefacto local y no se versiona.

## Convenciones

- Mantener la lógica de negocio en ASP.NET Core.
- Usar TypeScript estricto y evitar `any`.
- No incluir secretos en el repositorio.
- Reutilizar componentes y servicios antes de duplicar lógica.
- Usar nombres de dominio de ReservaYa.
- Documentar cambios de arquitectura en `docs/`.
