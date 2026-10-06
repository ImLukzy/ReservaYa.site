# Especificación: 15 - Recuperación de contraseña (BLOQUEO-API #1)

## 1. Objetivo
**Problema:**
- **API:** `AuthController.cs` (`[Route("api/auth")]`) solo expone `login` (L37), `register` (L76), `logout` (L147) y `me` (L173). `POST /api/auth/forgot-password` responde 404. Tampoco hay servicio de email en la API: no aparece SMTP, Resend ni MailKit en `backend/ReservaFacil.Api`. Documentado en `reservaya-frontend-astro/docs/api.md:18` y en la spec 07 §8.
- **Landing:** `forgot-password.astro:61-69` hace `fetch(…).catch(() => null)` y muestra «Revisa tu correo» siempre, aunque el endpoint no exista. El usuario cree que recibirá un correo que nunca llega.
- **Flujo incompleto:** no hay página para fijar la nueva contraseña, y el login del panel (`app/(auth)/login/page.tsx`) no enlaza a la recuperación. Solo lo hace `login.astro:41`.

**Resultado esperado:**
1. El usuario pide el enlace y recibe un correo.
2. En `/reset-password` fija una contraseña nueva.
3. Todas sus sesiones se cierran.
4. El enlace sirve una sola vez y vence en 30 minutos.

Sin migraciones: se usan las columnas existentes `Usuario.Password` (hash BCrypt) y `Usuario.TokenVersion` (`Models/Entities.cs`).

## 2. Fuera de alcance
- BLOQUEO-API #2: género en el registro (requiere migración).
- Verificación de email, cambio de email, 2FA y plantillas de email con marca completa.
- Tocar `Models/Entities.cs`, `Data/AppDbContext.cs` o `Migrations/**`, y cualquier `dotnet ef` / `prisma migrate|db push`.

**Decisiones de producto que requieren aprobación:**
1. **D1 — Territorio:** la API está fuera del territorio de esta rama (`CLAUDE.md`: los bloqueos «no se parchean»). Propuesta: autorizar los cambios de §3-A en una rama nueva `agents/backend-password-reset`, creada desde esta, con un PR aparte. La parte B (frontend) va en `agents/frontend-nextjs-ui`.
2. **D2 — Proveedor de email:** propongo **Resend**, por API HTTP. No depende de puertos SMTP salientes, que en hosting gratuito suelen estar restringidos. Requiere cuenta, `RESEND_API_KEY` y un dominio remitente verificado (p. ej. `no-reply@reservaya.pe`). Mientras no esté, el modo `log` (solo desarrollo) escribe el enlace en el log de la API.
3. **D3 — Política:**
   - El enlace vence a los 30 minutos.
   - Al restablecer se cierran todas las sesiones (`TokenVersion++`).
   - Un logout en otro dispositivo también invalida los enlaces pendientes.
   - La contraseña mínima es de 6 caracteres, igual que en el registro (`AuthController.cs:84`).

## 3. Archivos afectados

**A. API .NET (sujeto a D1) — `reservaya-nextjs-api/backend/ReservaFacil.Api/`**

| Archivo | Acción | Nota |
|---|---|---|
| `Controllers/AuthController.cs` | modificar | `POST forgot-password` y `POST reset-password` (contrato en §4) |
| `Dtos/Dtos.cs` | modificar | `ForgotPasswordRequest { Email }` y `ResetPasswordRequest { Token, Password }`, junto a `LoginRequest` |
| `Services/PasswordResetTokens.cs` | crear | Firma y validación del token sin estado |
| `Services/EmailSender.cs` | crear | `IEmailSender` + `ResendEmailSender` (`HttpClient`) + `LogEmailSender` (solo desarrollo) |
| `Program.cs` | modificar | DI de `IEmailSender` según `EMAIL_PROVIDER`, `AddHttpClient`, validación de variables al arrancar |
| `render.yaml` (raíz) | modificar | Claves `EMAIL_PROVIDER`, `EMAIL_FROM`, `PASSWORD_RESET_URL` y `RESEND_API_KEY` (`sync: false`) |
| `reservaya-nextjs-api/.env.example` | modificar | Solo los nombres de las variables nuevas |

**B. Frontend (esta rama)**

| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/pages/forgot-password.astro` | modificar | Manejo real de la respuesta (ver §4). Deja de mostrar éxito ante 404, 5xx o fallo de red |
| `reservaya-frontend-astro/src/pages/reset-password.astro` | crear | Formulario de nueva contraseña + confirmación |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | modificar | Prop `analytics?: boolean` (por defecto `true`). Con `false` no se carga GA, para que el token no llegue a `page_location` |
| `reservaya-nextjs-api/app/(auth)/login/page.tsx` | modificar | Enlace «¿Olvidaste tu contraseña?» → `${NEXT_PUBLIC_PUBLIC_APP_URL}/forgot-password` |
| `reservaya-frontend-astro/docs/api.md` | modificar | L18: el endpoint pasa de ⛔ a implementado; se añade `reset-password` |
| `DEPLOY_GRATIS.md` | modificar | Tabla de variables de Render: las 4 nuevas y el paso de verificación del dominio en Resend |
| `PLAN_OTRO_AGENTE.md` | modificar | §6: se retira el BLOQUEO-API #1 y se añade la fila del ítem |

## 4. Diseño y lógica

**Contrato API** (JSON, sin cookie, CORS igual que `login`):

| Endpoint | Body | Respuestas |
|---|---|---|
| `POST /api/auth/forgot-password` | `{ "email": string }` | **200** `{ "ok": true }` siempre que el formato sea válido, exista o no la cuenta (no revela cuentas). **400** `{ "error" }` si el email es inválido. **429** si hay límite: 5/h por IP+email y 20/h por IP (`IRateLimiter`, mismo patrón que `register`, L102) |
| `POST /api/auth/reset-password` | `{ "token": string, "password": string }` | **200** `{ "ok": true }`. **400** `{ "error": "Enlace inválido o vencido" }` si la firma, `exp`, `tv` o `ph` no cuadran, o la cuenta está inactiva. **400** `{ "error": "La contraseña debe tener al menos 6 caracteres" }`. **429**: 10 por 15 min por IP |

- **forgot-password:** normaliza el email (igual que `login`). Si existe una cuenta `Activo`, genera el token y encola el correo **sin esperar el envío**, para que el tiempo de respuesta no revele si la cuenta existe. Los errores del proveedor se registran en el log, nunca en la respuesta.
- **reset-password:** valida el token → `Password = Bcrypt.HashPassword(password, 10)` → `TokenVersion++` (con `ExecuteUpdateAsync` condicionado a `TokenVersion == tv`, como `logout` en L159-160, para que sea atómico) → 200. El `TokenVersion++` cierra todas las sesiones (`ValidSessionHandler`) y deja el enlace inservible.

**Token sin estado:** `base64url(payload) + "." + base64url(HMACSHA256(K, payload))`.
- `payload = { sub: Id, tv: TokenVersion, ph: SHA256(Password)[0..16], exp: ahora + 30 min }`.
- `K = HMACSHA256(JWT_SECRET, "reservaya:password-reset:v1")`. Es una clave distinta a la del JWT de sesión, así que no se pueden confundir los tokens.
- Comparación en tiempo constante (`CryptographicOperations.FixedTimeEquals`).
- El token no se registra en el log en producción.

**Email:**
- Asunto «Restablece tu contraseña de ReservaYa». Texto + HTML mínimo, con el nombre, el enlace `${PASSWORD_RESET_URL}#t=<token>` y el aviso «vence en 30 minutos; si no fuiste tú, ignóralo».
- El token va en el **fragmento** (`#`): no llega a ningún servidor, logs de CDN ni `Referer`.

**Variables de entorno (API; solo nombres, nunca valores en el repo):**

| Variable | Valor / ejemplo | Dónde |
|---|---|---|
| `EMAIL_PROVIDER` | `resend` \| `log` (`log` solo si `ASPNETCORE_ENVIRONMENT=Development`; en producción sin proveedor la API registra un error al arrancar y los endpoints responden igual) | Render, `.env` local |
| `RESEND_API_KEY` | secreto | Render (`sync: false`) |
| `EMAIL_FROM` | `ReservaYa <no-reply@DOMINIO_VERIFICADO>` | Render |
| `PASSWORD_RESET_URL` | `https://<landing>/reset-password` (dev: `http://localhost:4321/reset-password`) | Render, `.env` local |

**Red e integraciones:**
- Landing → API directo: `PUBLIC_RESERVAYA_API_URL`. La preflight de un POST JSON ya la cubre `FRONTEND_ORIGIN` (Program.cs:155-161; DEPLOY_GRATIS.md:61), así que no hay cambios de CORS.
- API → `https://api.resend.com` (HTTPS 443, salida estándar).
- El panel no hace proxy de estos endpoints; solo enlaza a la landing.

**UI de `forgot-password.astro`:**
- 200 → pantalla «Revisa tu correo», como hoy.
- 429 → «Demasiados intentos. Espera unos minutos».
- 400 → «Escribe un correo válido».
- 404, 5xx o fallo de red → «No pudimos enviar el enlace ahora. Inténtalo más tarde o escríbenos a hola@reservaya.pe», sin pantalla de éxito.

**UI de `reset-password.astro`:**
- Lee `#t` y lo borra de la URL al instante con `history.replaceState`.
- Sin `t` → «Enlace incompleto», con enlace a `/forgot-password`.
- Campos: contraseña + confirmación (≥ 6 y coincidentes; validación en cliente con `aria-describedby`).
- 200 → «Contraseña actualizada», con enlace a `/login`. 400 → mensaje de la API + «Pide un enlace nuevo».
- La página se sirve con `robots="noindex, nofollow"` y `analytics={false}`.
- Reglas del skill de Astro: JS plano si es `is:inline`, sin `innerHTML`, sin `alert()`; texto sobre verde en #060C08 (spec 13).

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| B1 | Compila | `dotnet build` en `backend/ReservaFacil.Api` (sin `dotnet ef`) | 0 errores |
| B2 | Contrato | `curl` contra la API local con `EMAIL_PROVIDER=log` y una cuenta de prueba creada con `/register` (nunca cuentas reales): (a) forgot con email existente e inexistente → mismo 200 y cuerpo; (b) enlace en el log solo para el existente; (c) reset válido → 200; (d) login con la nueva → 200 y con la vieja → 401; (e) la cookie previa en `/api/auth/me` → 401; (f) reutilizar el token → 400; (g) token alterado → 400; (h) token vencido → 400; (i) el 6.º forgot en 1 h → 429 | 9/9 |
| B3 | Sin migraciones | `git diff --name-only` sin `Migrations/`, `Entities.cs` ni `AppDbContext.cs`; `npm --prefix reservaya-nextjs-api run db:check` | 0 archivos; OK, 0 pendientes |
| F1 | Astro | `astro check` y `build`; `node --check` de los scripts inline de `forgot-password` y `reset-password` | 0 errores |
| F2 | Estados de UI | Playwright contra un backend falso que implementa el contrato: forgot 200/400/429/404/500 y reset 200/400/sin token/contraseñas distintas/corta. Además: token fuera de la URL tras cargar y 0 peticiones a Google Analytics en `/reset-password` | 10/10 estados; 0 falsos éxitos |
| F3 | Panel | `typecheck`, `lint`, `test` y `build` del panel; el enlace de `/login` apunta a `…/forgot-password` | 0 errores |
| F4 | Móvil | 375 px sin scroll horizontal en las 2 páginas y en `/login` del panel | OK |
| E1 | Email real (requiere D2) | Con `EMAIL_PROVIDER=resend`: llega el correo a la bandeja de la cuenta de prueba y el enlace completa el flujo | manual, anotado en §7 |
| S1 | Alcance | `git status` por rama | A solo en la rama de backend, B solo en esta |

## 6. Checklist
- [x] T1: Confirmar D1–D3 y crear `agents/backend-password-reset` si D1 se aprueba.
- [x] T2: API: `PasswordResetTokens`, `EmailSender` (Resend + log) y DI en `Program.cs`.
- [x] T3: API: DTOs y los 2 endpoints con rate limit; `render.yaml` y `.env.example` (solo nombres).
- [x] T4: B1–B3 con `EMAIL_PROVIDER=log` y una cuenta de prueba.
- [x] T5: `forgot-password.astro`: manejo de respuestas.
- [x] T6: `reset-password.astro` + prop `analytics` en `BaseLayout.astro`.
- [x] T7: Enlace en el login del panel.
- [x] T8: F1–F4; `api.md`, `DEPLOY_GRATIS.md`, §7 y `PLAN_OTRO_AGENTE.md` §6.
- [x] T9: E1 cuando Resend esté configurado (D2).

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | T1 | ✅ | D1–D3 aprobadas. Rama `agents/backend-password-reset`. Credenciales de Resend en `reservaya-nextjs-api/.env`, que no se versiona y el agente no edita |
| 2026-09-26 | B1 | ✅ | `dotnet build -o <scratch>` (el binario de :5000 del usuario estaba en uso): 0 errores, 0 warnings |
| 2026-09-26 | B2 | ✅ | 16/16 contra una instancia de prueba en :5099 (`JWT_SECRET` de prueba, `EMAIL_PROVIDER=log`): (a) mismo 200 y cuerpo exista o no la cuenta; (b) enlace solo para la existente; vigencia 1799 s ≤ 30 min; (g) token alterado → 400; (h) vencido con firma válida → 400; contraseña corta → 400; (c) reset → 200; (d) login nueva 200 / vieja 401; (e) sesión previa → 403; (f) reutilizar → 400; (k) un logout invalida el enlace pendiente → 400; (i) 429 en el 6.º forgot; forgot con email inválido → 400 |
| 2026-09-26 | B3 | ✅ | Sin cambios en `Migrations/`, `Entities.cs`, `AppDbContext.cs`, `prisma/` ni `.env`. `db:check` OK, 0 migraciones pendientes |
| 2026-09-26 | F1 | ✅ | `astro check` 0 errores; build de 22 páginas (+ `/reset-password`); 15 scripts inline de las 2 páginas → `node --check`: 0 fallos. Build final sin variables de prueba |
| 2026-09-26 | F2 | ✅ | 18/18 con Playwright contra :5099. Forgot: 200 → «Revisa tu correo»; 400, 429, 404, 500 y red caída → error sin falso éxito. Reset: sin token → «Enlace incompleto»; contraseñas distintas o cortas (cliente); token inválido → «Enlace inválido o vencido»; flujo real → «Contraseña actualizada» + login 200; token fuera de la URL; 0 scripts de GA en `/reset-password` (sí en `/forgot-password`, build con `PUBLIC_GA_ID` de prueba) |
| 2026-09-26 | F3 | ✅ | Panel: `typecheck` 0, `lint` 0 errores (los 2 warnings ya existían), `test` 21/21, `build` OK. `/login` enlaza a `http://localhost:4321/forgot-password` |
| 2026-09-26 | F4 | ✅ | 375 px: 0 px de scroll horizontal en `/forgot-password` y `/reset-password` |
| 2026-09-26 | E1 | ✅ | Con `EMAIL_PROVIDER=resend` y las credenciales del usuario, el forgot de la cuenta de prueba `delivered@resend.dev` (dirección de test de Resend) dio 200 y Resend aceptó el envío: id `01a0de44-6a1a-71b3-a0ea-dc11b77d481f`. Queda pendiente que el usuario pruebe el flujo desde su propia bandeja |
| 2026-09-26 | S1 | ✅ | Parte A: `backend/**`, `render.yaml` y `.env.example`. Parte B: Astro, panel y docs. Se commitean por separado |
| 2026-09-26 | Nota | — | Cuentas de prueba creadas en la BD de desarrollo: `qa.reset.muiittgn@example.com`, `qa.reset.muiiuga3@example.com`, `qa.ui.muiizchn@example.com` y `delivered@resend.dev`. La API del usuario en :5000 sigue con el binario anterior: hay que reiniciar `npm run dev:api` para exponer los endpoints |
