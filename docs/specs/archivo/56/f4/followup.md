# Seguimiento F4 — RYS-77

F4 integrada852634c tras gate y auditoría APTO. Este seguimiento atiende H-01/H-02 de audit-kelly.md.

La limpieza del fixture tiene tres intentos, con espera de1 y2 segundos y un cliente administrativo nuevo en cada intento. Cada cliente se cierra, incluso si falla DROP. Los intentos disponen de15 segundos y el cierre de3; el último fallo sigue produciendo salida1. La función rechaza nombres fuera de f4_fixture_<12hex>; no borra bases ajenas.

GET /api/usuarios/clientes admite paginación opcional:

- `?take=200`: primera página (1–200). Devuelve `nextCursor` con el último ID cuando quedan más registros; null cuando termina.
- `?take=200&cursor=<nextCursor>`: página siguiente. Orden estable CreadoEn descendente, ID ascendente.
- El cursor debe pertenecer a un cliente en el alcance autorizado; desconocidos o ajenos devuelven400. Roles y filtro de alcance se mantienen.
- Sin parámetros conserva `{ok, clientes}`, orden y límite200 del legado.

No requiere cambios de esquema ni modifica los dominios F5. No se añade paginación a .NET.

Verificación local Node22.20: API54/54 tests, build/tipos/lint, cleanup3/3 tests, checkJs y diff-checkPASS. SIGTERM smokePASS con BD simulada y host/scratch reales. Prueba de paginación real QA preparada en `scripts/f4-parity.mjs --confirm-qa-migracion-ts --check-client-pagination` (dos páginas, alcance, tamaños, roles, forma antigua y cero escrituras). Paridad/regresiones y esa prueba pendientes de god.
