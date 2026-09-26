# Especificación: 08 - `npm run dev:all` levanta los tres servicios en Windows

## 1. Objetivo
**Problema:** `npm run dev:all` fallaba de dos formas:
- "Landing Astro no respondió en puerto 4321 tras 90s". Falso error: Astro/Vite escucha solo en `::1`, y `Test-Port` (`scripts/start-dev.ps1:5`) solo probaba `127.0.0.1`. Además, `WaitOne` devuelve `true` aunque la conexión se rechace; funcionaba por casualidad, porque el rechazo en loopback tarda ~2 s.
- El panel arrancaba, pero `next dev` (Turbopack) daba **404 en todas las rutas dentro de grupos** (`/login`, `/register`, `/tecnico`, `/admin/*`), aunque `app-paths-manifest.json` las listaba. `next.config.ts:3` ya pedía `next dev --webpack`, pero `package.json` nunca lo tuvo.
- Las tildes salían rotas ("respondiÃ³") porque el `.ps1` estaba en UTF-8 sin BOM y Windows PowerShell 5.1 lo lee como ANSI.

**Resultado esperado:** `npm run dev:all` deja la API en :5000, el panel en :3000 y la landing en :4321 respondiendo, con los mensajes legibles.

## 2. Fuera de alcance
Investigar el bug de Turbopack. El build de producción (`next build`, con Turbopack) funciona y no se toca.

**Decisiones de producto que requieren aprobación:** ninguna. `scripts/start-dev.ps1` figuraba como territorio del Agente 1 en el plan; se tocó porque bloqueaba el arranque local que pidió el usuario.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `scripts/start-dev.ps1` | modificar | `Test-Port` prueba IPv4 e IPv6 y exige `Connected`; comentario de Next; guardado con BOM |
| `reservaya-nextjs-api/package.json` | modificar | `"dev": "next dev --webpack"` |
| `docs/skills/panel-next.md` | modificar | Regla 1: `dev` con `--webpack` |

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Script | `npm run dev:all` | termina en "Listo", sin excepción |
| A2 | Servicios | `curl` a `:5000/healthz`, `:3000/login`, `:3000/register`, `:4321/`, `:4321/login`, `:4321/canchas` | 200 |
| A3 | `Test-Port` | PowerShell 5.1 sobre 5000/3000/4321/5999 | True/True/True/False |

## 6. Checklist
- [x] T1: `Test-Port` IPv4+IPv6, BOM y comentario.
- [x] T2: `dev` con `--webpack`.
- [x] T3: verificar A1–A3.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | Antes | ❌ | `Get-NetTCPConnection`: Astro en `::1:4321` únicamente; `curl 127.0.0.1:4321` falla y `localhost:4321` da 200. Con Turbopack: `/login`, `/register`, `/tecnico`, `/admin/caja` → 404; `/` → 307 |
| 2026-09-25 | A3 | ✅ | PowerShell 5.1: 0 errores de parseo; 5000 True (47 ms), 3000 True (1 ms), 4321 True (420 ms, vía ::1), 5999 False; "respondió" se decodifica bien |
| 2026-09-25 | A1 | ✅ | `npm run dev:all` → `[SKIP] API`, `[OK] Panel Next.js`, `[SKIP] Landing` → "Listo: API :5000 \| Panel :3000 \| Landing :4321" |
| 2026-09-25 | A2 | ✅ | 6 × 200; el proceso del panel es `next dev --webpack`. Con webpack, `/tecnico` y `/admin/caja` → 307 a `/login` (la ruta resuelve; `requireAuth` rechaza un JWT de usuario inexistente) |
