# Especificación: 16 - Campo «género» sin persistencia (BLOQUEO-API #2)

## 1. Objetivo
**Problema:** la app pide el género en dos pantallas y no lo guarda en ningún sitio:
- **Landing:** `reservaya-frontend-astro/src/pages/register.astro:56-63` pinta el selector «GÉNERO · opcional» (Masculino / Femenino / Prefiero no decir). `L125` (`let genero`) y `L154-160` (handlers de `.gen`) guardan la elección, pero `POST /api/auth/register` no la recibe: `RegisterRequest` en `Dtos/Dtos.cs` no tiene `Genero`.
- **Panel:** `reservaya-nextjs-api/components/b2b/ConfigPanel.tsx:14,35,175,266-275` tiene un `<select>` de género y lo envía en `PATCH /api/usuarios/me`. `MiPerfilPatchRequest` (`Dtos/Dtos.cs:77`) no tiene el campo, así que la API lo ignora sin avisar.
- **API/BD:** `Usuario` (`Models/Entities.cs`) no tiene columna de género, y ninguna función del producto lo usa: el grep de `genero|género|sexo|gender` solo encuentra esas dos UIs.

Guardarlo exige una migración, que `CLAUDE.md` prohíbe («⛔ Cero migraciones»). Mientras tanto, pedir un dato personal que se descarta engaña al usuario y va contra el principio de proporcionalidad de la Ley 29733 (Protección de Datos Personales, Perú).

**Resultado esperado:** la app no pide datos que no guarda ni usa. El bloqueo se cierra por decisión de producto (opción A), sin migraciones. Si en el futuro hace falta el dato, la opción B queda especificada.

## 2. Fuera de alcance
Detectado al revisar, va en otra spec (candidata a la 17):
- `ConfigPanel.tsx:155-192` guarda el perfil completo (teléfono, fecha de nacimiento…) en `localStorage` (`ry_perfil`), un dato personal en el navegador.
- Ese perfil manda `nombre` y `fechaNacimiento` a `PATCH /api/usuarios/me`, que los rechaza con 400 si cambian (`UsuariosController.cs`: «El nombre no se puede cambiar», «La fecha de nacimiento no se puede cambiar»).
- Tras ese 400 muestra un mensaje falso: «el servidor aún no expone PATCH /api/usuarios/me», cuando el endpoint sí existe (`UsuariosController.cs:278`).

**Decisiones de producto que requieren aprobación:**
1. **D1 — Opción:**
   - **A (recomendada):** quitar el campo género de la landing y del panel. No hay migración ni cambios en la API. Se puede revertir si algún día hace falta.
   - **B:** guardarlo. Requiere levantar la regla «Cero migraciones» solo para este cambio, con una migración EF en Neon dev y prod (detalle en §4-B).

## 3. Archivos afectados (opción A)
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/pages/register.astro` | modificar | Quitar el bloque L56-63 (selector), `let genero` (L125) y los handlers de `.gen` (L154-160). El resto del formulario no cambia |
| `reservaya-nextjs-api/components/b2b/ConfigPanel.tsx` | modificar | Quitar `genero` del tipo `Perfil` (L14), de `PERFIL_VACIO` (L35), del body del PATCH (L175) y el `<label>`/`<select>` (L266-275). Al implementar se vio que `leerLocal` conserva las claves desconocidas y el guardado las reescribiría. Por eso se añade `leerPerfilLocal()`, que toma solo los campos vigentes y purga el `genero` viejo de `ry_perfil`. «Nombre del negocio» deja `md:col-span-2` para que la rejilla quede 2×2 |
| `reservaya-frontend-astro/src/pages/jugador/perfil.astro` | modificar | Detectado al implementar: L79-80 tenía un `<select>` «Género · opcional» decorativo, que no se enviaba. Se retira |
| `reservaya-frontend-astro/docs/api.md` | modificar | Nota: el registro no recoge género (decisión de la spec 16) |
| `PLAN_OTRO_AGENTE.md` | modificar | §6: el BLOQUEO-API #2 queda resuelto por decisión de producto; se añade la fila del ítem y la candidata 17 |

## 4. Diseño y lógica
**A. Retirar el campo (recomendada)**
- **Landing:** el formulario queda con nombre, correo, contraseña, fecha de nacimiento y usuario. La rejilla de campos se reajusta, y a 375 px no hay scroll horizontal.
- **Panel:** la tarjeta «Perfil» de `ConfigPanel` pierde el `<select>`. La rejilla `sm:grid-cols-2` se mantiene y el siguiente campo sube.
- **API:** ninguna. Sin `BLOQUEO-API` residual.
- **Invariantes:** el payload de `POST /api/auth/register` no cambia (nunca incluyó `genero`). Cero migraciones. En el script inline de `register.astro`: JS plano y sin `innerHTML` (skill Astro).

**B. Guardar el dato (solo si se elige en D1; no se ejecuta con A)**
- **BD:**
  - Columna `genero text NULL` en `"Usuario"`, con un `CHECK` sobre `('masculino','femenino','otro','no_indica')`, en lugar de un enum PG nuevo: así no hay que tocar el `MapEnum` de `Program.cs`.
  - Cambios en `Models/Entities.cs` (`public string? Genero`) y `Data/AppDbContext.cs`, más `dotnet ef migrations add AddUsuarioGenero`.
  - Se aplica en Neon dev con backup o *branch* previo y luego en prod por deploy.
  - Espejo en `prisma/schema.prisma` y `db:check` actualizado.
- **API:** `RegisterRequest.Genero` y `MiPerfilPatchRequest.Genero`, validados contra la lista. `GET /api/auth/me` devuelve `genero`.
- **UI:** `register.astro` envía `genero` («Prefiero no decir» → `no_indica`). `ConfigPanel` lo lee de `/me`.
- **Privacidad:** el dato es opcional, con texto de finalidad junto al campo, y se añade a `legal/privacy`.
- **Riesgo:** es la primera migración tras la regla. Necesita permiso explícito del dueño y una ventana de despliegue.

## 5. Criterios de aceptación (opción A)
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro | `astro check` y `build`; `node --check` de los scripts inline de `dist/register/index.html` | 0 errores |
| A2 | Panel | `npm --prefix reservaya-nextjs-api run typecheck` · `lint` · `test` · `build` | 0 errores |
| A3 | Sin rastro | `grep -rniE "genero\|género" reservaya-frontend-astro/src reservaya-nextjs-api/{app,components,lib}` | 0 coincidencias |
| A4 | Registro | Playwright contra la API de prueba (:5099, `JWT_SECRET` de prueba): `/register` sin selector de género; alta de una cuenta de prueba → 200 y redirección como hoy | OK |
| A5 | Perfil del panel | Playwright contra `next start -p 3099` + backend falso: `/admin/configuracion` sin `<select>` de género; el body de `PATCH /api/usuarios/me` no incluye `genero` | OK |
| A6 | Móvil | 375 px sin scroll horizontal en `/register` y `/admin/configuracion` | OK |
| A7 | Alcance / BD | `git status` solo con los archivos de §3; `db:check` OK, 0 migraciones pendientes | OK |

## 6. Checklist (opción A)
- [x] T1: Confirmar D1.
- [x] T2: `register.astro`: quitar el selector y su JS.
- [x] T3: `ConfigPanel.tsx`: quitar `genero` (tipo, estado vacío, PATCH, UI).
- [x] T4: `api.md` y `PLAN_OTRO_AGENTE.md` §6.
- [x] T5: A1–A7; anotar en §7; detener los servidores de prueba (:5099, :4399, :3099, :5999).

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | T1 | ✅ | D1 = opción A, aprobada por el usuario (respeta «Cero migraciones») |
| 2026-09-26 | A1 | ✅ | `astro check` 0 errores; build de 22 páginas; 14 scripts inline de `register` y `jugador/perfil` → `node --check`: 0 fallos. Build final sin variables de prueba |
| 2026-09-26 | A2 | ✅ | Panel: `typecheck` 0, `lint` 0 errores (los 2 warnings ya existían), `test` 21/21, `build` OK (build final sin variables de prueba) |
| 2026-09-26 | A3 | ✅ | `grep -rniE "genero\|género\|masculino\|femenino\|gender\|sexo"` en `reservaya-frontend-astro/{src,public}` y en `app`, `components` y `lib` del panel: 0 coincidencias, salvo las 2 líneas del saneo de `localStorage` en `ConfigPanel.tsx` |
| 2026-09-26 | A4 | ✅ | Playwright contra la API de prueba (:5099, `JWT_SECRET` de prueba): `/register` sin selector; alta de `qa.reg.muijjl88@example.com` → 200; payload `nombre,email,password,fechaNacimiento,username`; `/jugador/perfil` sin género |
| 2026-09-26 | A5 | ✅ | `next start -p 3099` + backend falso: `/admin/configuracion` (SUPERADMIN) sin `<select>` de género. Un `ry_perfil` con `genero` se purga al cargar. El body de `PATCH /api/usuarios/me` lleva `nombre,telefono,fechaNacimiento,nombreNegocio` |
| 2026-09-26 | A6 | ✅ | 375 px: 0 px de scroll horizontal en `/register`, `/jugador/perfil` y `/admin/configuracion` |
| 2026-09-26 | A7 | ✅ | `git status`: solo `register.astro`, `jugador/perfil.astro`, `ConfigPanel.tsx`, `api.md`, `PLAN_OTRO_AGENTE.md` y esta spec; `backend/`, `prisma/` y `Migrations/` intactos; `db:check` OK, 0 migraciones pendientes. Servidores de prueba detenidos; :3000, :4321 y :5000 del usuario sin tocar |
