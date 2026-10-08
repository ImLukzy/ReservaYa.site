# F7 — reservas en Nest

Estado: seis rutas implementadas; gate externo de paridad y concurrencia pendiente. No se declara F7 completa.

Portado ReservasController sin modificar sus fuentes .NET. Jugador lista sus reservas y solo puede cancelar las propias; staff usa dueño/membresía vigente y fallback de cancha para reservas legacy sin complejoId; TECNICO global. Validación QR conserva estado CONFIRMADA, auditoría validadaEn/validadaPor y sanción activa prioritaria. DTOs conservan precios con dos decimales, navegación de cancha y presencia de usuario según acción.

Crear y PATCH usan SERIALIZABLE. La cancha se bloquea durante la transacción, y todas las consultas de alcance, horario, precio y solape emplean el cliente transaccional. Solo reservas CONFIRMADAS bloquean horarios; pendientes coincidentes son válidas por contrato. Confirmar cancela pendientes solapadas dentro de la misma transacción. Los límites son estrictos: fin=inicio de otra reserva permite adyacencia. Total se calcula en el servidor con el motor PrecioCancha F2, promociones PRECIO_ESPECIAL, y cobro por cada hora iniciada como .NET. El request no admite precio/pago arbitrario; pagos/abonos son el dominio F6 y no se modifican.

Primer horario general se crea post-commit con mejor esfuerzo, igual que .NET. QR aleatorio RF-4hex, reintento por colisión y respuestas409 para serialización/FK. Sin Google, correo ni bucket reales.

Verificación local Node22.20:

- API85/85 tests PASS (siete nuevos de reservas: precio ignorando total del cliente, adyacencia, bloqueos, cancelación atómica, permisos de jugador y serialización).
- API build/typecheck/lint PASS; parser/checkJs runner y git diff-check PASS.
- Host legacy Release:0 errores; dos warningsNU1900 por red de auditoría NuGet no disponible.
- Cleanup F7:3/3 tests PASS ejecutando directamente `node scripts/f7-cleanup.test.mjs`.
- SmokeSIGTERM Node22 PASS con adaptador administrativo simulado: DROP invocado, proceso hijo real detenido, scratch real eliminado, salida1. Borrado real QA aún no probado.

Runner `node scripts/f7-parity.mjs --confirm-qa-migracion-ts`: crea BD vacía f7_fixture_<12hex> y baseline; datos ficticios, efectos íntegros de tablas incluidas promociones/horarios, status/body/headers/correo/borrado ficticios. Normaliza IDs nuevos y QR solo tras formato válido; conserva diferencias UTC. Fixture15150, nunca servicios humanos3000/5000. Guarda parity-results.json con complete=false al abortar, y complete=true solo al terminar. Cleanup tiene guarda de nombre, tres clientes administrativos frescos, tiempos acotados y SIGINT/SIGTERM.

Incluye tres rondas mixtas contra la misma BD: creación de solicitudes pendientes por Nest/.NET y confirmaciones concurrentes intercaladas entre ambos backends. Exige exactamente una confirmada y un éxito, y respuestas Nest200/409; resultados legacy de concurrencia se registran para diagnóstico informativo. Las pendientes solapadas no son defecto por el contrato anterior. No se afirma PASS hasta ejecutar QA.

Gate solicitado a god: build/host/paridad F7+smoke real, regresión F2–F5 y los gates F6 que coordina su worker, más clon limpio. Sin seed sobre DB existente, prod, apps/web, commit ni push.

## Primer gate externo (20:19)
God informó47PASS,2divergencias de seguridad,2fallos y aborto de mixedRace. Corregido POSTvalidar a HTTP200. Confirmado en el propio fixture que f7-other tiene complejoId null y cancha de sede b: el DELETE legado consulta sin Include(Cancha), calcula complejo null y acepta un recurso ajeno. God autorizó clasificar E075-otra-sede como SECURITY_DIVERGENCE; Nest mantiene403, sin cambios ni efectos laterales.
La preparación mixta ahora instala horarios generales antes de lanzar POST concurrentes. Si SERIALIZABLE rechaza solicitudes y quedan menos de dos candidatas, completa la preparación mediante POST secuenciales a los dos backends; no cambia estados directamente para simular éxitos. Conserva estados de creación y suplementos y añade status/body al assert si todavía falta una candidata. La carrera de confirmación sigue siendo simultánea Nest/.NET y exige una sola confirmada. Node22 API95/95 (incluye diez nuevas pruebas F6 del worker), build/checkJs/diffPASS. Segundo gate solicitado, sin afirmar nuevoPASSQA.
