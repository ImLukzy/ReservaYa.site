# F0 — versiones a fijar

Son pins exactos propuestos para un primer entorno reproducible. No son una lista de «últimas versiones» ni un lockfile instalado. F0 no cambia dependencias. Antes de desplegar, F1 debe validar resolución, dependencias pares, mantenimiento y parches disponibles con el conjunto completo; ajustar un pin con evidencia y revisión, sin cambiar mayores de producto por accidente.

| Paquete | Pin | Evidencia y motivo |
|---|---|---|
| Node | 22.20.0 | [Release LTS oficial](https://nodejs.org/en/blog/release/v22.20.0). Cumple mínimos de Next/Nest/Fastify/Prisma y Vitest seleccionados; no usar Node26 local como requisito del proyecto |
| pnpm | 10.18.3 | [Manifest del tag](https://raw.githubusercontent.com/pnpm/pnpm/v10.18.3/pnpm/package.json); engines>=18.12. Fijar packageManager y scripts aprobados |
| Turborepo | 2.5.8 | [Manifest oficial](https://raw.githubusercontent.com/vercel/turborepo/v2.5.8/packages/turbo/package.json). Caché solo de outputs explícitos; pruebas de integración sin caché |
| Next/eslint-config-next | 16.2.9 | package-lock web actual; mantener versión exacta |
| React/react-dom | 19.2.4 | package-lock actual; no cambio de render durante port |
| Prisma/@prisma/client | 6.19.3 | package-lock actual; ambos iguales, no pasar a Prisma7/8 dentro de este alcance |
| TypeScript | 5.9.3 | lock actual y [manifest oficial](https://raw.githubusercontent.com/microsoft/TypeScript/v5.9.3/package.json) |
| ESLint | 9.39.4 | lock actual; config común con adaptadores Next/Nest |
| Nest core/common/platform-fastify/testing | 11.1.6 | [Core](https://raw.githubusercontent.com/nestjs/nest/v11.1.6/packages/core/package.json), [adaptador](https://raw.githubusercontent.com/nestjs/nest/v11.1.6/packages/platform-fastify/package.json); todos misma versión. No seguir documentación Nest12 sin adaptación |
| Fastify | 5.4.0 | El adaptador Nest11.1.6 depende exactamente de5.4.0; no añadir5.6.1 en paralelo solo por ser más nuevo. [Manifest](https://raw.githubusercontent.com/fastify/fastify/v5.4.0/package.json) |
| @fastify/cookie | 11.0.2 | [Manifest](https://raw.githubusercontent.com/fastify/fastify-cookie/v11.0.2/package.json); línea Fastify5 |
| @fastify/multipart | 9.2.1 | [Tag del plugin](https://github.com/fastify/fastify-multipart/tree/v9.2.1); validar integración y límites en F1; no Multer Express |
| reflect-metadata/rxjs | 0.2.2 / 7.8.2 | Pins propuestos que cumplen pares declarados de Core; resolver con registry y tipos en F1 |
| zod | 4.1.12 | [Manifest](https://raw.githubusercontent.com/colinhacks/zod/v4.1.12/packages/zod/package.json); DTOs transportables sin Prisma en navegador |
| Vitest/Vite | 3.2.4 / 6.1.0 | [Vitest](https://raw.githubusercontent.com/vitest-dev/vitest/v3.2.4/packages/vitest/package.json), [Vite](https://raw.githubusercontent.com/vitejs/vite/v6.1.0/packages/vite/package.json); compatibilidad declarada. No usar requisitos de Vitest actual/main para este pin |
| supertest | 7.1.4 | [Manifest](https://raw.githubusercontent.com/forwardemail/supertest/v7.1.4/package.json); NestFastify inicializado y ready antes de request |
| Playwright/@playwright/test | 1.63.0 | playwright ya fijado en lock; [manifest oficial](https://raw.githubusercontent.com/microsoft/playwright/v1.63.0/packages/playwright/package.json). Test/core/browser revisions deben coincidir |
| jose/bcryptjs | 6.2.3 / 3.0.3 | lock actual; pruebas criptográficas cruzadas antes de port auth |

El lock actual usa @types/node20.19.43; F1 debe alinear los tipos con el runtime22 elegido y fijar su patch exacto con resolución del registry. No cambiarlo silenciosamente en F0. Las dependencias adicionales que realmente aparezcan en F1 se fijan entonces, con sus pares y lock; no inventar versiones para un scaffold no instalado.

Comprobación local: `node --version`=26.10.0, `npm --version`=12.2.0. `npm view` falló una vez por EAI_AGAIN al resolver registry.npmjs.org; no se reintentó ni se instaló nada. Los pins nuevos se contrastaron con manifests de tags oficiales por navegador. Esa evidencia prueba existencia/compatibilidad declarada; no equivale a build o test del conjunto.

Gate F1: instalación congelada en Node22 fijado; generar cliente Prisma en packages/db; comprobar dependencias duplicadas Fastify/Nest, pares y límites de plugins; typecheck/lint/build de cada paquete; pruebas de adaptador con cookie/multipart; conservar allowScripts equivalentes sin habilitar ejecución global. Actualizar aquí los pins definitivos y la evidencia del lock al superar ese gate.
