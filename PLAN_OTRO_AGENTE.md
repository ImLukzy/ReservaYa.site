# PLAN DE TRABAJO — Agente 2 (Frontend + Next.js UI)

> Este plan es para ejecutarlo **en paralelo y sin cruzarse** con el Agente 1
> (backend/DB). Léelo completo antes de tocar nada.

## 0. Contexto del proyecto (resumen)

Monorepo en `C:\Users\anton\OneDrive\Documentos\ReservaYa` (rama `main`):

| Pieza | Carpeta | Puerto | Rol |
|---|---|---|---|
| Landing pública | `reservaya-frontend-astro/` (Astro 5, output estático) | 4321 | Marketing + auth shell |
| Panel + proxy API | `reservaya-nextjs-api/` (Next.js 16) | 3000 | Dashboards `/dashboard`, `/admin`, `/superadmin`; proxya `/api/*` |
| API real | `reservaya-nextjs-api/backend/ReservaFacil.Api/` (.NET 10) | 5000 | Única autoridad: auth, reservas, caja, torneos… |
| DB | Neon Postgres | — | **Dueño: EF Core (baseline registrado). Ver §1.** |

Levantar todo (cada servicio en su ventana): `powershell -File scripts/start-dev.ps1`
desde la raíz. Orden: API 5000 → Next 3000 → Astro 4321.

## 1. ⛔ REGLA INNEGOCIABLE: CERO MIGRACIONES

**Está prohibido crear, modificar, aplicar o revertir migraciones.**
Ni EF Core ni Prisma. Ni SQL de estructura. La DB ya converge (regla de oro).

Concretamente, NO tocar ni de lejos:

- `reservaya-nextjs-api/prisma/migrations/**` (no crear carpetas, no editar `.sql`)
- `reservaya-nextjs-api/prisma/schema.prisma` (ni una línea)
- `reservaya-nextjs-api/backend/**/Migrations/**` (incluido el snapshot)
- `reservaya-nextjs-api/backend/**/Models/Entities.cs` y `Data/AppDbContext.cs`
- `reservaya-nextjs-api/prisma/seed.ts` en lo que afecte forma de datos
  (puedes leerlo; no lo ejecutes contra Neon compartido sin avisar)

Comandos prohibidos:

```text
dotnet ef / prisma migrate / prisma db execute / prisma db push / prisma db pull
```

## 0.5 Novedades ya implementadas por el Agente 1 (no duplicar)

- **Rol `TECNICO`** (plataforma, `/tecnico/*` con sidebar propio): ve todo,
  no crea reservas. Matriz en `lib/permissions.ts`.
- **Sanciones/bloqueo**: `GET/POST /api/sanciones`, `GET /api/usuarios/clientes`,
  `GET /api/usuarios/{id}/historial`; UI en `/admin/clientes`.
- **Horario operativo**: tabla `Horario` (7 filas Lun–Dom por local/cancha),
  `GET/PUT /api/horarios`; UI en `/admin/horarios` + resumen en el modal de
  `/admin/agenda`. Si no hay horario, la primera reserva lo genera
  (Lun–Dom 08:00–21:00); fuera de horario la API responde 400.
- **Arequipa-only**: ciudad fija + 29 distritos whitelist (backend y UI).
- Endpoints nuevos a conocer: `/api/horarios`, `/api/sanciones`,
  `/api/usuarios/clientes`, `/api/usuarios/{id}/historial`.
- **Multitenancy estricta (no romper)**: `EsPlataforma` = solo `TECNICO`;
  cada `SUPERADMIN` opera solo sus complejos. Altas de trabajadores por
  `POST /api/equipo`. Reservas con alcance (403 cross-owner en
  create/get/validar/patch/delete); el jugador solo reserva vitrina visible.
  Si una UI necesita dato de otra sede: es `BLOQUEO-API`, no workaround.
- **Perfil de jugador** (migración `PerfilJugador`, `@@map("Horario")`
  corregido de paso): `Usuario` tiene `fechaNacimiento`/`username`/
  `usernameCambiadoEn`. Registro exige los 3; `PATCH /api/usuarios/me`
  (username anual + fecha por única vez + clave con actual); nombre/correo/
  fecha bloqueados (`400`), segundo cambio de username `409`.
  `/jugador/perfil` ya carga `/api/auth/me` + `/api/reservas` reales (P0-3
  PII de ese archivo resuelto: no reintroducir mocks).
- **OBLIGATORIO en Astro: scripts inline en JS plano.** Los `<script>` con
  `as HTMLElement` / `as HTMLInputElement` NO se transforman y se emiten tal
  cual → SyntaxError y página muerta (así quedó `/jugador/perfil` atascado en
  "Cargando…"; se arregló pasando todo a JS plano + `getAttribute`). Archivos
  que hoy tienen el mismo mal y hay que convertir: `canchas.astro`,
  `completar-cuadro.astro`, `mejoras.astro`, `sortear.astro` (ver P1-8).
  Verificación: `npm run build` + `node --check` del JS emitido.
- **Reseñas** (sin DDL): `POST /api/resenas` (COMPLETADA requerida) +
  `GET /api/resenas/publicas` (anónimo, vitrina). `CalificarBtn` en
  `dashboard/reservas` (Next). `/canchas` reescrito con data real
  (`disponibles` + `opciones` + `publicas`), Reservar →
  `/dashboard/canchas?complejoId=`; `/jugador/perfil` migrado a `is:inline`.
- **Equipo solo-ADMIN (PERSONAL eliminado)**: `rolSede` solo acepta `ADMIN`;
  el alta sube `Usuario.Rol` a `ADMIN` (+`TokenVersion`, reingreso obliga) y
  la baja/desactivación lo devuelve a `USUARIO` si no tiene otra sede.
  `Rol` TS sin `PERSONAL`; `canAccess`/`fallback`/`proxy`/`Sidebar`/
  `CajaPanel`/`CambiarRolBtn` sin rama PERSONAL; `login.astro` igual.
  `db-check.mjs` ahora ignora comentarios `//` al leer enums.

Excepción: `npm run db:check` (solo LEE la DB para verificar deriva — permitido
y recomendado antes de cada commit). Si `db:check` falla: **detente y repórtalo**,
no lo arregles con SQL.

Tampoco commitear: `.env`, `**/bin/`, `**/obj/`, `.next/`, `dist/`
(ya están en `.gitignore` raíz — verifícalo con `git status`).

## 2. Tu territorio (solo aquí)

- `reservaya-frontend-astro/src/**`, `public/**` (de Astro)
- `reservaya-nextjs-api/app/**`, `components/**`, `lib/**` (solo Next.js UI/cliente)
- `.github/workflows/**` (puedes crear CI)

**Fuera de tu alcance** (lo lleva el Agente 1): `backend/**`, `prisma/**`,
`scripts/db-check.mjs`, `scripts/start-dev.ps1`, READMEs de DB.

Si un fix “necesita” cambio de API/DB: no lo hagas — anótalo en tu reporte
como `BLOQUEO-API` con endpoint, payload y error exacto.

## 3. Backlog asignado (en este orden)

### 3.0 Orden propuesto vigente (2026-09-28, planificado por dev-claude mientras el trío descansa)
1. **Spec 29** (cerrada, lista para Oscar) — 5 lotes de ≤3 archivos: L1 `CronogramaView.tsx` (prioridad) → L2 `AbonosPanel`/`CajaPanel`/`ConfigPanel` → L3 `GestionCanchasPanel`/`loading.tsx` → L4 `Modal`/`Button` (a11y panel) → L5 `Header.astro`/`canchas.astro` (Astro, al final) → L6 verificación integral (JIM-QA).
2. **Spec 30** (auditoría cerrada, sin lotes de código) — inventario de 47 rutas confirmado sano; 2 `BLOQUEO-API` heredados sin cambio; recomienda V1/V2 (verificación viva por rol y de formularios) para JIM-QA cuando retome.
3. **Spec 31** (propuesta, pendiente de aprobación de Lukas) — extender el croquis de cancha (ya existente, CSS puro) como firma visual de estados vacíos/error en vez de iconos genéricos; menor riesgo/mayor identidad que alternativas descartadas (charts, ilustraciones importadas).
4. **Spec 46** (aprobada y ejecutada 2026-09-30; falta solo A8, la medición de CLS del panel: `BLOQUEO-API`, el login da 500 hasta que se aplique la migración `GoogleLogin` de la spec 44) — resorte único 400/30 como token `--ease-resorte` (`linear()`, sin `framer-motion`) idéntico en Astro y panel con `--check` en CI; CLS del panel medido en 12 rutas por rol (≤ 0.02, cierra `21-operativa.md:242`); skills con regla de motion. Deuda de componentes > 150 líneas → spec 48.
5. **Spec 47** (pedido de Lukas 2026-09-30, ejecutada) — «Iniciar sesión» visible otra vez en la cabecera (`HeaderAcciones.astro`) y portada con los patrones de Universo (`components/inicio/*`); arreglo de `menu.ts` (el clic tras el hover cerraba el menú). Tanda 2 hecha: `/duenos`, `/sortear`, `/canchas` con los mismos componentes, `BandaCierre`, «Precios publicados» en vez de «Reserva al instante» y precarga de `barlow-condensed-700` (CLS ≤ 0.0039 en 8 páginas). Tanda 3 hecha: `/completar-cuadro`, `/torneos`, `/ayuda` (con las 8 preguntas desde `lib/preguntas.ts`), `AuthCard` y `BotonGoogle` (ahora `<button>`, alcanzable con teclado) y 17 radios inexistentes corregidos. CLS ≤ 0.0039 en 10 páginas.
6. **Spec 49** (pedido de Lukas 2026-09-30, ejecutada) — escala de Universo en el sitio público: raíz fija de 16 px (retira la fluida de la spec 36), escala de texto `xs…7xl` completa, cabecera `max-w-7xl`, héroe de portada centrado, pie siempre fuera de la primera pantalla. CLS máximo 0.0007 en 10 páginas. La spec 48 queda reservada para la deuda de componentes del panel.
7. **Spec 50** (pedido de Lukas 2026-09-30, ejecutada) — preguntas frecuentes con los efectos del acordeón de Universo en portada, `/duenos`, `/sortear` y `/ayuda`: una abierta a la vez, la primera abierta, abrir y cerrar con resorte, y entrada `.revelar` una sola vez, ampliada a todas las secciones (fuera `seccion-entra`). Sin `framer-motion`. CLS máximo 0.0006. Commit `562b302` en la rama `feature/46-50-landing-universo`.

Detalle completo de cada una en `docs/specs/29-auditoria-diseno.md`, `30-frontend-funcional.md`, `31-croquis-estados-vacios.md`.

---

### P0 — Seguridad frontend
1. **Open redirect** en `reservaya-frontend-astro/src/pages/login.astro` (y `register.astro`
   si aplica): el `returnUrl` se usa crudo en `location.href`. Valida allowlist
   (solo rutas locales `/...` o mismo origen); si no pasa, cae a `/`.
2. **XSS por `innerHTML` con datos de API/usuario**: reemplazar por
   `textContent`/`createElement` en `src/components/CanchasPublicas.astro`,
   `src/components/MisReservasPublicas.astro` y `src/pages/duenos.astro`
   (auditar además cualquier `innerHTML` restante con `rg innerHTML src`).
3. **PII hardcodeada**: quitar nombre/email/teléfono reales de
   `src/pages/jugador/perfil.astro` y `src/layouts/BaseLayout.astro`
   (usar skeleton/iniciales neutras).

### P1 — Funcional Astro
4. `src/pages/canchas.astro` usa mock de 9 canchas y botón `Reservar` muerto:
   cablear `<CanchasPublicas/>` (ya llama `GET /api/canchas`) y eliminar el mock,
   **o** eliminar el componente si se decide lo contrario — no mantener dos fuentes.
   Igual para `mis-reservas.astro` ↔ `MisReservasPublicas.astro`.
5. `src/pages/mejoras.astro:82` tiene `http://localhost:5000` hardcodeado → usar
   `PUBLIC_RESERVAYA_API_URL` (patrón del resto de páginas).
6. Crear `src/pages/404.astro` (y `500.astro` si aplica).
7. `BaseLayout.astro` desestructura `announcementBadge` no declarado en `Props` →
   rompe `astro check`. Declararlo y correr `npx astro check` hasta verde.
8. Scripts cargados como `<script src="/src/scripts/*.ts">` no se empaquetan con
   `output: static` → migrar a `import`/`is:inline`. Quitar `alert()` y
   `console.error` sueltos.

### P1 — Next.js UI/cliente
9. `proxy.ts` solo chequea existencia del cookie `token`: verificar firma JWT
   con `jose` en el edge y redirigir por rol (hay `lib/session.ts:getDashboardPorRol`
   como referencia de destinos). Sin cambiar su `matcher` sin avisar.
10. `lib/b2b-api.ts:getJson` traga errores (`return {} as T`): que lance `ApiError`
    y que la UI muestre estado de error en vez de vacío.
11. Unificar `lib/api.ts` ↔ `lib/api-client.ts` (8 funciones duplicadas) dejando
    una sola superficie cliente/servidor sin cambiar firmas que usen componentes.
12. Quitar dependencia muerta (`jsonwebtoken` si nada la importa — verificar con
    `rg jsonwebtoken`) y corregir `name` en `package.json` (`reservafacil` →
    nombre real de la carpeta). Añadir scripts `typecheck` y `lint` si faltan.

### P2 — Calidad/entrega
13. Crear `.github/workflows/ci.yml`: `npm ci` + `astro check` + `astro build`
    (frontend) y `tsc --noEmit` + `next lint` (panel).
14. Revisar `docs/` de Astro: fusionar lo duplicado heredado (ya se borró lo de
    Educlook; no resucitarlo).

## 4. Reglas de trabajo

- Rama propia: `agents/<tema>` desde `main` actualizado (`git pull --ff-only`).
  Commits atómicos por tema. **Nunca** `--force`, nunca commitear del Agente 1.
- Cuentas de prueba: créate la tuya vía `/register` (USUARIO) — no uses ni
  difundas credenciales de otros ni tokens en logs/commits.
- Antes de cada commit: `git status` + `git diff` (solo tus archivos) y builds:
  - Astro: `npm --prefix reservaya-frontend-astro run build`
  - Panel: `npx --prefix reservaya-nextjs-api tsc --noEmit`
  - `npm --prefix reservaya-nextjs-api run db:check` (debe seguir OK)
- Si la API local está caída o un endpoint falla y bloquea tu tarea: repórtalo
  como `BLOQUEO-API`, no intentes arreglar el backend.

## 5. Reporte de cierre (formato obligatorio)

Por cada ítem: `✅ hecho (archivos) + cómo se verificó` o `⏭️ no hecho (motivo)` o
`⛔ BLOQUEO-API (endpoint, payload, respuesta exacta)`. Más: lista de ramas/commits,
salida de `db:check`, y pendientes que detectaste fuera de tu alcance.

## 6. Estado del backlog (2026-09-25, rama `agents/frontend-nextjs-ui`, sin commit)

Detalle y evidencia de cada ítem en `docs/specs/NN-*.md` §7.

| Ítem | Estado | Spec / nota |
|---|---|---|
| P0-1 Open redirect | ✅ | Astro ya lo tenía (`getSafeReturnUrl`). El panel (`app/(auth)/login` y `register`) aceptaba `/\evil.com` → `lib/redirect.ts` + tests (spec 03) |
| P0-2 XSS `innerHTML` | ✅ | Quedaba `jugador/perfil.astro` `pintarFoto` → DOM API (spec 01) |
| P0-3 PII | ✅ | Ya estaba; verificado con `grep` (spec 01) |
| P1-4 `/canchas` mock | ✅ | Ya estaba (datos reales; componentes duplicados eliminados) |
| P1-5 `localhost` en mejoras | ✅ | Ya estaba |
| P1-6 404/500 | ✅ | Ya estaba |
| P1-7 `astro check` | ✅ | 95 errores → 0 (spec 02) |
| P1-8 Scripts | ✅ | `is:inline` explícito; 299 scripts inline pasan `node --check` (spec 02) |
| P1-9 Proxy JWT | ✅ | `jose` ya estaba. + `/tecnico` en `matcher` (**aviso: se cambió el matcher**), rol desconocido = token inválido, un solo mapa `fallbackPorRol` (spec 03) |
| P1-10 Errores visibles | ✅ | 25 `.catch(() => [])` → `crearCarga` + `<AvisoCarga>`; `error.tsx` en `app/` y `app/(dashboard)/` (spec 04) |
| P1-11 Unificar API | ✅ | `lib/http.ts` (cliente) + `lib/server-fetch.ts` (servidor) (spec 05) |
| P1-12 Deps/scripts | ✅ | Ya estaba; se añadió `npm test` (`node --test`, 13 tests) |
| P2-13 CI | ✅ | Lint 17 errores → 0; CI con `test` + `build` (spec 06). Necesita el secreto `DATABASE_URL` para el job `db-check` |
| P2-14 Docs Astro | ✅ | Sin duplicados y al día, 302 → 129 líneas (spec 07) |
| Extra: onboarding `/admin/ayuda` | ✅ | Progreso real con `complejos`/`canchas`/`horarios` + `totalCanchas` corregido en 3 vistas; verificado con simulación A6 (34/34 tests, docs/audits/09-onboarding-simulacion-a6.md) (spec 09) |
| Extra: headings sobre fondos oscuros | ✅ | `.on-dark` + herencia en headings (`global.css`), 12 contenedores; 13 títulos pasan de 1.52–3.40:1 a AA (≥ 9:1; «S/ 112», texto grande, ≥ 3.3:1) (26/26 Playwright) (spec 10) |
| Extra: hero premium (`/`) | ✅ | Fondos locales AVIF/WebP (1918 KB → 65 KB en móvil), sin parpadeo gris, control único pausable (WCAG 2.2.2/2.5.8), copy Arequipa; 27/27 Playwright (spec 11) |
| Extra: glifos en enlaces y botones | ✅ | Regla global `:is(a, button) :is(span, em, strong)` + avatar de `/duenos`; 214/214 spans heredan el color del control, 0 cambios fuera de controles, ningún contraste empeora (spec 12) |
| Extra: contraste AA de CTA verdes (landing) | ✅ | 74 superficies verdes con texto blanco (2.28–3.30:1) → texto #060C08 (8.66 / 5.99:1). 0/480 nodos < 4.5:1 en reposo y 0 en hover (116 controles) (spec 13). Panel → spec 14 |
| Extra: contraste AA de CTA verdes (panel + login) | ✅ | 45 cadenas + `active` de `Button` + `CronogramaView` + `.btn-accent` → texto #060C08. 0/204 nodos < 4.5:1 y 0 en hover/active (64 controles, 72 vistas, 4 roles) (spec 14) |
| BLOQUEO-API #1: recuperar contraseña | ✅ | `forgot-password` + `reset-password` en la API (token HMAC sin estado, 30 min, un solo uso, `TokenVersion++` cierra sesiones, Resend) sin migraciones; `/reset-password` en Astro y enlace en el login del panel. B2 16/16, F2 18/18, envío real por Resend OK (spec 15) |
| BLOQUEO-API #2: género sin persistencia | ✅ | Opción A: se retira el campo de `register.astro`, `jugador/perfil.astro` y `ConfigPanel.tsx`, y se purga el `genero` viejo de `localStorage`. Sin migraciones ni cambios en la API (spec 16). El perfil del panel (PII en `localStorage` y mensaje falso tras un 400) pasa a la spec 19 |
| Extra: scroll de la rueda con retardo | ✅ | Se elimina `smooth-wheel.ts` (secuestraba `wheel` con un LERP de 0.075 y chocaba con `scroll-behavior: smooth`). Latencia de 450-1017 ms → 13-30 ms; p95 de frame 10 ms, 0 long tasks (spec 17) |
| Rediseño 1/5: retirar la IA y lo redundante | ✅ | IA del panel, `B2BModulePage`, modales inalcanzables y blog de plantilla eliminados; −26.5 MB de imágenes; 34 clases CSS muertas (24 en la landing y 10 en el panel) (spec 18) |
| Rediseño 2/5: botones y conexiones | ✅ | Módulo Torneos alineado con la API (alta, estados, inscripción, partido y resultado); perfil y suscripción reales; WhatsApp oculto sin número; sin campanas ni botones mudos. Contrato 0/0 · 201 botones (200 con efecto + 1 descarga) · 144 enlaces OK (spec 19) |
| Rediseño 3/5: sistema de diseño + landing | ✅ | «Tablero de cancha» en las 22 páginas de la landing: tokens (paleta de Tailwind desactivada), Barlow + Barlow Condensed propias, 7 componentes base, portada con el tablero de canchas libres de la API y `/canchas` con filtros en la URL. 0 rasgos genéricos y 0 datos inventados; 1 693 textos AA; 375 px sin scroll y CLS ≤ 0.017; home 693 → 172 KB (spec 20) |
| Rediseño 4/5: panel | 🟡 Aprobada, en curso | Gestión operativa frontend/backend sin pasarelas externas. Aprobada por el humano 2026-09-27; Fase 2 iniciada (RPG stats retiradas de `dashboard/perfil`, reemplazadas por métricas reales de jugador) en `feature/21-panel-operativo` (docs/specs/21-operativa.md) (spec 21) |
| Rediseño 5/5: área del jugador (desacoplada) | 🟡 Aprobada, en curso | Decisión humana: mantener arquitectura desacoplada existente; `/jugador/perfil` pasa a redirect directo a `/dashboard/perfil` (sin duplicar lógica en Astro). Contratos API auditados (docs/audits/22-contratos-api-area-jugador.md), OpenAPI 3.1 formal (docs/contracts/openapi-area-jugador.yaml) y 39/39 tests de contrato pasando (docs/specs/22-area-jugador-desacoplada.md) (spec 22) |

⛔ **BLOQUEO-API**
- ~~`POST /api/auth/forgot-password` no existe~~ → resuelto en la spec 15 (rama `agents/backend-password-reset`).
- ~~`register.astro`: el selector de género no se envía~~ → resuelto en la spec 16 (opción A: el campo se retira; no queda ningún bloqueo abierto).
- **#3 (spec 20) Torneos sin lista pública:** `GET /api/torneos` exige `ADMIN,SUPERADMIN,TECNICO` (`TorneosController.cs:16`); anónimo → 401. `/torneos` muestra un estado vacío honesto en vez de torneos inventados. Falta un `GET /api/torneos/publicos` (solo `INSCRIPCIONES_ABIERTAS`/`EN_CURSO` de complejos visibles).
- **#4 (spec 20) Disponibilidad sin horario del complejo:** `GET /api/canchas/disponibles?fecha&horaInicio&horaFin` solo descuenta reservas `CONFIRMADA`; no aplica `HorarioOperativo` (`HorariosController.ValidarSlotAsync` solo se usa al crear la reserva, y `GET /api/horarios` exige sesión). El tablero limita las horas a 08:00–21:00 (las del panel), pero una cancha cerrada ese día puede verse «libre» hasta que la reserva la rechaza con «Fuera de horario».

`db:check` (2026-09-25): OK · 19 tablas · 82/82 nombres · 198 columnas · 0 migraciones pendientes.
