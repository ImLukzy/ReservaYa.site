# Desarrollo

## Ejecutar
| Comando (en esta carpeta) | Qué hace |
|---|---|
| `npm run dev` | Astro en `http://localhost:4321` |
| `npm run build` | Genera `dist/` (no se versiona) |
| `npm run preview` | Sirve `dist/` |
| `npx astro check` | Tipos y diagnósticos de `.astro` |

Desde la raíz del monorepo: `npm run dev:api` (API :5000) o `npm run dev:all`
(API → Next → Astro, cada uno en su ventana). Variables en [api.md](./api.md).

## Validar antes de integrar
1. `npx astro check` → 0 errores (lo exige el CI, `.github/workflows/ci.yml`).
2. `npm run build`.
3. Si tocaste un `<script is:inline>` o `define:vars`: `node --check` sobre el JS
   inline emitido en `dist/` (un cast TS ahí deja la página muerta en producción).

## Convenciones
Las reglas de código (JS plano en scripts inline, sin `innerHTML` con datos,
URLs por variables `PUBLIC_*`, sin PII ni `alert()`) están en
[`docs/skills/astro-landing.md`](../../docs/skills/astro-landing.md).
