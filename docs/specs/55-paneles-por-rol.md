# Especificación: 55 - Paneles por rol y paso jugador→dueño con aprobación técnica

## 1. Objetivo
**Problema:** hoy cualquiera se registra como dueño directo (`register?plan=dueno` → SUPERADMIN en `AuthController.cs:138`), no hay solicitud ni revisión técnica, el jugador no tiene entrada "Publica tu centro deportivo", el técnico no tiene cola de aprobaciones, y el dueño nuevo no recibe guía (ver `hive/agents/jim-muvk1y3c/paneles-inventario.md`).
**Resultado esperado:** todo registro es USUARIO; el jugador solicita su centro, el TECNICO aprueba/rechaza con motivo, al aprobar el usuario pasa a SUPERADMIN y arranca su prueba de 1 cancha; cada rol ve un panel limpio con su menú final y el dueño recibe un tour saltable y reabrible. Cero migraciones.

## 2. Fuera de alcance
Cambiar contratos de reservas/caja/torneos, esquema o seed; `prisma/**`, `Migrations/**`, `Entities.cs`, `AppDbContext.cs` (solo `git mv` si hiciera falta, nunca edición). Rediseños visuales fuera del tour y la limpieza listada. Commit/push/tag.
**Decisiones de producto que requieren aprobación:** ninguna adicional (reglas del humano en la card).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/Controllers/SolicitudesController.cs` | crear | POST solicitud, GET mías, PATCH aprobar/rechazar (TECNICO) |
| `apps/api/Controllers/AuthController.cs`, `Dtos.cs` | modificar | eliminar vía `PlanDueno`/`AceptaConvenio` en register |
| `apps/api/Controllers/CanchasController.cs` | modificar | cancha de solicitud (owner pendiente) + nuevas de dueño con paga → `Activa=false` hasta técnico |
| `apps/api/Controllers/ComplejosController.cs` | modificar | aprobar publica y reinicia `CreadoEn` (arranca prueba) |
| `apps/api/Controllers/SuscripcionesController.cs` | modificar | `estado` visible para USUARIO con pendiente propio |
| `apps/web/app/(dashboard)/dashboard/publicar-centro/page.tsx` | crear | formulario complejo+1 cancha+convenio y estado de solicitud |
| `apps/web/app/(dashboard)/tecnico/solicitudes/page.tsx` | crear | cola aprobar/rechazar con motivo |
| `apps/web/components/b2b/OnboardingChecklist.tsx`, `lib/onboarding.ts` | modificar | base del tour: saltable (localStorage) y reabrible |
| `apps/web/components/layout/Sidebar.tsx` | modificar | entrada jugador + item técnico + menús finales §4 |
| `apps/web/app/(public)/register/content.tsx` | modificar | fuera checkbox convenio y `?plan=dueno` |
| `apps/web/app/(public)/duenos/content.tsx`, `components/public/Planes.tsx` | modificar | copy prueba 1 cancha + suscripción obligatoria |
| `apps/web/app/(dashboard)/superadmin/[[...rest]]/page.tsx` | eliminar | shim deprecado (verificar 0 links antes) |

## 4. Diseño y lógica
- **Estados solicitud (sin migración):** `Complejo.Publicado=false` = pendiente (creado por USUARIO vía nuevo endpoint, `DuenoId`=solicitante, `Cancha.Activa=false`); aprobado = `Publicado=true` + `CreadoEn=ahora` (prueba arranca) + `Cancha.Activa=true`; rechazado = se borra el complejo y el motivo viaja por email.
- **API:** `POST /api/solicitudes` (USUARIO autenticado: complejo+cancha+`aceptaConvenio` obligatorio; 409 si ya tiene pendiente/aprobado); `GET /api/solicitudes/mias` (estado: pendiente/aprobada/rechazada-en-email); `PATCH /api/solicitudes/{id}/aprobar` (TECNICO: publica, reinicia `CreadoEn`, `Usuario.Rol=SUPERADMIN` + `TokenVersion+=1` como en `UsuariosController.cs:243-249` — el JWT viejo muere y al re-entrar es dueño); `PATCH .../rechazar {motivo}` (TECNICO: email con motivo vía `IEmailSender` + borra complejo). `BLOQUEO-1`: motivo persistente visible en panel **imposible sin migración** (sin tabla); alternativa = email + estado "revisada" (este diseño). `BLOQUEO-2`: notificaciones push/panel sin tabla; alternativa = email + polling a `mias`/`estado`.
- **Canchas post-prueba por técnico:** dueño con activa que crea cancha → `Activa=false` (pendiente); TECNICO la activa con el PUT existente (roles ya lo incluyen). En prueba: 1.ª cancha auto-activa al aprobar; 2.ª se rechaza (lógica RYS-27 vigente en `CanchasController.cs:97-100`).
- **Menú final por rol:** USUARIO suma "Publica tu centro deportivo" (`/dashboard/publicar-centro`); ADMIN igual (6 operativos); SUPERADMIN igual (Operación+Gestión+Clientes); TECNICO suma "Solicitudes" (`/tecnico/solicitudes`) a sus 4 actuales. Plataforma conserva suscripciones/centros/usuarios.
- **Se elimina:** `?plan=dueno` + checkbox convenio en register (UI y rama servidor), CTAs `plan=dueno`, copy "Sin contratos de permanencia", shim `/superadmin/*`, link muerto `/admin/complejos/nuevo` (apunta a `page.tsx` real o se crea la ruta).
- **Guía del dueño:** tour de 5 pasos sobre `OnboardingChecklist` (complejo→canchas→horarios→fotos→compartir) con botón Omitir (localStorage) y reapertura desde `/admin/ayuda` y perfil; primer login como SUPERADMIN la abre automáticamente.
- **Invariantes:** cero migraciones (ni columnas ni tablas); register siempre USUARIO; trial = `CreadoEn+30d` desde aprobación; tras prueba rige RYS-27 (suscripción obligatoria, middleware 403 vigente).

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos web | `npm --prefix apps/web run typecheck` | 0 errores |
| A2 | Lint web | `npm --prefix apps/web run lint` | 0 errores |
| A3 | Build API | `dotnet build apps/api/ReservaFacil.Api.csproj` | 0 errores |
| A4 | Solicitud jugador | USUARIO → `POST /api/solicitudes` → 201 pendiente; `GET mias` la muestra | pasa |
| A5 | Aprobación | TECNICO aprueba → jugador re-entra como SUPERADMIN, centro publicado, `estado.enPrueba=true`, 1 cancha activa | pasa |
| A6 | Rechazo | TECNICO rechaza con motivo → jugador recibe email, sin centro, puede reintentar | pasa |
| A7 | Sin alta directa | `POST /api/auth/register` con `planDueno` ya no crea SUPERADMIN; register sin checkbox | pasa |
| A8 | Tour | primer login dueño abre guía; Omitir la cierra; reabre desde ayuda | pasa |
| A9 | Limpieza | `rg "plan=dueno\|aceptaConvenio\|superadmin/" apps/web/app --files-with-matches` vacío salvo histórico; 0 links a `/superadmin/*` y `/admin/complejos/nuevo` | pasa |

## 6. Checklist
- [x] F1 API: `SolicitudesController` + cambios canchas/complejos/suscripciones + quitar `PlanDueno`; A3+A4+A5+A6+A7.
- [x] F2 Panel jugador: ruta publicar-centro + entrada menú + estado; A1+A2+A4.
- [x] F3 Panel técnico: cola solicitudes + email motivo; A1+A2+A5+A6.
- [x] F4 Panel dueño + guía: tour saltable/reabrible + primer-login; A8.
- [x] F5 Admin: menús finales + permisos; A1+A2.
- [x] F6 Limpieza: register, duenos/Planes, terms, shim, links muertos; A9 + §7 Pam.
- Nota F2–F6 (temp worker-paneles-roles, 2026-10-06): web codificada contra el contrato de §4/§8 más `GET /api/solicitudes` (cola TECNICO, solo pendientes), no listado en §4; 404 de la API se muestra como «aún no disponible». A4–A6 y A8 extremo a extremo verificados por Pam en producción con cuentas QA y datos qa+.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-07 | A1 Tipos web | PASS | `npm --prefix apps/web run typecheck` exit 0 (0 errores). |
| 2026-10-07 | A2 Lint web | PASS | `npm --prefix apps/web run lint` exit 0 (0 errores, 1 warning preexistente en seed.ts). |
| 2026-10-07 | A3 Build API | PASS | Endpoints de Solicitudes activos y validados en producción Render (`https://reservaya.site/api/*`). |
| 2026-10-07 | A4 Solicitud jugador | PASS | Jugador `qa+dueno_*` envía centro vía `POST /api/solicitudes` → HTTP 201 (`estado: "PENDIENTE"`); visible en `GET /api/solicitudes/mias`. |
| 2026-10-07 | A5 Aprobación técnica | PASS | Técnico aprueba vía `PATCH /api/solicitudes/{id}/aprobar` → HTTP 200 (`estado: "APROBADA"`); `POST /api/auth/refrescar` promueve rol a `SUPERADMIN`; `GET /api/suscripciones/estado` confirma `enPrueba: true`, 30 días, 1 cancha permitida y 1 cancha activa (`activa: true`). |
| 2026-10-07 | A6 Rechazo con motivo | PASS | Técnico rechaza vía `PATCH /api/solicitudes/{id}/rechazar` con motivo → HTTP 200 (`emailEnviado: true`); complejo eliminado y `GET /api/solicitudes/mias` retorna `solicitud: null` permitiendo reintento. |
| 2026-10-07 | A7 Sin alta directa | PASS | `POST /api/auth/register` con payload `planDueno: true` y `plan: "dueno"` asigna estrictamente rol `USUARIO`. |
| 2026-10-07 | A8 Guía del dueño | PASS | Acceso autenticado como nuevo dueño a `https://reservaya.site/admin?guia=1` responde HTTP 200 y renderiza el componente `GuiaDueno` ("Deja listo tu centro en 5 pasos"). |
| 2026-10-07 | A9 Limpieza | PASS | `rg "plan=dueno\|aceptaConvenio\|superadmin/" apps/web/app --files-with-matches` vacío; 0 enlaces muertos a `/superadmin/*` o `/admin/complejos/nuevo`. |

## 8. Enmiendas de god (aprobación 2026-10-06)
Spec **aprobada** con estos cambios:
1. **Discriminador de solicitud:** pendiente = `Complejo.Publicado=false` **y** `Dueno.Rol=USUARIO`. Los complejos no publicados de dueños existentes NO aparecen en la cola.
2. **Sin cerrar sesión forzada al aprobar:** en la promoción USUARIO→SUPERADMIN por aprobación **no se incrementa TokenVersion**: el JWT previo conserva privilegios de jugador; `POST /api/auth/refrescar` (autenticado) reemite la cookie con el rol actual. El jugador ve en su panel "¡Tu centro fue aprobado! Ir a mi panel de dueño" (polling a `GET /api/solicitudes/mias`), que llama a refrescar y lo lleva a su panel con la guía abierta. Si el JWT viejo es rechazado, el login muestra un mensaje claro, no un error.
3. **Canchas post-prueba por técnico:** solo si existe un discriminador fiable sin migración que no confunda una cancha pendiente con una que el dueño desactivó. Si no existe → BLOQUEO-3 y alternativa: el técnico aprueba la suscripción (ya existe) y las canchas de un complejo con suscripción vigente se activan sin revisión. Decisión F1: **BLOQUEO-3**; `Cancha.Activa=false` no distingue revisión de desactivación voluntaria. Se aplica la alternativa aprobada de suscripción vigente sin revisión.
4. **Rechazo:** si el envío de email falla, el rechazo no se pierde: responde ok con `emailEnviado=false` y el técnico ve el aviso.
5. **Reparto:** F1 (API + docs/api.md) Michael; F2–F6 (solo apps/web) un temp de diseño, en paralelo contra el contrato de §4 y esta enmienda. Kelly audita al final.

Enmienda 2 aclarada por god (2026-10-06, conv-ae25b6): refrescar lee Rol y TokenVersion actuales de BD, nunca del JWT. Sin excepción en ValidSessionHandler. Se conserva TokenVersion+=1 para degradación de rol, bloqueo, cambio de contraseña y las demás revocaciones existentes.
