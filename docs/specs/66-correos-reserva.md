# Especificación: 66 - Correos de reserva: confirmación, cambios y recordatorio

Estado: aprobada 2026-10-08 (humano: "trabaja en todas las mejoras sin coste").

## 1. Objetivo
**Problema:** la API no envía ningún correo al crear, confirmar o cancelar una reserva (`apps/api/src/reservas/reservas.ts:36`, `:52-53`), ni un recordatorio. Ya existe `MailProvider` con Resend (`apps/api/src/auth/providers.ts:61-100`), que se usa para el reclamo y para recuperar la contraseña.

**Resultado esperado:**
- El jugador recibe un correo al crear la reserva (estado y código), al confirmarse y al cancelarse.
- El jugador recibe un recordatorio unas 2 h antes de jugar.
- El dueño recibe un aviso de cada reserva nueva.
- Sin coste: Resend tiene plan gratuito y ya está configurado en Render.

## 2. Fuera de alcance
WhatsApp/SMS, pagos y cambios de flujo de reserva.

**Decisiones de producto que requieren aprobación:** ninguna. Migración `3_recordatorio_reserva` (`recordatorioEnviadoEn DateTime?` en `Reserva`): se prueba en QA y en producción solo con el OK del humano.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `packages/shared/src/` (plantillas, como `reclamaciones.ts`) | crear | texto y HTML del correo; fecha y hora en hora de Perú (`fechaPeru`) |
| `apps/api/src/auth/providers.ts` | modificar | `queueReserva` genérico (transporte sin `PASSWORD_RESET_URL`, como el reclamo) |
| `apps/api/src/reservas/reservas.ts` | modificar | encolar tras `$transaction` (como `reclamos.ts`), sin bloquear la respuesta |
| `apps/api/src/reservas/recordatorios.ts` | crear | tarea en proceso cada 5 min (`setInterval(...).unref()`): reservas `CONFIRMADA` que empiezan en ≤ 2 h y sin `recordatorioEnviadoEn` → enviar y marcar (`updateMany` condicional, idempotente) |
| `packages/db/prisma/schema.prisma` + `migrations/3_recordatorio_reserva` | modificar / crear | columna nueva |
| tests | crear | sin llamar a Resend real |

## 4. Diseño y lógica
- **Contenido del correo:**
  - Complejo y cancha, fecha y hora (hora de Perú), total, código y estado.
  - Enlace a `https://reservaya.site/dashboard/reservas` y enlace "Cómo llegar" si el complejo tiene coordenadas (spec 62).
- **Destinatarios:**
  - El jugador (`usuario.email`).
  - El dueño (`complejo.usuarioByDuenoId.email`), solo para las reservas nuevas.
- **Fallos:** un fallo de correo nunca rompe la reserva; solo queda en el log, sin datos personales.
- **Recordatorio:** solo uno por reserva. Si la API estuvo dormida y el partido ya empezó, no se envía.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate completo | turbo build/typecheck/lint/test (god) | 18/18 |
| A2 | Tests | crear, confirmar y cancelar encolan el correo correcto; el recordatorio es idempotente y no se envía si ya empezó; un fallo de Resend no cambia la respuesta | pasa |
| A3 | Migración | `migrate deploy` en QA al día | pasa |
| A4 | Producción | el humano hace una reserva de prueba y recibe los correos | pasa |

## 6. Checklist
- [x] T1 plantillas · [x] T2 envío en crear/confirmar/cancelar · [x] T3 recordatorio + migración · [x] T4 tests/docs/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 | pasa | `apps/api` vitest 139/139 (nuevos: `reservas/correos.test.ts` 8, `reservas.test.ts` +5), `packages/shared` 3/3 (`reservas-correo.test.ts`); typecheck y lint API/shared OK. `fetch` simulado: ningún test llama a Resend. Cubre crear/confirmar/cancelar (incluidas pendientes solapadas canceladas), dueño solo en reservas nuevas, recordatorio único y no enviado si ya empezó, fallo de Resend (500) sin cambiar el 201 y log sin correos. |
| 2026-10-08 | A3 | pasa | QA `qa-migracion-ts`: `migrate deploy` aplicó `3_recordatorio_reserva` sobre 0–2; `migrate status` «Database schema is up to date!». UPDATE condicional del recordatorio probado en QA dentro de transacción revertida: 1.ª vez 1 fila, 2.ª vez 0. |
| 2026-10-08 | Notas | — | Columna nueva solo vía SQL crudo (`$executeRaw`) para no depender del cliente Prisma generado; candidatos con `findMany` tipado. «Cómo llegar» lee `latitud/longitud` (spec 62) si el cliente las devuelve. Hora: `fecha` + minutos de reloj de Perú (UTC-5 fijo). Render gratis se duerme: sin tráfico no hay recordatorio; tarea solo arranca con transporte configurado. A1 y A4 pendientes (god / humano). |

