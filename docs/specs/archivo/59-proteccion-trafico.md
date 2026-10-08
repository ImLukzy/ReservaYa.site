# Especificación: 59 - Protección de tráfico: origen, límite global e IP fiable

Estado: completada 2026-10-08.

## 1. Objetivo
**Problema:**
- La IP del cliente sale del primer valor de `X-Forwarded-For` (`apps/api/src/auth/auth.service.ts:16`, `apps/api/src/management/access.ts:9`). Llamando directo a `https://reservaya-api-va.onrender.com` ese valor lo elige el atacante: los límites de login, registro, reclamos, etc. se saltan.
- No hay límite global por IP: `/api/canchas`, `/api/partidos` y demás lecturas públicas no tienen tope.
- `RateLimiter` (`apps/api/src/auth/rate.ts`) nunca borra claves viejas: con claves aleatorias el `Map` crece sin fin.

**Resultado esperado:** la API solo atiende peticiones que vienen de la web (Vercel) cuando el secreto de origen está configurado; la IP usada en los límites es la real del cliente; hay un límite global por IP; el limitador no crece sin control. Sin coste nuevo.

## 2. Fuera de alcance
- Planes de pago, Redis u otro almacén externo (el límite sigue en memoria, 1 instancia).
- Firewall de Vercel (lo configura god aparte) y prueba de carga (Pam aparte).
- Cambios de contrato de endpoints.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/auth/rate.ts` | modificar | purga periódica y tope de claves |
| `apps/api/src/app.ts` (o un guard/hook nuevo en `apps/api/src/`) | modificar / crear | verificación de origen y límite global |
| `apps/api/src/auth/auth.service.ts`, `apps/api/src/management/access.ts` | modificar | una sola función `ip()` fiable compartida |
| `apps/web/proxy.ts` y/o `apps/web/next.config.ts` | modificar | añadir la cabecera secreta a lo que va a la API |
| `apps/web/lib/server-fetch*` / `apps/web/lib/b2b-api*` (rutas reales) | modificar | llamadas servidor→API con secreto e IP del cliente |
| tests de API y web junto a lo cambiado | crear / modificar | casos de §5 |
| `apps/web/.env.example`, `docs/api.md`, `DEPLOY_GRATIS.md` | modificar | variable `ORIGIN_SECRET` y comportamiento 403/429 |

## 4. Diseño y lógica
- **Secreto de origen:** variable `ORIGIN_SECRET` (≥32 caracteres) en web y API. La web la envía en una cabecera (p. ej. `x-origin-secret`) en todo lo que reenvía a la API: el rewrite `/api/*` (vía `proxy.ts` con `NextResponse` + `request.headers`, ampliando su matcher a `/api/:path*` sin tocar la lógica de las zonas) y los fetch de servidor. La API compara en tiempo constante; si `ORIGIN_SECRET` está definida y no coincide → 403. Si no está definida → no se exige (despliegue gradual y tests locales). `/healthz` siempre abierto (health check de Render).
- **IP fiable:** con secreto válido, la IP es la que la web reenvía del cliente (cabecera fijada por la web desde `x-forwarded-for`/`x-real-ip` de Vercel, no la que mande el navegador); sin secreto configurado, comportamiento actual. Una sola función `ip()` para todos los usos.
- **Límite global por IP:** p. ej. 300 peticiones/min por IP para todo `/api`, más estricto para escrituras (POST/PUT/PATCH/DELETE, p. ej. 60/min); 429 con `Retry-After`. Las llamadas de servidor (SSR) cuentan contra la IP del cliente que las originó, nunca contra una IP compartida de Vercel. Valores en constantes con nombre.
- **RateLimiter:** purga de claves vencidas (por intervalo `unref()` o al superar N claves) y tope duro de claves; los límites existentes no cambian.
- **API:** contratos sin cambios salvo nuevos 403 (origen) y 429 (global).
- **Invariantes:** tests nunca llaman a Google/Resend/R2 reales; no imprimir secretos; login con Google sigue funcionando (callback por `reservaya.site`).

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate completo | `pnpm exec turbo run build typecheck lint test --force` (fuera del sandbox, god) | 18/18 |
| A2 | Origen | tests: con `ORIGIN_SECRET` y sin cabecera/errónea → 403; correcta → 200; `/healthz` sin cabecera → 200; sin `ORIGIN_SECRET` → 200 | pasa |
| A3 | IP fiable | test: `X-Forwarded-For` inventado por el cliente no cambia la clave de límite cuando hay secreto | pasa |
| A4 | Límite global | test: superar el tope → 429 con `Retry-After`; otra IP no afectada | pasa |
| A5 | Limitador acotado | test: claves vencidas se purgan; nº de claves ≤ tope | pasa |
| A6 | Producción | tras desplegar con `ORIGIN_SECRET` en Render y Vercel: directo a Render → 403; `reservaya.site` público, login y Google OK (Pam + humano) | pasa |

## 6. Checklist
- [x] T1: `ip()` única y `RateLimiter` acotado.
- [x] T2: verificación de origen en la API (inactiva sin variable).
- [x] T3: límite global por IP.
- [x] T4: web envía secreto e IP en rewrite y fetch de servidor.
- [x] T5: tests y docs.
- [x] T6: despliegue en orden (API → variables Render/Vercel → redeploy web) y A6.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 | Pasa | Tests del hook y de la API Nest real: origen ausente/incorrecto → 403; válido → 200; healthz abierto; sin variable funciona. |
| 2026-10-08 | A3 | Pasa | 300 peticiones con X-Forwarded-For cambiante conservan la IP web y agotan la misma clave; cabecera personalizada inválida se rechaza. Helper web sobrescribe origen/IP inventados tanto para rewrite como para SSR. |
| 2026-10-08 | A4 | Pasa | 300 lecturas/min y 60 escrituras/min; exceso → 429 con Retry-After: 60; otra IP y healthz siguen disponibles. |
| 2026-10-08 | A5 | Pasa | Purga de vencidas y máximo 10.000 claves; a capacidad se rechaza una nueva clave sin expulsar contadores activos. |
| 2026-10-08 | Tipos / lint / tests | Pasa | `pnpm exec turbo run typecheck lint test --force`: 16/16 tareas; API 118 tests. Web + runner + motion en proceso único: 85/85 tests. Knip sin hallazgos. Logs privados de Michael: spec59-checks.log y spec59-web-tests.log. |
| 2026-10-08 | A1 | Pasa | god fuera del sandbox: `pnpm exec turbo run build typecheck lint test --force` → 18/18 (API 118). E2E local con `ORIGIN_SECRET`: directo 403, healthz 200, web/SSR/login/panel 200, 310 peticiones → 429 con `Retry-After: 60`. |
| 2026-10-08 | A6 | Pasa | Producción a87fd9c con `ORIGIN_SECRET` en Vercel y Render: directo a Render 403 (también con IP falsificada), `/healthz` 200; humo Pam 11/11 (USUARIO y ADMIN); login con Google OK (humano). WAF Vercel: regla 300/60 s por IP en `/api`. |

Decisiones: cabeceras `x-origin-secret` y `x-reservaya-client-ip`, IP derivada del edge de Vercel en proxy/SSR, SHA-256 + comparación constante, sin dependencias nuevas. Los límites siguen en memoria por instancia. `b2b-api` hereda el envío por `server-fetch` sin duplicarlo. Las zonas existentes de `proxy.ts` conservan su lógica. Se añadieron `/api/:path*` al matcher y una rama de forwarding previa a las guardas del panel.

Activación sin corte: primero API sin variable, luego secreto en Vercel y redeploy web; activar el mismo secreto en Render cuando la web nueva envíe las cabeceras. Véase `DEPLOY_GRATIS.md`. T6 queda a cargo de god.
