# Plan de despliegue gratuito (desde cero) — ReservaYa

**Arquitectura:** API .NET 10 en **Render** (Docker, plan free) · Panel Next.js 16 en **Vercel** (Hobby) · Landing Astro 5 estática en **Cloudflare Pages** · BD **Neon** y email **Resend**, ya configurados (no se mueven).
**Rama a desplegar:** `main` (sincronizada con `origin/main`).
**Sustituye a** `DEPLOY_GRATIS.md`: su tabla de Vercel incluye variables que el panel no lee (`FRONTEND_ORIGIN`, `COOKIE_SECURE`).

> ⚠️ Ningún secreto va al repo. Donde pone `<…>` se pega el valor desde el dashboard correspondiente (Neon, Resend, Render). El resto de los valores son exactos.

```
Navegador ──► Landing (Cloudflare Pages, estática) ──fetch directo, credentials──► API (Render)
Navegador ──► Panel (Vercel) ──rewrite /api/* y /uploads/* (BACKEND_URL)───────────► API (Render) ──► Neon
                                                                              API ──► Resend (HTTPS)
```

---

## 0. Antes de empezar (5 min)
1. **Borra los servicios rotos** (manual, en los dashboards): el servicio `reservaya-api` de Render, el proyecto del panel en Vercel y el de la landing en Pages. **No** toques Neon ni Resend.
2. **Elige ya los nombres de proyecto:** la URL sale de ellos y sirve para rellenar todas las variables en la primera pasada.

   | Servicio | Nombre sugerido | URL resultante (confírmala tras crear) |
   |---|---|---|
   | Render | `reservaya-api` | `https://reservaya-api.onrender.com` (si el nombre está ocupado, Render añade un sufijo: `reservaya-api-xxxx`) |
   | Vercel | `reservaya-panel` | `https://reservaya-panel.vercel.app` |
   | Cloudflare Pages | `reservaya` | `https://reservaya.pages.dev` |

   En adelante: `API_URL`, `PANEL_URL` y `LANDING_URL` = esas URLs, **sin barra final**.
3. **Ten a mano:**
   - La cadena de conexión de Neon (proyecto **prod**). En Connection Details: Branch `main` · **Pooled connection: OFF** (direct) · formato URL.
   - La API key de Resend y el remitente del dominio verificado. Si no lo tienes, créalos en Resend: Domains → registros DNS → Verified.

---

## 1. Backend en Render (API .NET 10)
1. Render → **New → Blueprint** → repo `ImLukzy/ReservaYa` → rama `main` → **Apply**. Lee `render.yaml`: Docker (`./Dockerfile` en la raíz), plan free, health `/healthz`.
2. En el servicio `reservaya-api` → **Environment**, deja exactamente esto:

| Key | Value |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `COOKIE_SECURE` | `true` |
| `DATABASE_URL` | `<cadena DIRECT de Neon prod, p. ej. postgresql://USUARIO:CLAVE@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require>` |
| `JWT_SECRET` | `<el que generó Render (generateValue) o uno propio de ≥ 32 caracteres: openssl rand -base64 48>`. **Cópialo: Vercel necesita el mismo** |
| `FRONTEND_ORIGIN` | `https://reservaya-panel.vercel.app,https://reservaya.pages.dev` (provisional; se confirma en el §4) |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | `<API key de Resend, empieza por re_>` |
| `EMAIL_FROM` | `ReservaYa <no-reply@TU-DOMINIO-VERIFICADO>` |
| `PASSWORD_RESET_URL` | `https://reservaya.pages.dev/reset-password` (`LANDING_URL` + `/reset-password`) |

- **No** definas `PORT` (lo inyecta Render; el `Dockerfile` ya escucha en `$PORT`) ni `DATABASE_URL_UNPOOLED`. **No** uses `localhost` en ninguna variable.
3. **Deploy.** Comprueba `API_URL/healthz` → `{"ok":true}`. El primer arranque tarda unos 60 s por el cold start del plan free.
4. En los logs debe aparecer `Email de recuperación de contraseña: resend`. Si pone `desactivado (…)`, falta o es inválida alguna de las 4 variables de email.

---

## 2. Panel Next.js en Vercel
1. Vercel → **Add New → Project** → importa `ImLukzy/ReservaYa`.
2. Configuración del proyecto:

| Campo | Valor |
|---|---|
| Project Name | `reservaya-panel` |
| Framework Preset | Next.js |
| **Root Directory** | `reservaya-nextjs-api` |
| Build Command | `npm run build` (por defecto) |
| Install Command | `npm install` (por defecto; el `postinstall` ejecuta `prisma generate`, que no necesita la BD) |
| Output Directory | por defecto (`.next`) |
| Node.js Version | 22.x |
| Production Branch | `main` |

3. **Environment Variables** (Production y, si usas previews, también Preview):

| Key | Value | Nota |
|---|---|---|
| `BACKEND_URL` | `https://reservaya-api.onrender.com` (`API_URL`) | Lo usan los rewrites `/api/*` y `/uploads/*` (**se fija al compilar**) y el `serverFetch` |
| `JWT_SECRET` | `<exactamente el mismo que en Render>` | `proxy.ts` verifica la firma de la cookie `token` |
| `NEXT_PUBLIC_PUBLIC_APP_URL` | `https://reservaya.pages.dev` (`LANDING_URL`) | Enlaces del panel hacia la landing (inicio, «¿Olvidaste tu contraseña?»). Se fija al compilar |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `<51 + tu número, solo dígitos>` | Opcional. Si falta, no se muestra ningún botón de WhatsApp (spec 19). Se fija al compilar |

- **No hace falta:** `NEXT_PUBLIC_API_URL` (el código no la lee; todo va por `BACKEND_URL`), `FRONTEND_ORIGIN`, `COOKIE_SECURE` ni `DATABASE_URL`, que solo usan `db:check` y `prisma.config.ts`, no el runtime.
4. **Deploy.** Comprueba: `PANEL_URL/login` carga, y un login incorrecto responde «Credenciales inválidas» (es un 401 de la API a través del rewrite).
5. Si cambias `BACKEND_URL` o `NEXT_PUBLIC_*`, haz **Redeploy**: se fijan al compilar.

---

## 3. Landing Astro en Cloudflare Pages
1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → `ImLukzy/ReservaYa`.
2. Configuración del build:

| Campo | Valor |
|---|---|
| Project name | `reservaya` |
| Production branch | `main` |
| Framework preset | Astro |
| **Root directory (advanced)** | `reservaya-frontend-astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |

3. **Environment variables** (Production). Todas se fijan al compilar: si cambias alguna, hay que hacer **Retry deployment**.

| Key | Value | Nota |
|---|---|---|
| `NODE_VERSION` | `22` | Node del build |
| `PUBLIC_RESERVAYA_API_URL` | `https://reservaya-api.onrender.com` (`API_URL`) | Login, registro, canchas, recuperación de contraseña… |
| `PUBLIC_RESERVAYA_APP_URL` | `https://reservaya-panel.vercel.app` (`PANEL_URL`) | Destino tras el login y enlaces al panel |
| `PUBLIC_GA_ID` | `<G-XXXXXXX>` | Opcional. Vacío = sin Google Analytics (en `/reset-password` nunca se carga) |
| `PUBLIC_INBOXMEJIKAI_ENDPOINT` | `<URL del inbox>` | Opcional. Vacío = sin formulario de contacto |

4. **Deploy.** Comprueba `LANDING_URL/`, `/canchas` (lista desde la API) y `/forgot-password`.

---

## 4. Estrategia CORS (`FRONTEND_ORIGIN` en Render)
- **Qué es:** la lista de orígenes que pueden llamar a la API **con credenciales**. Se leen al arrancar (`Program.cs`: `WithOrigins(...)`, `.AllowCredentials()`). Solo hace falta de verdad para la **landing**, que llama directo a la API; el panel pasa por el rewrite, que es del lado del servidor.
- **Formato exacto:** orígenes `https://host`, **sin barra final ni ruta**, separados por comas: `https://reservaya-panel.vercel.app,https://reservaya.pages.dev`.
- **Cuándo actualizarla:**
  1. En el §1 va con las URLs **previstas** (paso 0.2).
  2. Cuando Vercel y Pages te den sus URLs **definitivas** (Settings → Domains), compáralas con las previstas. Si difieren (sufijo, dominio propio), corrige en Render: `FRONTEND_ORIGIN`, **y también** `PASSWORD_RESET_URL`. Guardar → Render redeploya solo.
  3. Si cambió `PANEL_URL` o `LANDING_URL`, corrige también `PUBLIC_RESERVAYA_APP_URL` (Pages) y `NEXT_PUBLIC_PUBLIC_APP_URL` (Vercel), y **redeploya** los dos.
  4. Con un **dominio propio** (p. ej. `reservaya.pe` y `app.reservaya.pe`), añade esos orígenes y repite los puntos 2 y 3.
- **Previews:** las URLs de preview (`<hash>.reservaya.pages.dev`, `reservaya-panel-git-…vercel.app`) **no** están en la lista. Para probar previews, añade su origen concreto de forma temporal.
- **Verificación** (desde tu terminal):
  ```
  curl -s -D - -o /dev/null -X OPTIONS https://reservaya-api.onrender.com/api/auth/login -H "Origin: https://reservaya.pages.dev" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
  ```
  Deben aparecer `Access-Control-Allow-Origin: https://reservaya.pages.dev` y `Access-Control-Allow-Credentials: true`.

---

## 5. Orden y checklist final
1. [ ] §0: borrar los servicios rotos y fijar los nombres/URLs.
2. [ ] §1 Render → `/healthz` OK y log «Email…: resend».
3. [ ] §2 Vercel → `/login` del panel responde.
4. [ ] §3 Pages → `/canchas` carga datos.
5. [ ] §4: `FRONTEND_ORIGIN`, `PASSWORD_RESET_URL` y las URLs cruzadas coinciden con las definitivas, y el `curl` de CORS da OK.
6. [ ] Humo:
   - Login en el panel.
   - Registro y login en la landing.
   - `/forgot-password` → llega el correo → `/reset-password` → login con la nueva contraseña.
   - Un dueño ve `/admin`.

## 6. Limitaciones conocidas del plan gratuito (no bloquean el despliegue)
- **Cold start de Render free:** se duerme tras 15 min sin tráfico; la primera petición tarda ~1 min. La cola de emails y el rate-limit están en memoria y se reinician al dormir.
- **Uploads efímeros:** `wwwroot/uploads` (fotos de canchas y perfiles) se pierde en cada redeploy o reinicio de Render. Para producción real, almacenamiento de objetos (spec aparte).
- **Sesión entre dominios distintos:**
  - La landing (`pages.dev`) guarda la cookie `token` en el dominio de la API (`onrender.com`) como cookie de terceros (`SameSite=None; Secure` por `COOKIE_SECURE=true`). Safari y Firefox la bloquean por defecto.
  - El panel (`vercel.app`) tiene **su propia** cookie (vía rewrite). Tras entrar en la landing, el panel pide login otra vez.
  - Arreglo recomendado (spec aparte, con código): dominio propio con subdominios (`reservaya.pe`, `app.`, `api.`) y cookie con `Domain` compartido.
- **SEO:** `astro.config.mjs` tiene `site: "https://reservaya.com"`, así que las URLs canónicas y OG apuntan ahí. Ajústalo (cambio de código) cuando haya dominio definitivo.
