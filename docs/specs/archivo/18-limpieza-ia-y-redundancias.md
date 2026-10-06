# Especificación: 18 - Retirar la IA y el código redundante

## 1. Objetivo
**Problema:** la app carga con código, rutas y recursos que no se usan o prometen funciones que no existen.

- **IA** (no se va a implementar), toda en el panel:
  - Página `app/(dashboard)/admin/ai/page.tsx` («ReservaYa AI»).
  - Tarjeta «✨ PRÓXIMAMENTE · ReservaYa AI» en `app/(dashboard)/admin/page.tsx:229-284`.
  - Ítem del menú en `components/layout/Sidebar.tsx:74` (icono `Sparkles`, L15).
  - Módulo `'ai'` en `lib/permissions.ts:30`.
- **Código muerto:**
  - `components/features/B2BModulePage.tsx`: placeholder con datos falsos; ningún archivo lo importa (escaneo de imports).
  - Modales de login y registro en `layouts/BaseLayout.astro:400-425`, su script (`BaseLayout.astro:814-870`), y `components/LoginForm.astro` y `RegisterForm.astro`. Son inalcanzables: los disparadores `data-*-modal-trigger` solo existen dentro de los propios modales. El header enlaza a `/login` y `/register`.
- **Restos de plantilla en la landing:**
  - La colección `src/content/blog` (2 posts) y `src/content.config.ts`: ninguna página llama a `getCollection`.
  - `public/images/unsplash/`: 29 fotos (6 MB) sin ninguna referencia.
  - `src/assets/images/`: 4 fotos de oficina (20 MB).
  - `public/og-default.svg`: se usa el `.png`.
- **CSS sin uso:**
  - `styles/global.css`: 11 clases sin ninguna referencia en `src` (`contact-link`, `navbar-logo`, `nav-link`, `navbar-cta`, `bg-gray-50`, `social-icon`, `prose`, `line-clamp-3`, `float-soft`, `card-lift`, `astro-asset-image/img`) y bloques duplicados (`.nav-link` L39 y L363; `::-webkit-scrollbar*` L104-127 y L527-540).
  - `styles/motion.css`: 10 clases sin uso (`field-glow`, `badge-live`, `no-js`, `skeleton`, `skeleton-dark`, `ticket-bump`, `fly-dot`, `slot-block`, `dragging`, `slot-cell-drop`).

**Resultado esperado:** no queda rastro de IA; ningún archivo, ruta, recurso ni regla CSS sin uso. El repo y el build pesan unos 26 MB menos.

## 2. Fuera de alcance
- Botones sin acción y conexiones rotas: spec 19.
- Rediseño visual: spec 20. El nuevo `global.css` se reescribe allí; aquí solo se borra lo muerto.
- Las páginas de redirección `/mis-reservas` y `/publica-tu-cancha` se mantienen, porque conservan enlaces antiguos.
- Unificar el área de jugador duplicada entre la landing y el panel: spec 22, con decisión aparte.

**Decisiones de producto que requieren aprobación:** ninguna (la IA se retira por pedido explícito).

## 3. Archivos afectados
| Archivo | Acción |
|---|---|
| `reservaya-nextjs-api/app/(dashboard)/admin/ai/` | eliminar |
| `reservaya-nextjs-api/app/(dashboard)/admin/page.tsx` | modificar: quitar la tarjeta de IA; «Tu día» a todo el ancho |
| `reservaya-nextjs-api/components/layout/Sidebar.tsx` | modificar: quitar el ítem y el import `Sparkles` |
| `reservaya-nextjs-api/lib/permissions.ts` | modificar: quitar `'ai'` |
| `reservaya-nextjs-api/components/features/B2BModulePage.tsx` | eliminar |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | modificar: quitar modales + script e imports de `LoginForm`/`RegisterForm` |
| `reservaya-frontend-astro/src/components/LoginForm.astro`, `RegisterForm.astro` | eliminar |
| `reservaya-frontend-astro/src/content/`, `src/content.config.ts` | eliminar |
| `reservaya-frontend-astro/public/images/unsplash/`, `src/assets/images/`, `public/og-default.svg` | eliminar |
| `reservaya-frontend-astro/src/styles/global.css`, `motion.css` | modificar: borrar las clases sin uso y los duplicados |
| `reservaya-frontend-astro/docs/architecture.md`, `PLAN_OTRO_AGENTE.md` | modificar |

## 4. Diseño y lógica
- Se borra solo lo que ninguna ruta, import ni script referencia. Cada candidato se confirma con `grep` antes de borrarlo.
- `permissions.ts`: si algún rol perdía `'ai'`, el resto de su matriz no cambia.
- **API:** ninguna. **Invariantes:** ninguna ruta viva cambia de comportamiento. Cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Sin IA | `grep -rniE "\bIA\b\|\bAI\b\|inteligencia artificial\|Sparkles"` en `app`, `components`, `lib` y `src` | 0 |
| A2 | Gates | Panel: `typecheck`, `lint`, `test`, `build`. Landing: `astro check`, `build` | 0 errores |
| A3 | Sin muertos | Rescanear imports, recursos de `public/` y clases CSS | 0 sin uso |
| A4 | Rutas | `/admin/ai` → 404; `/admin`, `/login` y `/register` renderizan (Playwright, 1280 y 375 px, 0 errores de consola) | OK |
| A5 | Peso | `du -sh` de `public/` y `src/assets/` antes y después | ≈ −26 MB |

## 6. Checklist
- [x] T1: Retirar la IA del panel.
- [x] T2: Borrar `B2BModulePage`, los modales, `LoginForm` y `RegisterForm`.
- [x] T3: Borrar el blog, las imágenes y el SVG.
- [x] T4: Limpiar CSS.
- [x] T5: A1–A5 y §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | T1 | ✅ | Eliminado `admin/ai/`; tarjeta «PRÓXIMAMENTE · ReservaYa AI» fuera («Tu día» a todo el ancho); ítem y `Sparkles` fuera del `Sidebar`; `'ai'` fuera de `permissions.ts`. `Sparkles` del checklist de `/admin` → `ListChecks` |
| 2026-09-26 | T2 | ✅ | Eliminados `B2BModulePage.tsx`, `LoginForm.astro` y `RegisterForm.astro`, y de `BaseLayout.astro` los modales, sus 2 scripts, los flags `showLoginModal`/`showRegisterModal` y los imports (904 → 816 líneas) |
| 2026-09-26 | T3 | ✅ | Eliminados `src/content/` (blog), `src/content.config.ts`, `public/images/unsplash/` (29 fotos), `src/assets/images/` (4) y `public/og-default.svg`. Antes de borrar se comprobó que las únicas referencias eran los 2 posts del blog |
| 2026-09-26 | T4 | ✅ | Landing: 24 clases sin uso eliminadas. `global.css` (12: `contact-link`, `navbar-logo`, `nav-link`×2 bloques, `navbar-cta`, `bg-gray-50`, `astro-asset-image/img`, `social-icon`, `prose`, `line-clamp-3`, `input`, `float-soft`, `card-lift`) + los dos bloques de scrollbar fusionados en uno con los valores efectivos, 610 → 402 líneas. `motion.css` (12, incluidas `modal-*-enter`, que quedaron huérfanas al quitar los modales). Panel `app/globals.css`: 10 clases sin uso (`animate-in`, `btn-accent`, `dashboard-shell`, `dragging`, `form-input`, `form-label`, `skeleton`, `slide-in-from-right`, `slot-block`, `slot-cell-drop`), 341 → 241 líneas |
| 2026-09-26 | A1 | ✅ | `grep` de IA, `Sparkles` y `/admin/ai` en `app`, `components`, `lib` y `src`: 0 |
| 2026-09-26 | A2 | ✅ | Landing: `astro check` 0 errores; build de 22 páginas. Panel: `typecheck` 0 (tras regenerar `.next/types`, que aún citaba `admin/ai`), `lint` 0 errores (los 2 warnings ya existían), `test` 21/21, `build` OK. Un primer build falló al descargar Nunito de Google Fonts (fallo transitorio de red); el reintento pasó |
| 2026-09-26 | A3 | ✅ | Rescaneo: 0 módulos del panel sin importar; 0 clases CSS sin uso en la landing y en el panel |
| 2026-09-26 | A4 | ✅ | Playwright a 1280 y 375 px: `/`, `/login` y `/register` de la landing → 200, 0 errores JS, 0 modales; `/admin` (SUPERADMIN) → 200, sin «AI» ni «PRÓXIMAMENTE»; `/admin/ai` → 404; 0 px de scroll horizontal. Captura de `/admin` revisada |
| 2026-09-26 | A5 | ✅ | `public/` de 6.0 MB a 37 KB y `src/assets/` de 24 MB a 3.5 MB (≈ −26.5 MB) |
| 2026-09-26 | Nota | — | Para la spec 21: el sidebar del dueño repite el título de grupo «Operación» (se ve en la captura de `/admin`) |
