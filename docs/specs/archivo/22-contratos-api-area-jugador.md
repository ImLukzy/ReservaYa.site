# Auditoría de Contratos de API: Área del Jugador y Arquitectura Desacoplada (Spec 22)

> **Fecha:** 2026-09-27  
> **Auditor:** Auditor-Gemini (`auditor-gemini-mujcn8iw`)  
> **Estado:** 📝 Borrador / Nota de Auditoría (conforme a la decisión de mantener la arquitectura desacoplada existente).

---

## 1. Contexto y Decisión de Arquitectura

En la consulta al humano para la tarea **ILK-3**, se tomó la siguiente decisión definitiva de producto y arquitectura:
> **Decisión humana:** *«Para la Spec 22, mantén la arquitectura desacoplada existente. Auditor-Gemini debe encargarse de la auditoría de contratos y pruebas OpenAPI.»*

### Frontera Arquitectónica:
1. **Landing pública (`reservaya-frontend-astro`, puerto 4321 / Cloudflare Pages):**
   - Destinada a captación, descubrimiento, vitrina SEO, listado de canchas libres (`/`, `/canchas`), información para dueños y herramientas abiertas (`/sortear`, `/completar-cuadro`).
   - Las acciones que concluyen en reserva (`Reservar` en home o `/canchas`) redirigen al usuario al panel con parámetros de búsqueda (`${APP}/dashboard/canchas?fecha=...&horaInicio=...&complejoId=...`).
   - Páginas legacy de sesión como `/mis-reservas` ejecutan redirección inmediata hacia `${APP}/dashboard/reservas`.
2. **Panel operativo (`reservaya-nextjs-api`, puerto 3000 / Vercel):**
   - Destinado a todas las operaciones transaccionales autenticadas (`USUARIO`, `ADMIN`, `SUPERADMIN`, `TECNICO`).
   - Aloja la creación de reservas (`ReservaForm`), el historial de reservas (`/dashboard/reservas`), cancelación, calificaciones y visualización de carné digital.
3. **Backend (.NET 10 `ReservaFacil.Api`, puerto 5000 / Render):**
   - Única autoridad sobre la base de datos PostgreSQL en Neon.
   - Provee autenticación mediante cookie HttpOnly `token` (emitida con `SameSite=None; Secure` en producción).

---

## 2. Inventario y Auditoría de Contratos de API (Área del Jugador)

Se auditó la totalidad de los contratos de API compartidos o relevantes para el flujo del jugador:

| Endpoint | Método | Consumidor Astro | Consumidor Next.js | Backend Handler | Estado del Contrato |
|---|---|---|---|---|---|
| `/api/canchas/disponibles` | GET | `canchas.ts`, `tablero.ts` | `api.getDisponibles` (`dashboard/canchas`) | `CanchasController:Disponibles` | ✅ **Alineado** (parámetros en minutos: `horaInicio`, `horaFin`) |
| `/api/canchas/opciones` | GET | — | `api.getOpcionesBusqueda` | `CanchasController:Opciones` | ✅ **Alineado** |
| `/api/canchas/{id}/cotizar` | GET | — | `cotizarCancha` (`ReservaForm`) | `CanchasController:Cotizar` | ✅ **Alineado** |
| `/api/resenas/publicas` | GET | `canchas.ts`, `tablero.ts` | — | `ResenasController:Publicas` | ✅ **Alineado** (`promedio`, `total`, `resenas[]`) |
| `/api/reservas` | GET | `perfil.astro` | `api.getReservas` | `ReservasController:Index` | ✅ **Alineado** |
| `/api/reservas` | POST | — | `createReserva` (`ReservaForm`) | `ReservasController:Create` | ✅ **Alineado** (`canchaId`, `fecha`, `horaInicio`, `horaFin`, `notas`) |
| `/api/reservas/{id}` | PATCH | — | `CancelarReservaBtn` | `ReservasController:Update` | ✅ **Alineado** (`estado: "CANCELADA"`) |
| `/api/resenas` | POST | — | `CalificarBtn` | `ResenasController:Create` | ✅ **Alineado** (exige reserva `COMPLETADA`) |
| `/api/auth/me` | GET | `sesion.ts`, `perfil.astro` | `getSession` (`lib/session.ts`) | `AuthController:Me` | ✅ **Alineado** |
| `/api/auth/login` | POST | `login.astro` | `app/(auth)/login/page.tsx` | `AuthController:Login` | ✅ **Alineado** (cookie `token` HttpOnly) |
| `/api/auth/register` | POST | `register.astro` | `app/(auth)/register/page.tsx` | `AuthController:Register` | ✅ **Alineado** |
| `/api/auth/logout` | POST | `sesion.ts` | `Sidebar.tsx`, `TopBar.tsx` | `AuthController:Logout` | ✅ **Alineado** |
| `/api/usuarios/me` | PATCH | `perfil.astro` | — | `UsuariosController:UpdateMe` | ✅ **Alineado** (reglas de fecha única y username anual) |
| `/api/usuarios/me/foto` | POST | `perfil.astro` | — | `UsuariosController:SubirFoto` | ✅ **Alineado** (multipart/form-data) |
| `/api/partidos` | GET/POST | `completar-cuadro.astro` | — | `PartidosController` | ✅ **Alineado** |
| `/api/partidos/mios` | GET | `mis-partidos.astro` | — | `PartidosController:Mios` | ✅ **Alineado** |

---

## 3. Verificación OpenAPI y Suite de Pruebas de Contrato

1. **Especificación OpenAPI 3.1 formal:**  
   Se generó la especificación formal del contrato en:  
   [`docs/contracts/openapi-area-jugador.yaml`](file:///C:/Users/anton/OneDrive/Documentos/ReservaYa/docs/contracts/openapi-area-jugador.yaml)  
   Cubre todas las operaciones, parámetros de consulta, cuerpos de petición y modelos de datos (`Cancha`, `CanchaDisponible`, `Reserva`, `Resena`, `UsuarioSesion`, `Partido`).

2. **Suite de pruebas de contrato automatizadas:**  
   Se implementó la suite en:  
   [`reservaya-nextjs-api/lib/contratos-jugador.test.mjs`](file:///C:/Users/anton/OneDrive/Documentos/ReservaYa/reservaya-nextjs-api/lib/contratos-jugador.test.mjs)  
   - 5 pruebas de contrato automáticas que validan tipos y estructuras para consumidores Astro y Next.js.
   - Integrada en el pipeline estándar `npm test` (`node --test "lib/**/*.test.mjs"`).
   - **Resultado:** 39/39 tests verdes en tiempo récord (237 ms).

---

## 4. Hallazgos y Bloqueos Existentes Documentados

Durante la auditoría de contratos se confirmaron dos bloqueadores ya identificados en `PLAN_OTRO_AGENTE.md` que impactan el área del jugador y la vitrina pública:

1. **`BLOQUEO-API #3` — Torneos sin lista pública:**
   - **Situación:** `GET /api/torneos` está restringido con `[Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]` en `TorneosController.cs:16`.
   - **Impacto:** En Astro, la página `/torneos` no puede mostrar torneos disponibles para inscripción a jugadores anónimos; hoy muestra un estado vacío honesto.
   - **Requerimiento:** Crear endpoint público `GET /api/torneos/publicos` (solo con estados `INSCRIPCIONES_ABIERTAS` y `EN_CURSO` de complejos publicados).
2. **`BLOQUEO-API #4` — Disponibilidad sin filtrado por horario operativo:**
   - **Situación:** `GET /api/canchas/disponibles` únicamente descuenta reservas con estado `CONFIRMADA` en la fecha y rango horario solicitados, sin verificar la tabla `HorarioOperativo`.
   - **Impacto:** Si un complejo está cerrado en un día determinado (o cierra a las 18:00), la cancha puede mostrarse como «disponible» en la vitrina hasta que el usuario intenta reservar en el panel y la API responde `400 Bad Request` («Fuera de horario»).
   - **Requerimiento:** Integrar validación de `HorarioOperativo` en la consulta de disponibilidad de `CanchasController.cs`.
3. **Manejo de Cookies entre Dominios en Despliegue Gratuito:**
   - En producción desacoplada (`reservaya.pages.dev` vs `reservaya-panel.vercel.app` vs `reservaya-api.onrender.com`), las cookies de terceros de la API pueden ser bloqueadas en navegadores estrictos (Safari/Firefox).
   - Al mantener la arquitectura desacoplada, la estrategia recomendada es que **todo el flujo autenticado ocurra de forma natural en el panel**, usando la landing de Astro exclusivamente como canalizador sin requerir sesión para explorar o buscar.

---

## 5. Dictamen del Auditor

Los contratos entre la landing de Astro y el panel Next.js están **técnicamente verificados y alineados**. La decisión de mantener la arquitectura desacoplada es viable, no rompe contratos actuales, y queda respaldada por la especificación OpenAPI en `docs/contracts/openapi-area-jugador.yaml` y la suite de tests en `reservaya-nextjs-api/lib/contratos-jugador.test.mjs`.
