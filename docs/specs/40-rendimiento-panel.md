# Especificación: 40 - Rendimiento del panel

**Aprobada por Lukas:** 2026-09-30 00:35 («Acepta todas las ask me»).

## 1. Objetivo
**Problema:** la auditoría de Oscar (`hive/agents/oscar-code-mumyo7te/auditoria-rendimiento-panel.md`, contrastada con la skill `vercel-react-best-practices`) encontró 8 hallazgos. Pantallas grandes del panel bajan todo su JavaScript al abrir (`components/b2b/CronogramaView.tsx` ~1300 líneas, `components/b2b/CajaPanel.tsx` ~897, `components/features/CanchaCard.tsx` con `Modal` + `ReservaForm` por tarjeta), y varias cargas de datos van en cascada (`app/(dashboard)/dashboard/perfil/page.tsx:10-13`, `components/b2b/EquipoPanel.tsx:61-84`, `components/features/GestionCanchasPanel.tsx:177-179`).
**Resultado esperado:** cada pantalla baja solo el código de la vista que se ve; los datos independientes se piden en paralelo. Sin cambios visibles ni de comportamiento.

## 2. Fuera de alcance
Backend, `prisma/**`, `.env`, dependencias nuevas (nada de `swr`), cambios de diseño, textos y rutas.

**Decisiones de producto que requieren aprobación:**
1. Aprobar la spec.
2. QA funcional de la tanda B: las pantallas de agenda, caja y canchas exigen sesión. Sin cuentas de prueba (ADMIN o SUPERADMIN, y USUARIO), la tanda B se verifica solo con gates y revisión de código.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/app/(dashboard)/dashboard/perfil/page.tsx:10-13` | modificar | A1 · `Promise.all` de sesión y reservas; sin UI si la sesión es inválida |
| `reservaya-nextjs-api/components/features/GestionCanchasPanel.tsx:177-179` | modificar | A2 · en edición, `updateCancha` y `subirImagen` en paralelo; al crear sigue en secuencia (necesita el id) |
| `reservaya-nextjs-api/components/b2b/EquipoPanel.tsx:61-84` | modificar | A3 · complejos y equipo inicial llegan por props desde el Server Component; el fetch cliente queda para cambios de complejo |
| `reservaya-nextjs-api/lib/b2b-api.ts` | modificar | A3 · función servidor para el equipo usando el mismo endpoint que ya usa el cliente (sin cambios de API) |
| página servidor que monta `EquipoPanel` | modificar | A3 · la ubica Oscar con grep; pasa los datos iniciales |
| `reservaya-nextjs-api/components/features/ClientesPanel.tsx:51-59` | modificar | A4 · caché por complejo con `Map` dentro del componente (sin dependencia nueva) |
| `reservaya-nextjs-api/components/features/CanchaCard.tsx` | modificar | B1 · `Modal` + `ReservaForm` con `next/dynamic`, cargados al abrir |
| `reservaya-nextjs-api/components/b2b/CronogramaView.tsx` | modificar / crear archivos hermanos | B2 · vistas semana, mes y horarios, drawer y modal en `next/dynamic`; en el bundle inicial solo la vista activa y los controles comunes |
| `reservaya-nextjs-api/components/b2b/CajaPanel.tsx` | modificar / crear archivos hermanos | B3 · cada pestaña y modal en `next/dynamic`, con precarga al hover o foco |
| `reservaya-nextjs-api/app/(dashboard)/admin/agenda/page.tsx:24-36` | modificar | C1 · pasar a `CronogramaView` solo los campos que consume |

## 4. Diseño y lógica
- **UI:** idéntica. Mientras carga un trozo dinámico se ve el mismo esqueleto o estado de carga que ya use la pantalla; nunca un hueco.
- **API:** los mismos endpoints de hoy; si A3 exige un endpoint nuevo → `BLOQUEO-API` y A3 se cae de la spec.
- **Invariantes:** la sesión sigue en la cookie HttpOnly `token`; las guardas `requireAuth`/`requireRole` corren antes de pedir datos protegidos; `.densidad-fija` y `HORA_PX=52` intactos (Spec 37); multitenancy solo en la API.
- **Orden:** tanda A (bajo riesgo) → tanda C → tanda B (partir componentes grandes, un componente por lote).

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores; avisos ≤ los de hoy |
| A3 | Tests | `npm --prefix reservaya-nextjs-api test` | todos pasan |
| A4 | Build | `npm --prefix reservaya-nextjs-api run build` | compila |
| A5 | Carga en paralelo | revisión del diff: A1–A4 sin `await` en serie entre datos independientes | 0 cascadas |
| A6 | Carga dinámica | revisión del diff: B1–B3 usan `next/dynamic`; `CronogramaView.tsx` y `CajaPanel.tsx` < 500 líneas cada uno | cumple |
| A7 | Sin regresión visual | Playwright 360/1440 en las rutas con sesión, si Lukas da cuentas de prueba | igual a hoy |

## 6. Checklist
- [x] Tanda A: A1 perfil, A2 edición de canchas, A3 equipo, A4 clientes.
- [x] Tanda C: C1 agenda serializa solo lo necesario.
- [ ] Tanda B1: CanchaCard.
- [ ] Tanda B2: CronogramaView.
- [ ] Tanda B3: CajaPanel.
- [ ] Gates y §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1–A4 (tandas A y C) | ✅ | god: typecheck 0 · lint 0 errores, 2 avisos (los de antes) · test 40/40 · build compila (2.º intento; el 1.º chocó con otra compilación en curso) |
| 2026-09-30 | A5 (tanda A) | ✅ | revisión god del diff: perfil arranca reservas en paralelo con `carga.de` y espera la sesión antes de producir UI; equipo llega desde el servidor (`getEquipo` en `lib/b2b-api.ts`, mismo endpoint) con `AvisoCarga`; edición de canchas en `Promise.all`; clientes con caché `Map` por complejo invalidada al sancionar o levantar |
| 2026-09-30 | C1 | ✅ | `admin/agenda/page.tsx` proyecta canchas, reservas y complejos a los tipos `*Cronograma` de `CronogramaView.tsx` (Pick); typecheck confirma que no usa otros campos |
| 2026-09-30 | A7 | pendiente | sin cuentas de prueba: QA visual con sesión la hace Lukas |
| 2026-09-30 | B2, B3 | descartada | Lukas decidió dejarla (ILK-56, 19:52) tras 3 intentos fallidos; `CronogramaView.tsx` y `CajaPanel.tsx` quedan como en HEAD |
