# Spec 26 — Identidad futbolera compartida (landing + panel)

**Estado: Aprobada** (god por delegación de Lukas).

Origen: feedback de Lukas ("se ve genérico y muerto; el panel parece otro entorno"). Base: specs 20, 21 §4, 24.

## 1. Objetivo
Unificar la paleta cesped entre Astro y Next (hoy `#17804a` vs `#22c55e`), sumar 2 tokens nuevos con tema futbolero, dar sensación de landing al shell del panel (marca real + fondo oscuro compartido), inputs con estilo compartido, y volver la landing más viva (bandas, franjas, contenido real) sin romper spec 17 (scroll nativo) ni CLS.

## 2. Tokens (mismos nombre/valor en `tokens.css` y `globals.css`)
| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `cesped` (unificado) | `#17804a` | acento único | **texto encima pasa a `tiza` (blanco), no `grafito`**: grafito da 3.98:1 (falla AA), tiza da 4.96:1 |
| `cesped-hover` | `#126b3d` | hover del acento | tiza encima ~6.3:1 |
| `noche` (nuevo) | `#0b1912` | banda oscura hero/footer, fondo del Sidebar (reemplaza `grafito` genérico) | tiza encima ~19:1 |
| `cielo` (nuevo) | `#e8f1f6` | banda clara alterna a `sillar` (sección "para dueños") | basalto encima ~17:1 |
| tarjeta amarilla | reutiliza `sol` `#f0b429` (sin token nuevo: dos amarillos casi iguales sobran) | chips/FAQ | basalto encima 7.96 |
| tarjeta roja | ya existe: `error` `#b42318` | — | — |

**Riesgo principal:** unificar cesped invierte la regla de spec 14 (texto sobre verde = grafito). Hay 9 archivos del panel con `bg-cesped`/`bg-cesped-hover` + texto `grafito` que deben pasar a `tiza`. Este es el único cambio permitido en pantallas admin (excepción explícita).

## 3. Lote 1 — tokens + inputs + shell
- `tokens.css`: sumar `noche`/`cielo`.
- `globals.css`: cambiar `--cesped`/`--cesped-hover`, sumar `--noche`/`--cielo` + mapeo `@theme inline`; texto `grafito`→`tiza` en los archivos con `bg-cesped`/`bg-cesped-hover`.
- `Sidebar.tsx`: fondo `bg-grafito` → `bg-noche`; logotipo igual a `Marca.astro` (icono de cancha + "ReservaYa"), no el tile con emoji actual.
- Nuevo `components/ui/Input.tsx` y `Select.tsx` en Next (alto 44, icono, foco cesped), espejo de `Field.astro`/`Select.astro`; adoptados en filtros de `dashboard/canchas`, `PerfilForm` y `ReservaForm`.
- `scroll-behavior: smooth` + `@media (prefers-reduced-motion: reduce) { scroll-behavior: auto }` en ambos globals; scrollbars finas con tokens (`cal`/`niebla`) en vez de hex sueltos.
- Verificación: grep de `bg-cesped`/`hover:bg-cesped-hover` en `app/` y `components/` → 0 coincidencias con `text-grafito`.

## 4. Lote 2 — landing viva
- Hero y bandas nuevas (Astro `index.astro` y páginas relacionadas): fondo `noche` + franja de "césped cortado" (rayas `cesped`/`cesped-hondo` alternas, solo CSS) + líneas `cal`, limitado a hero/bandas (no en tarjetas de contenido).
- Secciones nuevas con contenido real: deportes (`TIPOS` de `lib/arequipa.ts`), 29 distritos (`DISTRITOS`), preguntas frecuentes, texto para dueños — sin cifras/testimonios inventados.
- Aplicar `Input`/`Select` nuevos donde ya existen campos de contacto/búsqueda en la landing.

## 5. Riesgos
- Astro ya usa `tiza` sobre `cesped` (sin cambio); Next es el que voltea — validar con gates de contraste tras el lote 1.
- Franja de césped cortado: solo CSS (gradient/repeating-linear-gradient), cero JS, para no tocar spec 17.

## 6. Checklist
- [ ] L1: tokens + shell + inputs — gates (typecheck/lint/test/build ambas apps) + grep 0 + 1 ronda de capturas
- [ ] L2: landing viva — `astro check` + build + 1 ronda de capturas
- [ ] A: revisión visual de Lukas

## 7. Verificación
_En progreso._
