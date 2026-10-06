# Despliegue

La guía paso a paso (Cloudflare Pages para esta landing, Vercel para el panel,
Render para la API, Neon) está en [`DEPLOY_GRATIS.md`](../../DEPLOY_GRATIS.md).

## Lo propio de Astro
- Build estático: `npm run build` → publicar `dist/`.
- Variables `PUBLIC_*` ([api.md](./api.md)) con las URLs públicas reales **al compilar**; cambiarlas exige un build nuevo.
- La API debe permitir por CORS el origen de la landing y el del panel (`FRONTEND_ORIGIN` en la API).
- Si landing, panel y API están en dominios distintos, la cookie `token` necesita `SameSite=None; Secure` (`COOKIE_SECURE`).
