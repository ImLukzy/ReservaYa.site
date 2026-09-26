# Arquitectura

```text
Navegador ── Astro estático (:4321) ──HTTP + cookie HttpOnly──► API ASP.NET Core (:5000) ── EF Core ──► Neon Postgres
         └── Panel Next.js (:3000): /dashboard /admin /tecnico (mismo backend)
```

Astro no tiene lógica de negocio ni acceso a datos: todo sale de la API, que
decide disponibilidad, estados, totales y permisos.

## `src/` (estado vigente)
| Carpeta | Contenido |
|---|---|
| `pages/` | 22 rutas: 20 `.astro` + `legal/privacy.md` y `legal/terms.md` (tabla abajo) |
| `layouts/BaseLayout.astro` | Shell: header, barra rotativa, menú de sesión, SEO, GA. Login y registro viven solo en `/login` y `/register` (sin modales: spec 18) |
| `components/` | `Footer` |
| `scripts/` | `menu`, `motion`, `reveal`, `theme` (TS procesado por Vite). La rueda del ratón usa el scroll nativo: no interceptar `wheel` (spec 17) |
| `styles/` | `global.css`, `motion.css`, `tailwind.css` |
| `assets/hero/` | Fondos del hero (`astro:assets`, spec 11) |

## Rutas
| Ruta | Datos |
|---|---|
| `/` · `/duenos` · `/precios` · `/publica-tu-cancha` · `/torneos` · `/ayuda` · `/legal/privacy` · `/legal/terms` | Estáticas (demos interactivas sin API) |
| `/canchas` | `GET /api/canchas/disponibles`, `/api/canchas/opciones`, `/api/resenas/publicas` |
| `/login` · `/register` · `/forgot-password` | `POST /api/auth/*` (ver [api.md](./api.md)) |
| `/jugador/perfil` | `/api/auth/me`, `/api/reservas`, `PATCH /api/usuarios/me`, `POST /api/usuarios/me/foto` |
| `/mis-reservas` | Redirige al panel (`PUBLIC_RESERVAYA_APP_URL/dashboard/reservas`) |
| `/completar-cuadro` · `/mis-partidos` | `/api/partidos*` |
| `/sortear` | `GET /api/usuarios/buscar` |
| `/mejoras` · `/libro-reclamaciones` | Formularios → `PUBLIC_INBOXMEJIKAI_ENDPOINT` (`mejoras` además lee `/api/auth/me`) |
| `/404` · `/500` | Errores |

## Sesión
1. `POST /api/auth/login` o `register` → la API fija la cookie HttpOnly `token`.
2. Toda petición autenticada usa `credentials: "include"`; Astro nunca lee ni guarda el JWT.
3. Tras entrar se redirige a `returnUrl` validado (`getSafeReturnUrl` en `login.astro`) o al inicio del rol en el panel.
