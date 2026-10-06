# Especificación: 41 - Login y registro del panel legibles

**Aprobada por Lukas:** 2026-09-30 00:35 («Acepta todas las ask me»).

## 1. Objetivo
**Problema:** la QA de Jim (`hive/agents/jim-qa-mumwavdb/informe-qa-panel-publico.md`, capturas en `shots-publico/`) encontró 3 fallos en `/login` y `/register` del panel:
1. `app/(auth)/register/page.tsx:85`: `grid grid-cols-2` deja el campo de fecha en 124 px a 360 px de ancho; el texto `dd/mm/aaaa` se corta y el ícono del calendario se superpone.
2. `app/(auth)/login/page.tsx:67` y `app/(auth)/register/page.tsx:67`: la alerta de error usa `text-rose-300` sobre la tarjeta blanca, con un contraste de 1.89:1 (WCAG AA pide 4.5:1).
3. `app/globals.css:169` `.auth-home-link` («Volver a inicio»): `var(--niebla)` sobre blanco da 2.16:1.

**Resultado esperado:** los tres textos pasan WCAG AA (≥ 4.5:1) y el campo de fecha se ve completo a 360 px.

## 2. Fuera de alcance
Lógica de login y registro, textos, validaciones, la landing Astro, otros avisos.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/app/(auth)/register/page.tsx:85` | modificar | `grid-cols-1 sm:grid-cols-2` |
| `reservaya-nextjs-api/app/(auth)/register/page.tsx:67` | modificar | alerta con tokens `bg-error-suave`, `text-error`, borde `error` |
| `reservaya-nextjs-api/app/(auth)/login/page.tsx:67` | modificar | igual que el anterior |
| `reservaya-nextjs-api/app/globals.css:169-175` | modificar | `.auth-home-link` pasa a `var(--pizarra)` (5.43:1); hover con un token existente |

## 4. Diseño y lógica
- **UI:** mismos elementos y lugares; solo cambian el color y, en celular, la fila de fecha pasa a ocupar el ancho completo.
- **API:** sin cambios.
- **Invariantes:** solo tokens de `globals.css` (`--error` 6.57:1, `--error-suave`, `--pizarra`); nada de hex nuevos.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos, lint, tests, build del panel | `typecheck` · `lint` · `test` · `build` | 0 errores; avisos ≤ los de hoy |
| A2 | Fecha completa | Playwright 360 px en `/register`: ancho del `input[type=date]` | ≥ 280 px |
| A3 | Contraste de la alerta | color del texto frente al fondo real | ≥ 4.5:1 |
| A4 | Contraste de «Volver a inicio» | igual | ≥ 4.5:1 |
| A5 | Sin regresión | Playwright 360/768/1440 en `/login` y `/register`: 0 scroll lateral | 0 px |

## 6. Checklist
- [x] T1: fila de fecha responsiva.
- [x] T2: alertas de error con tokens.
- [x] T3: enlace «Volver a inicio» con `--pizarra`.
- [x] T4: gates y Playwright; §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 | ✅ | typecheck 0 errores · lint 0 errores, 2 avisos (los de antes) · test 40/40 · build compila (god) |
| 2026-09-30 | A2 | ✅ | Playwright 360 px `/register`: `input[type=date]` 260 px = 100 % del ancho útil de la tarjeta; `dd/mm/aaaa` y el ícono completos (captura god). El umbral 280 superaba el ancho de la tarjeta |
| 2026-09-30 | A3 | ✅ | alerta `text-error` sobre `bg-error-suave`: 5.75:1 (token documentado en `globals.css:45`) |
| 2026-09-30 | A4 | ✅ | `.auth-home-link` computado `rgb(90, 102, 96)` = `--pizarra`, 5.43:1 |
| 2026-09-30 | A5 | ✅ | Playwright 360/768/1440 en `/login` y `/register`: 0 px de scroll lateral |
