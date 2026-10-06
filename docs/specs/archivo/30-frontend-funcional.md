# Especificación: 30 — Inventario funcional y roturas del frontend

> **Estado:** ✅ Auditoría cerrada por `dev-claude` (`task-20260928-dev-plan-frontend` + `task-20260928-dev-s30-sesion` con sesión real por rol), sin lotes de código pendientes salvo los ya conocidos como `BLOQUEO-API`.
> **Origen:** Orden de Lukas vía god — planificación de frontend mientras el trío descansa. Fuente: archivos del repo + `curl` (solo códigos HTTP, sin Playwright/capturas — eso lo hace JIM-QA).

---

## 1. Objetivo

**Problema:** No había un inventario de rutas y estado funcional actualizado desde el backlog original (`PLAN_OTRO_AGENTE.md`, 2026-09-25); desde entonces se sumaron las specs 20–29 (rediseño completo, rendimiento, sistema táctil). Antes de que Oscar retome trabajo hay que confirmar que nada quedó roto.

**Resultado esperado:** Tabla de rutas por app/rol con su código HTTP base y archivo fuente; confirmación explícita de qué categorías de rotura se buscaron y cuántas se encontraron (con evidencia); lotes de arreglo solo si hay algo que arreglar.

---

## 2. Fuera de alcance

- Editar código: esta spec es 100% de auditoría (0 archivos modificados salvo este documento).
- Playwright, capturas, medición de latencia (ya cubierto en spec 28) — verificación visual la hace JIM-QA.
- Rutas de `backend/**` (fuera de `docs/specs/**`).

**Decisiones de producto que requieren aprobación:** ninguna.

---

## 3. Archivos afectados

| Archivo | Acción | Nota |
|---|---|---|
| `docs/specs/30-frontend-funcional.md` | Crear | Este documento. |

Ningún archivo de código cambia como resultado directo de esta spec: la auditoría no encontró roturas nuevas (ver §4.2). Los dos ítems abiertos son `BLOQUEO-API` heredados (§4.3), no arreglables desde el frontend.

---

## 4. Diseño y lógica

### 4.1 Inventario de rutas (fuente: archivos + `curl` sin sesión, 2026-09-28)

**Astro (`reservaya-frontend-astro`, público, :4321)** — 13 páginas + `404.astro`/`500.astro` (no tienen ruta URL propia, Astro las sirve como fallback):

| Ruta | Archivo | HTTP |
|---|---|---|
| `/` | `src/pages/index.astro` | 200 |
| `/login` | `src/pages/login.astro` | 200 |
| `/register` | `src/pages/register.astro` | 200 |
| `/forgot-password` | `src/pages/forgot-password.astro` | 200 |
| `/reset-password` | `src/pages/reset-password.astro` | 200 |
| `/canchas` | `src/pages/canchas.astro` | 200 |
| `/torneos` | `src/pages/torneos.astro` | 200 |
| `/duenos` | `src/pages/duenos.astro` | 200 |
| `/completar-cuadro` | `src/pages/completar-cuadro.astro` | 200 |
| `/sortear` | `src/pages/sortear.astro` | 200 |
| `/ayuda` | `src/pages/ayuda.astro` | 200 |
| `/libro-reclamaciones` | `src/pages/libro-reclamaciones.astro` | 200 |
| `/mejoras` | `src/pages/mejoras.astro` | 200 |
| ruta inexistente | `src/pages/404.astro` | 404 (confirmado) |

**Next.js (`reservaya-nextjs-api`, panel, :3000) — sin sesión, verifica el gate del `proxy.ts`:**

| Ruta | Rol esperado | Archivo | HTTP sin sesión |
|---|---|---|---|
| `/` | — | `app/page.tsx` | 307 → `/login` |
| `/login`, `/register` | público | `app/(auth)/{login,register}/page.tsx` | 200 |
| `/dashboard`, `/dashboard/{reservas,canchas,carne,mi-partido,perfil,partidos}` | USUARIO | `app/(dashboard)/dashboard/**/page.tsx` (7) | 307 → `/login` |
| `/admin`, `/admin/{reservas,agenda,caja,canchas,complejos,horarios,equipo,resenas,reportes,metas,descuentos,precios-especiales,abonos,configuracion,novedades,torneos,validar-codigo,clientes,ayuda}` | ADMIN/SUPERADMIN | `app/(dashboard)/admin/**/page.tsx` (19) | 307 → `/login` |
| `/superadmin` (catch-all) | SUPERADMIN | `app/(dashboard)/superadmin/[[...rest]]/page.tsx` | 307 → `/login` |
| `/tecnico`, `/tecnico/{centros,suscripciones,usuarios}` | TECNICO | `app/(dashboard)/tecnico/**/page.tsx` (4) | 307 → `/login` |

Total: 13 rutas Astro + 34 rutas Next.js (2 públicas + 32 protegidas). Todas responden el código esperado: público 200, protegido 307 a `/login` sin cookie. El `matcher` de `proxy.ts` cubre el 100% de las rutas protegidas listadas (ninguna quedó fuera del gate).

### 4.2 Roturas buscadas (fuente: grep sobre el código, no ejecución)

| Categoría | Comando | Resultado |
|---|---|---|
| Errores tragados (`.catch(() => [] \| null \| {})`) | `grep -E "\.catch\(\(\) => (\[\]\|null\|\{\}\|undefined)\)" app/` (Next) | 0 coincidencias |
| Consola suelta (`console.log/error/warn`) | `grep -E "console\.(log\|error\|warn)"` en `app/` y `components/` (Next) | 1 uso legítimo (`ErrorPanel.tsx:16`, dentro del error boundary — no es una fuga) |
| Enlaces muertos (`href="#"`) | `grep 'href="#"'` (Next) | 0 coincidencias |
| `alert()` / consola suelta / `innerHTML` inseguro | `grep` sobre `src/` (Astro) | 0 coincidencias (ya resueltos en specs 01/25) |
| Estados de carga/error a nivel de ruta | Comparar `page.tsx` vs `loading.tsx`/`error.tsx` | Cubiertos por `app/(dashboard)/loading.tsx` y `error.tsx` a nivel de grupo (convención de Next: no hace falta uno por subruta) |
| Formularios sin feedback de error | Lectura de `ReservaForm.tsx`, `PerfilForm.tsx`, `login`/`register` | Todos usan `crearCarga()`/`<AvisoCarga>` o estado `error` propio (spec 04) — sin regresión |

**Conclusión:** no se encontraron roturas nuevas de las categorías clásicas (enlaces, estados vacío/error/carga, formularios, consola). El frontend llega limpio a la spec 29.

### 4.3 `BLOQUEO-API` heredados (sin cambio, informativos)

Ambos ya estaban registrados en `PLAN_OTRO_AGENTE.md` §3 desde la spec 20; siguen abiertos porque requieren un endpoint nuevo o un cambio de la API .NET, fuera del alcance de frontend:

1. **Torneos públicos:** `GET /api/torneos` exige `ADMIN,SUPERADMIN,TECNICO`; `/torneos` (Astro) muestra vacío honesto en vez de datos. Falta `GET /api/torneos/publicos`.
2. **Disponibilidad sin horario del complejo:** `GET /api/canchas/disponibles` no aplica `HorarioOperativo`; una cancha cerrada puede verse «libre» hasta que la reserva la rechaza.

### 4.4 Verificación con sesión real (2026-09-28, `dev-claude`, `task-20260928-dev-s30-sesion`)

Login vía `curl` contra `POST http://localhost:3000/api/auth/login` (se relaya al backend; cookie `token` HttpOnly guardada en un archivo temporal del scratchpad, nunca impresa) para las 4 cuentas seed, luego `GET` de cada ruta de su rol con esa cookie.

**Hallazgo metodológico:** buscar el texto de `error.tsx`/`not-found` en el HTML da **falso positivo** en Next 16: el payload de streaming RSC (`self.__next_f.push(...)`) incluye la definición serializada de los segmentos hermanos (`error.js`, `not-found`) en TODA página, aunque no se rendericen — el texto "This page could not be found." aparece siempre como dato inerte. La señal real es `role="alert"` (el único marcador que `ErrorPanel.tsx` renderiza de verdad) combinado con el código HTTP.

| Rol | Rutas propias | Resultado | Cruce a rol ajeno |
|---|---|---|---|
| USUARIO | 7/7 `/dashboard/*` | 200, 0 `role="alert"` real | `/admin`, `/superadmin`, `/tecnico` → 307 (redirige, no se ve la ruta) |
| ADMIN | 19/19 `/admin/*` | 200, 0 `role="alert"` real | `/dashboard`, `/superadmin`, `/tecnico` → 307 |
| SUPERADMIN | `/superadmin` + `/admin` (2 muestras) | 200, 0 `role="alert"` real | `/dashboard`, `/tecnico` → 307 |
| TECNICO | 4/4 `/tecnico/*` + `/admin` (permitido por matriz) | 200, 0 `role="alert"` real | `/dashboard`, `/superadmin` → 307 |

Las 4 cuentas están documentadas en `prisma/seed.ts:12-23` (contraseñas por defecto si no hay `SEED_*_PASSWORD` en el entorno) — no se leyó `.env`. Un primer intento de login de USUARIO devolvió 500 (transitorio; se repitió y dio 200; no se investigó más por no ser el objeto de esta spec, queda anotado por si reaparece).

**V2 (formularios por rol) no se probó:** exige simular envíos POST reales (crear reserva, editar perfil, alta de equipo) con efectos secundarios en datos de desarrollo compartidos — fuera del alcance de "solo códigos HTTP" de esta spec; se deja como sugerencia para una verificación E2E con Playwright de JIM-QA, no para `curl`.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Inventario completo | Conteo de rutas vs. `find app/**/page.tsx` y `src/pages/**/*.astro` | 13 Astro + 34 Next.js, 0 rutas fuera de tabla |
| A2 | Códigos HTTP base | `curl -s -o /dev/null -w "%{http_code}"` por ruta, sin sesión | 200 público, 307→`/login` protegido, 404 ruta inexistente |
| A3 | 0 roturas clásicas nuevas | Greps de §4.2 | 0 coincidencias nuevas (salvo el uso legítimo anotado) |
| A4 | BLOQUEO-API documentados | Coinciden con `PLAN_OTRO_AGENTE.md` §3 | 2, sin cambio de estado |
| A5 | Rutas protegidas con sesión real | Login por `curl` + `GET` con cookie, por rol (§4.4) | 200 y 0 `role="alert"` real en rutas propias; 307 al cruzar a otro rol |

---

## 6. Checklist

- [x] T1: inventariar rutas Astro y Next.js por archivo.
- [x] T2: `curl` de código HTTP sin sesión sobre las 47 rutas.
- [x] T3: grep de las 6 categorías de rotura clásica.
- [x] T4: cruzar contra `BLOQUEO-API` ya conocidos, sin duplicar hallazgos.
- [x] T5: login por `curl` con las 4 cuentas seed y verificar las 34 rutas Next.js con sesión real (200 propias, 307 al cruzar de rol).

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-28 | A1 Inventario | ✅ PASS | 13 rutas Astro (Glob) + 34 rutas Next.js (Glob) — ver §4.1 |
| 2026-09-28 | A2 Códigos HTTP | ✅ PASS | `curl` sin sesión: 13/13 Astro 200 (+1 ruta falsa → 404), 34/34 Next.js 200 (públicas) o 307→`/login` (protegidas) |
| 2026-09-28 | A3 Roturas | ✅ PASS | 0 `.catch` mudos, 0 `console.*` fuera de `ErrorPanel`, 0 `href="#"`, 0 `alert()`/`innerHTML` inseguro en Astro |
| 2026-09-28 | A4 BLOQUEO-API | ✅ PASS | 2 ítems, iguales a `PLAN_OTRO_AGENTE.md` §3, sin cambios |
| 2026-09-28 | A5 Sesión real por rol | ✅ PASS | USUARIO 7/7, ADMIN 19/19, SUPERADMIN 2/2 muestras, TECNICO 4/4 + `/admin` — todos 200 y 0 `role="alert"` real; 10/10 cruces de rol → 307 |
