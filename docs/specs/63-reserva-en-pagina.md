# Especificación: 63 - Reservar desde la página del complejo (días y franjas)

Estado: aprobada 2026-10-08 (humano: "haz las dos fases"). Depende de la spec 62. Referencia de disposición: tarjeta «Reservar horario» de CanchasGO (solo estructura).

## 1. Objetivo
**Problema:** en `/c/[slug]`, "Reservar" lleva al flujo del panel; no se ven las horas libres ni el precio por franja.

**Resultado esperado:** en la columna derecha (fija al bajar en escritorio; hoja inferior en móvil) aparece una tarjeta «Reservar horario» con:
- Un selector de cancha, si el complejo tiene varias.
- Una tira de 14 días.
- Una cuadrícula de franjas de 30 min con hora, precio y estado: libre, ocupada, pasada o fuera de la anticipación (spec 69), y elegida.
- Selección de franjas seguidas, de 1 a 3 h.
- El total cotizado y el botón «Reservar».

Sin sesión, «Reservar» lleva a iniciar sesión y vuelve a la misma selección (`returnUrl` con `cancha`, `fecha`, `inicio` y `fin`).

## 2. Fuera de alcance
Pago en línea (hoy la reserva queda `PENDIENTE` o `CONFIRMADA` según la regla actual).

**Decisión humana 2026-10-08:** cobro proporcional por media hora: 90 min a S/80/h = S/120. Se cambia `quote()` común para que cotizar, agenda y POST coincidan; sustituye el cobro anterior por hora iniciada. Los céntimos se redondean de forma acumulada para sumar las franjas sin diferencias de un céntimo. Las reservas usan minutos (`horaInicio`/`horaFin` 0–1440, `apps/api/src/reservas/reservas.ts:36`), así que las franjas de 30 min son posibles.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/public/read.*` | modificar | `GET /api/canchas/:id/agenda?fecha=YYYY-MM-DD` → franjas de 30 min dentro del `HorarioOperativo` con `estado` y `precio` (mismas reglas de precio y promociones que `cotizar`); sin datos de otros jugadores |
| `apps/web/components/public/reserva/*` | crear | `ReservaWidget` (días, franjas, selección, total) |
| `apps/web/app/(public)/c/[slug]/page.tsx` | modificar | montar el widget en la columna derecha y la barra inferior móvil |
| tests | crear | agenda (ocupadas, pasadas, horario cerrado) y lógica de selección contigua |

## 4. Diseño y lógica
- Reservar llama a `POST /api/reservas` existente con la sesión, y la respuesta se muestra en la misma tarjeta (código y estado).
- Si otro usuario tomó la franja mientras tanto (409), se avisa y se recarga la agenda.
- Leyenda: Ocupado · Libre · Elegido · No disponible.
- Accesibilidad: las franjas son botones `aria-pressed`, navegables con teclado y de ≥ 44 px.
- La agenda se recarga al cambiar de día. Sin CLS: esqueletos del mismo tamaño.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate | turbo (god) | 18/18 |
| A2 | Agenda | tests: estados y precios correctos; horario cerrado sin franjas | pasa |
| A3 | Selección | tests: solo contiguas, 1–3 h, total = suma de las franjas | pasa |
| A4 | E2E | Playwright en QA: elegir 1 h, iniciar sesión, reservar, ver el código; repetir la misma franja → 409 controlado | pasa |

## 6. Checklist
- [x] T1 endpoint agenda · [ ] T2 widget · [ ] T3 integración/login · [ ] T4 tests/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 | Pasa |11tests de agenda: controlador anónimo, campos públicos, ocupación, pasadas/anticipación Perú, calendario cerrado, fallback, visibilidad y fecha inválida. Pricing común probado con prorrateo/90min=120, bandas y céntimos aditivos. API185/185 (gate sin build). |
| 2026-10-08 | A3 | Pasa |6tests de selección:1–3h, sin huecos/bloqueadas, extremos, sumacéntimos, revalidación tras login,14días Perú y returnUrl íntegro. |
| 2026-10-08 | Gate sin build | Pasa |Node22 turbo typecheck/lint/test16/16; ejecución nativa web+runner+motion en un proceso111/111; diffcheck limpio. |
| 2026-10-08 | A1 | Pendiente (god) |Gate con build18/18 fuera sandbox. |
| 2026-10-08 | A4 | Pendiente (god) |Script preparado spec63-reserva-qa.mjs en carpeta privada del agente, node--checkPASS. Requiere servidorlocalhostQA, SPEC63_SLUG y QA_USUARIO_EMAIL/PASSWORD; simula agenda/POST para no escribir DB. Valida login/retorno/código/409+recarga. Confirmar una PENDIENTE antes de repetir para conflicto real (regla vigente: solo CONFIRMADA ocupa). |
| 2026-10-08 | A1 / A4 | Pasa (god) |God confirmó gate18/18, script E2E pasa y agenda real QA26franjas; integrado en b8b5317 (inbox16:53). |
