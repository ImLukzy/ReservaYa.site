# F0 — diferencias con documentación, spec y catálogo

Revisión del 2026-10-07 sobre HEAD `0e3811bbab4c9655d5b4e2bdade65aab1cb7b88d`. El manifiesto conserva el comportamiento del código actual; este informe no cambia `docs/api.md`, la spec principal ni el esquema.

## Contratos y permisos

| Diferencia | Evidencia actual | Tratamiento en el port |
|---|---|---|
| `usuarios/buscar` figura con sesión en docs/api | Buscar tiene `[AllowAnonymous]`; responde 200 o 429 | Mantener público; query de menos de dos caracteres devuelve usuarios vacíos |
| Spec56 propone complejos/torneos como lecturas públicas candidatas | Complejos tiene `[Authorize]`; Torneos exige ADMIN/SUPERADMIN/TECNICO a nivel de clase | F2 solo migra lecturas realmente públicas. Estos GET van a una fase autenticada |
| Dinero de varios DTOs es texto, no número | `DtoFormat.Money` devuelve string con dos decimales | Mantener `"50.00"` donde corresponda; aclarar §4.4 de la spec antes de implementar. No convertir todo dinero por una regla global |
| Cuenta bancaria carece de implementación | GET/POST `abonos/cuenta` responden 501 `{ok:false,error}` | 501 es el nominal de compatibilidad; no crear columnas o persistencia dentro del port |
| Tabla de errores de docs/api no cubre todos los códigos | Equipo usa 422; abonos 501; Google/R2 503; imagen legacy 500 | Reproducir cada rama. Validación automática puede responder ProblemDetails 400 antes del controlador |
| Referencias públicas anteriores a `/jugar` | Docs aún nombra sortear/completar-cuadro; Next redirige con 301 a `/jugar` | El endpoint API sigue existiendo. Actualizar referencias de página en la tarea de documentación futura |
| Autoridad nominal de datos/esquema describe .NET/EF | Humano aprobó TS/Prisma; runtime todavía .NET | Cambiar las instrucciones operativas por fase, sin presentar el runtime nuevo como desplegado |
| GET canchas tiene una variante protegida | `propias=true` sin sesión devuelve 401 | Conservar reglas query, cookies y middleware, además del método/ruta |
| GET partidos puede ser personalizado | Incluye si el usuario de la cookie está anotado | No compartir respuesta de sesión en una caché pública |
| Recursos ajenos no siempre producen 403 | PUT producto de caja/PATCH meta ajena: 404; DELETE de ambos: 200 sin modificar | Mantener esos códigos y comprobar efectos. La memoria antigua no sustituye el código actual |
| Promociones de rol tienen excepciones de TokenVersion | Solicitudes e invitaciones aprobadas conservan tv; bajas/logout/reset pueden revocarlo | Probar emisión cruzada, refrescar y bajas por separado |
| Registro normal devuelve 200 | `AuthController.Register` usa `Ok`, no 201 | Mantener 200 y rol USUARIO; planDueno/aceptaConvenio no forman parte del DTO |

`docs-coverage.json` registra presencia literal de rutas, con límites para evitar confundir `/api/usuarios` con `/api/usuarios/buscar`. Una mención no demuestra que el método, permisos o todas sus respuestas estén documentados. El manifiesto es la referencia de las 106 acciones; allí se señalan las rutas ausentes.

## Catálogo real recibido de Jim

Fuente: [catalogo-neon.md](../../../hive/agents/jim-muvk1y3c/catalogo-neon.md). Jim ejecutó SELECT de metadatos; Michael leyó el informe y no conectó a Neon. Se reportan 19 tablas de negocio más `_prisma_migrations`, 13 enums, 34 claves externas y 64 índices.

- `PartidoAbierto` y `AnotacionPartido` **ya existen**. Incorporarlas al futuro modelo Prisma no autoriza ejecutar CREATE TABLE. Jim confirmó la fe de erratas: el catálogo contiene 16 columnas de PartidoAbierto y 4 de AnotacionPartido; el 18 del mensaje inicial era incorrecto.
- `Reclamo` **no existe en producción**. El modelo local y el POST público esperan esa tabla. Un baseline sin cambios de negocio no puede incluir su creación. El positivo 201 y la prueba de correlativos requieren una decisión de esquema separada y un entorno aislado. No se llamó al POST de producción para confirmar un fallo.
- `_prisma_migrations` ya contiene ocho registros; `__EFMigrationsHistory` está ausente. Dos registros comparten el nombre b2b_convergencia: uno sin finished_at y otro finalizado. Antes de interpretar el primero como fallo activo, comprobar rolled_back_at y checksums en una fase autorizada. No borrar historia ni ejecutar resolve ciego para `0_baseline`.
- Los enums coinciden en valores. Preservar su orden físico en la reconstrucción; el orden puede importar en comparaciones PostgreSQL. PERSONAL permanece en el esquema y no debe habilitar paneles nuevos.
- Los nombres de columnas coinciden en los 17 modelos presentes de Prisma. Eso no prueba igualdad de nulabilidad, defaults o acciones referenciales: el catálogo declara arrays nullable como `Cancha.fotos` y `Promocion.diasSemana`. No imponer NOT NULL ni hacer backfill dentro de la migración de lenguaje.
- Jim confirmó 203 columnas de negocio más ocho de `_prisma_migrations`: 211 global. El resumen JSON distingue ambos recuentos.

## Pendientes antes de ejecutar F1

God confirmó la rama aislada `qa-migracion-ts` y eligió Render en el mismo workspace que `reservaya-api` (conv-2ed05f). Autorizó allí ensayos de baseline/resolve y paridad; F0 no los ejecuta. La copia contiene datos de producción: el harness no debe exportarlos ni usarlos como evidencias. Siguen pendientes plan/región y la definición del procedimiento para el historial existente y el alcance separado de Reclamo. No bloquean la entrega documental del manifiesto.

La memoria de Jim menciona anteriormente un pooler us-east-1; el catálogo no certifica la región actual. Confirmar el proyecto antes del deploy. Esta fase no ejecuta resolve, migrate diff, db pull ni SELECT.
