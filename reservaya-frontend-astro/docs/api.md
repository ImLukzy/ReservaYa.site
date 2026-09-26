# Integración con la API

## Variables (build-time, `.env` a partir de `.env.example`)
| Variable | Uso | Local |
|---|---|---|
| `PUBLIC_RESERVAYA_API_URL` | Base de la API ASP.NET Core | `http://localhost:5000` |
| `PUBLIC_RESERVAYA_APP_URL` | Base del panel Next.js | `http://localhost:3000` |
| `PUBLIC_GA_ID` | Google Analytics (opcional) | vacío |
| `PUBLIC_INBOXMEJIKAI_ENDPOINT` | Receptor de formularios de contacto/mejoras (opcional) | vacío |

Nunca `DATABASE_URL` ni secretos aquí: todo `PUBLIC_*` termina en el HTML.

## Endpoints usados por Astro
| M | Ruta | Sesión | Página |
|---|---|---|---|
| POST | `/api/auth/login` · `/api/auth/register` · `/api/auth/logout` | — | login, register, layout |
| GET | `/api/auth/me` | sí | layout, perfil, mejoras |
| POST | `/api/auth/forgot-password` | — | forgot-password — ⛔ **no implementado en la API** (404; la página muestra el mensaje genérico igualmente) |
| GET | `/api/canchas/disponibles` · `/api/canchas/opciones` | — | canchas |
| GET | `/api/resenas/publicas` | — | canchas |
| GET | `/api/reservas` | sí | perfil |
| PATCH | `/api/usuarios/me` | sí | perfil |
| POST | `/api/usuarios/me/foto` | sí | perfil (multipart) |
| GET | `/api/usuarios/buscar` | sí | sortear |
| GET / POST | `/api/partidos` | GET — / POST sí | completar-cuadro |
| GET | `/api/partidos/mios` | sí | mis-partidos |
| POST / DELETE | `/api/partidos/{id}/anotarse` | sí | completar-cuadro, mis-partidos |
| DELETE | `/api/partidos/{id}` | sí | mis-partidos |

## Errores
| Código | Significado | Qué hace la UI |
|---|---|---|
| 400 | Datos inválidos, fuera de horario | Mensaje `error` de la API |
| 401 | Sin sesión | Redirige a `/login?returnUrl=…` (perfil muestra aviso) |
| 403 | Sin permiso / otra sede | Mensaje `error` |
| 409 | Conflicto (horario tomado, username usado) | Mensaje `error` |
| 429 | Demasiados intentos de login | "Espera 15 minutos" |
