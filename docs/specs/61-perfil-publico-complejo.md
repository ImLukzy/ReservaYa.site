# Especificación: 61 - Perfil público del complejo y enlace para compartir

Estado: aprobada 2026-10-08 (humano: "ver perfil y/o compartir su centro no está funcionando", con capturas).

## 1. Objetivo
**Problema:**
- `apps/web/components/b2b/ComplejosGrid.tsx:66-68` arma el enlace con el dominio fijo `https://reservaya.pe/c/${slug}`. Ese dominio no es el del proyecto: abrirlo da `404 DEPLOYMENT_NOT_FOUND`. "Ver perfil", "Abrir página pública", el QR y "Copiar link de WhatsApp" usan ese enlace.
- Tampoco existe la ruta `/c/[slug]` en `apps/web/app/(public)`, ni un endpoint público que devuelva un complejo por `slug` (`Complejo.slug` es único, `packages/db/prisma/schema.prisma:177,200`).
- `apps/web/lib/public/metadata.ts:3` usa `https://reservaya.com` como sitio: los canonical y `og:image` apuntan a otro dominio.

**Resultado esperado:** el dueño comparte `https://reservaya.site/c/<slug>`. Esa página pública muestra el complejo y sus canchas activas con "Reservar", y se ve bien al compartirla por WhatsApp. Todo el sitio usa un solo dominio canónico.

## 2. Fuera de alcance
- Cambios de esquema o migraciones.
- Cambiar `slug` existentes o permitir editarlos.
- Rediseño de `/canchas` (spec 60, en curso en otra rama): no tocar `apps/web/app/(public)/canchas/*` ni `apps/web/lib/public/scripts/canchas.ts`.

**Decisiones de producto que requieren aprobación:** ninguna. Visibilidad: la página es pública exactamente cuando sus canchas salen en el catálogo (`visibleIds` en `apps/api/src/public/read.service.ts`: suscripción `ACTIVA` vigente o gracia de 30 días, y publicado). Si no lo está, se muestra 404.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/public/read.controller.ts`, `read.service.ts` | modificar | `GET /api/complejos/publico/:slug` sin auth |
| test de API junto al servicio | crear / modificar | publicado → 200; no publicado o inexistente → 404; sin datos privados |
| `apps/web/app/(public)/c/[slug]/page.tsx` (+ `content.tsx` si hace falta) | crear | perfil público con `generateMetadata` (título, descripción, `og:image` = foto del complejo o cancha) |
| `apps/web/lib/public/sitio.ts` (o similar) | crear | `SITIO = 'https://reservaya.site'` única fuente |
| `apps/web/lib/public/metadata.ts` | modificar | usar `SITIO` |
| `apps/web/components/b2b/ComplejosGrid.tsx` | modificar | `linkPublico` con `SITIO` |
| `docs/api.md` | modificar | documentar el endpoint |
| `apps/web/lib/public/contacto.ts`, `apps/web/components/public/Footer.tsx`, `apps/web/app/(public)/layout.tsx` | modificar | contacto real (ver §4) |

## 4. Diseño y lógica
- **API** `GET /api/complejos/publico/:slug` → `{ complejo: { slug, nombre, direccion, distrito, ciudad, telefono, descripcion?, imagen? }, canchas: [{ id, nombre, tipo, precioPorHora, imagen, techada, superficie, capacidad }], valoracion: { promedio, total } }`. Solo campos públicos: nada de dueño, email, suscripción ni ids internos innecesarios. Solo canchas activas.
- **Web `/c/[slug]`:**
  - Cabecera con foto o respaldo, nombre, distrito y dirección, un botón para llamar por teléfono y otro de WhatsApp si hay número (usar el helper existente de `apps/web/lib/whatsapp.ts`), y la valoración.
  - Lista de canchas con foto, deporte, precio por 60 min y "Reservar", que lleva al flujo de reserva actual.
  - Mismo layout público, tokens y componentes existentes, objetivos táctiles ≥ 44 px.
  - Si el slug no existe o el complejo no está publicado: `notFound()`.
  - `revalidate` corto, de unos 60 s.
- **Panel:** "Ver perfil", el QR y "Copiar link de WhatsApp" usan `SITIO + /c/<slug>`.
- **Contacto (decisión del humano 2026-10-08):** `hola@reservaya.pe` e Instagram `reservaya.pe` no existen. `EMAIL = "lukas.melgar@tecsup.edu.pe"` (`reservaya.site` no tiene MX). Quitar `INSTAGRAM`: el enlace del pie y `sameAs` del JSON-LD de `layout.tsx`. Mantener el objetivo táctil del pie (spec 58).
- **Invariantes:** la API sigue tras el secreto de origen (spec 59): la página obtiene los datos por `serverFetch`; sin cambios de esquema; tests sin servicios reales.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate completo | `pnpm exec turbo run build typecheck lint test --force` (fuera del sandbox, god) | 18/18 |
| A2 | Endpoint | tests: publicado 200 con solo campos públicos; no publicado o inexistente 404 | pasa |
| A3 | Enlace | en el panel, el QR y "Copiar" contienen `https://reservaya.site/c/<slug>`; no queda `reservaya.pe` ni `reservaya.com` en código de la web (salvo tests con datos ficticios); sin Instagram | pasa |
| A4 | Página | local: `/c/<slug real publicado>` 200 con canchas y "Reservar" funcional; slug inventado 404; metadatos OG presentes | pasa |
| A5 | Producción | tras desplegar, el humano abre "Ver perfil" y el QR desde su panel | pasa |

## 6. Checklist
- [x] T1: endpoint público + tests.
- [x] T2: `SITIO` único y enlaces del panel.
- [x] T3: página `/c/[slug]` con metadatos.
- [x] T4: docs y verificar criterios en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2 | Pasa | 8 pruebas de integración de `/api/complejos/publico/:slug`: publicado/suscrito 200, inexistente/no publicado/no habilitado 404, gracia 200, rol USUARIO sin gracia, lista activa y sin campos privados. API: 126/126. |
| 2026-10-08 | A3 | Pasa | `linkPublico` compartido por Ver perfil, QR y copiar WhatsApp; metadatos y JSON-LD usan SITIO. robots/sitemap corregidos. Búsqueda de reservaya.pe/reservaya.com fuera de fixtures: cero coincidencias. Correo confirmado y sin constante, icono, enlace ni sameAs de Instagram. |
| 2026-10-08 | Verificación local | Pasa | `turbo run typecheck lint test --force`: 16/16; ejecución Node 22 en un proceso de web + scripts: 88/88; `git diff --check` limpio. Sin build/servidor dentro del sandbox. |
| 2026-10-08 | A1 / A4 | Pendiente (god) | Gate con build 18/18 y servidor fuera del sandbox: comprobar perfil real 200, ficticio 404, metadatos y reserva. |
| 2026-10-08 | A5 | Pendiente (humano) | Tras desplegar, abrir Ver perfil y QR desde el panel. |

Reservar lleva al flujo existente de búsqueda `/dashboard/canchas` con nombre de cancha, distrito y deporte; el usuario elige horario en el formulario actual. No se modificaron rutas/scripts de la spec 60. El análisis adicional de Knip solo señala 298 archivos del worktree ajeno `worktrees/worker-canchas-tarjetas`; no se alteró su configuración ni ese worktree.
| 2026-10-08 | A1 | Pasa | god fuera del sandbox con spec 60 integrada: `pnpm exec turbo run build typecheck lint test --force` → 18/18 (API 126, web 80). |
| 2026-10-08 | A4 | Pasa | god local (API NestJS + web build): `/api/complejos/publico/<slug Melgar>` 200 con solo campos públicos; slug inventado 404; `/c/<slug>` 200 con canonical `https://reservaya.site/c/…`, `og:image` de la cancha y botón Reservar; `/c/no-existe` 404; desborde 0 px a 360/1280. |
