# Especificación: 04 - Errores de carga visibles en el panel (backlog P1-10)

## 1. Objetivo
**Problema:** `lib/b2b-api.ts:getJson` ya lanza `ApiError`, pero las 13 páginas de servidor del panel lo tapan con `.catch(() => [])` o `.catch(() => null)`: 25 cargas en `app/(dashboard)/{admin,tecnico}/**/page.tsx`. Si la API falla, la UI muestra un vacío falso ("0 solicitudes pendientes", "Sin centros"). No existe ningún `error.tsx`: con la API caída, `requireAuth` del layout lanza y Next muestra su pantalla genérica. Además, por debajo de `lg` el botón de menú fijo (`Sidebar`, `left-4 top-4`) tapa la cabecera de cada página (`app/(dashboard)/layout.tsx`, `p-4`).
**Resultado esperado:** cada lectura fallida se ve como aviso (`<AvisoCarga />`) con qué falló y por qué, sin perder el resto de la página. Los errores no controlados muestran un panel propio con **Reintentar**. El contenido móvil no queda debajo del botón de menú.

## 2. Fuera de alcance
Componentes cliente de `components/b2b/**` (ya gestionan `setError`). Los `res.json().catch(() => null)` de parseo de cuerpo son legítimos. Tampoco se tocan `lib/api.ts` ni `lib/b2b-api.ts` más allá de un comentario (spec 05).

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/lib/carga-core.ts` | crear | `mensajeCarga`, `crearCargaCon(rethrow)` puros |
| `reservaya-nextjs-api/lib/carga.ts` | crear | `crearCarga()` = núcleo + `unstable_rethrow` |
| `reservaya-nextjs-api/lib/carga-core.test.mjs` | crear | 4 tests |
| `reservaya-nextjs-api/components/ui/AvisoCarga.tsx` | crear | aviso `role="alert"`, null si no hay errores |
| `reservaya-nextjs-api/components/ui/ErrorPanel.tsx` | crear | fallback con digest + Reintentar |
| `reservaya-nextjs-api/app/error.tsx` | crear | errores de layouts anidados (API caída) |
| `reservaya-nextjs-api/app/(dashboard)/error.tsx` | crear | errores de página; el sidebar sigue visible |
| `reservaya-nextjs-api/app/(dashboard)/layout.tsx` | modificar | `pt-16` hasta `lg` |
| `app/(dashboard)/admin/{agenda,caja,canchas,clientes,complejos,horarios,metas,reportes,reservas}/page.tsx`, `admin/page.tsx`, `tecnico/{centros,suscripciones}/page.tsx`, `tecnico/page.tsx` | modificar | 25 cargas → `carga.de(...)` + `<AvisoCarga />` |
| `reservaya-nextjs-api/lib/b2b-api.ts` | modificar | comentario obsoleto de `getComplejos` |

## 4. Diseño y lógica
- `crearCarga()` es un colector por página. `carga.de(promesa, vacío, 'las reservas')` devuelve el dato o el vacío y acumula `"No se pudieron cargar las reservas: <motivo>."`. El tipo es `Promise<T | V>`.
- Motivo (`mensajeCarga`): el mensaje de la API si lo hay; si no, `la API respondió <status>`; `TypeError` → `sin conexión con la API`. No se exponen trazas.
- `unstable_rethrow` (Next 16) relanza `redirect()`, `notFound()` y el uso dinámico. Se inyecta para poder probar el núcleo con `node --test`, porque Node no resuelve `next/navigation` desde ESM.
- `error.tsx` en Next 16 recibe `unstable_retry` (no `reset`). En producción el mensaje de servidor se oculta y solo se muestra el `digest`.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos | `npm run typecheck` | 0 errores |
| A2 | Lint | `npx eslint` sobre los archivos tocados | 0 errores |
| A3 | Tests | `npm test` | verde; +4 en `carga-core.test.mjs` |
| A4 | Build | `npm run build` | OK |
| A5 | Sin silencios | `grep -rn "\.catch(() => \(\[\]\|null\))" app` | 0 |
| A6 | API parcial | backend falso (auth 200, suscripciones 403, reporte 500) → `/tecnico`, `/tecnico/centros` 1280/375 | aviso con ambos motivos, página renderizada, 0 errores, scroll-x 0 |
| A7 | API caída | sin backend → `/tecnico` | `ErrorPanel` con Ref; **Reintentar** con la API de vuelta → "Panel técnico" |

## 6. Checklist
- [x] T1: `carga-core.ts` + `carga.ts` + tests.
- [x] T2: `AvisoCarga`, `ErrorPanel`, `app/error.tsx`, `app/(dashboard)/error.tsx`.
- [x] T3: migrar las 25 cargas de las 13 páginas.
- [x] T4: `pt-16` hasta `lg` en el layout del panel (bug previo encontrado al verificar).
- [x] T5: verificar A1–A7 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | `npm run typecheck` → 0 errores |
| 2026-09-25 | A2 | ✅ | `npx eslint` sobre los archivos modificados y nuevos de `app/ components/ lib/` → 0 problemas |
| 2026-09-25 | A3 | ✅ | `npm test` → 13/13 (4 nuevos: mensajes, éxito, fallo acumulado, `redirect` relanzado) |
| 2026-09-25 | A4 | ✅ | `npm run build` → Compiled successfully |
| 2026-09-25 | A5 | ✅ | `grep` → 0 `.catch(() => []/null)` en `app/` |
| 2026-09-25 | A6 | ✅ | `next start` + backend falso `:5999`, Playwright 1280/375: `/tecnico` → "No se pudieron cargar el reporte: la API respondió 500." + "…las suscripciones: No tienes acceso a esta sede."; `/tecnico/centros` → aviso de suscripciones; HTTP 200, 0 errores de página, scroll-x 0; capturas revisadas (en 375 el aviso ya no queda bajo el botón de menú) |
| 2026-09-25 | A7 | ✅ | Backend apagado: `/tecnico` → HTTP 500 con "No pudimos cargar esta sección" + `Ref: <digest>` (antes: pantalla genérica de Next); al levantar el backend y pulsar **Reintentar** → "Panel técnico" + aviso de cargas parciales; 0 errores de página |
