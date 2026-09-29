# Especificación: 31 — Croquis de cancha como firma visual de estados vacíos y error

> **Estado:** ✅ Implementada por `dev-claude` (`task-20260929-reparto-pam`, 2026-09-29) — gates A1–A7 en verde, pendiente de verificación jim-qa-b.
> **Origen:** `task-20260928-dev-plan-frontend`, punto 3 ("la siguiente mejora de mayor impacto visual no genérica").

---

## 1. Objetivo

**Problema:** `EmptyState.tsx` (Next) usa un ícono genérico de Lucide en una caja — exactamente el patrón "icono + texto" que `design-taste-frontend` (§4.8 *Image & Visual Asset Strategy*) señala como defecto por omisión de IA. `EmptyState.astro` (Astro) y `404.astro`/`500.astro` no tienen ningún elemento visual, solo texto sobre `card-dashed`. Mientras tanto, ReservaYa ya tiene una firma visual propia — el **croquis de cancha** (perímetro + línea media + círculo central, 100% CSS, sin imagen ni SVG externo) creada en la spec 24 para el fallback de fotos de cancha (`CanchaCard.tsx`, `filas.ts`) — pero solo se usa ahí. Es la pieza de identidad más distintiva del sistema y hoy está infrautilizada.

**Resultado esperado:** El croquis de cancha se convierte en el elemento visual por defecto de todo estado vacío/error del producto (listas vacías, 404, 500), reemplazando iconos genéricos y cajas sin nada. Justificación de por qué esta mejora y no otra: cero dependencias nuevas (ya es CSS puro, ya pasó gates de contraste/CLS en spec 24), cero riesgo de romper datos o lógica, y es la opción de mayor identidad frente a alternativas descartadas (gráficas en `/admin/reportes` exigiría una librería nueva, prohibida por spec 27 §2; ilustraciones importadas romperían la regla "sin imágenes/SVG externos" ya fijada en spec 24).

---

## 2. Fuera de alcance

- Cualquier librería de charts/gráficos para `/admin/reportes` o `/tecnico`.
- Pantallas admin/B2B (`components/b2b/**`) — las cubre la spec 29.
- Cambiar el copy de los estados vacíos existentes, solo el elemento visual que los acompaña.

**Decisiones de producto que requieren aprobación:** usar el croquis (en vez de dejar `EmptyState` sin ícono, o mantener los iconos de Lucide actuales) como firma visual única de "vacío/error" en todo el producto.

---

## 3. Archivos afectados

| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/components/ui/CroquisCancha.tsx` | Crear | Extraer el componente ya duplicado dentro de `CanchaCard.tsx` a un archivo propio y reutilizable. |
| `reservaya-nextjs-api/components/features/CanchaCard.tsx` | Modificar | Importar `CroquisCancha` en vez de definirlo localmente (sin cambio visual). |
| `reservaya-nextjs-api/components/ui/EmptyState.tsx` | Modificar | Sustituir el `icon: LucideIcon` genérico por `<CroquisCancha />` como imagen por defecto (mantener `icon` opcional para casos que de verdad lo necesiten). |
| `reservaya-frontend-astro/src/components/ui/CroquisCancha.astro` | Crear | Versión Astro del mismo croquis (hoy vive inline en `filas.ts` como función que crea DOM; aquí se necesita como componente `.astro` para páginas estáticas). |
| `reservaya-frontend-astro/src/components/ui/EmptyState.astro` | Modificar | Sumar el croquis sobre el texto existente. |
| `reservaya-frontend-astro/src/pages/404.astro` | Modificar | Reemplazar el número "404" suelto por el croquis + texto. |
| `reservaya-frontend-astro/src/pages/500.astro` | Modificar | Mismo tratamiento que 404. |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | Modificar | No listado originalmente: se quitó `icon={SearchX}` de los 2 `EmptyState` (import ahora sin uso, retirado) para que se ejerza el croquis por defecto y cumplir A7. |

---

## 4. Diseño y lógica

- **UI:** el croquis (perímetro `border-2 border-cesped/40`, línea media, círculo central, `bg-cesped-suave`) se reutiliza tal cual de `CanchaCard.tsx`/`filas.ts` — mismas proporciones, mismos tokens, sin inventar un estilo nuevo. Tamaño de referencia: `h-24 w-24` en `EmptyState`, `h-32 w-full max-w-xs` en 404/500 (banda ancha en vez de tarjeta cuadrada, para llenar mejor la página de error).
- **API:** ninguna — es un cambio puramente visual sobre componentes ya existentes.
- **Invariantes:** `aria-hidden="true"` en el croquis siempre (decorativo, el mensaje de texto ya comunica el estado); `EmptyState` sigue aceptando `action` para el CTA.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests panel | `npm --prefix reservaya-nextjs-api run test` | 40/40 |
| A4 | Build panel | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Astro | `astro check` + `astro build` | 0 errores |
| A6 | Sin duplicación | `grep -c "CroquisCancha\|croquisCancha"` por archivo | Solo 1 definición por app, el resto son imports/usos |
| A7 | Comportamiento | Vaciar resultados de `/dashboard/canchas` (filtro sin coincidencias), visitar `/ruta-inexistente` | Se ve el croquis en el estado vacío y en 404 |

---

## 6. Checklist
- [x] T1: extraer `CroquisCancha` a componente propio en ambas apps (Next + Astro), sin cambiar su apariencia en los usos actuales.
- [x] T2: adoptarlo en `EmptyState` (Next y Astro).
- [x] T3: adoptarlo en `404.astro`/`500.astro`.
- [x] T4: verificar criterios y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-29 | A1–A4 Next | ✅ PASS | typecheck 0, lint 0 (2 warnings preexistentes), test 40/40, build Next OK. |
| 2026-09-29 | A5 Astro | ✅ PASS | `astro check` 0 err/0 warn/1 hint conocido; `astro build` 17 páginas OK. |
| 2026-09-29 | A6 Sin duplicación | ✅ PASS | Next: 1 definición (`components/ui/CroquisCancha.tsx`), usada en `CanchaCard.tsx` y `EmptyState.tsx`. Astro: 1 componente (`CroquisCancha.astro`), usado en `EmptyState.astro`/`404.astro`/`500.astro`; `src/scripts/filas.ts` conserva su propia `croquisCancha()` en DOM puro porque es JS de cliente para filtrado dinámico, no una plantilla `.astro` (excepción ya prevista en §3). |
| 2026-09-29 | A7 Comportamiento | ✅ PASS | Se quitó `icon={SearchX}` de ambos `EmptyState` de `/dashboard/canchas` (fuera de la lista original de §3, necesario para que el criterio se cumpla) para que usen el croquis por defecto; `404.astro`/`500.astro` muestran el croquis en vez del número suelto. Sin cambio de copy. |
| 2026-09-29 | T1–T4 revisión auditor-b (contra spec, tras verde jim-qa-b) | ✅ APROBADO + 1 nota | Extracción fiel: misma geometría/tokens en ambos `CroquisCancha`, `aria-hidden` siempre, `icon` opcional conservado, copy intacto, A6 con 1 definición por app (`filas.ts` excepción documentada). Nota (no bloqueante): el nuevo componente añade `rounded-xl overflow-hidden` que el original inline no tenía — imperceptible (el padre en `CanchaCard` recorta con `overflow-hidden`), pero estrictamente es un micro-delta visual en el fallback sin foto. |
