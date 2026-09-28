# Especificación: 27 — Elevación visual de referencia (estilo táctil/rudo Universo Agustino)

> **Estado:** 📋 Borrador oficial del Auditor — entregado al trío (`Auditor-Gemini` → `Oscar-code` → `JIM-QA` → `god`).
> **Origen:** Directiva de Lukas (2026-09-28) para llevar el acabado visual de ReservaYa al nivel del monorepo de referencia `Universo_Agustino` (`apps/web/src/styles/ui.css` y Spec 18).

---

## 1. Objetivo

**Problema:**
A pesar de las unificaciones de tokens logradas en las Specs 20, 24 y 26, las interfaces de ReservaYa (tanto en la landing Astro como en el panel Next.js) aún exhiben una textura visual plana y dispar:
1. **Superficies débiles y sombras difusas:** Las tarjetas (`Card.tsx`, filas de canchas) utilizan bordes delgados de 1px (`border-cal`) sin profundidad o con sombras borrosas residuales de Tailwind estándar (`shadow-sm`, `shadow-lg`, o `rgba(...)` en `.btn-press`), perdiendo la contundencia de un panel deportivo.
2. **Botones sin peso físico:** Los botones carecen del feedback de pulsación mecánica (elevación en hover y depresión en click activo) característico del sistema de referencia.
3. **Estados vacíos e informativos sin marco unificado:** Existen avisos y llamadas vacías con estilos improvisados en lugar de la caja punteada estandarizada (`.card-dashed`) de Universo Agustino.
4. **Buscadores y filtros heterogéneos:** Filtros y chips se renderizan con distintos radios y bordes en lugar del estándar de píldora táctil (`rounded-full border-2 border-basalto`).
5. **Tipografía sin balance editorial:** Falta la aplicación de balance tipográfico nativo (`text-wrap: balance` en encabezados y `text-wrap: pretty` en párrafos) para asegurar jerarquía visual sin saltos huérfanos.

**Resultado esperado:**
Unificar y elevar el lenguaje visual de ReservaYa bajo la estética **neo-brutalista sobria ("stetik / rudo")** de Universo Agustino, adaptada a la identidad del «Tablero de cancha»:
- Bordes definidos de 2px en tono tinta/basalto (`#1f2a24` o `--basalto`).
- Sombras duras de época (drop shadows sin desenfoque: `3px 3px 0 0`, `4px 4px 0 0`, `6px 6px 0 0`).
- Botones píldora táctiles con elevación en hover y depresión mecánica en click (`active:translate(2px, 2px)`).
- Tarjetas sólidas (`.card-tactil`) y estados vacíos enmarcados (`.card-dashed`).
- Buscadores y chips en formato píldora nítida.
- Cero degradados difusos de IA, cero sombras borrosas y cero cambios a la lógica de negocio o contratos de API.

---

## 2. Fuera de alcance

- Backend .NET, controladores C#, Prisma, base de datos y migraciones (cero cambios).
- Contratos de API, esquemas OpenAPI y endpoints existentes (cero cambios).
- Lógica de autenticación, emisión de tokens JWT, cookies o flujos de sesión (cero cambios).
- Paneles B2B/Admin especializados (`components/b2b/**`), excepto por la herencia natural de componentes UI base (`Button`, `Card`, `Modal`).
- Agregar librerías o dependencias npm nuevas (cero dependencias externas).
- Alterar la paleta de color aprobada en Spec 26 (`cesped`, `cesped-hover`, `basalto`, `sillar`, `tiza`, `noche`, `cielo`).

---

## 3. Archivos afectados

| Archivo | Acción | Propósito en Spec 27 | Lote |
|---|---|---|---|
| `reservaya-frontend-astro/src/styles/tokens.css` | Modificar | Incorporar tokens de sombra dura táctil, `sol-suave`, `alerta(-suave)` y utilidades de balance | L1 |
| `reservaya-nextjs-api/app/globals.css` | Modificar | Incorporar sombras duras, tokens `sol-suave`, `alerta(-suave)`, clases táctiles y erradicar sombras difusas | L1 |
| `reservaya-nextjs-api/components/b2b/CronogramaView.tsx` | Modificar | Reemplazar los 10 hex huérfanos de pendiente y bloqueo por tokens semánticos | L1 |
| `reservaya-frontend-astro/src/lib/estilos.ts` | Modificar | Actualizar `BOTON`, `CAMPO`, `INSIGNIA` con borde 2px y sombras duras táctiles | L1 |
| `reservaya-nextjs-api/components/ui/Button.tsx` | Modificar | Estilo táctil píldora, borde 2px, sombra dura y click mecánico (`active:translate`) | L1 |
| `reservaya-nextjs-api/components/ui/Card.tsx` | Modificar | Borde 2px, sombra dura 4px, `StatCard` con tokens semánticos limpios | L1 |
| `reservaya-nextjs-api/components/ui/EmptyState.tsx` | Modificar | Enmarcado `.card-dashed` con borde 2px punteado | L1 |
| `reservaya-nextjs-api/components/ui/Badge.tsx` | Modificar | Chips y etiquetas píldora con borde nítido | L1 |
| `reservaya-frontend-astro/src/components/ui/Button.astro` | Modificar | Variantes táctiles con sombra dura compartida | L1 |
| `reservaya-frontend-astro/src/components/ui/EmptyState.astro` | Modificar | Adopción de caja enmarcada punteada (`border-2 border-dashed`) | L1 |
| `reservaya-frontend-astro/src/components/ui/Badge.astro` | Modificar | Chips píldora con bordes y tipografía compacta | L1 |
| `reservaya-nextjs-api/components/ui/Modal.tsx` | Modificar | Contenedor táctil con borde 2px, sombra dura 6px y botones consistentes | L2 |
| `reservaya-nextjs-api/components/features/CanchaCard.tsx` | Modificar | Tarjeta con borde 2px, sombra dura y hover con elevación sutil | L2 |
| `reservaya-nextjs-api/components/features/PartidosJugadorPanel.tsx` | Modificar | Tabs píldora con borde 2px y tarjetas de partidos organizados/inscritos táctiles | L2 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/page.tsx` | Modificar | Home del jugador: tarjetas táctiles, balance tipográfico y acciones rápidas | L2 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/carne/page.tsx` | Modificar | Credencial deportiva con relieve táctil, sombra dura y estética de carné físico | L2 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/reservas/page.tsx` | Modificar | Franja de resumen y tarjetas de historial con acabado rudo/táctil | L2 |
| `reservaya-frontend-astro/src/pages/index.astro` | Modificar | Buscador píldora táctil, tarjetas de complejos y acordeón FAQ sobrio | L3 |
| `reservaya-frontend-astro/src/pages/canchas.astro` | Modificar | Listado y buscador con tarjetas táctiles consistentes | L3 |
| `reservaya-frontend-astro/src/pages/torneos.astro` | Modificar | Tarjetas de torneos públicos con sombra dura 4px y botón estandarizado | L3 |
| `reservaya-frontend-astro/src/components/Header.astro` | Modificar | Botones píldora y enlaces con microinteracción táctil | L3 |
| `reservaya-frontend-astro/src/components/AuthCard.astro` | Modificar | Tarjeta de formulario de acceso con borde 2px y sombra dura 4px | L3 |

---

## 4. Diseño y lógica

### 4.1 Principios del Sistema Táctil / Rudo (Referencia Universo Agustino)

1. **La Caja Táctica (`.card-tactil`):**
   - Borde: `border-2 border-basalto` (2px sólido `#1f2a24`).
   - Fondo: `bg-tiza` (`#ffffff`).
   - Sombra dura: `box-shadow: 4px 4px 0 0 rgb(31 42 36)` (sin desenfoque blur).
   - Radio: `rounded-2xl` (superficies principales) o `rounded-xl` (tarjetas compactas).
   - Hover interactivo (solo si la tarjeta es clickeable): `hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgb(31_42_36)]`.

2. **La Caja de Información o Estado Vacío (`.card-dashed`):**
   - Borde: `border-2 border-dashed border-basalto bg-tiza`.
   - Sombra: ninguna (diferenciación clara de superficie interactiva).
   - Uso: en `EmptyState` y avisos que no representan una entidad interactiva.

3. **El Botón Mecánico (`.btn-tactil` / `Button`):**
   - Forma: píldora `rounded-full` con `border-2 border-basalto`.
   - Altura: 44px estándar (`h-11`), padding `px-5`, tipografía `font-bold text-sm`.
   - Sombra de reposo: `box-shadow: 3px 3px 0 0 rgb(31 42 36)`.
   - Hover: `translate(-1px, -1px)` con sombra `4px 4px 0 0 rgb(31 42 36)`.
   - Active (click): `translate(2px, 2px)` con sombra `1px 1px 0 0 rgb(31 42 36)`.
   - Colores:
     - `primario`: `bg-cesped text-tiza` (borde 2px basalto y sombra basalto).
     - `secundario`: `bg-tiza text-basalto` (borde 2px basalto y sombra basalto).
     - `oscuro`: `bg-noche text-tiza` (borde 2px basalto y sombra basalto).
     - `peligro`: `bg-error text-tiza` (borde 2px basalto y sombra basalto).

4. **Buscador Píldora (`.searchbar-tactil`):**
   - Contenedor: `flex h-12 w-full items-center gap-2 rounded-full border-2 border-basalto bg-tiza pl-4 pr-1.5`.
   - Sombra dura: `box-shadow: 3px 3px 0 0 rgb(31 42 36)`.
   - Foco: `focus-within:shadow-[4px_4px_0_0_rgb(23_128_74)]` (acento césped).

5. **Chips y Pestañas Segmentadas (`.chip-tactil`):**
   - Reposo: `rounded-full border-2 border-basalto bg-tiza px-4 py-1.5 text-xs font-bold text-basalto hover:bg-piedra`.
   - Activo: `border-2 border-basalto bg-basalto text-tiza`.

6. **Tipografía:**
   - Encabezados: `text-wrap: balance`.
   - Párrafos y descripciones: `text-wrap: pretty`.
   - Cifras y métricas: `font-display font-extrabold tabular-nums tracking-tight`.

---

## 5. Plan de ejecución por lotes (para Oscar-code)

### Lote 1: Tokens, utilidades compartidas y componentes UI base
- **Objetivo:** Definir las clases maestras en CSS, sumar tokens semánticos de pendiente y bloqueo (`sol-suave`, `alerta`, `alerta-suave`, `alerta-hondo`), limpiar hex huérfanos en `CronogramaView.tsx`, y actualizar los componentes atómicos (`Button`, `Card`, `EmptyState`, `Badge`, `Modal`) en ambas aplicaciones.
- **Acciones específicas:**
  - En `tokens.css` y `globals.css`:
    - Incorporar variables de sombra dura: `--sombra-dura-sm: 2px 2px 0 0 var(--basalto);`, `--sombra-dura: 4px 4px 0 0 var(--basalto);`, `--sombra-dura-lg: 6px 6px 0 0 var(--basalto);`.
    - Incorporar tokens semánticos de estado:
      - `--color-sol-suave: #fef9c3;` (fondo suave de estado pendiente).
      - `--color-alerta: #f97316;` (borde y acento de bloqueo/mantenimiento).
      - `--color-alerta-suave: #ffedd5;` (fondo suave de bloqueo).
      - `--color-alerta-hondo: #c2410c;` (texto sobre alerta-suave y hover).
    - Añadir utilidades `@layer components` para `.card-tactil`, `.card-dashed`, `.btn-tactil`, `.searchbar-tactil`, `.chip-tactil`.
    - Regla tipográfica global para `h1, h2, h3, h4 { text-wrap: balance; }` y `p, li, dd { text-wrap: pretty; }`.
    - Limpieza en `globals.css`: erradicar `box-shadow: 0 8px 22px rgba(34, 197, 94, 0.35)` de `.btn-press`.
  - En `CronogramaView.tsx`: reemplazar los 10 hex huérfanos (`#EAB308`, `#FEF9C3`, `#A16207`, `#F97316`, `#FFEDD5`, `#9A3412`, `#C2410C`, `#EA580C`, `#FDBA74`) por los nuevos tokens `sol-suave`, `alerta`, `alerta-suave` y `alerta-hondo`.
  - Actualizar `Button.tsx` y `Button.astro` para implementar el estilo píldora con sombra dura y depresión `active:translate(2px,2px)`.
  - Actualizar `Card.tsx` para usar borde 2px basalto y sombra dura 4px. Limpiar hex residuales en `StatCard` hacia tokens semánticos.
  - Actualizar `EmptyState.tsx` y `EmptyState.astro` para utilizar el patrón `.card-dashed`.
  - Actualizar `Badge.tsx` y `Badge.astro` con estilo pill y borde definido.
- **Gates del Lote 1 (con JIM-QA):** Typecheck Next.js, Lint Next.js, Tests 40/40 PASS, Astro check 0 errores, Grep de hex huérfanos en `CronogramaView.tsx` = 0.

### Lote 2: Área del Jugador (Next.js)
- **Objetivo:** Aplicar las superficies táctiles a las pantallas clave del jugador en el panel.
- **Acciones específicas:**
  - `app/(dashboard)/dashboard/page.tsx`: aplicar `.card-tactil` a las tarjetas de bienvenida, métricas y accesos rápidos.
  - `components/features/CanchaCard.tsx`: tarjeta con borde 2px basalto, sombra dura 4px y hover de elevación (`translate(-2px, -2px)`).
  - `components/features/PartidosJugadorPanel.tsx`: rediseñar pestañas como chips píldora táctiles (`chip-tactil`) y tarjetas de partidos organizados/inscritos con acabado rudo.
  - `app/(dashboard)/dashboard/carne/page.tsx`: convertir el carné en credencial física con borde 2px, franja césped superior y sombra dura 6px.
  - `app/(dashboard)/dashboard/reservas/page.tsx`: franja resumen con números `tabular-nums` destacados y tarjetas de historial consistentes.
  - `components/ui/Modal.tsx`: contenedor con borde 2px y sombra 6px.
- **Gates del Lote 2 (con JIM-QA):** Typecheck, Lint, Tests 40/40, Build Next.js, scroll horizontal 0px en viewport 375px.

### Lote 3: Landing y Páginas Públicas (Astro)
- **Objetivo:** Renovar la presencia de la landing page y vistas públicas con la fuerza gráfica de Universo Agustino.
- **Acciones específicas:**
  - `src/pages/index.astro`:
    - Buscador hero con formato `.searchbar-tactil`.
    - Tarjetas de complejos destacados con borde 2px y sombra dura 4px.
    - Chips de deportes y distritos con estilo `.chip-tactil`.
    - Acordeón de preguntas frecuentes con bordes limpios y separación nítida.
  - `src/pages/canchas.astro`: listado de canchas con tarjetas táctiles y filtros píldora.
  - `src/pages/torneos.astro`: tarjetas de torneos públicos con sombra dura 4px y botón estandarizado.
  - `src/components/Header.astro`: botones de acceso y registro con botón píldora táctil.
  - `src/components/AuthCard.astro`: tarjeta de autenticación con borde 2px basalto y sombra dura 4px.
- **Gates del Lote 3 (con JIM-QA):** `npx astro check` (0 errores, 0 warnings), `npm run build` Astro (17+ páginas), scroll horizontal 0px en 375px.

### Lote 4: Verificación Integral de Calidad y Anti-CLS
- **Objetivo:** Auditoría visual, regresión de layout y verificación exhaustiva de los criterios A1–A10.
- **Acciones específicas:**
  - Verificación de ausencia de CLS en carga de imágenes y esqueletos.
  - Verificación de contraste de accesibilidad WCAG AA en botones y etiquetas.
  - Capturas responsive en 375px y 1440px para archivo de evidencias.

---

## 6. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos Next.js | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint Next.js | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests unitarios y contratos | `npm --prefix reservaya-nextjs-api test` | 100% pasando (≥ 40 tests) |
| A4 | Build Next.js | `npm --prefix reservaya-nextjs-api run build` | 0 errores (código de salida 0) |
| A5 | Astro check | `npx --prefix reservaya-frontend-astro astro check` | 0 errores, 0 warnings |
| A6 | Build Astro | `npm --prefix reservaya-frontend-astro run build` | 0 errores (todas las páginas generadas) |
| A7 | Cero scroll horizontal | Playwright / inspección a 375 px y 1440 px en `/`, `/canchas`, `/dashboard`, `/dashboard/carne` | `scrollHorizontalPx = 0` |
| A8 | Sombras duras táctiles | Grep de `box-shadow` borrosos residuales (`rgba(...)` con blur) en componentes clave | 0 sombras difusas en tarjetas y botones principales |
| A9 | Integridad de producto | Contratos de API, endpoints y migraciones | 0 cambios en backend o lógica de datos |
| A10 | Cero hex huérfanos | Grep de `#EAB308\|#FEF9C3\|#F97316\|#FFEDD5` en `CronogramaView.tsx` | 0 coincidencias |

---

## 7. Checklist de ejecución

- [x] **L1:** Tokens de sombra dura, `sol-suave`, `alerta(-suave)` y utilidades táctiles (`tokens.css`, `globals.css`) + Limpieza de hex en `CronogramaView.tsx` + Componentes UI base (`Button`, `Card`, `EmptyState`, `Badge`, `Modal` en Next y Astro).
- [x] **L2:** Implementación en el Área del Jugador Next.js (`dashboard`, `canchas`, `partidos`, `carne`, `reservas`, `CanchaCard`, `PartidosJugadorPanel`).
- [ ] **L3:** Implementación en la Landing Astro (`index.astro`, `canchas.astro`, `torneos.astro`, `Header.astro`, `AuthCard.astro`).
- [ ] **L4:** Gates finales integrales (A1–A10) anotados por JIM-QA y revisión visual.

---

## 8. Registro de verificación

| Fecha | Lote / Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-28 | Redacción formal Spec 27 | ✅ Creada | Auditor-Gemini: docs/specs/27-frontend-referencia-universo.md |
| 2026-09-28 | Lote 1 (A1–A6, A10) | ✅ PASS | JIM-QA: typecheck 0 err, lint 0 err (2 warnings), test 40/40, build Next OK, astro check 0 err, astro build 17 págs OK, 0 hex huérfanos |
| 2026-09-28 | Lote 2 (A1–A4, A7) | ✅ PASS | JIM-QA: typecheck 0 err, lint 0 err (2 warnings), test 40/40, build Next OK, build Astro 17 págs OK, scroll horizontal 0px |
