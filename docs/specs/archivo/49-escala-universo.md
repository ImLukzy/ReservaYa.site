# Especificación: 49 — Escala y formato como Universo Agustino en el sitio público

> **Estado:** ✅ Pedido directo de Lukas (2026-09-30): «disminuye la escala, aléjalo más, y adapta el formato de toda la página para que quede bien, igual como el de universoagustino».
> **Nota:** la spec 48 queda reservada para la deuda de componentes del panel > 150 líneas (spec 46 §2).

## 1. Objetivo
**Problema:**
1. **Escala fluida demasiado grande.** `reservaya-frontend-astro/src/styles/global.css:6` `html { font-size: clamp(100%, 0.8rem + 0.5vw, 125%) }` (spec 36): la raíz vale 19.2 px a 1280 px y 20 px a 1440 px, así que todo (texto, espacios, botones, contenedores) sale un 20–25 % más grande que en Universo, que usa 16 px fijos. Ejemplo: la píldora «Iniciar sesión» (`min-h-11`) mide 52.8 px en lugar de 44 px.
2. **Escala de texto grande e incompleta.** `tokens.css:85-99` resetea `--text-*` y define solo `sm…4xl` con razón 1.25 (`lg` 20 px, `xl` 25 px, `4xl` 49 px). `text-xs` (25 usos), `text-5xl` (8) y `text-6xl` (3) no generan CSS: esos textos heredan un tamaño que nadie eligió.
3. **Cabecera estrecha.** La de Universo usa `max-w-7xl` con píldoras `btn-sm`; la de ReservaYa, el contenedor de contenido (`max-w-page`).

**Resultado esperado:** raíz de 16 px fija; escala de texto de Tailwind (la de Universo) completa de `xs` a `7xl`; contenido a 70 rem (1120 px, como las filas de Universo) y cabecera a `max-w-7xl`; cada página revisada a 1280 y 375 px sin cortes, CLS < 0.02 y 0 px de desborde.

## 2. Fuera de alcance
- Panel Next (su raíz fluida es de la spec 37). Colores, radios, motion.

**Decisiones tomadas por defecto:** se retira la escala fluida 1.00→1.25 de la spec 36 (pedido explícito de Lukas). En celular no cambia la raíz (el `clamp` ya daba 16 px a 375 px); cambia solo la escala de títulos.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `src/styles/global.css` | modificar | `html { font-size: 100% }` |
| `src/styles/tokens.css` | modificar | Escala `xs…7xl` de Tailwind con interlineado para display; `--container-texto` 48 rem |
| `src/components/Header.astro`, `HeaderAcciones.astro` | modificar | `max-w-7xl`; píldoras de escritorio `min-h-10` y 13 px |
| Páginas y componentes | modificar | Solo los ajustes que salgan de la revisión visual (§7) |
| `docs/skills/astro-landing.md` | modificar | Regla 8: raíz fija y escala nueva |

## 4. Diseño
| Token | Antes | Ahora (Tailwind/Universo) |
|---|---|---|
| raíz | 16 → 20 px (fluida) | 16 px |
| `xs` / `sm` / `base` | — / 14 / 16 | 12 / 14 / 16 |
| `lg` / `xl` / `2xl` | 20 / 25 / 31 | 18 / 20 / 24 |
| `3xl` / `4xl` / `5xl` / `6xl` / `7xl` | 39 / 49 / — / — / — | 30 / 36 / 48 / 60 / 72 |
| `--container-texto` | 42 rem (806 px efectivos a 1280) | 48 rem (768 px, `max-w-3xl` de Universo) |

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro | `astro check` + build; `motion-tokens --check` | 0 errores |
| A2 | Escala | CSS generado: `.text-xs`…`.text-7xl` presentes; raíz 16 px a 1280 | todas |
| A3 | CLS y desborde | `cls.mjs --landing --rutas` (10 páginas) | < 0.02; 0 px |
| A4 | Capturas | 16 páginas a 1280 y 375 revisadas junto a Universo | sin cortes ni solapes |
| A5 | Regresión | `qa47`, `qa47b`, `qa47c` | 0 ✗ |

## 6. Checklist
- [x] T1: Raíz, escala y contenedor texto.
- [x] T2: Cabecera ancha.
- [x] T3: Revisión página a página y ajustes (abajo).
- [x] T4: Skill + verificación A1–A5 en §7.

**Ajustes que salieron de la revisión (T3):**
| Archivo | Cambio | Por qué |
|---|---|---|
| `pages/index.astro` | Héroe centrado como el de Universo: titular de hasta 72 px, buscador horizontal ancho (`max-w-4xl`, `shadow-dura-cesped`) y tablero debajo | Con 16 px, el titular en la columna de 18 rem se partía en 3 líneas y el tablero dejaba un hueco oscuro |
| `components/ui/PatronCancha.astro` | Variante `centro`: cancha a todo el ancho detrás del héroe centrado | La cancha estaba a la derecha, detrás de la antigua columna del tablero |
| `layouts/BaseLayout.astro` | `<main class="min-h-[calc(100svh-4rem)]">` | A la escala nueva, `/completar-cuadro` cabe en pantalla y el pie visible bajaba 111 px al cargar la lista (CLS 0.0163 a 1440) |
| `ui/EmptyState.astro`, `scripts/filas.ts` | Títulos `font-display` de 600 a 700 | El 600 condensado no se precarga: el título de error del tablero pasaba de 2 a 1 línea al llegar la fuente (CLS 0.0147 a 375) |

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 Astro | ✅ | `astro check` 0 errores, 0 warnings; build 18 páginas; `motion-tokens --check` OK |
| 2026-09-30 | A2 Escala | ✅ | CSS: `.text-xs`, `.text-6xl`, `sm:/md:/lg:text-5xl` generadas; píldora «Iniciar sesión» 40 px a 1280 (antes 52.8) y 44 px a 375 |
| 2026-09-30 | A3 CLS y desborde | ✅ | `cls.mjs --landing` con 10 páginas × 375/1440: 3 pasadas con 20/20; máximo 0.0007. 16 páginas a 375 px: 0 px de desborde, 0 errores |
| 2026-09-30 | Fuentes | ✅ | Playwright, 8 páginas × 2 anchos: se piden `barlow-400`, `barlow-600`, `barlow-condensed-700` (+ `barlow-500` en `/duenos`); `barlow-condensed-600` ya no se pide |
| 2026-09-30 | A4 Capturas | ✅ | 8 páginas a 1280 (3 vistas) y 375, más el héroe nuevo a 1280/375 y `/duenos`, revisadas junto a las de Universo: contenido a 1120 px con márgenes, cabecera a lo ancho, sin cortes |
| 2026-09-30 | A5 Regresión | ✅ | `qa47` 20/20 (umbral de la píldora de escritorio en 40 px), `qa47b` 0 ✗, `qa47c` 14/14 |
