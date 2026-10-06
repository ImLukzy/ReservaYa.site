# Reporte final — Frontend (landing Astro + panel Next)

**Fecha:** 2026-09-26 · **Rama:** `agents/frontend-nextjs-ui` (sin push) · **Commits:** `b02c7fe` → `7b0c2d6`
**Fuente:** `PLAN_OTRO_AGENTE.md` §6 y el §7 de cada spec (evidencia y comandos).

## Mejoras implementadas

### Seguridad (specs 01, 03)
- **XSS:** el último `innerHTML` con datos de usuario (`jugador/perfil.astro`, `pintarFoto`) se pasó a DOM API.
- **PII:** no queda nada hardcodeado (verificado con `grep`).
- **Open redirect en el panel:** `app/(auth)/login` y `register` aceptaban `/\evil.com`. Ahora pasan por `lib/redirect.ts`, con tests.
- **Proxy JWT:** `/tecnico` añadido al `matcher`; un rol desconocido cuenta como token inválido; un solo mapa `fallbackPorRol`.

### Calidad y entrega (specs 02, 04–08)
- `astro check`: de 95 errores a 0. Los 299 scripts inline pasan `node --check`.
- **Errores visibles en el panel:** 25 `.catch(() => [])` sustituidos por `crearCarga` + `<AvisoCarga>`, y `error.tsx` por segmento.
- **API cliente/servidor unificada** en `lib/http.ts` + `lib/server-fetch.ts`.
- **Lint:** de 17 errores a 0.
- **CI:** `astro check` + build (landing), `typecheck` + `lint` + `test` + build (panel) y `db:check`.
- **Docs de Astro:** sin duplicados, de 302 a 129 líneas.
- **Arranque local** con `dev:all`.

### Producto (spec 09)
- **Onboarding de `/admin/ayuda`:** muestra el progreso real (complejos, canchas y horarios), y `totalCanchas` quedó corregido en 3 vistas.

### UI / accesibilidad (specs 10–12)
- **Títulos sobre fondos oscuros (spec 10):** clase `.on-dark` y herencia en headings. 13 títulos pasan de 1.52–3.40:1 a AA (≥ 9:1; «S/ 112», texto grande, 3.3:1). Playwright 26/26, sin cambios en superficies claras.
- **Hero premium (spec 11):**
  - Fondos locales en AVIF/WebP: de 1918 KB a 65 KB en móvil (−97 %) y a 444 KB en escritorio.
  - `fetchpriority` en el primer fondo y sin parpadeo gris al cargar.
  - Un solo control del carrusel, pausable con teclado o táctil (WCAG 2.2.2), con áreas de toque de 24 px (WCAG 2.5.8).
  - Copy de Arequipa y `svh` en la altura. Playwright 27/27; contraste mínimo medido 7.23:1.
- **Glifos en enlaces y botones (spec 12):** regla global `:is(a, button) :is(span, em, strong)`. 214/214 spans heredan el color del control, sin cambios fuera de controles y sin ningún contraste que empeore.
- La convención quedó documentada en `docs/skills/astro-landing.md` (regla 8).

## Estado
- **Landing:** `astro check` 0 errores; build de 21 páginas; sin scroll horizontal a 375 px en las páginas verificadas (2026-09-26).
- **Panel:** no se ha tocado desde `42be9d3`. Sus gates están en verde según las specs 06 y 09 (2026-09-25); no se re-ejecutaron hoy.
- **BD:** `db:check` OK (2026-09-25), 0 migraciones pendientes. Cero migraciones en todo el trabajo.

## Pendientes
**Bloqueados (no son frontend):**
- ⛔ `POST /api/auth/forgot-password` no existe (404), y `forgot-password.astro` igualmente muestra «revisa tu correo» (spec 07 §8).
- ⛔ El género de `register.astro` no se envía: haría falta un campo en la API y una migración (spec 02 §8).
- 🟡 Onboarding (spec 09): falta verlo con una cuenta de dueño real.
- 🟡 CI: el job `db-check` necesita el secreto `DATABASE_URL`.

**Recomendados, en orden de impacto:**
1. **Contraste del CTA verde:** blanco sobre #22C55E da 2.28:1 en todas las etiquetas, lo que falla AA. Por ejemplo, #15803D + blanco da 5.02:1. Es una decisión de marca (spec 12 §2).
2. **Token `--text-soft` (#8A938D) sobre fondo claro:** 3.16:1, en ~30 spans/li fuera de controles. Cambio del sistema de diseño (spec 12 §2).
3. **Copy coherente con Arequipa:** quedan «todo el Perú» en `BaseLayout.astro:72`, `index.astro` y `completar-cuadro.astro`, los pines del mapa y los testimonios con distritos de Lima (spec 11 §2).
4. **Búsqueda en el hero** (distrito/deporte → `/canchas?…`): requiere que `canchas.astro` lea los parámetros de URL (spec 11 §2).
5. **Limpieza:** `src/assets/images/*.jpg` (4 fotos de plantilla, ~20 MB, sin uso).
6. **Detalle visual:** línea de 1 px más clara en el borde izquierdo del hero a 375 px. Ya existía y sale de `scale(1.02)` en `.hero-bg` (spec 11 §7).
7. **Publicar la rama:** push y PR a `main` cuando se autorice.
