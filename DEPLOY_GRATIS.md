# Despliegue gratuito de ReservaYa ($0)

Arquitectura: **Vercel** (panel Next) + **Cloudflare Pages** (landing Astro) +
**Render free** (API .NET) + **Neon** (Postgres prod, proyecto aparte del dev).

> ⚠️ El repo remoto (`origin/main`) va por delante del local y el otro agente
> tiene PRs abiertas (incluye renombre a "CanchasGO"). Para desplegar ESTE
> trabajo, sube la rama `agents/frontend-nextjs-ui` y úsala como fuente en
> Vercel/Pages/Render, o mézclala a `main` primero.

## 0. GitHub: dar acceso a la terminal (una vez)

El push está bloqueado por autenticación. Elige una opción:

```powershell
# Opción A (fácil): instala gh y entra con el navegador
winget install --id GitHub.cli
gh auth login
# Opción B: crea un token clásico con scope "repo" en
# https://github.com/settings/tokens y úsalo como contraseña del push
```

Luego:

```powershell
git push -u origin agents/frontend-nextjs-ui
```

## 1. Neon: base de datos de producción (5 min)

1. En https://neon.tech crea el proyecto **`reservaya-prod`** (nuevo, vacío).
2. Copia sus connection strings (**pooled** y **direct**).
3. Desde tu PC, con la terminal en la raíz del repo:

```powershell
# 1) Migraciones (usa la URL pooled)
$env:DATABASE_URL = "postgresql://...pooler.../reservaya-prod?sslmode=require"
dotnet ef database update --project reservaya-nextjs-api/backend/ReservaFacil.Api/ReservaFacil.Api.csproj

# 2) Seed UNA SOLA VEZ (crea superadmin/admin/usuario/tecnico + demo).
#    ¡Nunca apuntes esto a la DB de desarrollo!
$env:ALLOW_PROD_SEED = "true"
$env:SEED_SUPERADMIN_PASSWORD = "clave-larga-superadmin"
$env:SEED_ADMIN_PASSWORD = "clave-larga-admin"
$env:SEED_USUARIO_PASSWORD = "clave-larga-usuario"
$env:SEED_TECNICO_PASSWORD = "clave-larga-tecnico"
npm --prefix reservaya-nextjs-api run seed
```

Guarda esas 4 claves: son tus logins de producción.

## 2. Render: API .NET (10 min)

1. Entra a https://render.com (Sign up con GitHub, sin tarjeta).
2. **New → Blueprint** → repo `ImLukzy/ReservaYa` → Apply (lee `render.yaml`).
3. Completa las variables del servicio `reservaya-api`:
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | URL **direct** de `reservaya-prod` + `?sslmode=require` |
   | `JWT_SECRET` | genera una con `openssl rand -base64 48` (**la misma** va a Vercel) |
   | `FRONTEND_ORIGIN` | `https://TU-PANEL.vercel.app,https://TU-LANDING.pages.dev` (se ajusta en el paso 5) |
4. Deploy. Anota la URL: `https://reservaya-api-xxxx.onrender.com`.
5. Prueba: `https://.../healthz` → `{"ok":true}` (la primera tarda ~1 min: cold start).

## 3. Vercel: panel Next.js (10 min)

1. https://vercel.com → Add New → Project → importa `ImLukzy/ReservaYa`.
2. **Root Directory:** `reservaya-nextjs-api`. Framework: Next.js (auto).
3. Variables (todas en Production):
   | Variable | Valor |
   |---|---|
   | `BACKEND_URL` | `https://reservaya-api-xxxx.onrender.com` |
   | `JWT_SECRET` | **el mismo** que en Render |
   | `DATABASE_URL` | URL pooled de prod (respaldo para tooling) |
   | `FRONTEND_ORIGIN` | igual que en Render |
   | `NEXT_PUBLIC_PUBLIC_APP_URL` | `https://TU-LANDING.pages.dev` |
   | `COOKIE_SECURE` | `true` |
4. Deploy. Anota `https://TU-PANEL.vercel.app`.

## 4. Cloudflare Pages: landing Astro (10 min)

1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → conecta el repo.
2. **Root:** `reservaya-frontend-astro`. Build: `npm run build`. Output: `dist`.
3. Variables (Production):
   | Variable | Valor |
   |---|---|
   | `PUBLIC_RESERVAYA_API_URL` | `https://reservaya-api-xxxx.onrender.com` |
   | `PUBLIC_RESERVAYA_APP_URL` | `https://TU-PANEL.vercel.app` |
4. Deploy. Anota `https://TU-LANDING.pages.dev`.

## 5. Cierre del círculo

1. Vuelve a Render → `reservaya-api` → Environment: pon en `FRONTEND_ORIGIN`
   las dos URLs reales (`https://TU-PANEL.vercel.app,https://TU-LANDING.pages.dev`)
   → Save (redeploy automático).
2. Smoke test: entra al landing → Iniciar sesión (superadmin prod) → te lleva al
   panel → `/admin/complejos` → crea tu primer local real.
3. (Opcional) https://uptimerobot.com: monitor HTTP cada 15 min a `.../healthz`
   para que Render no se duerma entre visitas. Consume las 750 h/mes gratis
   (alcanza para 1 servicio).

## Límites conocidos del plan $0

- **Render duerme** la API a los 15 min sin tráfico; despertar tarda ~1 min.
- **Uploads efímeros**: fotos de perfil/canchas en `/uploads` se pierden cuando
  Render reinicia o duerme (sin discos en free). Siguiente paso: Cloudflare R2.
- **Vercel Hobby**: solo uso personal no comercial.
- Los JWT los firman API y Vercel con el **mismo** `JWT_SECRET`: si difieren,
  el panel te saca a `/login` en bucle.
