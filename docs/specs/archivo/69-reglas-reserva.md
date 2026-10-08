# Especificación: 69 - Reglas del complejo: anticipación mínima y política de cancelación

Estado: aprobada 2026-10-08 (humano: "trabaja en todas las mejoras sin coste").

## 1. Objetivo
**Problema:** no existe anticipación mínima ni política de cancelación. Un jugador puede reservar para dentro de 5 minutos y cancelar en cualquier momento (`apps/api/src/reservas/reservas.ts:36`, `:52`).
**Resultado esperado:** cada complejo configura en su panel:
- La anticipación mínima para reservar (0–48 h, por defecto 0).
- El plazo mínimo para que el jugador cancele (0–72 h antes, por defecto 0).
- Un texto corto de política (≤ 300 caracteres).

La API lo aplica y la página del complejo y el widget de reserva (spec 63) lo muestran ("Se reserva con al menos 3 h de anticipación").

## 2. Fuera de alcance
Reembolsos y penalidades económicas (no hay pago en línea).

**Decisiones de producto que requieren aprobación:** ninguna (por defecto 0 = comportamiento actual). Migración `4_reglas_complejo`: QA primero; en producción solo con OK del humano.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `packages/db/prisma/schema.prisma` + `migrations/4_reglas_complejo` | modificar / crear | `Complejo.anticipacionMinMin Int @default(0)`, `cancelacionMinMin Int @default(0)`, `politica String?` |
| `apps/api/src/reservas/reservas.ts` | modificar | `create`: 409 si falta menos que la anticipación (hora de Perú); cancelar como USUARIO: 409 si está fuera de plazo. ADMIN/dueño sin restricción |
| `apps/api/src/complejos/complejos.ts` | modificar | editar las reglas (validación de rangos) |
| perfil público y endpoint `/api/complejos/publico/:slug` | modificar | exponer las reglas |
| panel (`ComplejosGrid.tsx` o Configuración) | modificar | formulario de reglas |
| tests | crear | límites y zona horaria |

## 4. Diseño y lógica
- Todos los cálculos de tiempo se hacen en `America/Lima`.
- Mensajes claros: "Este complejo acepta reservas con al menos 3 h de anticipación" y "Solo puedes cancelar hasta 24 h antes; contacta al complejo".

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate | turbo (god) | 18/18 |
| A2 | API | tests: dentro/fuera de anticipación; cancelar dentro/fuera de plazo; el dueño puede siempre; por defecto sin cambios | pasa |
| A3 | Migración | QA al día | pasa |
| A4 | UI | el dueño guarda las reglas y el perfil las muestra | pasa |

## 6. Checklist
- [x] T1 migración+API · [ ] T2 panel · [ ] T3 perfil/widget · [ ] T4 tests/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 | Pasa |10tests reglas Reserva: límite exacto/1ms antes, cambio de día UTC/Perú,409 antes de escritura/correo, cancelación y excepciones ADMIN/SUPERADMIN/TECNICO, cero conserva comportamiento.10tests de validación/guardado reglas Complejo + contrato público. API208/208. |
| 2026-10-08 | A3 | Pasa (god) |Migración4_reglas_complejo aplicada únicamente a qa-migracion-ts y status al día (inbox16:53). Esquema solo Complejo. Producción pendiente aprobación humana. |
| 2026-10-08 | Gate sin build | Pasa |Node22 turbo typecheck lint test --force16/16; web+runner+motion en un proceso112/112; diffcheck limpio. |
| 2026-10-08 | A1 | Pendiente (god) |Gate18/18 con build fuera sandbox. |
| 2026-10-08 | A4 | Pendiente (god) |Script Playwright privado spec69-reglas-qa.mjs listo y syntaxPASS: localhostQA + SPEC69_COMPLEJO_ID publicado/visible + QA_SUPERADMIN_*. Edita3h/24h/política, comprueba perfil tras TTL60 y restaura valores originales en finally. No ejecutado en sandbox. |

Los plazos se aplican a USUARIO dentro de la transacción antes de escrituras/correos. El límite exacto se acepta. Cero omite las nuevas restricciones (comportamiento anterior). El perfil y la agenda exponen plazos/política; el widget conserva las franjas ANTICIPACION de spec63.
| 2026-10-08 | A1 | Pasa | god con 68 y 69 en main: `turbo run build typecheck lint test --force` 18/18 (API 208, web 97). |
| 2026-10-08 | A4 | Pasa | god local (copia aislada :3100/:5300 contra `qa-migracion-ts`), `spec69-reglas-qa.mjs` con Melgar: el dueño guarda 3 h / 24 h / política y el perfil las muestra; reglas restauradas. |
