# Especificación: 58 - Objetivos táctiles de 44 px en móvil

Estado: completada 2026-10-08.

## 1. Objetivo
**Problema:** la auditoría responsiva (`hive/agents/jim-muvk1y3c/responsive-audit.md`) no halló desbordes, pero sí objetivos táctiles por debajo de 44×44 px:
- H1: enlaces inline — `apps/web/components/public/CookieConsent.tsx:32` (69×18), `apps/web/app/(public)/content.tsx:59` y `:70` (alto 24), `apps/web/app/(public)/libro-reclamaciones/content.tsx:99`, `:135`, `:140` (alto 18–38).
- H2: enlace "Jugar" del pie 39×44 — `apps/web/components/public/Footer.tsx:16` (`enlaceLegal`) y `:70`.
- H8: enlaces del drawer del panel 236×40 — `apps/web/components/layout/Sidebar.tsx:261` y `:286`.
- H9: botones abrir/cerrar menú del panel 36×36 y 34×34 — `apps/web/components/layout/Sidebar.tsx:216` y `:250`.

**Resultado esperado:** todos esos objetivos miden al menos 44×44 px de área táctil a 360, 390 y 768 px, sin cambiar el aspecto visual ni el ritmo del texto.

## 2. Fuera de alcance
- H3 (banner de cookies fijo) y H4 (`/registro`, la ruta real es `/register`).
- API, datos, rutas y cualquier otro componente.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/web/components/public/CookieConsent.tsx` | modificar | H1 |
| `apps/web/app/(public)/content.tsx` | modificar | H1 |
| `apps/web/app/(public)/libro-reclamaciones/content.tsx` | modificar | H1 |
| `apps/web/components/public/Footer.tsx` | modificar | H2 |
| `apps/web/components/layout/Sidebar.tsx` | modificar | H8, H9 |

## 4. Diseño y lógica
- **UI:** enlaces dentro de texto corrido: ampliar solo el área táctil sin mover el texto (p. ej. `inline-block py-3 -my-3`, o `relative` + pseudo-elemento). Enlaces/botones sueltos: `min-h-11` / `min-w-11` o padding (`py-3`, `px-3`, `p-3`). Seguir `docs/skills/panel-next.md`.
- **API:** ninguna.
- **Invariantes:** 0 px de desborde horizontal; foco visible y estados hover intactos; sin cambios de copy.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos web | `npm --prefix apps/web run typecheck` | 0 errores |
| A2 | Lint web | `npm --prefix apps/web run lint` | 0 errores |
| A3 | Gate completo | `pnpm exec turbo run build typecheck lint test --force` (fuera del sandbox) | 18/18 |
| A4 | Tamaño táctil | Medir con Playwright (bounding box del área clicable) los objetivos de §1 en local a 360/390/768 | todos ≥ 44×44 |
| A5 | Sin regresión | Desborde horizontal en rutas públicas y drawer del panel a 360/390/768 | 0 px |

## 6. Checklist
- [x] T1: H8 y H9 en `Sidebar.tsx`.
- [x] T2: H2 en `Footer.tsx`.
- [x] T3: H1 en los tres archivos públicos.
- [x] T4: verificar criterios y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A1 | Cumple | `npm --prefix apps/web run typecheck`, Node 22: exit 0. |
| 2026-10-08 | A2 | Cumple | `npm --prefix apps/web run lint`: exit 0. |
| 2026-10-08 | A3 | Cumple | god, fuera del sandbox: `pnpm exec turbo run build typecheck lint test --force` → 18/18 (API 111, web 67, shared 1). |
| 2026-10-08 | A4 | Cumple | god: `spec58-measure.mjs` (Chrome del sistema, web local build contra API de producción, usuario QA) 54 mediciones a 360/390/768, 0 por debajo de 44×44. |
| 2026-10-08 | A5 | Cumple | 21 mediciones de desborde (6 rutas públicas + drawer del panel × 3 anchos): 0 px. |

Antes: auditoría de Jim en producción. Después: medición local de god (mínimo por objetivo en los 3 anchos).

| Objetivo | Anchos de viewport (px) | Antes (ancho×alto px, Jim) | Después medido |
|---|---|---|---|
| Cookies: Privacidad | 360 / 390 / 768 | 69×18 | 69×44 |
| Landing: Arma los equipos | 360 / 390 / 768 | 312×24 | 312×44 |
| Landing: Otra duda | 360 / 390 / 768 | 210×24 | 210×44 |
| Libro: correo | 360 / 390 / 768 | 121–124×18 | ≥44×44 |
| Libro: Política de privacidad | 360 / 390 / 768 | 277×38 | 136×44 |
| Footer: Jugar | 360 / 390 / 768 | 39×44 | 44×44 |
| Drawer: enlaces | 360 / 390 / 768 | 236×40 | 236×44 |
| Panel: abrir menú | 360 / 390 / 768 | 36×36 | 44×44 |
| Panel: cerrar menú | 360 / 390 / 768 | 34×34 | 44×44 |
