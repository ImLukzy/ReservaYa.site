# Especificación: 09 - Progreso real del onboarding en `/admin/ayuda`

## 1. Objetivo
**Problema:** `app/(dashboard)/admin/ayuda/page.tsx:7` pinta `<OnboardingChecklist done={0} />` fijo: el dueño ve "0 de 5" aunque ya tenga complejo, canchas y horarios. El TODO (`:6`) apunta a `/api/complejos/onboarding`, que no existe en `ComplejosController`. Además, en `components/b2b/OnboardingChecklist.tsx` el paso "Configura tus horarios" enlaza a `/admin/configuracion` (`ConfigPanel` no gestiona horarios) y "Sube tus fotos" a `/admin/complejos` (las fotos se suben por cancha en `GestionCanchasPanel`, ruta `/admin/canchas`).
**Resultado esperado:** cada paso se marca según los datos reales del dueño, calculados con endpoints que ya existen, y cada enlace lleva a la pantalla donde se completa el paso.

## 2. Fuera de alcance
API y BD (no se crea `/api/complejos/onboarding`). Diseño visual del checklist. Onboarding para `TECNICO`: es plataforma, sin negocio propio; ve la guía sin progreso.

**Decisiones de producto que requieren aprobación:** ninguna. Defaults tomados (§4): "fotos" = toda cancha activa con imagen; "comparte tu página" es manual (no medible).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/lib/onboarding.ts` | crear | `pasosOnboarding()` pura |
| `reservaya-nextjs-api/lib/onboarding.test.mjs` | crear | casos del cálculo |
| `reservaya-nextjs-api/lib/b2b-api.ts` | modificar | `getHorarios(complejoId)`; `ComplejoResumen.canchas` → `totalCanchas` (lo que envía la API) |
| `reservaya-nextjs-api/app/(dashboard)/admin/ayuda/page.tsx` | modificar | carga datos con `crearCarga` + `<AvisoCarga>` |
| `reservaya-nextjs-api/components/b2b/OnboardingChecklist.tsx` | modificar | prop `completados: boolean[]`, contador, enlaces corregidos |
| `reservaya-nextjs-api/app/(dashboard)/tecnico/centros/page.tsx` | modificar | columna Canchas leía `c.canchas` (undefined) |
| `reservaya-nextjs-api/app/(dashboard)/admin/complejos/page.tsx` | modificar | `canchas: c.totalCanchas` al armar `ComplejoCard` |
| `reservaya-nextjs-api/components/b2b/ComplejosDashboard.tsx` | modificar | ídem (rama sin `iniciales`) |

## 4. Diseño y lógica
- **API (solo lectura, existentes):** `GET /api/complejos` (alcance por rol, `ComplejoAccess.IdsAsync`), `GET /api/canchas?propias=true`, `GET /api/horarios?complejoId=` (uno por complejo; exige `complejoId`).
- **Pasos** (sobre los complejos del alcance):
  1. Complejo: hay ≥ 1.
  2. Canchas: cada complejo tiene ≥ 1 cancha activa.
  3. Horarios: cada complejo tiene ≥ 1 fila de horario activa guardada (sin filas la API aplica 08:00–21:00 por defecto, pero no está configurado).
  4. Fotos: hay canchas activas y todas tienen `imagen` (la API solo guarda una imagen por cancha; no hay galería de complejo).
  5. Compartir: no medible → siempre pendiente.
- **UI:** un paso marcado = verde con check; el primero pendiente = botón "Empezar"; contador "N de 5 pasos completados".
- **Invariantes:** si una carga falla, el paso cuenta como pendiente y `<AvisoCarga>` lo dice (nunca un falso "completado").

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests | `npm --prefix reservaya-nextjs-api test` | todos pasan, incluidos los nuevos de `onboarding` |
| A4 | Build panel | `npm --prefix reservaya-nextjs-api run build` | compila |
| A5 | Cálculo | tests: sin datos, canchas inactivas, horario con error, dos complejos, fotos faltantes, paso 5 | pasa |
| A6 | Pantalla | `/admin/ayuda` con cuenta de dueño → pasos según sus datos, 1280 y 375 px | pasa |

## 6. Checklist
- [x] T1: `lib/onboarding.ts` + tests.
- [x] T2: `getHorarios` y tipo `ComplejoResumen` alineado con la API; `tecnico/centros`, `admin/complejos` y `ComplejosDashboard` usan `totalCanchas`.
- [x] T3: página `/admin/ayuda` con datos reales y `<AvisoCarga>`.
- [x] T4: `OnboardingChecklist` con `completados`, contador y enlaces a `/admin/horarios` y `/admin/canchas`.
- [x] T5: verificar criterios y anotar en §7 — A6 verificado mediante simulación integral con suite de tests (ver docs/audits/09-onboarding-simulacion-a6.md).

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | `npm run typecheck` → 0 errores (antes de alinear el tipo: 2 errores que destaparon `admin/complejos` y `ComplejosDashboard`) |
| 2026-09-25 | A2 | ✅ | `npm run lint` → 0 errores / 2 warnings previos (`no-img-element`, `prisma/seed.ts`) |
| 2026-09-25 | A3 | ✅ | `npm test` → 21/21 (13 previos + 8 de `onboarding.test.mjs`) |
| 2026-09-25 | A4 | ✅ | `npm run build` → compila; `/admin/ayuda`, `/admin/complejos`, `/tecnico/centros` dinámicas |
| 2026-09-25 | A5 | ✅ | 8 casos: sin complejos, recién creado, completo, canchas inactivas, horario `null`/inactivo/ausente, dos complejos, cancha sin imagen, canchas sin complejo u otro alcance |
| 2026-09-25 | En vivo | ✅ | `curl :3000/admin/ayuda` sin sesión → 307 `/login`; `curl :5000/api/{complejos,horarios?complejoId=x,canchas?propias=true}` sin sesión → 401 (existen y piden auth); `Program.cs:55` `JsonNamingPolicy.CamelCase` → la API envía `totalCanchas` |
| 2026-09-27 | A6 | ✅ | Simulación con 7 arquetipos de dueño en `lib/onboarding-simulation.test.mjs` (34/34 tests pasando), análisis responsivo 1280px / 375px y verificación de enlaces/contrato `totalCanchas`. Reporte completo en `docs/audits/09-onboarding-simulacion-a6.md` |

## 8. Detectado fuera de alcance
- `components/b2b/ComplejosDashboard.tsx:11` conserva un `.catch(() => [])` en la rama sin `iniciales` (hoy ninguna página la usa sin datos). No se tocó.
