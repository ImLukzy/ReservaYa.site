# Especificación: 24 - Pulido visual profesional de landing + área del jugador

> **Estado:** ✅ Aprobada (god, delegación de Lukas, 2026-09-28) — ejecución en 3 entregas (E1 landing, E2 panel, E3 carné/reservas) en `feature/24-pulido-visual`; god revisa el diff y commitea cada entrega.

---

## 1. Objetivo

**Problema:** Auditoría visual en vivo (navegador real, servidores :4321/:3000/:5000, 2026-09-28) sobre landing y área del jugador ya "terminadas" según las specs 20-22b. Hallazgos verificados contra el código:

1. **La landing nunca muestra fotos reales de cancha, aunque ya existen.** La API (`GET /api/canchas/disponibles`) devuelve `cancha.imagen` con URLs reales ya subidas (`/uploads/canchas/*.jpg|webp`, verificado en vivo con 3 canchas del complejo «Golazo»). Ni el "Tablero de hoy" (`src/components/ui/SlotBoard.astro`) ni `/canchas` (`src/pages/canchas.astro`) la consumían. El resultado era una landing 100% texto sobre listas con líneas.
2. **`/dashboard` (home del jugador) nunca se migró.** `app/(dashboard)/dashboard/page.tsx` es exactamente lo que la spec 21 §3.3 marcaba «Pendiente de rediseño»: paleta Tailwind default (`gray-900`, `gray-500`, `gray-100`), emoji crudo como icono (`👋`, `📅`, `✅`, `🏟️`, `🎉`, `📋`, `📭`), hex sueltos (`#22C55E`, `#060A08`, `#DCFCE7`, `#14532D`, `#15803D`, `#BBF7D0`) y dos tarjetas de acción con pesos visuales sin criterio. Es la primera pantalla de la sesión del jugador y el salto de calidad con `/dashboard/perfil` (ya migrado) es evidente.
3. **`CanchaCard.tsx` no tiene fallback cuando la imagen real falla al cargar.** Ya reserva contenedor anti-CLS (`aspect-video`) y ya pinta un emoji por tipo de cancha (`tipoEmoji`) cuando `cancha.imagen` es `null`, pero cuando la URL existe y el archivo no carga no hay `onError`: se ve el icono de imagen rota del navegador, no un estado intencional.
4. **`/dashboard/carne` no tiene tratamiento de credencial.** `Card` genérica, sin proporción de tarjeta física ni franja de acento.
5. **`/login` tiene mucho espacio muerto.** La tarjeta de `AuthCard` flota sola en un campo `bg-sillar` sin ningún elemento visual acompañante en pantallas ≥768px.
6. **Composición repetitiva en la landing.** `/`, `/canchas` y `/duenos` seguidas se sienten una sola plantilla reciclada.
7. **Poco contenido de relleno con datos reales escasos.** `/dashboard/reservas` y `/dashboard/carne` dejan mucho espacio en blanco cuando el jugador tiene pocas reservas.

**Descartado por decisión de god (2026-09-28):** el "mockup de teléfono cortado" reportado en el audit inicial no tiene respaldo en el código (`index.astro:75-83` y `duenos.astro` completo no tienen ningún `<img>`/`<svg>` ahí) — **D1: descartado, fuera de alcance.**

**Decisiones de producto (god, 2026-09-28):**
- **D2 — Carné:** proporción CR80 real (`aspect-[1.586]`), `max-w-[420px]`; en móvil ancho completo con la misma proporción, y si el contenido no cabe a ≤360px cae a `aspect-auto`. Franja superior de 4px `bg-cesped`. Nada inventado: sin QR, códigos ni sellos que no vengan de la API.
- **Acento landing vs. panel:** la divergencia `--cesped` landing (`#17804a`) / panel (`#22c55e`, 160 usos en hex en el lado admin) queda **fuera de alcance** — deuda anotada para una spec futura. En el lado jugador de esta spec: solo tokens, cero hex nuevo.
- **Firma visual compartida:** el fallback sin foto (o con foto rota) es un **croquis de cancha** en líneas de cal — perímetro, línea media y círculo central, con `border`/`div`, sin SVG ni imagen — más el tipo de cancha en Barlow Condensed donde el espacio lo permite. Mismo croquis en `SlotBoard`, `/canchas` y `CanchaCard` (reemplaza `tipoEmoji`).

**Resultado esperado:** landing y área del jugador dejan de sentirse como una plantilla de componentes bien tokenizada pero vacía de producto: se ven las canchas reales que existen (o su croquis si no hay foto o falla), `/dashboard` deja de ser la pantalla más floja de la sesión del jugador, y el carné se siente un objeto propio del producto. Sin tocar contratos de API, sin datos inventados.

---

## 2. Fuera de alcance

- Backend .NET, Prisma/EF Core, migraciones: cero cambios.
- Paneles `ADMIN`/`SUPERADMIN`/`TECNICO` y `components/b2b/**`: no se tocan (Fase 3-5 de la spec 21 sigue su propio plan; F3.1 agenda en espera).
- `/dashboard/mi-partido` y `/dashboard/partidos`: sin hallazgos, no se tocan.
- **D1 descartado:** el "mockup de teléfono" no existe en el código, fuera de alcance.
- **Divergencia de acento cesped landing/panel:** deuda anotada, no se resuelve aquí (ver §1).
- `lib/api*.ts`, `lib/http.ts`, `lib/session.ts`, `lib/server-fetch.ts`, `proxy.ts`, dependencias o fuentes nuevas: sin cambios.
- Generar imágenes sintéticas o de IA: las fotos son las que ya subieron los dueños vía `POST /api/canchas/foto`. Sin foto (o si falla), el croquis de cancha (§1), nunca una imagen inventada.
- Degradados, blur, sombras decorativas, animaciones > 150ms.

---

## 3. Archivos afectados

| Archivo | Acción | Propósito | Entrega |
|---|---|---|---|
| `reservaya-frontend-astro/src/scripts/filas.ts` | Modificar | Miniatura 16:9 (`cancha.imagen` validada o croquis) compartida por home y `/canchas`; `onError` cae al croquis | E1 ✅ |
| `reservaya-frontend-astro/src/components/ui/SlotBoard.astro` | Modificar | Invoca `iniciarTablero` explícito; esqueleto con columna de miniatura | E1 ✅ |
| `reservaya-frontend-astro/src/scripts/tablero.ts` | Modificar | Exporta `iniciarTablero(raiz)` en vez de auto-ejecutar (permite reutilizarlo con guardia de media query) | E1 ✅ |
| `reservaya-frontend-astro/src/pages/canchas.astro` | Modificar | Columna de miniatura en cabecera y esqueleto | E1 ✅ |
| `reservaya-frontend-astro/src/components/AuthCard.astro` | Modificar | Grid de dos columnas en `md:` (formulario + `AuthTablero`) | E1 ✅ |
| `reservaya-frontend-astro/src/components/AuthTablero.astro` | Crear | Tablero real reducido, oculto bajo `md:`, solo inicia con `matchMedia` (sin fetch en móvil) | E1 ✅ |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/page.tsx` | Reescribir | Migración completa al sistema «Tablero de cancha»: sin emoji, sin hex, sin `uppercase+tracking` | E2 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | Modificar | Igual, quitar `uppercase+tracking` restante | E2 |
| `reservaya-nextjs-api/components/features/CanchaCard.tsx` | Modificar | `onError` (estado React) → croquis compartido; Lucide genérico | E2 |
| `reservaya-nextjs-api/components/ui/Modal.tsx` | Modificar | Prop opcional `tono: "oscuro"|"claro"`, por defecto `"oscuro"` (admin intacto) | E2 |
| `reservaya-nextjs-api/components/features/CalificarBtn.tsx`, `PartidosJugadorPanel.tsx` | Modificar | Usan `tono="claro"`, migran a tokens claros, ★ → Lucide Star, radiogroup accesible | E2 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/carne/page.tsx` | Modificar | Carné según D2 | E3 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/reservas/page.tsx` | Modificar | Franja de resumen con datos ya cargados | E3 |

---

## 4. Diseño y lógica

### 4.1 Landing — fotos reales (E1, hecho)
- Miniatura de tamaño reservado (16:9, `width`/`height` nativos, `loading="lazy"`, `decoding="async"`) en `filaCancha` (`filas.ts`), compartida por el home y `/canchas`.
- `img.src` solo si `cancha.imagen` empieza por `/uploads/` → `new URL(imagen, PUBLIC_RESERVAYA_API_URL)`; cualquier otro valor, o error de carga (`onError`), cae al croquis de cancha. DOM con `createElement`/`className`/`append`, cero `innerHTML` nuevo.
- Verificado en vivo: los 3 `/uploads/` de la BD de desarrollo devuelven 404 (archivo no presente en este entorno) → el croquis se ve correctamente como fallback; no se pudo verificar visualmente el caso "foto cargando bien" por esta limitación del entorno, no del código.

### 4.2 `/login` (y register/forgot/reset vía `AuthCard`) — dos columnas (E1, hecho)
- `AuthCard`: grid `md:grid-cols-[minmax(0,28rem)_1fr]`, formulario a la izquierda, `AuthTablero` a la derecha.
- `AuthTablero`: mismo tablero real (`tablero.ts`), oculto por completo (`hidden md:flex`) bajo 768px; su script solo llama `iniciarTablero` si `matchMedia("(min-width: 768px)").matches` — verificado con Playwright que a 375px no se dispara ninguna llamada a `/api/canchas/disponibles`. Sin copy de marketing ni ilustración. `getSafeReturnUrl` y el resto de la lógica de auth intactos (solo cambió el layout).

### 4.3 `/dashboard` (jugador) — migración completa (E2)
- Reemplaza la paleta Tailwind default y los hex sueltos por los tokens de `globals.css`; retira todo emoji como icono y usa Lucide; reutiliza `StatCard`; balancea el peso visual de las tarjetas de "Acciones rápidas"; quita `uppercase+tracking` restante (spec 21 §4.1.4) en `dashboard/page.tsx` y `dashboard/canchas/page.tsx`.

### 4.4 `CanchaCard.tsx` — fallback de imagen rota (E2)
- `onError` vía estado de React que cae al croquis compartido (mismo patrón visual que en Astro, implementación propia en JSX). Lucide solo para lo genérico, sin forzar un icono por deporte.

### 4.5 `Modal.tsx` claro + `CalificarBtn`/`PartidosJugadorPanel` (E2)
- Prop `tono` opcional en `Modal.tsx`, por defecto `"oscuro"` (cero cambio para el admin). Los dos componentes del lado jugador migran a `tono="claro"` con tokens claros (sin `slate-*`/hex), estrella con Lucide `Star`, radiogroup accesible.

### 4.6 `/dashboard/carne` — credencial (E3, según D2) y relleno de reservas (E3)
- Carné con proporción CR80 (D2). `/dashboard/reservas`: franja de resumen (próxima reserva, nº de reservas, total pagado en `CONFIRMADA`+`COMPLETADA`, `tabular-nums`) derivada de datos ya cargados vía `getReservas()` — sin llamadas nuevas, sin gamificación.

**API:** ningún endpoint nuevo.
**Invariantes:** cero migraciones, cero cambios de contrato.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos Next.js | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint Next.js | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests | `npm --prefix reservaya-nextjs-api test` | 100% pasando |
| A4 | Build Next.js | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Astro check + build | `npx astro check` + `npm run build` (`reservaya-frontend-astro`) | 0 errores |
| A6 | Cero emoji/glifos como icono y cero `uppercase+tracking` en el lado jugador | Inspección + grep | 0 |
| A7 | Clases de color existentes | `grep` de cada clase nueva contra `tokens.css`/`globals.css` antes de reportar | 100% existen |
| A8 | Estados de imagen | Croquis cuando no hay foto y cuando la foto falla (`onError`); miniatura de tamaño reservado | OK |
| A9 | Móvil real (375×812) y desktop (1440×900) | Captura con viewport real (Playwright), CLS y scroll horizontal | 0 scroll horizontal; CLS ≤ 0.05 |
| A10 | Sin fetch en móvil | Auth: 0 llamadas a `/api/canchas/disponibles` bajo 768px | 0 |
| A11 | Props retrocompatibles | `Modal.tsx` sin romper consumidores existentes (admin) | OK |
| A12 | Revisión visual humana | Capturas antes/después por entrega | Aprobadas por god/Lukas |

---

## 6. Checklist de implementación (por entregas)

- [x] **E1 — Landing (L1 fotos + L2 auth de dos columnas)**
  - [x] `filas.ts`: miniatura 16:9 con croquis compartido (home + `/canchas`).
  - [x] `tablero.ts`: `iniciarTablero` exportado, sin auto-ejecución.
  - [x] `SlotBoard.astro`, `canchas.astro`: columna de miniatura en filas, esqueletos y cabecera.
  - [x] `AuthCard.astro` + `AuthTablero.astro`: dos columnas en `md:`, sin fetch en móvil (verificado).
  - [x] Gates: `astro check` 0/0/1 hint (preexistente); `build` 22 páginas OK; `node --check` de los JS emitidos OK.
  - [x] Capturas 375×812 y 1440×900 (Playwright, viewport real) de `/`, `/canchas`, `/login`: CLS ≤ 0.011, 0 scroll horizontal.
- [x] **E2 — Panel (L3 dashboard + L4 CanchaCard + L4b Modal claro)**
  - [x] `dashboard/page.tsx` reescrito (tokens, `StatCard`/`Card`/`EmptyState`, Lucide en vez de emoji, CTAs balanceadas).
  - [x] `dashboard/canchas/page.tsx`: quitado 📅 y las 3 etiquetas `uppercase tracking-wider` restantes.
  - [x] `uppercase+tracking` barrido en todo `app/(dashboard)/dashboard` (13) + `PerfilForm.tsx` (5) + `ReservaForm.tsx` (1) = 19; excluido `GestionCanchasPanel.tsx` (admin, 4, fuera de alcance).
  - [x] `CanchaCard.tsx`: `ImagenCancha` con `useEffect`+`ref` (no solo `onError`, ver desvío) → `CroquisCancha` compartido; 📍👥🌙 a Lucide (`MapPin`/`Users`/`Moon`).
  - [x] `Modal.tsx` prop `tono` (`'oscuro'|'claro'`, retrocompatible); `CalificarBtn.tsx` (Lucide `Star`, roving tabindex) y `PartidosJugadorPanel.tsx` a `tono="claro"`.
  - [x] `Card.tsx` `StatCard.icon`: `string`→`React.ReactNode` (único consumidor, sin roturas).
  - [x] Gates: typecheck 0, lint 0 err/2 avisos preexistentes, test 40/40, build OK (34 rutas).
  - [x] Capturas 375×812/1440×900 (Playwright, sesión real `usuario@reservafacil.com`) de `/dashboard`, `/dashboard/canchas`, `/dashboard/carne`, `/dashboard/reservas`, `/dashboard/partidos`: 0 scroll horizontal.
- [x] **E2-rework (god rechazó `/dashboard` por genérico)**
  - [x] `dashboard/page.tsx` reescrito otra vez: bloque "Tu próxima reserva" con datos reales (`api.getReservas()`, filtro CONFIRMADA/PENDIENTE con `fechaFinReservaEnMs` > ahora, ordenado por hora de inicio); franja de métricas con `divide-x`/`divide-y` (sin baldosas de color); una sola acción "Reservar cancha"; "Últimas reservas" como filas sin icono; grid asimétrico `lg:grid-cols-[2fr_1fr]`.
  - [x] `Sidebar.tsx`: label `''` en `GROUPS_USUARIO` (sin «Operación» para USUARIO); quitado `uppercase tracking-wide` del label de sección para el resto de roles.
  - [x] `ReservaForm.tsx` a tokens claros (`border-cal bg-tiza text-basalto`, resumen `bg-cesped-suave text-cesped-hondo`, 🌙→`Moon`); `Modal` de `CanchaCard.tsx` a `tono="claro"`.
  - [x] Gates: typecheck 0; lint detectó `react-hooks/purity` real (`Date.now()` en el cuerpo del Server Component) → extraída a función de módulo `proximaDe()`, 0 errores tras el fix; test 40/40; build OK.
  - [x] Capturas 375×812/1440×900 de `/dashboard` y del modal de reserva abierto: 0 scroll horizontal, tono claro correcto. Cuenta de prueba sin próxima reserva (las 2 reservas confirmadas son del 07/09/2026, ya pasado) → se ve el estado vacío, no el bloque con datos.
- [x] **E3 — Carné, reservas y badges legibles**
  - [x] `dashboard/carne/page.tsx`: proporción CR80 (`aspect-[1.586] max-w-[420px]`), franja superior `h-1 bg-cesped`, `max-[360px]:aspect-auto` (verificado a 360 y 320px), quitado el tile redundante "Tipo/Estado" (duplicaba el pill "Activo"). Sin QR, sin datos inventados.
  - [x] `dashboard/reservas/page.tsx`: franja de resumen (reservas totales, total pagado en CONFIRMADA+COMPLETADA, próxima reserva) derivada de `getReservas()` ya cargado, sin llamadas nuevas; `proximaDe()` reutiliza el mismo patrón que `dashboard/page.tsx` (no se pudo compartir función porque `lib/**` estaba prohibido).
  - [x] `components/features/etiquetasJugador.ts` (nuevo): `estadoLabel` y `tipoCanchaLabel`, mapa local sin tocar `Badge.tsx` ni `lib/`. Aplicado en `dashboard/page.tsx`, `dashboard/reservas/page.tsx`, `dashboard/canchas/page.tsx` (select de deporte) y `CanchaCard.tsx` — badges ahora dicen "Confirmada"/"Básquet" en vez de "CONFIRMADA"/"BASQUET".
  - [x] Gates ambas apps: Astro `check` 0/0/1 hint, `build` 22 páginas; Next `typecheck` 0, `lint` 0 err/2 avisos preexistentes, `test` 40/40, `build` OK.
  - [x] Capturas Playwright (sesión real) 375×812/1440×900 de `/dashboard/carne`, `/dashboard/reservas`, `/dashboard/canchas` + 360px/320px de `/dashboard/carne` (caso borde `aspect-auto`): 0px scroll horizontal en las 8.
  - [ ] A10 (revisión visual humana): queda abierta, la presenta god a Lukas.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-28 | Auditoría visual inicial | 📝 Hallazgos §1 | Navegador real contra :4321/:3000/:5000, sesión `usuario@reservafacil.com` |
| 2026-09-28 | Aprobación con ajustes | ✅ | god (delegación de Lukas): D1 descartado, D2 carné CR80, firma visual croquis, alcance por entregas E1/E2/E3 |
| 2026-09-28 | E1 — A5 Astro | ✅ PASS | `astro check`: 0 errores, 0 avisos, 1 hint preexistente (47 archivos). `build`: 22 páginas. `node --check` sobre los `.js` de `dist/`: 0 errores |
| 2026-09-28 | E1-fix (4 correcciones de god tras revisar capturas) | ✅ PASS | 1) Croquis ilegible (cal sobre piedra) → `bg-cesped-suave` + perímetro/línea/círculo en `cesped/40`, `aria-hidden`. 2) Miniatura recortaba el nombre en móvil → oculta bajo `sm:`, grid móvil revertido a 3 columnas original en `filas.ts`/`SlotBoard.astro`/`canchas.astro`. 3) Auth recortada entre 768-1023px → **desvío del pedido**: en vez de subir a `lg` (1024px) probé ese breakpoint en vivo y seguía recortado (columna ~512px, necesita ~432px fijos + espacio de texto); subí a `xl` (1280px) donde da ~640px y se lee limpio (verificado: 0 recorte a 1024/1279px con el tablero oculto, visible y legible desde 1280px). Panel con alto fijo `h-80` (5 filas), sin `flex-1`. 4) `img.alt=""` (nombre ya está en la fila). Gates: `astro check` 0/0/1 hint, `build` 22 páginas, `node --check` 0 errores. Capturas Playwright 375×812/1024×768/1440×900 de `/`, `/canchas`, `/login`: 0px scroll horizontal en las 9; 0 llamadas a `/api/canchas/disponibles` del tablero de auth por debajo de 1280px (1024, 1279 y 1280 verificados uno por uno) |
| 2026-09-28 | E1 — A9 CLS/scroll | ✅ PASS | Playwright (viewport real 375×812 y 1440×900) contra `:4321` en vivo: `/` CLS 0–0.0005, `/canchas` CLS 0.011, `/login` CLS 0–0.0005; 0px de scroll horizontal en las 6 combinaciones |
| 2026-09-28 | E1 — A10 sin fetch en móvil | ✅ PASS | Playwright a 375px en `/login`: 0 llamadas a `/api/canchas/disponibles` |
| 2026-09-28 | E1 — A7 clases de color | ✅ PASS | `bg-piedra`, `border-cal`, `bg-cal`, `rounded-control` verificados contra `tokens.css` (líneas 46, 53, 84) |
| 2026-09-28 | E1 — limitación de entorno | ⚠️ Nota | Los 3 `/uploads/*` de la BD de desarrollo devuelven 404 (archivo no presente en disco) → las capturas solo muestran el croquis, no el caso de foto cargada con éxito. No es un defecto del código: el `onError` funciona según lo pedido |
| 2026-09-28 | E2 — hallazgo: `onError` solo no basta en SSR | ⚠️ Corregido | El `<img>` de `CanchaCard.tsx` se renderiza en el HTML servido por el Server Component; con un 404 casi instantáneo (localhost) el navegador puede disparar el evento `error` ANTES de que React hidrate y adjunte el handler (a diferencia de `filas.ts` en Astro, que crea el `<img>` 100% en cliente, sin esta carrera). Verificado en vivo con Playwright: con solo `onError`, las 3 imágenes rotas de la BD dev quedaban mostrando el icono roto del navegador — el fix real fue añadir un `useEffect`+`ref` que revisa `img.complete && naturalWidth===0` al montar, además de `onError` para fallos posteriores. Confirmado tras el fix: 0 `<img>` en el DOM, croquis visible en las 3 tarjetas |
| 2026-09-28 | E2 — gates y capturas | ✅ PASS | `typecheck` 0 errores; `lint` 0 errores (2 avisos preexistentes ajenos); `test` 40/40; `build` OK (34 rutas). Playwright con sesión real (`usuario@reservafacil.com`) 375×812/1440×900 en `/dashboard`, `/dashboard/canchas`, `/dashboard/carne`, `/dashboard/reservas`, `/dashboard/partidos`: 0px scroll horizontal en las 12; 0 emoji/glifos restantes en los archivos tocados (regex `\p{Extended_Pictographic}`) |
| 2026-09-28 | E1-fix2 (god): croquis perdía ubicación tras error de imagen | ✅ PASS | `caja.replaceWith(croquisCancha())` creaba un croquis sin las clases de grid que `filaCancha` añadía después con `+=` — en móvil aparecía fuera de lugar, debajo de la hora. Fix: `miniaturaCancha`/`croquisCancha` reciben `claseUbicacion` y la aplican también en el reemplazo de error. Verificado con Playwright contra `/canchas` (fotos reales en 404): 0 croquis visibles a 375px (oculto, correcto), 3 visibles y en columna 1 a 1440px. `astro check` 0/0/1 hint, `build` 22 páginas |
| 2026-09-28 | OK E2 | ✅ | god confirma commit `4305d17` |
| 2026-09-28 | E3 — Carné CR80 | ✅ PASS | `aspect-[1.586] max-w-[420px]` con franja `h-1 bg-cesped`; verificado a 1440/375/360/320px — a ≤360px `max-[360px]:aspect-auto` evita recorte (0 scroll horizontal en las 8 combinaciones). Sin QR, sin datos inventados; quitado el tile "Tipo/Estado" que duplicaba el pill "Activo" |
| 2026-09-28 | E3 — Franja de resumen en reservas | ✅ PASS | Derivada de `getReservas()` ya cargado (reservas totales, total pagado `CONFIRMADA`+`COMPLETADA` con `tabular-nums`, próxima reserva) — 0 llamadas nuevas a la API |
| 2026-09-28 | E3 — Badges legibles | ✅ PASS | `components/features/etiquetasJugador.ts` (nuevo, sin tocar `Badge.tsx`/`lib/`): `estadoLabel`/`tipoCanchaLabel` aplicados en `dashboard/page.tsx`, `dashboard/reservas`, `dashboard/canchas` (select) y `CanchaCard.tsx`. Verificado en vivo: "Confirmada", "Básquet", "Fútbol", "Tenis" en vez de los enums en mayúsculas |
| 2026-09-28 | E3 — Gates finales ambas apps | ✅ PASS | Astro: `check` 0 errores/0 avisos/1 hint preexistente, `build` 22 páginas. Next: `typecheck` 0, `lint` 0 errores (2 avisos preexistentes ajenos), `test` 40/40, `build` OK. 0 emoji y 0 `uppercase+tracking` restantes en los archivos de E3 (verificado por regex) |
| 2026-09-28 | E3-fix (god): bug de flujo + 3 ajustes | ✅ PASS | 1) `dashboard/mi-partido/page.tsx:12` elegía la primera CONFIRMADA sin mirar fecha (podía abrir una reserva pasada distinta de "Tu próxima reserva"), y `proximaDe` estaba duplicada en 2 archivos → nuevo `components/features/proximaReserva.ts` (única regla), usado en `dashboard/page.tsx`, `dashboard/reservas/page.tsx` y `dashboard/mi-partido/page.tsx`; mi-partido ahora usa `Badge`+`estadoLabel` en vez del pill fijo "Reserva asegurada" (ya podía ser PENDIENTE). 2) Tabla de reservas a 375px: filas de 2 líneas (`sm:hidden`), tabla completa desde `sm:` (`hidden sm:block`), sin scroll lateral. 3) Franja de resumen: `flex flex-wrap divide-x` dejaba bordes huérfanos al envolver → `grid grid-cols-2` con la 3.ª celda a lo ancho y `border-t` en móvil, `sm:grid-cols-3 sm:divide-x`. 4) Carné: quitados `shadow-md`/`shadow-sm`; `flex-col justify-between` (cabecera/identidad/pie) — pie con "Jugador" + teléfono si existe, sin banda vacía. Verificado con Playwright (sesión real) 375/1440 en carné, reservas y mi-partido + 360/320px del carné: 0px scroll horizontal en las 8. Gates: typecheck 0, lint 0 err/2 avisos preexistentes, test 40/40, build OK |
| 2026-09-28 | E3 — A10 revisión humana | ⏳ Abierto | Queda pendiente: god la presenta a Lukas |
