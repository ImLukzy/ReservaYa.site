# Reporte final de integración — ReservaYa

**Fecha:** 2026-09-26 · **Rama:** `main` = `origin/main` en `26865f8` (0 commits por delante y 0 por detrás; push de 27 commits desde `e065f5f`). Este reporte se subió después, en su propio commit.

## Frontend
- **Landing Astro:** `astro check` 0 errores; build de 22 páginas; 0 px de scroll horizontal a 375 px en las páginas verificadas.
- **Specs de UI/accesibilidad:**
  - Spec 10: títulos legibles sobre fondos oscuros.
  - Spec 11: hero con imágenes AVIF/WebP (de 1918 KB a 65 KB en móvil) y carrusel accesible.
  - Spec 12: iconos y flechas de enlaces y botones con el mismo color que el control.
  - Spec 13: contraste AA de los botones verdes, texto #060C08.
- **Panel Next 16:** `typecheck` 0, `lint` 0 errores (2 warnings que ya existían), `test` 21/21, `build` OK. Contraste AA de los botones verdes (spec 14): 0 textos sobre verde por debajo de 4.5:1 en 72 vistas y los 4 roles.
- **Recuperación de contraseña:** páginas `/forgot-password` (sin falsos éxitos) y `/reset-password`, y enlace en el login del panel.
- **Género:** retirado del registro, del perfil del jugador y del panel (spec 16).

## Backend (.NET 10)
- `dotnet build`: 0 errores, 0 warnings.
- Nuevos `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`. El token no se guarda en BD (va firmado con HMAC), vence a los 30 min, sirve una sola vez y al usarlo cierra todas las sesiones (`TokenVersion++`). El correo sale por Resend a través de una cola en segundo plano.
- Cero migraciones en todo el trabajo: `db:check` OK, 0 migraciones pendientes.
- Variables nuevas: `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` y `PASSWORD_RESET_URL`. Ya están en `render.yaml`, `.env.example` y `DEPLOY_GRATIS.md`.

## Bloqueos resueltos
- **BLOQUEO-API #1, recuperar contraseña (spec 15):** contrato de la API 16/16, UI 18/18 y envío real por Resend aceptado.
- **BLOQUEO-API #2, género sin guardar (spec 16, opción A):** campo retirado, sin migración; 10/10 comprobaciones.
- No queda ningún `BLOQUEO-API` abierto en `PLAN_OTRO_AGENTE.md`.

## Pendiente (fuera del plan)
- **Producción:** configurar en Render las 4 variables de email y verificar el dominio remitente en Resend. En local, reiniciar `npm run dev:api` para que la API exponga los endpoints nuevos.
- **Candidata a spec 17:** el perfil del panel (`ConfigPanel`) guarda datos personales en `localStorage` y muestra un mensaje falso tras un 400.
- **Contraste pendiente:** `--text-soft` sobre fondo claro (3.16:1); texto verde sobre fondo claro; botones naranja con texto blanco.
- **Copy y funcionalidad:** textos «todo el Perú» y distritos de Lima; búsqueda desde el hero; borrar `src/assets/images/*.jpg` (~20 MB sin uso).
- **Limpieza:** las cuentas de prueba `qa.*@example.com` y `delivered@resend.dev` siguen en la BD de desarrollo (listadas en el §7 de las specs 15 y 16). `origin/agents/frontend-nextjs-ui` quedó por detrás de `main`.
