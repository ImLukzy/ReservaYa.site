# F4 — gestión Nest

Estado: F4 integrada en main (852634c), con paridad estricta128/142 y14 divergencias de seguridad aprobadas, cero fallos; F2/F3 y clon limpio PASS según god. Seguimiento RYS-77 implementado, pendiente de gate externo.

## Alcance

Mutaciones de canchas E026–028/E032–033, horarios E043–044, promociones E059–062 y usuarios E098–106. Se conservan propiedad del dueño, membresías para lecturas, plataforma TECNICO, bloqueo por convenio y cupo de prueba, contratos de precios y revocación de sesión. Las imágenes nuevas se validan contra MEDIA_PUBLIC_URL y prefijo uploads/tipo/usuario; el borrado R2 sucede después del guardado y conserva mejor esfuerzo. Multipart heredado usa bytes mágicos, tope 3 MB, request 3.500.000 bytes y Deprecation.

Inconsistencia de negocio conocida: register/google exigen 14, PatchMe 5. God confirmó preservar el mínimo de cinco años en PatchMe para paridad 1:1 y corregirlo después de la migración. El límite 20/10min corresponde al presign web; se conserva allí sin migrarlo. F4 replica buscar 30/min.

## Verificación

- Build, tipos y API 46/46 tests PASS con Node 22.20. Lint PASS tras corregir detector de caracteres de control. Host .NET fixture: build sin errores.
- scripts/f4-parity.mjs compara respuestas, Deprecation, efectos en cuatro tablas y borrados del S3 ficticio local. Crea y elimina una base vacía efímera en QA; ninguna llamada al bucket real. Primer intento abortó antes de comparar por creadoPorId faltante en una sanción ficticia, corregido.
- checkJs de todos los create del harness PASS: `node_modules/.bin/tsc --allowJs --checkJs --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --typeRoots apps/api/node_modules/@types scripts/f4-parity.mjs`.
- Paridad F4, regresión F2/F3 y clon limpio: pendientes de ejecución por god.

## Límites

Sin tráfico productivo, commit, push ni despliegue por Michael. No se leyeron .env reales ni credenciales R2. El presign apps/web/app/api/upload conserva su implementación. Los servicios humanos en 3000/5000 no se modifican; el fixture usa 15120.

## Diagnóstico del segundo gate

God confirmó build/tipos/lint/43 tests PASS, pero el runner se detuvo después de inicializar y se canceló tras diez minutos. No produjo resultados de paridad. God eliminó la base efímera de ese intento.

Corregidas las consultas de propiedad, habilitación y suscripción de canchas para usar el mismo cliente de la transacción serializable. La prueba adicional impide solicitar una segunda conexión al cliente general desde la operación transaccional. API 44/44 tests Node 22.20 PASS.

El runner registra caso y backend, limita requests a quince segundos y la ejecución a quince minutos, y limpia base, host y carpeta temporal al recibir SIGINT/SIGTERM. S3 Delete dispone de timeout de diez segundos. Los helpers de clon preservan solo logs pequeños y eliminan su carpeta temporal en EXIT, también al fallar. Añadidos casos DEL y C1 para contrastar el rechazo de controles con char.IsControl del legado. Reintento y smoke de cancelación solicitados a god; aún pendientes.

### Reintento tras tercer gate (14:34)
El gate externo avanzó unas 55 comparaciones en 540 s, pero SIGTERM dejó recursos que god eliminó manualmente. No constituye paridad PASS. El runner ahora espera `run()` directamente, mantiene listeners durante `finally`, y el listener solo aborta. Se conserva la limpieza acotada con DROP FORCE antes de cerrar conexiones. Smoke local Node22 con adaptador de BD simulado: SIGTERM invoca DROP, detiene hijo real, borra scratch real y sale 1; no demuestra borrado real en Neon. Helper reproducible: `python3 hive/agents/michael-code-muy0s116/f4-sigterm-smoke.py <node22>`.
Restauración de semilla agrupada en transacción, pool Prisma de seis conexiones, consultas de efectos paralelas y reutilización de semilla mientras los efectos permanezcan iguales al baseline. Una preparación o mutación detectada obliga a restaurar antes del siguiente backend/caso; se siguen comparando efectos en todos los casos. Parser, checkJs y diff-check PASS. Tiempo total menor de ocho minutos y limpieza real por señal siguen pendientes del gate externo.

### Cuarto gate (14:48)
God confirmó limpieza real por SIGTERM (BD y scratch borrados, host detenido) y ejecución completa en 550 s, 125/142. El artefacto contiene 17 fallos: 14 sesiones revocadas, dos conflictos de clave foránea y un listado con orden distinto. La notificación hablaba de 15 sesiones; E044-tv-revocado sí pasó y conserva paridad estricta.
God autorizó preservar el rechazo seguro en Nest: los 14 casos afectados se registran explícitamente como SECURITY_DIVERGENCE, separados del conteo de paridad estricta. Exigen Nest403 con mensaje exacto, ningún cambio de datos respecto de la preparación y ningún borrado S3. .NET omite ValidSession en determinadas autorizaciones con Roles; Kelly y god resolverán su corrección. No se copió el defecto al backend nuevo.
Errores Prisma se identifican por código estructural, porque instanceof puede fallar entre instancias del cliente generado; P2003 produce409 y el mensaje exacto. Dos pruebas nuevas cubren el error de otra instancia: 46/46 tests Node22PASS, build/tipos/lintPASS. Usuarios conserva CreadoEn DESC y separa agregación de reservas del listado para evitar el plan con joins que reordenaba empates. El legado no declara desempate adicional; no se añadió uno arbitrario.
Runner optimizado: restauración con TRUNCATE únicamente en la BD efímera propia y nueve createMany tipados dentro de una transacción; snapshot SQL único conserva todas las columnas de las cuatro tablas y comprueba contraseñas cambiadas. El snapshot usa tipos JSON nativos de PostgreSQL para ambos backends; los contratos HTTP mantienen su comparación íntegra. Baseline reutilizado tras restores. Parser/checkJs/diff-check y smoke local SIGTERM PASS. Menos de seis minutos, paridad corregida, regresiones y clon limpio pendientes de reintento externo.
