# Especificación: 67 - Sitemap dinámico, app instalable (PWA) y API siempre despierta

Estado: aprobada 2026-10-08 (humano: "trabaja en todas las mejoras sin coste").

## 1. Objetivo
**Problema:**
- `apps/web/public/sitemap.xml` es un archivo fijo, sin las páginas de los complejos `/c/<slug>`.
- No hay manifiesto web, así que la web no se puede añadir a la pantalla de inicio del móvil.
- Render free apaga la API cuando no recibe tráfico: la primera visita espera unos 30–50 s.

**Resultado esperado:**
- Sitemap generado con las rutas públicas y todos los complejos visibles.
- La web se puede instalar en el móvil (icono y pantalla de bienvenida).
- La API recibe una llamada cada 10 minutos para no dormirse.
- Todo gratis: el repositorio es público, así que GitHub Actions no gasta minutos de pago.

## 2. Fuera de alcance
Modo sin conexión completo y notificaciones push.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/web/app/sitemap.ts` | crear | rutas públicas + `/c/<slug>` (vía `serverFetch` a un endpoint público de slugs o al listado existente; `revalidate` 1 h) |
| `apps/web/public/sitemap.xml` | eliminar | lo reemplaza `sitemap.ts` |
| `apps/web/public/robots.txt` | revisar | `Sitemap: https://reservaya.site/sitemap.xml` |
| `apps/web/app/manifest.ts` + iconos 192/512 y maskable en `apps/web/public/` | crear | nombre, `theme_color` y `background_color` de los tokens, `display: standalone`, `start_url: /` |
| `.github/workflows/keepalive.yml` | crear | `schedule: '*/10 * * * *'` → `curl -fsS https://reservaya-api-va.onrender.com/healthz` con reintento; sin secretos |
| `apps/api/src/public/read.*` | modificar si hace falta | `GET /api/complejos/publicos/slugs` (solo slug + `actualizadoEn` de complejos visibles) |

## 4. Diseño y lógica
- El sitemap solo incluye complejos visibles (`visibleIds`, la misma regla que el catálogo).
- Los iconos salen de la marca existente (`components/ui/Marca`, `public/favicon.svg`).
- El keepalive solo llama a `/healthz`, que no exige secreto de origen (spec 59).
- GitHub desactiva los cron tras 60 días sin actividad en el repo; queda documentado en `DEPLOY_GRATIS.md`.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate | turbo (god) | 18/18 |
| A2 | Sitemap | `/sitemap.xml` válido con `/c/<slug>` de Melgar | pasa |
| A3 | PWA | `/manifest.webmanifest` válido; Chrome lo reconoce como instalable | pasa |
| A4 | Keepalive | ejecución manual del workflow (`workflow_dispatch`) en verde | pasa |

## 6. Checklist
- [x] T1 sitemap · [x] T2 manifest+iconos · [x] T3 workflow · [x] T4 docs/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A1 | Pasa | god en main con 62/64/65/66: `turbo run build typecheck lint test --force` 18/18 (API 173, web 90). |
| 2026-10-08 | A2 | Pasa | god local (API contra QA): `/sitemap.xml` con 8 rutas estáticas + `/c/melgar` y el otro complejo visible; `getJson` usa `serverFetch` (secreto de origen). |
| 2026-10-08 | A3 | Pasa | `/manifest.webmanifest` válido (0 errores en Chrome); `Page.getInstallabilityErrors` solo `in-incognito` (contexto de prueba); 3 iconos PNG 200. |
| 2026-10-08 | A4 | Pendiente | Ejecutar `workflow_dispatch` de keepalive tras el push. — Jim (T1–T4), god (verificación) |
