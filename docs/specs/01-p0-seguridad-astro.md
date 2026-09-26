# Especificación: 01 - Cierre P0 de seguridad en Astro (backlog P0-1/2/3)

## 1. Objetivo
**Problema:** el backlog P0 figuraba abierto. Auditoría 2026-09-25: P0-1 (open redirect) y P0-3 (PII) ya resueltos; queda un sumidero XSS en `reservaya-frontend-astro/src/pages/jugador/perfil.astro:218` — `pintarFoto` arma `'<img src="' + src + '" …>'` con `fotoUrl` de la API dentro de `innerHTML` (un `"` en la URL inyecta atributos, p. ej. `onerror`).
**Resultado esperado:** ningún `innerHTML`/`outerHTML` de la landing recibe datos de API o usuario sin escapar; el avatar se construye con `createElement` y conserva la insignia.

## 2. Fuera de alcance
Validar `fotoUrl` en la API (backend), rediseñar el perfil, `innerHTML` con literales fijos.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/pages/jugador/perfil.astro` | modificar | `pintarFoto` sin `innerHTML` |

## 4. Diseño y lógica
- `pintarFoto`: vaciar con `replaceChildren()`, crear `<img>` con `setAttribute("src", src)`, re-anexar el nodo insignia existente (no su `outerHTML`).
- Script sigue siendo `is:inline` → JS plano.
- **Invariantes (auditados, sin cambios):** `getSafeReturnUrl` (`login.astro:74`) rechaza `//x`, `/\x`, `javascript:` y orígenes ajenos a `location.origin`/`appUrl`; `register.astro` redirige a destino fijo `${appUrl}/dashboard`; `sortear.astro:224` escapa con `esc()`.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Sin sumideros con datos | `rg "innerHTML\s*=\s*['\"\`].*\+" src` revisado a mano | solo literales o `esc()` |
| A2 | Build | `npm run build` | OK |
| A3 | JS inline válido | `node --check` del script inline de `dist/jugador/perfil/index.html` | 0 errores |
| A4 | Comportamiento | `pintarFoto('/x.png')` y `pintarFoto('a" onerror="alert(1)')` en navegador | img creada, sin atributo `onerror`, insignia presente |

## 6. Checklist
- [x] T1: reescribir `pintarFoto` con DOM API.
- [x] T2: verificar A1–A4 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | `grep innerHTML src` → 25 usos: literales fijos, `""` o `esc()` (`sortear.astro:224`); `perfil.astro` ya sin `innerHTML` con datos |
| 2026-09-25 | A2 | ✅ | `npm run build` → 21 page(s) built |
| 2026-09-25 | A3 | ✅ | `node --check` sobre los 299 scripts inline de `dist/**/*.html` → 0 errores |
| 2026-09-25 | A4 | ✅ | Playwright 1280/375 con `/api/auth/me` interceptado: `fotoUrl='https://x.test/a.png" onerror="window.__xss=1'` → `src` literal, `onerror` null, `__xss` no definido; `fotoUrl` relativa → `http://localhost:5000/uploads/…`; 2 `<img>` + insignia presente; 0 errores de página; scroll-x 0 px; captura revisada |
