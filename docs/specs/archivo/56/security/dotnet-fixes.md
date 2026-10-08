# Arreglos de seguridad .NET

Worktree ReservaYa-sec, rama sec/dotnet-fixes, base4251035. Sin commit/push, prod ni cambios en el árbol principal.

ValidSessionConvention añade un AuthorizeFilter con usuario autenticado y ValidSessionRequirement a las acciones protegidas en método o controlador. Conserva las políticas de roles y excluye AllowAnonymous. Registrada tanto en la API como en el host fixture. DELETEreservas carga Cancha antes de calcular el alcance: reservas legacy con complejoId null ya conservan la sede de la cancha. GET, validar y PATCH ya tenían Include(Cancha), sin cambios necesarios.

El host acepta además prefijosF6/F7 exclusivamente con flagsQA explícitos para que god pueda ejecutar sus fixtures desde esta worktree. Añadido modo sin BD --security-convention-check: comprueba el modelo real de106acciones; PASS89protegidas/61conroles/17públicas o anónimas.

Comandos y resultados:

- dotnet build apps/api-dotnet/ReservaFacil.Api.csproj --ignore-failed-sources:0errores.
- dotnet build tests/legacy-auth-host/LegacyAuthHost.csproj --ignore-failed-sources:0errores.
- dotnet build tests/legacy-auth-host/LegacyAuthHost.csproj -c Release --no-restore:0errores.
- dotnet tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll --security-convention-check:PASS.
- git diff --check:PASS.

NU1900 advierte que no se pudo consultar vulnerabilidades NuGet por red restringida. Las pruebas HTTP/QA las ejecutará god; no se afirma PASSexterno todavía.

Filas que deberían pasar de SECURITY_DIVERGENCE a paridad estricta PASS con el host corregido:

- f4 (14): E026-tv-revocado, E027-tv-revocado, E028-tv-revocado, E032-tv-revocado, E033-tv-revocado, E059-tv-revocado, E060-tv-revocado, E061-tv-revocado, E062-tv-revocado, E099-tv-revocado, E100-tv-revocado, E101-tv-revocado, E102-tv-revocado, E106-tv-revocado
- f5 (28): E036-tv-revocado, E037-tv-revocado, E038-tv-revocado, E039-tv-revocado, E040-tv-revocado, E041-tv-revocado, E042-tv-revocado, E069-tv-revocado, E076-tv-revocado, E077-tv-revocado, E078-tv-revocado, E079-tv-revocado, E080-tv-revocado, E081-tv-revocado, E082-tv-revocado, E083-tv-revocado, E086-tv-revocado, E087-tv-revocado, E088-tv-revocado, E089-tv-revocado, E090-tv-revocado, E091-tv-revocado, E092-tv-revocado, E093-tv-revocado, E094-tv-revocado, E095-tv-revocado, E096-tv-revocado, E097-tv-revocado
- f6 (16): E001-tv-revocado, E002-tv-revocado, E015-tv-revocado, E016-tv-revocado, E017-tv-revocado, E018-tv-revocado, E019-tv-revocado, E020-tv-revocado, E021-tv-revocado, E022-tv-revocado, E023-tv-revocado, E048-tv-revocado, E049-tv-revocado, E050-tv-revocado, E051-tv-revocado, E065-tv-revocado
- f7 (3): E072-tv-revocado, E075-tv-revocado, E075-otra-sede

Total61filas:60revocaciones y1DELETEcross-owner. Los runners actuales clasifican divergencias por ID; al verificar el host corregido deberán reevaluar igualdad de respuesta/efectos y etiquetar PASS, en vez de conservar SECURITY_DIVERGENCE automáticamente.
