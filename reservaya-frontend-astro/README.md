# ReservaYa Web (Astro)

Landing pública de ReservaYa: marketing, búsqueda de canchas, login/registro y
área del jugador. Sitio estático (Astro 5 + Tailwind 4) que consume la API
ASP.NET Core con cookies; los paneles de dueño y plataforma viven en
`reservaya-nextjs-api/`.

```powershell
npm install
Copy-Item .env.example .env
npm run dev          # http://localhost:4321 (la API debe estar en :5000)
```

| Documento | Contenido |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | Estructura real de `src/`, rutas y flujo de sesión |
| [docs/development.md](./docs/development.md) | Comandos, validación y convenciones |
| [docs/api.md](./docs/api.md) | Variables `PUBLIC_*`, endpoints usados y errores |
| [docs/deployment.md](./docs/deployment.md) | Publicación estática, CORS y cookies |

Reglas de código de esta carpeta: [`docs/skills/astro-landing.md`](../docs/skills/astro-landing.md).
