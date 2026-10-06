# Especificación: 22b - Adenda: Cierre de Huecos Funcionales del Área del Jugador (Partidos Comunitarios)

> **Estado:** ✅ Aprobada por Lukas (2026-09-27, ASK ME ILK-3) — adenda de la Spec 22; implementación en `feature/22-unificar-jugador`.  
> **Alcance:** Migración de la gestión autenticada de partidos abiertos desde Astro (`/mis-partidos`) hacia el panel en Next.js (`/dashboard/partidos`), enlaces directos landing → panel y eliminación de scripts mutacionales en la landing.

---

## 1. Objetivo

**Problema:**
El mapeo de pantallas del área del jugador (`task-20260927-dwight-mapa-jugador`) y el inventario de enlaces identificaron una asimetría funcional y rutas intermedias innecesarias:
- En Astro, `src/pages/mis-partidos.astro` (L1-157) ejecuta llamadas transaccionales autenticadas (`GET /api/partidos/mios`, `DELETE /api/partidos/{id}` y `DELETE /api/partidos/{id}/anotarse`) mediante un script inline de cliente (`fetch` con `credentials: "include"`), forzando manejo de sesión y 401 en la landing pública.
- En Next.js, `/dashboard/mi-partido` solo atiende la reserva confirmada activa de una cancha con cuenta regresiva, careciendo de interfaz para que el jugador gestione sus partidos comunitarios organizados o postulaciones a «completar cuadro».
- En la landing de Astro, `completar-cuadro.astro:28` apunta a `/mis-partidos` y `Header.astro:49` pasa por `/jugador/perfil`, provocando saltos por páginas puente en lugar de enlazar directo al panel.

**Resultado esperado:**
1. Crear en Next.js la ruta `/dashboard/partidos` (`app/(dashboard)/dashboard/partidos/page.tsx`), Server Component protegido por la guarda existente en el layout, que renderiza partidos organizados y postulaciones leídos en servidor (`lib/api.ts`).
2. Implementar mutaciones de cliente exclusivamente en `lib/api-client.ts` (`cancelarPartido`, `salirseDePartido`) con revalidación mediante `router.refresh()`.
3. Transformar `src/pages/mis-partidos.astro` en una redirección inmediata hacia `${APP}/dashboard/partidos` bajo el patrón canónico de `src/pages/mis-reservas.astro` (meta refresh + fallback UI + `window.location.replace`) para soportar enlaces externos y marcadores.
4. Actualizar enlaces en la landing (`completar-cuadro.astro:28` y `Header.astro:49`) para enlazar directamente a las rutas destino del panel (`${APP}/dashboard/partidos` y `${APP}/dashboard/perfil`).
5. Mantener intactos los endpoints del backend .NET existentes (`/api/partidos/mios`, `/api/partidos/*`), sin cambios de base de datos ni lógica de servidor.

---

## 2. Fuera de alcance

- Modificaciones, migraciones o nuevos endpoints en el backend .NET (`ReservaFacil.Api`).
- Alterar las herramientas públicas y anónimas de Astro (`/completar-cuadro` y `/sortear`), que permanecen en la landing como utilidades abiertas.
- Reescribir o modificar la Spec 22 Aprobada (`docs/specs/22-area-jugador-desacoplada.md`); esta adenda actúa como extensión formal (§2.20 / adenda b).
- Crear tokens nuevos en CSS: se reutilizan estrictamente los tokens del sistema «Tablero de cancha» de `app/globals.css`.

**Decisiones de producto cerradas (Lukas, ASK ME ILK-3, 2026-09-27):**
- Nombre en el menú del panel y en el botón de `completar-cuadro.astro`: **«Mis partidos»** (`/dashboard/partidos`). La entrada existente «Mi partido» (`/dashboard/mi-partido`) pasa a llamarse **«Próxima reserva»** (etiqueta del menú y título h1 de la página; la ruta no cambia).

---

## 3. Archivos afectados

| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/app/(dashboard)/dashboard/partidos/page.tsx` | Crear | Server Component que lee datos vía `getMisPartidos()` y hereda la guarda de `layout.tsx` |
| `reservaya-nextjs-api/components/features/PartidosJugadorPanel.tsx` | Crear | Client Component interactivo con tabs («Organizo» / «Me anoté»), diálogos de confirmación y `router.refresh()` |
| `reservaya-nextjs-api/components/layout/Sidebar.tsx` | Modificar | Entrada «Mis partidos» hacia `/dashboard/partidos`; la etiqueta «Mi partido» pasa a «Próxima reserva» |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/mi-partido/page.tsx` | Modificar | Solo el título h1: «Mi partido» → «Próxima reserva» |
| `reservaya-nextjs-api/lib/api.ts` | Modificar | Incorporar lectura en servidor `getMisPartidos()` (server-fetch autenticado) |
| `reservaya-nextjs-api/lib/api-client.ts` | Modificar | Incorporar exclusivamente mutaciones: `cancelarPartido(id)` y `salirseDePartido(id)` |
| `reservaya-nextjs-api/lib/api-types.ts` | Modificar | Tipado TypeScript para DTOs de partidos del usuario (`PartidoComunitario`, `MisPartidosResponse`) |
| `reservaya-frontend-astro/src/pages/mis-partidos.astro` | Modificar | Redirección canónica a `${APP}/dashboard/partidos` para enlaces externos y marcadores |
| `reservaya-frontend-astro/src/pages/completar-cuadro.astro` | Modificar | L28: botón «Mis partidos» enlaza directo a `${APP}/dashboard/partidos` |
| `reservaya-frontend-astro/src/components/Header.astro` | Modificar | L49: «Mi perfil» enlaza directo a `${APP}/dashboard/perfil` (igual que L50-51) |
| `docs/contracts/openapi-area-jugador.yaml` | Modificar | Incorporar esquemas de `/api/partidos/mios` y operaciones de baja a la especificación OpenAPI |

---

## 4. Diseño y lógica

### 4.1 Autenticación y Arquitectura de Datos
- **Guarda Heredada:** `app/(dashboard)/dashboard/layout.tsx` ya ejecuta `requireRole(['USUARIO'])` en servidor. La página `/dashboard/partidos` hereda esta protección de forma nativa sin requerir verificaciones manuales redundantes.
- **Lectura en Servidor:** `getMisPartidos()` se aloja en `lib/api.ts` y aprovecha `server-fetch.ts` con cookies seguras reenviadas en el ciclo de renderizado de Next.js.
- **Mutaciones de Cliente:** `lib/api-client.ts` expone únicamente `cancelarPartido(id: string)` y `salirseDePartido(id: string)`. Al completarse una acción con éxito, el componente cliente ejecuta `router.refresh()` para recargar los datos del servidor sin alterar el estado global de navegación.
- **Aislamiento de Tokens:** El cliente nunca lee ni procesa el JWT (cookie HttpOnly `token`).

### 4.2 Interfaz de Usuario («Tablero de cancha»)
- **Estructura Visual:** Cabecera con título en `font-display`, subtítulo en `text-pizarra` y pestañas de filtro («Organizo» / «Me anoté») con contraste accesible (`aria-selected:border-cesped text-basalto`).
- **Estados Vacíos:** Componente estándar `EmptyState` (`components/ui/EmptyState.tsx`) con botón que enlaza a la vitrina pública `${LANDING}/completar-cuadro` para buscar o convocar partidos.
- **Modales de Confirmación:** Al no requerir campos de formulario, no se emplean clases `flabel`/`finput`. El cuerpo del `Modal` (`components/ui/Modal.tsx`) muestra texto explicativo legible en `text-slate-300` sobre el fondo oscuro y dos botones: `Button variant="danger"` para confirmar la baja y `Button variant="secondary"` para desistir.
- **Anti-CLS:** Esqueletos de carga con dimensiones fijas (`h-32 rounded-xl border border-cal bg-piedra/40`) y números con `tabular-nums`.

### 4.3 Redirecciones y Enlaces Directos en Astro
- **Redirección de Respaldo:** `src/pages/mis-partidos.astro` replica fielmente el patrón de `src/pages/mis-reservas.astro`:
  1. `<meta http-equiv="refresh" content={`0;url=${urlDestino}`} />` en el `<head>`.
  2. Fallback accesible con botón si JavaScript no está disponible.
  3. `<script is:inline>` plano que ejecuta `window.location.replace(urlDestino)`.
- **Enlaces Directos:** `completar-cuadro.astro:28` y `Header.astro:49` transfieren al usuario directamente a `${APP}/dashboard/partidos` y `${APP}/dashboard/perfil`, suprimiendo la latencia de redirecciones intermedias en los flujos principales.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos en Next.js | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint en Next.js | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests unitarios y de contrato | `npm --prefix reservaya-nextjs-api test` | 100% PASS |
| A4 | Build de producción Next.js | `npm --prefix reservaya-nextjs-api run build` | 0 errores (ruta `/dashboard/partidos` compilada) |
| A5 | Diagnóstico Astro | `npx --prefix reservaya-frontend-astro astro check` | 0 errores |
| A6 | Build estático Astro | `npm --prefix reservaya-frontend-astro run build` | 22 páginas generadas limpias |
| A7 | Redirección canónica y enlaces | Navegación a `/mis-partidos` transfiere a `/dashboard/partidos`; enlaces de Header y completar-cuadro apuntan directo al panel sin rebotes | Verificación visual y funcional |

---

## 6. Checklist

- [x] T1: Incorporar contratos de partidos comunitarios en `docs/contracts/openapi-area-jugador.yaml`.
- [x] T2: Añadir `getMisPartidos()` a `lib/api.ts` y mutaciones en `lib/api-client.ts`, extendiendo `lib/api-types.ts`.
- [x] T3: Implementar `PartidosJugadorPanel.tsx`, la página Server Component `app/(dashboard)/dashboard/partidos/page.tsx` y la entrada «Mis partidos» en `Sidebar.tsx`; renombrar «Mi partido» → «Próxima reserva» (menú y h1 de `dashboard/mi-partido/page.tsx`).
- [x] T4: Reemplazar `src/pages/mis-partidos.astro` por redirección canónica y actualizar enlaces directos en `completar-cuadro.astro` y `Header.astro`.
- [x] T5: Correr suite de gates (`typecheck`, `lint`, `test`, `build`, `astro check`) y registrar evidencias en §7.

---

## 7. Registro de verificación

Gates ejecutados por god (Claudio) en el árbol principal, rama `feature/22-unificar-jugador`, 2026-09-28 00:25 UTC (JIM-QA sin sesión activa).

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-28 | A1: Tipos en Next.js | PASS | `npm --prefix reservaya-nextjs-api run typecheck` → código de salida 0 |
| 2026-09-28 | A2: Lint en Next.js | PASS | `run lint` → 0 errores, 2 warnings previos fuera de la 22b (`lib/onboarding-simulation.test.mjs:1`, `prisma/seed.ts:44`) |
| 2026-09-28 | A3: Tests unitarios y de contrato | PASS | `npm --prefix reservaya-nextjs-api test` → 40/40, incluye el contrato de `/api/partidos/mios` |
| 2026-09-28 | A4: Build Next.js | PASS | `run build` → código 0; ruta `/dashboard/partidos` presente en `.next/server/app/(dashboard)/dashboard/` |
| 2026-09-28 | A5: Diagnóstico Astro | PASS | `astro check` → 0 errores |
| 2026-09-28 | A6: Build Astro | PASS | `run build` → 22 páginas HTML en `dist/` |
| 2026-09-28 | A7: Enlaces y redirección | PASS (estático) | grep: `mis-partidos.astro` → `${APP}/dashboard/partidos`; `completar-cuadro.astro:28` → `/dashboard/partidos`; `Header.astro:49` → `/dashboard/perfil`. Sin verificación en navegador con API real. |
| 2026-09-28 | Tokens | PASS | grep `asfalto|cal-fuerte` en `app/` y `components/` del panel → vacío |
