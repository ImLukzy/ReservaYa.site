# F1: estructura y baseline

.NET se traslada únicamente en archivos versionados a apps/api-dotnet. `source-moves.json` conserva hashes; los archivos fuente legacy mantienen sus bytes. Artefactos y uploads de servicios locales permanecen en su sitio. Dockerfile y runner apuntan al nuevo directorio legacy; BACKEND_URL y rewrites mantienen el servicio vigente. Nest F1 solo sirve /health en puerto5200.

Node22.20.0, pnpm10.18.3 y Turbo2.5.8. packages/db contiene Prisma6.19.3 basado en catálogo; packages/shared contrato health zod; packages/config TypeScript/ESLint común. CI separa config/shared/db/api/web y .NET; no consume secretos de producción. El lock npm fue retirado tras instalación pnpm congelada PASS; sus hashes constan en retired-locks.json.

La web conserva Root Directory apps/web. vercel.json fija comandos workspace; activar inclusión de fuentes externas a Root Directory antes del próximo despliegue. Render conserva Dockerfile raíz y API .NET. No se ha creado/deployado servicio TS remoto.

[Baseline y rollback](baseline-runbook.md): god autorizó preservar ocho filas históricas y nueva línea 0_baseline SOLO en QA. Archivo auxiliar propuesto en schema migration_archive para evitar drift de public. Drift QA0 confirmado antes de reconciliar. Primer intento de archivo revirtió íntegramente por deserialización regclass; corregido con cast text, reintento pendiente.

Comprobaciones locales realizadas: Prisma schema validate; generación SQL offline; hashes de archivos trasladados; tests runner/motion (2/2); git diff --check. God confirmó instalación congelada, TypeScript, lint, tests y build web18páginas en Node26.10.0 local; gates Node22.20 y recreación efímera en BD temporal QA PASS; pendiente conciliación del historial y build db sin pnpm anidado.
