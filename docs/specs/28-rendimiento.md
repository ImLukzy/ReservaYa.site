# Especificación: 28 — Optimización de rendimiento y tiempos de respuesta (Astro + Next.js)

> **Estado:** 📋 Borrador oficial del Auditor — entregado al trío (`Auditor-Gemini` → `Oscar-code` → `JIM-QA` → `god`).
> **Origen:** Directiva de Lukas (2026-09-28) tras validación visual de la Spec 27: optimizar tiempos de respuesta de la página antes de avanzar al módulo admin. Medición de línea base provista por `JIM-QA` (mensaje `2026-09-28T18-13-28-386Z-04c4d4`).

---

## 1. Objetivo

### Problema
A partir de la medición de línea base ejecutada por `JIM-QA` sobre los servicios en caliente, se identifican cuellos de botella específicos en el renderizado SSR de Next.js:

1. **Doble llamada de sesión por request (`/api/auth/me` redundante):**
   - En `reservaya-nextjs-api/app/(dashboard)/layout.tsx:21`, el layout invoca `await requireAuth()`, ejecutando `getSession()` hacia el backend .NET (`lib/session.ts:8-15` vía `lib/api.ts:57-61`).
   - Simultáneamente, cada página hija servida (como `dashboard/page.tsx:28`, `admin/agenda/page.tsx:13`, `dashboard/perfil/page.tsx:10`) vuelve a invocar `await getSession()`.
   - Dado que `getSession()` no utiliza `React.cache()`, cada carga de página realiza **dos solicitudes HTTP independientes** al backend C# (`/api/auth/me`), agregando entre 150ms y 200ms de latencia ociosa e innecesaria a cada ruta del panel.

2. **Ejecución en serie (Waterfall) en rutas críticas:**
   - En `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx:43-60`: Se ejecuta secuencialmente `await api.getOpcionesBusqueda()` y luego `await api.getDisponibles(...)`. Al no ejecutarse en concurrencia con `Promise.all`, la latencia de ambas llamadas se suma linealmente (~200ms + ~350ms = ~550ms sólo en I/O), resultando en una mediana de respuesta de **801.0ms** (frío: 2073ms).

3. **Sobrecarga de datos en `admin/agenda`:**
   - En `reservaya-nextjs-api/app/(dashboard)/admin/agenda/page.tsx:18-22`: Se cargan en SSR `canchas` (con flag `todas=true`), `reservas` y `complejos` sobre un endpoint marcado `force-dynamic`, acumulando una mediana de **1155.1ms** y pico frío de **2828.8ms** con payload de 50.9 KB.

4. **Inflexibilidad de caché en `serverFetch`:**
   - En `reservaya-nextjs-api/lib/server-fetch.ts:16`: Se fuerza estrictamente `{ cache: 'no-store' }` para toda llamada HTTP. Datos de catálogo cuasi-estáticos (`/api/opciones-busqueda`, distritos, ciudades, lista de complejos) no aprovechan revalidación controlada (`next: { revalidate: 60 }`), saturando el backend en cada navegación.

5. **Landing Astro sin prefetch de rutas:**
   - Si bien Astro responde a nivel servidor en <15ms, no se encuentra configurada la estrategia nativa de prefetch (`defaultStrategy: 'hover'`), perdiendo la oportunidad de lograr transiciones cliente instantáneas (0ms percibido) al navegar entre páginas públicas.

### Resultado esperado
Optimizar los flujos de datos en el servidor y cliente de ReservaYa para reducir los tiempos de respuesta:
- **Reducción de SSR en Next.js:** Reducir la mediana de `/dashboard/canchas` a **< 500ms** (baja de ~38%), `/admin/agenda` a **< 750ms** (baja de ~35%), y `/dashboard` a **< 600ms** (baja de ~31%).
- **Deduplicación garantizada:** Un único roundtrip a `/api/auth/me` por ciclo de vida de request HTTP en Next.js.
- **Transiciones instantáneas en landing:** Navegación prefetch fluida en Astro sin degradar el tiempo de respuesta inicial.
- **Cero cambios de arquitectura:** Mantener intactos los contratos de API .NET, esquemas OpenAPI, reglas de seguridad y estética táctil aprobada.

---

## 2. Fuera de alcance

- Modificar el backend .NET Core (controladores C#, repositorios, consultas SQL, base de datos).
- Alterar contratos OpenAPI existentes o crear nuevos endpoints en la API.
- Modificar componentes de UI o estilos neo-brutalistas aprobados en la Spec 27.
- Introducir librerías pesadas de state management o clientes GraphQL/React-Query adicionales.
- Modificar el comportamiento de expiración de sesiones JWT o cookies HttpOnly de autenticación.

---

## 3. Archivos afectados

| Archivo | Acción | Propósito en Spec 28 | Lote |
|---|---|---|---|
| `reservaya-nextjs-api/lib/session.ts` | Modificar | Envolver `getSession()` en `cache()` de React para deduplicar la verificación de sesión entre layout y página. | L1 |
| `reservaya-nextjs-api/lib/server-fetch.ts` | Modificar | Permitir opciones de caché/revalidación opcionales en `serverFetch` y `getJson`. | L1 |
| `reservaya-nextjs-api/lib/api.ts` | Modificar | Habilitar revalidación de 60s en `getOpcionesBusqueda` y catálogos estáticos. | L1 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | Modificar | Paralelizar `getOpcionesBusqueda` y `getDisponibles` mediante `Promise.all`. | L2 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/page.tsx` | Modificar | Optimizar carga concurrente y evitar llamadas redundantes de reservas completas. | L2 |
| `reservaya-nextjs-api/app/(dashboard)/admin/agenda/page.tsx` | Modificar | Optimizar inicialización de datos de agenda con manejo eficiente de fallos y concurrencia. | L2 |
| `reservaya-frontend-astro/astro.config.mjs` | Modificar | Activar directiva nativa de prefetch para navegación rápida entre páginas estáticas. | L3 |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | Modificar | Optimizar preloads de fuentes tipográficas y prefetch de navegación en cabecera. | L3 |

---

## 4. Diseño y lógica

### Lote 1 (L1) — Deduplicación de sesión y opciones de revalidación en Next.js

1. **Memoización por ciclo de vida de request (`lib/session.ts`):**
   - Utilizar `import { cache } from 'react'` para envolver la función que consulta la sesión del usuario.
   - Dado que Next.js ejecuta tanto el layout (`app/(dashboard)/layout.tsx`) como la página hija en el mismo contexto de request, la invocación de `await getSession()` devolverá la promesa compartida.
   - Se elimina de raíz la segunda llamada HTTP redundante a `/api/auth/me`.

2. **Soporte de Revalidación en `serverFetch` (`lib/server-fetch.ts`):**
   - Modificar la firma de `serverFetch(path: string, init?: RequestInit, nextOptions?: NextFetchRequestConfig)` para permitir pasar `{ next: { revalidate: 60 } }` cuando corresponda a datos de lectura que no requieren invalidación inmediata.
   - Mantener `{ cache: 'no-store' }` como valor por defecto seguro para no alterar mutaciones ni consultas de usuario sensible.

3. **Caché de catálogos (`lib/api.ts`):**
   - Aplicar `revalidate: 60` a `getOpcionesBusqueda()`, garantizando que la lista de distritos, ciudades y complejos no sature el backend en búsquedas sucesivas.

### Lote 2 (L2) — Eliminación de Waterfalls y concurrencia en páginas críticas

1. **Paralelización de `/dashboard/canchas`:**
   - Reemplazar la secuencia `await getOpcionesBusqueda()` -> `await getDisponibles()` por:
     ```ts
     const [opciones, resultado] = await Promise.all([
       api.getOpcionesBusqueda().catch(() => opcionesFallback),
       api.getDisponibles({ ...params }).catch(() => resultadoVacio),
     ]);
     ```
   - Esto reduce inmediatamente el tiempo de I/O al máximo entre ambas llamadas en lugar de su suma.

2. **Optimización de `/dashboard`:**
   - Asegurar que `api.getDashboard()` y `api.getReservas()` se ejecuten de manera estrictamente paralela y sin bloqueos en cascada.

3. **Optimización de `/admin/agenda`:**
   - Mantener la ejecución paralela existente pero beneficiada por la deduplicación de sesión de L1, midiendo la ganancia neta en tiempo de renderizado.

### Lote 3 (L3) — Prefetch y optimización de navegación en Astro Landing

1. **Prefetching nativo en Astro:**
   - En `astro.config.mjs`:
     ```js
     export default defineConfig({
       // ...
       prefetch: {
         prefetchAll: false,
         defaultStrategy: 'hover',
       },
     });
     ```
   - Al posicionar el cursor sobre enlaces de navegación (`/canchas`, `/torneos`, `/duenos`, `/ayuda`), Astro descarga anticipadamente el HTML, brindando transiciones inmediatas.

2. **Ajuste de enlaces y fuentes en `BaseLayout.astro`:**
   - Añadir `data-astro-prefetch` en los enlaces principales del `Header.astro`.
   - Limitar preloads de fuentes en el `<head>` a las dos variantes críticas de carga inicial (`barlow-400` y `barlow-condensed-600`), cargando el resto de pesos bajo demanda para aligerar el parsing inicial.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos Next.js | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint Next.js | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests Next.js | `npm --prefix reservaya-nextjs-api run test` | 40/40 pasando |
| A4 | Build Next.js | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Astro check | `npm --prefix reservaya-frontend-astro run astro -- check` | 0 errores |
| A6 | Build Astro | `npm --prefix reservaya-frontend-astro run build` | 0 errores (22 páginas generadas) |
| A7 | Deduplicación sesión | Inspección de request / logs de backend en llamada a `/dashboard` | Máximo 1 `/api/auth/me` por carga de página |
| A8 | Latencia `/dashboard/canchas` | Medición caliente de JIM-QA (5 iteraciones) | Mediana < 500ms (antes 801.0ms) |
| A9 | Latencia `/admin/agenda` | Medición caliente de JIM-QA (5 iteraciones) | Mediana < 800ms (antes 1155.1ms) |
| A10 | Latencia `/dashboard` | Medición caliente de JIM-QA (5 iteraciones) | Mediana < 600ms (antes 874.9ms) |

---

## 6. Checklist de implementación (para Oscar-code)

- [x] **L1: Deduplicación y memoización de sesión en Next.js**
  - [x] Envolver `getSession` con `cache()` en `reservaya-nextjs-api/lib/session.ts`.
  - [x] Añadir soporte de `revalidate` en `reservaya-nextjs-api/lib/server-fetch.ts`.
  - [x] Habilitar revalidación de 60s en `getOpcionesBusqueda` de `lib/api.ts`.
  - [x] Verificar gates A1-A4.
- [ ] **L2: Eliminación de waterfalls y concurrencia en páginas críticas**
  - [ ] Ejecutar `Promise.all` para opciones y disponibilidad en `app/(dashboard)/dashboard/canchas/page.tsx`.
  - [ ] Verificar concurrencia en `app/(dashboard)/dashboard/page.tsx`.
  - [ ] Verificar concurrencia y tiempos en `app/(dashboard)/admin/agenda/page.tsx`.
  - [ ] Verificar gates A1-A4.
- [ ] **L3: Prefetch y navegación en Astro**
  - [ ] Configurar `prefetch: { defaultStrategy: 'hover' }` en `astro.config.mjs`.
  - [ ] Optimizar preloads en `src/layouts/BaseLayout.astro`.
  - [ ] Verificar gates A5 y A6.
- [ ] **L4: Verificación integral y re-medición por JIM-QA**
  - [ ] Ejecución de suite completa de Quality Gates (A1 a A6).
  - [ ] Re-medición de tiempos de respuesta por JIM-QA y anotación de §7.

---

## 7. Registro de verificación

### Línea Base — Antes de la optimización (JIM-QA, 2026-09-28T18:13Z)

| Entorno / Ruta | Estado | Frío | Mediana | Promedio | Tamaño |
|---|---|---|---|---|---|
| **Astro** `/` | Caliente | 15.6ms | 10.1ms | 10.9ms | 108.5 KB |
| **Astro** `/canchas` | Caliente | 38.7ms | 8.0ms | 9.0ms | 81.5 KB |
| **Astro** `/torneos` | Caliente | 38.7ms | 8.0ms | 9.0ms | 81.5 KB |
| **Astro** `/duenos` | Caliente | 58.7ms | 10.5ms | 10.1ms | 112.7 KB |
| **Next.js** `/login` | Caliente | 41.9ms | 37.4ms | 37.0ms | 13.1 KB |
| **Next.js** `/register` | Frío/Caliente | 1085.1ms | 35.1ms | 58.5ms | 14.0 KB |
| **Next.js** `/dashboard` | Caliente | 919.6ms | **874.9ms** | 882.7ms | 37.2 KB |
| **Next.js** `/dashboard/canchas` | Caliente | 2073.7ms | **801.0ms** | 806.3ms | 71.9 KB |
| **Next.js** `/dashboard/reservas` | Caliente | 385.2ms | 350.6ms | 455.6ms | 38.5 KB |
| **Next.js** `/dashboard/partidos` | Caliente | 434.7ms | 408.5ms | 404.0ms | 28.7 KB |
| **Next.js** `/dashboard/perfil` | Caliente | 1696.2ms | 548.6ms | 606.1ms | 39.5 KB |
| **Next.js** `/admin/agenda` | Frío/Caliente | 2828.8ms | **1155.1ms** | 1188.4ms | 50.9 KB |
| **Backend** `/api/canchas` | Caliente | 191.5ms | 158.2ms | 160.3ms | 1.7 KB |
| **Backend** `/api/canchas/disponibles` | Caliente | 351.1ms | 346.2ms | 348.6ms | 2.0 KB |
| **Backend** `/api/partidos/mios` | Caliente | 341.4ms | 338.8ms | 336.4ms | 38 B |

### Verificación Posterior (Post-optimizaciones Oscar-code + JIM-QA)

| Fecha | Criterio / Lote | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-28 | Lote 1 (A1–A4, A7, A8) | ✅ PASS | JIM-QA: typecheck 0 err, lint 0 err (2 warnings), test 40/40, build Next OK. Re-medición caliente: `/dashboard/canchas` 437ms (-45.4%), `/dashboard` 838ms (-36ms), `/dashboard/carne` 305ms, `/dashboard/mi-partido` 305ms. Deduplicación sesión activa. |
| _Pendiente_ | Lote 2 (Waterfalls A8–A10) | | |
| _Pendiente_ | Lote 3 (Astro A5–A6) | | |
| _Pendiente_ | Lote 4 (Verificación Integral) | | |

