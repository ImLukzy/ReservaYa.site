# Seguimiento F5: paginación sanciones y torneos

Implementados OBS-01/OBS-02 de audit-kelly.md. Pendiente gate externo de QA y regresión F2–F5.

Ambos GET admiten `?take=200` y `?take=200&cursor=<nextCursor>`. take acepta1–200, el orden paginado es CreadoEn descendente e ID ascendente y la respuesta añade nextCursor (último ID si quedan filas; null al terminar). El cursor debe pertenecer al alcance y filtros efectivos de la consulta. Desconocidos o ajenos devuelven400 con Cursor inválido; los permisos de sede y rol se validan antes de consultar filas. Sanciones conserva soloActivas y valida el cursor también frente a ese filtro.

Sin parámetros se conserva el contrato legado: sanciones mantiene máximo200 y torneos mantiene listado completo; no se añade nextCursor ni cambia el orden existente. No cambia el esquema ni los endpoints .NET.

Verificación local con Node22.20:

- `pnpm --filter @reservaya/api test`:78/78 PASS, siete pruebas nuevas. Incluyen acceso a registros201/202, ausencia de solapamiento, cursores ajenos, límites inválidos, filtro de activas y forma/límite sin parámetros.
- `pnpm --filter @reservaya/api build`, `typecheck`, `lint`: PASS.
- `tsc --allowJs --checkJs --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --typeRoots apps/api/node_modules/@types scripts/f5-parity.mjs`: PASS.
- `git diff --check`: PASS.

Modo QA preparado: `node scripts/f5-parity.mjs --confirm-qa-migracion-ts --check-pagination`. Crea BD vacía efímera F5, usa datos ficticios y mocks de correo/media; comprueba dos páginas, última página, respuestas sin parámetros, cursores ajenos/desconocidos, límites, roles, alcance TECNICO, filtro soloActivas y cero cambios de datos. Escribe followup-pagination-results.json solo si todas las comprobaciones pasan y conserva la limpieza del fixture.

No se ejecutó Neon desde este sandbox; la red local está restringida. No se afirma nuevo PASS de paridad F2–F5. God debe ejecutar modo QA y regresiones antes de integrar. Sin commit ni push.

El helper y las pruebas están en src/sanciones/pagination.ts y src/sanciones/pagination.test.ts. El aviso F6 limita este seguimiento a sanciones, torneos, runner F5 y este informe; no se modificaron módulos compartidos ni el host legacy.
