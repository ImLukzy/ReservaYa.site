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
