# Especificación: 57 - Correo de constancia del Libro de Reclamaciones

## 1. Objetivo
**Problema:** `apps/api/src/reclamos/reclamos.ts:71–72` persiste el reclamo y devuelve la constancia sin enviar correo.
**Resultado esperado:** tras confirmar el registro, enviar la constancia al consumidor y un aviso separado a ReservaYa. La respuesta 201 y el registro permanecen válidos aunque falle cualquier envío.
**Estado:** completada 2026-10-08 (6d0a602, fecha Perú bec58f0).

## 2. Fuera de alcance
Cambiar la respuesta HTTP, correlativos, validación, plazo de respuesta, esquema DB o implementación .NET; despliegues, configurar secretos, envío real en pruebas, cola persistente y reintentos de entrega.
**Decisiones de producto que requieren aprobación:** ninguna; aprobación recibida.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/reclamos/reclamos.ts` | modificar | Encolar dos mensajes después del commit. |
| `apps/api/src/auth/providers.ts` | modificar | Reutilizar transporte Resend y cola; separar condición de correo genérico de recuperación. |
| `apps/api/src/auth/providers.test.ts` | modificar | Fetch simulado, configuración y errores. |
| `packages/shared/src/index.ts` | modificar | Exportar formateador. |
| `packages/shared/src/reclamaciones.ts` | crear | Formateador puro de constancia, compartido por web y API. |
| `apps/web/lib/public/reclamaciones.ts` | modificar | Delegar textoReclamacion conservando su salida y firma públicas. |
| `apps/web/lib/public/reclamaciones.test.mjs` | modificar | Comparación exacta del texto antes/después. |
| `apps/api/src/caja/finance.test.ts` | modificar | Registro, commit, rollback y efectos de correo sin DB/Resend reales. |
| `scripts/f6-parity.mjs` | modificar solo si detecta correo | Documentar y comprobar exclusivamente el efecto nuevo intencional. |

## 4. Diseño y lógica
- **UI:** sin cambios visibles ni promesas de entrega; conservar la constancia descargable actual.
- **API:** POST `/api/reclamos` conserva status 201, cuerpo y efectos DB. Obtener el resultado de `$transaction`, salir del bloque de reintentos de transacción y entonces encolar: jamás enviar/encolar dentro del callback, ni repetir el INSERT por error de correo.
- **Texto:** extraer la función pura `textoReclamacion` a shared, exponiéndola por el entrypoint del paquete; web mantiene el adaptador de FormData. Conservar literalmente título, etiquetas, orden, saltos y valores por defecto actuales, número, fecha UTC y plazo de 15 días hábiles. API adapta campos normalizados del registro al formato web (`medioRespuesta` → `respuesta`, menor → texto correspondiente, monto sin pérdida decimal); fecha y datos provienen del registro confirmado, no de una segunda consulta o del reloj posterior.
- **Mensajes:** consumidor = email validado del reclamo; asunto `Constancia de reclamación — {numero}`. Interno = `RECLAMOS_EMAIL`, nueva variable sin valor fijado aquí; asunto `Nuevo reclamo — {numero}`. Ambos contienen el mismo texto de constancia; HTML, si se incluye, escapa todos los datos. Envíos independientes, nunca CC/BCC; fallo de uno no bloquea el otro.
- **Proveedor:** reutilizar `MailProvider.queue` y transporte fetch de Resend existente, con límite de cola y timeout existentes. Introducir condición genérica: EMAIL_PROVIDER Resend + RESEND_API_KEY + EMAIL_FROM; **el reclamo no necesita PASSWORD_RESET_URL**. `configured()` y recuperación mantienen además el requisito de URL de reset válida, conservando su comportamiento previo. No habilitar transporte log de datos del reclamo.
- **Configuración:** si falta RECLAMOS_EMAIL o es inválida, omitir únicamente aviso interno; no afectar constancia al consumidor. Sin configuración de transporte, omitir entrega y registrar diagnóstico seguro.
- **Invariantes:** envío best effort después del commit; cola rechazada/llena, excepción síncrona, timeout o respuesta no exitosa de Resend solo generan log seguro con número y clase de fallo, sin destinatarios, contenido, documento ni credenciales. Nunca borrar reclamo ni cambiar 201. Sin garantía de entrega ante reinicio del proceso.
- **Paridad:** correo es una divergencia intencional frente a .NET. Mantener comparación estricta HTTP/DB. Solo si F6 captura y detecta este efecto, registrar su diferencia explícita y exigir los mensajes esperados; no convertir otras diferencias en aceptadas ni declarar paridad idéntica de efectos.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos, lint y build API/shared/web | pnpm con filtros de los paquetes afectados | 0 errores |
| A2 | Orden transacción/correo | Mock commit diferido, rollback y conflicto seguido de éxito | 0 envíos antes de commit; una pareja tras éxito; 0 tras rollback definitivo |
| A3 | Texto idéntico a web | Fixture golden: mayor, menor, campos opcionales y monto decimal | Igualdad literal |
| A4 | Dos destinatarios independientes | Fetch mock, correo válido y RECLAMOS_EMAIL ausente/inválido | 2 mensajes separados o solo consumidor |
| A5 | Fallos no alteran registro | Fetch timeout/no exitoso; cola llena; excepción síncrona | Siempre 201 y registro conservado; log sin datos privados |
| A6 | Configuración separada | Reclamo sin PASSWORD_RESET_URL; recuperación sin URL | Reclamo habilitado con Resend; recuperación sigue deshabilitada |
| A7 | Paridad F6 | Runner con correo interceptado si lo detecta | HTTP/DB sin diferencias; solo correo intencional documentado |

## 6. Checklist
- [x] T1: aprobar borrador y despachar implementación.
- [x] T2: compartir formateador preservando salida web.
- [x] T3: separar configuración de transporte y recuperación; encolar tras commit.
- [x] T4: probar envíos y fallos con fetch mockeado, sin Resend real.
- [ ] T5: verificar criterios y anotar evidencia en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-07 | A1 | Tipos/lint API/shared/web y build API/shared PASS; build web bloqueado por sandbox | `pnpm turbo run build typecheck lint test --filter=@reservaya/api --filter=@reservaya/shared --filter=@reservaya/web`: 13/14 tareas, fallo web por binding de puerto EPERM. API/shared: mismo comando sin filtro web, 10/10 tareas; web typecheck/lint exit 0. |
| 2026-10-07 | A2 | PASS, commit diferido/rollback/retry | `pnpm --filter @reservaya/api test`: 111/111, suite finance 18; 0 mails precommit/rollback, 2 tras éxito. |
| 2026-10-07 | A3 | PASS, texto literal compartido | `node apps/web/lib/public/reclamaciones.test.mjs`: 4/4; ejecución directa de tests web: 69/69. |
| 2026-10-07 | A4 | PASS, interno ausente/inválido y dos destinos separados | Tests finance: 18/18; provider: 21/21, con fetch simulado. |
| 2026-10-07 | A5 | PASS, HTTP 201 y fila conservada | Tests finance incluyen HTTP real con DB simulada, cola llena/excepción; provider cubre timeout/HTTP no exitoso y logs sin contenido/destinatario. |
| 2026-10-07 | A6 | PASS, sin URL de reset entrega reclamo y recuperación deshabilitada | `pnpm --filter @reservaya/api test`: provider 21/21. |
| 2026-10-07 | A7 | Pendiente god; QA inaccesible desde sandbox | No repetir conexión fallida conocida; F6 actual no captura correo, no se modificó runner ni artefactos. |
| 2026-10-08 | A1 | PASS (god, fuera de sandbox) | Mismo comando turbo con 3 filtros: 14/14 tareas; API 111/111, web 69/69, shared 1/1. |
| 2026-10-08 | A7 | PASS (god) | `node scripts/f6-parity.mjs --confirm-qa-migracion-ts` sin variables de correo: 206/206, 16 divergencias de seguridad intencionales, 0 fallos; F3 40/40 (recuperación intacta). |
