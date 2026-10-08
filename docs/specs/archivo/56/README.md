# Spec 56 — entrega F0

La spec fue aprobada por el humano según dispatch de god `conv-bcb2aa` del 2026-10-07. Esta fase solo produce documentos y fixtures. No implementa F1 ni aplica un baseline.

## Archivos

| Archivo | Contenido |
|---|---|
| [manifest.md](manifest.md) | Índice de las 106 acciones y su caso negativo principal |
| [manifest.json](manifest.json) | Permisos heredados y de acción, scope, parámetros, DTOs, ramas de respuesta y fuentes con hashes |
| [request-dtos.json](request-dtos.json) | Declaraciones y atributos de validación C# para reproducir los contratos en zod |
| [response-contracts.md](response-contracts.md) | DTOs, formatos y helpers de respuesta actuales; reglas transversales |
| [differences.md](differences.md) | Diferencias con documentación/spec y catálogo real de Jim |
| [docs-coverage.json](docs-coverage.json) | Menciones exactas de rutas en docs/api.md; no se presentan como contratos completos |
| [versions.md](versions.md), [versions.json](versions.json) | Pins propuestos exactos y evidencia; instalación conjunta pendiente F1 |
| [catalog-summary.json](catalog-summary.json) | Metadatos del catálogo de Jim, sin filas de negocio ni conexión directa de Michael |
| [fixtures/dataset.json](fixtures/dataset.json) | Actores y dos sedes sintéticas; estados y bindings declarativos |
| [fixtures/endpoint-cases.json](fixtures/endpoint-cases.json) | 403 casos: 106 nominales, 106 negativos principales y 191 variantes de seguridad/negocio |
| [fixtures/scenarios.json](fixtures/scenarios.json) | Secuencias de concurrencia, sesión, dinero y rollback que requieren ejecución aislada |

## Uso y límites de los fixtures

Son datos para el futuro harness de paridad, **no un runner ejecutable ni snapshots HTTP capturados**. `execution:not-run` y `baselineCapture:pending…` son intencionales. Los éxitos con JSON dinámico incluyen la expresión fuente exacta y línea; respuestas fijas se afirman solo cuando salen directamente del código. Los nominales abonos/cuenta tienen501 porque ese es el comportamiento existente.

El harness futuro debe resolver `${ids.*}`, `${foreignIds.*}`, `${dates.*}`, `${tokens.*}`, `${credentials.*}`, `${origins.*}`, `${media.*}` y `${oauth.*}` usando dataset/estado. `sourceExpressionCsharp` es evidencia de contrato, nunca se evalúa como JSON o como código. Se captura la respuesta legacy en el entorno aislado y se compara completa contra TS. Si falta binding, estado o captura, el caso queda pendiente: nunca se considera aprobado por un matcher amplio.

Cada caso restaura dos bases desechables equivalentes. No reproducir mutaciones dos veces sobre producción ni reutilizar su URL de Neon. Generar credenciales y secretos sintéticos solo en ejecución. R2 y Google/correo usan dobles controlados para contratos; el flujo real de proveedor se comprueba luego en staging autorizado. No persistir JWT/cookies/passwords reales en evidencias.

Comparar status, JSON con tipos y null, orden contractual, errores y headers. Para Set-Cookie: atributos, claims y efectos de revocación; no comparar firmas/IDs aleatorios byte por byte. Normalización de IDs debe preservar correspondencia entre entidades; no ocultar campos. El reloj del legacy usa DateTime.UtcNow y DateTime.Today: registrar TZ y mantener las ventanas iguales. Fechas deldataset son referencia, no assertions sobre «hoy» de producción.

GET no siempre es puro: Googlecallback modifica sesión/vinculación. GET partidos puede incluir información de anotación del usuario, así que no compartir caché entre sesiones. El proxy del navegador y server-fetch deben usar la misma selección de destino durante F2–F8.

## F0: hecho y pendientes

- Hecho documental: inventario 106/106, 20 controladores, DTOs/query/body y ramas verificadas contra fuente; al menos un nominal y un negativo por acción; discrepancias registradas; pins exactos propuestos; catálogo de Jim incorporado.
- Recursos confirmados por god (conv-2ed05f): rama Neon aislada `qa-migracion-ts` y hosting Render, mismo workspace que `reservaya-api`. Las conexiones quedan en `hive/qa.env`; no se leyeron ni copiaron. La rama es copia de producción: usar solo fixtures sintéticos y no exportar filas/PII. Siguen pendientes plan/región y accesos de staging por rol/proveedor cuando corresponda.
- Pendiente de decisión técnica antes F1: historial Prisma existente y fila incompleta del mismo nombre deben reconciliarse con checksums/rolled_back_at; no resolve ciego. Reclamo está ausente en producción: port sin DDL no autoriza crearla. Definir su alcance separado antes de ejecutar positivos/concurrencia.
- Pendiente de fases siguientes: instalar/resolver lock y pares, implementar harness y TS, capturar y comparar endpoints, probar concurrencia/rollback/p95. Ningún gate HTTP, baseline o E2E se presenta como PASS.

No se modificaron código, dependencias, CLAUDE.md, hook ni esquema. No se conectó a Neon y no hubo commit. Pam conserva §7 de la spec.

## Actualización de coordinación

God autoriza ensayar baseline/resolve y paridad en la rama aislada; producción sigue prohibida sin confirmación humana. F0 mantiene su alcance documental y no ejecutó esos comandos. El ensayo se prepara al despachar la fase correspondiente. Jim confirmó la fe de erratas: PartidoAbierto tiene16columnas; las tablas de negocio suman203 y el historial añade8, total211.
