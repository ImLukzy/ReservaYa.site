# Integración con la API

## Variables

Copiar `.env.example` como `.env` en desarrollo. El archivo `.env` real no se
versiona y nunca debe aparecer en logs, capturas o documentación.

| Variable | Uso | Ejemplo local |
| --- | --- | --- |
| `PUBLIC_RESERVAYA_API_URL` | URL base de ASP.NET Core | `http://localhost:5000` |
| `PUBLIC_RESERVAYA_APP_URL` | URL del panel Next.js durante la transición | `http://localhost:3000` |
| `PUBLIC_GA_ID` | ID opcional de Analytics | vacío |

## Endpoints usados por Astro

| Método | Ruta | Sesión | Uso |
| --- | --- | --- | --- |
| `GET` | `/api/canchas?activas=true` | No | Listar canchas disponibles |
| `POST` | `/api/auth/login` | No | Iniciar sesión |
| `POST` | `/api/auth/register` | No | Crear cuenta |
| `GET` | `/api/reservas` | Sí | Consultar reservas del usuario |
| `POST` | `/api/reservas` | Sí | Crear solicitud pendiente |
| `PATCH` | `/api/reservas/{id}` | Sí | Cancelar una solicitud pendiente |

## Errores esperados

- `400`: datos incompletos, fecha u horario inválido.
- `401`: no hay una sesión válida; redirigir a login.
- `403`: la cuenta no tiene permisos para la operación.
- `409`: el horario ya fue confirmado por otra reserva.

El backend es la fuente de verdad para disponibilidad, estados, totales y
permisos. El cálculo visual del total en Astro es únicamente una estimación.
