# Especificación: 06 - CI en verde: lint del panel y pasos que faltaban (backlog P2-13)

## 1. Objetivo
**Problema:** `.github/workflows/ci.yml` ya existía, pero fallaría en dos jobs. `frontend`: `astro check` daba 95 errores (resuelto en la spec 02). `panel`: `npm run lint` daba **17 errores**:
- 13 × `react-hooks/set-state-in-effect` en `components/b2b/{AbonosPanel,CajaPanel×2,ConfigPanel×2,CronogramaView×2,HorariosPanel,MetasPanel,ResenasPanel,TorneosPanel}.tsx` y `components/features/ReservaForm.tsx`;
- 1 × `react-hooks/purity` (`Date.now()` en render, `MetasPanel.tsx`);
- 4 × `react/no-unescaped-entities` (`CronogramaView.tsx:693`).

Además, el CI no ejecutaba tests ni el build del panel.
**Resultado esperado:** los tres jobs pasan con el código actual (`db-check` depende del secreto `DATABASE_URL`). Los componentes se comportan igual o mejor.

## 2. Fuera de alcance
Los warnings `@next/next/no-img-element` (`dashboard/perfil/page.tsx:33`, que requeriría `images.remotePatterns` en `next.config.ts`) y `prisma/seed.ts` (territorio prohibido). También queda fuera partir `CronogramaView.tsx` (1 200 líneas).

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `components/b2b/CajaPanel.tsx` | modificar | `refrescar` como cadena de promesa; total animado con todo `setState` dentro del rAF |
| `components/b2b/MetasPanel.tsx` | modificar | `cargarMetas` (sin spinner, al montar) + `refrescar` (acciones); `ahora` se captura al hidratar para `histFiltrado` |
| `components/b2b/ResenasPanel.tsx`, `TorneosPanel.tsx` | modificar | `obtenerX()` a nivel de módulo + `cargar` (efecto) / `recargar` (reintento y acciones) |
| `components/b2b/HorariosPanel.tsx` | modificar | spinner y limpieza en los `onChange`; estado inicial = cargando si hay local |
| `components/b2b/CronogramaView.tsx` | modificar | `modalSinLocal` derivado; `marcarCargaHorario`/`cambiarVista`; constantes a nivel de módulo; comillas tipográficas; fuera el import sin uso |
| `components/b2b/ConfigPanel.tsx` | modificar | `cambiarTab` enciende el spinner de Pagos; lectura de localStorage con `eslint-disable` justificado |
| `components/b2b/AbonosPanel.tsx` | modificar | lectura de localStorage con `eslint-disable` justificado |
| `components/features/ReservaForm.tsx` | modificar | cotización ligada a su clave (`cancha\|fecha\|inicio\|fin`); `cotizado`/`cotizando` derivados |
| `.github/workflows/ci.yml` | modificar | panel: `typecheck`, `lint`, `test`, `build` (con `JWT_SECRET` ficticio) |

## 4. Diseño y lógica
- **Carga al montar:** la función que llama el efecto no hace `setState` en su cuerpo; solo en `.then/.catch/.finally`. El lint no reconoce `await` como frontera asíncrona. Los reintentos del usuario usan `recargar()` (spinner y limpieza primero).
- **localStorage tras hidratar** (Abonos, Config, historial de Metas): sincroniza con un sistema externo y en SSR no hay `window`. Es la excepción legítima de la regla: se deja `eslint-disable` en bloque con el motivo escrito.
- **ReservaForm:** una cotización solo se muestra si su clave coincide con la de los datos actuales; si no, la base. Antes podía verse el precio de otra franja durante el debounce.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Lint | `npm run lint` | 0 errores |
| A2 | Tipos / tests / build | `npm run typecheck`, `npm test`, `npm run build` | verde |
| A3 | Frontend | `astro check` + `astro build` | 0 errores |
| A4 | YAML | parseo de `ci.yml` | válido, 3 jobs |
| A5 | Comportamiento | backend falso v2 (datos para caja, metas, reseñas, torneos, abonos, horarios, canchas, cotización) + Playwright 1280/375 en las 9 rutas | carga, interacción OK, 0 errores de página, scroll-x 0 |

## 6. Checklist
- [x] T1: corregir los 17 errores de lint.
- [x] T2: añadir `test` y `build` al job del panel.
- [x] T3: verificar A1–A5 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | `npm run lint` → 17 errores / 4 warnings **→ 0 / 2** (quedan `no-img-element` y `prisma/seed.ts`, fuera de alcance) |
| 2026-09-25 | A2 | ✅ | `typecheck` 0 · `npm test` 13/13 · `JWT_SECRET=<ficticio> npm run build` → Compiled successfully |
| 2026-09-25 | A3 | ✅ | `astro check` 0 errores · `astro build` OK |
| 2026-09-25 | A4 | ✅ | `yaml.parse(ci.yml)` → jobs `frontend, panel, db-check`; panel: `npm ci → typecheck → lint → test → build` |
| 2026-09-25 | A5 | ✅ | `next start` con rewrites a `:5999` + Playwright 1280/375 (18 casos): `/admin/caja` producto → ticket S/ 2.50 y "Vendido hoy S/ 120.00"; `/admin/metas`, `/admin/resenas`, `/admin/torneos`, `/admin/abonos` cargan sus datos; `/admin/configuracion` pestaña Pagos; `/admin/horarios` y la vista Horarios de `/admin/agenda` → 08:00–21:00; `/dashboard/canchas` Reservar 19:00–20:00 → "S/ 95" + "Tarifa aplicada: Tarifa nocturna"; 0 errores de página/consola; scroll-x 0; capturas revisadas |

## 8. Pendiente fuera del código
- El job `db-check` necesita el secreto `DATABASE_URL` en GitHub (Settings → Secrets and variables → Actions). Sin él falla a propósito: es mejor que falle a que omita el chequeo de deriva sin avisar. No se pudo comprobar porque `gh` no está disponible en esta sesión.
- Los pasos de CI se reprodujeron en local salvo `npm ci`, que no se ejecutó para no reinstalar `node_modules` en OneDrive.
