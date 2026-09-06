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

En otra terminal, desde la raíz del repositorio, inicia la API:

```powershell
npm run dev:api
```

ASP.NET Core queda disponible en `http://localhost:5000`. Ambos procesos deben
estar ejecutándose para que funcionen el inicio de sesión y las reservas.

Para iniciar los tres servicios en procesos independientes y evitar que se
detengan al cerrar la terminal que lanzó el comando:

```powershell
npm run dev:all
```

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
