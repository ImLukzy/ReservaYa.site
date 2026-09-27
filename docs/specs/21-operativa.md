# Especificación: 21 - Rediseño operativo del panel («Tablero de cancha»)

> **Estado:** ✅ Aprobada (2026-09-27) — implementación en curso, fase por fase, en `feature/21-panel-operativo`.  
> **Alcance:** Gestión operativa en frontend y backend (Next.js panel + UI + endpoints B2B consumidos), **sin pasarelas de pago externas**.

---

## 1. Objetivo

**Problema:**
La interfaz del panel operativo (`reservaya-nextjs-api/app/(dashboard)`) y sus componentes B2B mantienen la estética anterior al sistema de diseño unificado establecido en la Spec 20:
1. **Disonancia visual y tokens huérfanos:** Coexisten colores hex arbitrarios (`#252b40`, `#0b130e`, `#15803D`, `#22C55E`, `#071c10`, `#465170`), fuentes no alineadas (Nunito / variables del sistema frente a Barlow / Barlow Condensed de la landing) y bordes no unificados.
2. **Rasgos genéricos y datos ficticios:** La pantalla de perfil del jugador (`app/(dashboard)/dashboard/perfil/page.tsx:49-58`) exhibe estadísticas inventadas tipo RPG («Velocidad 82», «Tiro 76», «Defensa 68», «Resistencia 85», «Armador»), banners con degradados oscuros y etiquetas en mayúsculas forzadas (`uppercase tracking-[0.2em]`).
3. **Riesgo de CLS (Cumulative Layout Shift):** Componentes como `DashboardWidgets`, `CronogramaView`, `AvisoCarga` y la carga diferida de imágenes de canchas/avatares carecen de dimensiones explícitas o contenedores reservados, provocando saltos de página durante la carga de datos del backend.
4. **Dispersión en componentes B2B:** Más de 20 paneles operativos (`ReservasPanel`, `CajaPanel`, `TorneosPanel`, etc.) aplican estilos de tarjetas y tablas de manera heterogénea, sin el patrón de líneas de cal y señalética deportiva.

**Resultado esperado:**
El panel operativo en Next.js adopta de forma íntegra el sistema de diseño «Tablero de cancha» (tokens compartidos, tipografías Barlow y Barlow Condensed, líneas de cal estructurales, botones y badges con contraste WCAG AA) en su shell (`Sidebar`, `TopBar`), sus componentes base UI y las vistas operativas de los cuatro roles (`ADMIN`, `SUPERADMIN`, `TECNICO`, `USUARIO`), eliminando datos ficticios y asegurando CLS ≤ 0.05, **sin alterar contratos de API existentes, sin migraciones de base de datos y sin integrar pasarelas de pago externas**.

---

## 2. Fuera de alcance

- **Pasarelas de pago externas:** No se implementan integraciones con Stripe, Mercado Pago, PayPal, Niubiz ni Culqi externo. La gestión de pagos en caja y reservas se mantiene 100% operativa a través de los métodos locales ya existentes (`EFECTIVO`, `YAPE`, `TRANSFERENCIA`, `TARJETA` presencial en caja) y el modelo local `CajaSesion`/`MovimientoCaja`.
- **Abonos y membresías externas:** Los pases y suscripciones se gestionan de forma local mediante el modelo Prisma `Suscripcion` y endpoints `/api/suscripciones`, sin facturación recurrente bancaria externa.
- **Migraciones de base de datos:** Prohibido crear, alterar o aplicar migraciones en EF Core o Prisma (`REGLA INNEGOCIABLE: CERO MIGRACIONES`). El esquema actual de PostgreSQL en Neon es la única fuente de verdad.
- **Modificación de contratos de API en backend .NET:** Se consumen exactamente las firmas de endpoint existentes de `ReservaFacil.Api`. Cualquier cambio o necesidad no cubierta debe registrarse como `BLOQUEO-API`.
- **Unificación de sesión/dominio con Astro:** La arquitectura desacoplada se preserva conforme a la decisión de la Spec 22 (landing estática en Astro y panel autenticado en Next.js se mantienen separados).

**Decisiones de producto (resueltas por el humano, 2026-09-27):**
1. **Retiro definitivo de estadísticas RPG:** ✅ Aprobado. Se eliminan los atributos ficticios («Velocidad», «Tiro», «Defensa», «Resistencia», «Armador») de `/dashboard/perfil` y se reemplazan por métricas reales del jugador. Nota de implementación: los ejemplos que dio el humano («canchas activas», «horas de mayor afluencia») son métricas de dueño/admin y no aplican a esta vista de jugador — se usaron en su lugar las métricas de jugador ya disponibles en la página (total de reservas, confirmadas, completadas), consistentes con la tarjeta "Resumen de reservas" de la misma vista.
2. **Estrategia de tokens en Next.js:** ✅ Aprobado. Tailwind CSS con variables CSS nativas (`:root` / `dark:`) ya configuradas en el proyecto — sin librerías de estilos ni CSS-in-JS externo adicional.

---

## 3. Archivos y componentes afectados (Mapeo de Dwight-Explora)

### 3.1 Layout y Shell
| Archivo | Acción | Propósito |
|---|---|---|
| `app/(dashboard)/layout.tsx` | Modificar | Aplicar fuentes Barlow, fondo `bg-sillar` / `bg-pizarra-fondo`, contenedor estructurado |
| `components/layout/Sidebar.tsx` | Modificar | Navegación lateral con señalética deportiva, estados activos con acento cal/césped y contraste AA |
| `components/layout/TopBar.tsx` | Modificar | Encabezado limpio con perfil, rol activo, selector de complejos (si aplica) y logout seguro |
| `app/(dashboard)/error.tsx` | Modificar | Error boundary alineado con sistema de diseño |

### 3.2 Rutas y Paneles de Administración (`ADMIN` y `SUPERADMIN`)
| Subgrupo / Ruta | Componente B2B asociado | Endpoints consumidos |
|---|---|---|
| `/admin/complejos` | `ComplejosDashboard.tsx`, `ComplejosGrid.tsx` | `GET/POST /api/complejos`, `PUT/DELETE /api/complejos/{id}` |
| `/admin/canchas` | `GestionCanchasPanel.tsx` | `GET /api/canchas?propias=true`, `POST/PUT/DELETE /api/canchas/{id}`, `POST /api/canchas/foto` |
| `/admin/horarios` | `HorariosPanel.tsx` | `GET /api/horarios?complejoId=`, `PUT /api/horarios` |
| `/admin/agenda` | `CronogramaView.tsx` | `GET /api/reservas`, `GET /api/horarios` |
| `/admin/reservas` | `ReservasPanel.tsx` | `GET /api/reservas`, `PATCH /api/reservas/{id}`, `POST /api/reservas` |
| `/admin/caja` | `CajaPanel.tsx` | `GET /api/caja/hoy`, `GET /api/caja/sesion-activa`, `POST /api/caja/abrir`, `POST /api/caja/cerrar`, `POST /api/caja/movimientos` |
| `/admin/torneos` | `TorneosPanel.tsx` | `GET/POST /api/torneos`, `PUT /api/torneos/{id}`, `POST /api/torneos/{id}/inscribir`, `PUT /api/torneos/partidos/{id}` |
| `/admin/resenas` | `ResenasPanel.tsx` | `GET /api/resenas?complejoId=`, `POST /api/resenas/{id}/respuesta` |
| `/admin/clientes` | `ClientesPanel.tsx`, `HistorialUsuarioBtn.tsx` | `GET /api/usuarios/clientes`, `GET /api/usuarios/{id}/historial`, `GET/POST/DELETE /api/sanciones` |
| `/admin/equipo` | `EquipoPanel.tsx`, `CambiarRolBtn.tsx` | `GET /api/equipo?complejoId=`, `POST /api/equipo`, `DELETE /api/equipo/{id}` |
| `/admin/precios-especiales` | `PreciosEspecialesPanel.tsx` | `GET/POST /api/promociones`, `DELETE /api/promociones/{id}` |
| `/admin/descuentos` | `DescuentosPanel.tsx` | `GET/POST /api/promociones`, `DELETE /api/promociones/{id}` |
| `/admin/abonos` | `AbonosPanel.tsx`, `SuscripcionesPanel.tsx` | `GET/POST /api/suscripciones`, `PATCH /api/suscripciones/{id}` |
| `/admin/metas` | `MetasPanel.tsx` | `GET/POST /api/metas`, `PATCH /api/metas/{id}` |
| `/admin/validar-codigo` | `ValidarCodigo.tsx` | `POST /api/reservas/validar` |
| `/admin/novedades` | Panel de avisos | `GET/POST /api/novedades` |
| `/admin/configuracion` | `ConfigPanel.tsx` | `GET/PUT /api/complejos/{id}`, configuración de sede |
| `/admin/reportes` | `ReportesPanel.tsx`, `DashboardWidgets.tsx` | `GET /api/reportes/dashboard`, `GET /api/reportes/ocupacion` |
| `/admin/ayuda` | `OnboardingChecklist.tsx` | `GET /api/complejos`, `GET /api/canchas?propias=true`, `GET /api/horarios` (Spec 09 verificado) |

### 3.3 Rutas del Dashboard de Usuario (`USUARIO` - Jugador)
| Ruta | Componentes asociados | Endpoints consumidos |
|---|---|---|
| `/dashboard` | `DashboardWidgets.tsx` | `GET /api/reportes/dashboard`, `GET /api/reservas` |
| `/dashboard/canchas` | `CanchaCard.tsx`, `ReservaForm.tsx` | `GET /api/canchas/disponibles`, `GET /api/canchas/opciones`, `GET /api/canchas/{id}/cotizar`, `POST /api/reservas` |
| `/dashboard/reservas` | `CalificarBtn.tsx`, `CancelarReservaBtn.tsx`, `Countdown.tsx` | `GET /api/reservas`, `PATCH /api/reservas/{id}`, `POST /api/resenas` |
| `/dashboard/perfil` | Formulario perfil, carné digital | `GET /api/auth/me`, `GET /api/reservas` (reemplazo de RPG stats por datos reales) |
| `/dashboard/mi-partido` | Panel grupos y partidos | `GET /api/partidos`, `GET /api/partidos/mios` |
| `/dashboard/carne` | Carnet visual de jugador | `GET /api/auth/me` con QR verificable |

### 3.4 Rutas de Plataforma (`TECNICO`)
| Ruta | Componentes asociados | Endpoints consumidos |
|---|---|---|
| `/tecnico` | Vista general de plataforma | `GET /api/reportes/global` |
| `/tecnico/centros` | Gestión de complejos plataforma | `GET /api/complejos`, `PATCH /api/complejos/{id}` (publicar/despublicar) |
| `/tecnico/usuarios` | `ToggleUsuarioBtn.tsx`, `CambiarRolBtn.tsx` | `GET /api/usuarios`, `PATCH /api/usuarios/{id}` |
| `/tecnico/suscripciones` | Auditoría de suscripciones | `GET /api/suscripciones` (plataforma-wide) |

### 3.5 Componentes UI Base y Features Compartidas
| Componente | Ruta | Ajuste de diseño y CLS |
|---|---|---|
| `components/ui/Button.tsx` | `components/ui/Button.tsx` | Tipografía Barlow, variantes primaria (verde `#22C55E` con texto `#060C08`), secundaria y contorno, foco accesible |
| `components/ui/Card.tsx` | `components/ui/Card.tsx` | Borde sillar/cal (`border-cal`), fondo tiza (`bg-tiza`) en claro o grafito sobrio en oscuro, sin blur excesivo |
| `components/ui/Badge.tsx` | `components/ui/Badge.tsx` | Estados de reserva/pago con tokens semánticos (libre, ocupado, pendiente, error) |
| `components/ui/Modal.tsx` | `components/ui/Modal.tsx` | Diálogo nativo accesible, prevención de reflow en scrollbar (`scrollbar-gutter: stable`) |
| `components/ui/EmptyState.tsx` | `components/ui/EmptyState.tsx` | Estados vacíos honestos sin ilustraciones pesadas ni datos ficticios |
| `components/ui/ErrorPanel.tsx` | `components/ui/ErrorPanel.tsx` | Presentación de `ApiError` consistente |
| `components/ui/AvisoCarga.tsx` | `components/ui/AvisoCarga.tsx` | Contenedor con altura mínima reservada (`min-h-[160px]`) para evitar colapsos |
| `components/ui/WhatsAppFloat.tsx`| `components/ui/WhatsAppFloat.tsx` | Botón flotante accesible solo cuando hay número configurado |

---

## 4. Diseño, Directivas UI/UX y Prevención de CLS

### 4.1 Concepto: «Tablero de cancha» en la Operación Diaria
1. **Líneas de cal estructurales:** Los paneles y tablas operativas se delimitan mediante bordes continuos y limpios (`border border-cal` o `divide-y divide-cal`), emulando las marcas reglamentarias de una cancha de juego.
2. **Tipografía dual:**
   - **Barlow Condensed:** Uso en encabezados de sección, números de canchas, horas en cronogramas, precios monetarios en soles (`tabular-nums`) y badges de estado.
   - **Barlow:** Uso en todo el cuerpo de texto, inputs de formularios, labels y mensajes de ayuda.
3. **Contraste WCAG AA estricto:**
   - Botón de acento / acción primaria: fondo césped (`#22C55E`) con texto grafito profundo (`#060C08`), garantizando una relación de contraste de **8.66:1** (superior al umbral AA de 4.5:1).
   - Fondos oscuros del panel: uso de `.on-dark` o tokens específicos donde los textos alcancen ≥ 9:1 frente a superficies de pizarra/grafito.
   - Prohibido el texto blanco sobre fondos verde claro o lima.
4. **Erradicación de rasgos genéricos:**
   - Cero estadísticas tipo videojuego o RPG.
   - Cero degradados decorativos estilo web3 (`bg-gradient-to-br from-[#0b130e]...`).
   - Cero etiquetas innecesarias en `uppercase tracking-[0.2em]`.

### 4.2 Prevención de CLS (Cumulative Layout Shift)
Para garantizar que la navegación y carga de datos no generen saltos visuales molestos:
1. **Reserva de dimensiones en medios:**
   - Las fotos de canchas en tarjetas y formularios deben especificar `aspect-ratio: 16/9` (o clase `aspect-video`) con contenedor contenedor de fondo neutro (`bg-cal/20`).
   - Los avatares de usuario y logos de complejos deben tener dimensiones fijas explícitas (`h-10 w-10`, `h-14 w-14`) antes de resolver la imagen.
2. **Skeletons con altura fija:**
   - En vistas de carga (`CronogramaView`, `ReservasPanel`, `CajaPanel`), los estados de carga deben pintar skeletons que ocupen el alto exacto de las filas o tarjetas reales (`filasEsqueleto`).
   - La tabla de cronograma de agenda debe renderizar su grilla horaria de 08:00 a 21:00 con celdas de altura fija (`h-12` o `h-14`) independientemente de si hay datos cargados.
3. **Tipografía sin reflow:**
   - Declarar `font-display: swap` en las fuentes Barlow locales con fallbacks de métricas ajustadas (`Arial`, `sans-serif`) para evitar saltos de línea al renderizar la fuente.
   - Forzar `font-variant-numeric: tabular-nums` en toda columna con montos, fechas u horas, evitando variaciones de ancho entre dígitos.
4. **Espacio reservado en avisos y banners:**
   - Contenedores de notificación o error (`AvisoCarga`, toasts o mensajes de validación) deben contar con `min-height` o ubicarse en zonas con flujo reservado.

---

## 5. Matriz de Contratos de API Consumidos

Todas las vistas deben consumir exclusivamente los endpoints documentados en la siguiente matriz, sin alterar los tipos ni asumir rutas nuevas:

| Módulo / Vista | Endpoint | Verbo | Payload / Parámetros | Respuesta esperada |
|---|---|---|---|---|
| **Sesión** | `/api/auth/me` | GET | Cookie HttpOnly | `{ ok: true, usuario: UsuarioSesion }` |
| **Auth** | `/api/auth/logout` | POST | — | `{ ok: true }` |
| **Complejos** | `/api/complejos` | GET | — | `{ ok: true, complejos: ComplejoResumen[] }` |
| **Complejos** | `/api/complejos` | POST | `{ nombre, distrito, ciudad, direccion, telefono, slug }` | `{ ok: true, complejo: Complejo }` |
| **Canchas** | `/api/canchas` | GET | `?propias=true&activas=true` | `{ ok: true, canchas: Cancha[] }` |
| **Canchas** | `/api/canchas` | POST | `CanchaInput` | `{ ok: true, cancha: Cancha }` |
| **Canchas** | `/api/canchas/{id}` | PUT | `Partial<CanchaInput>` | `{ ok: true, cancha: Cancha }` |
| **Horarios** | `/api/horarios` | GET | `?complejoId={id}` | `{ ok: true, horarios: HorarioFila[] }` |
| **Horarios** | `/api/horarios` | PUT | `{ complejoId, canchaId?, filas: HorarioInput[] }` | `{ ok: true, horarios: HorarioFila[] }` |
| **Reservas** | `/api/reservas` | GET | `?complejoId=&fecha=&estado=` | `{ ok: true, reservas: Reserva[] }` |
| **Reservas** | `/api/reservas` | POST | `{ canchaId, fecha, horaInicio, horaFin, notas }` | `{ ok: true, reserva: Reserva }` |
| **Reservas** | `/api/reservas/{id}` | PATCH | `{ estado: EstadoReserva }` | `{ ok: true, reserva: Reserva }` |
| **Validación** | `/api/reservas/validar` | POST | `{ codigo: string }` | `{ ok: true, reserva: Reserva }` |
| **Caja** | `/api/caja/hoy` | GET | — | `{ ok: true, total: number, movimientos: MovimientoCaja[] }` |
| **Caja** | `/api/caja/sesion-activa`| GET | — | `{ ok: true, sesion: CajaAbierta \| null }` |
| **Caja** | `/api/caja/movimientos` | POST | `{ monto, tipo, metodoPago, descripcion }` | `{ ok: true, movimiento: MovimientoCaja }` |
| **Torneos** | `/api/torneos` | GET | `?complejoId=` | `{ ok: true, torneos: Torneo[] }` |
| **Clientes** | `/api/usuarios/clientes`| GET | — | `{ ok: true, clientes: ClienteResumen[] }` |
| **Historial** | `/api/usuarios/{id}/historial` | GET | — | `{ ok: true, usuario, stats, reservas, sanciones }` |
| **Sanciones** | `/api/sanciones` | GET | `?complejoId=&soloActivas=true` | `{ ok: true, sanciones: Sancion[] }` |
| **Sanciones** | `/api/sanciones` | POST | `{ usuarioId, complejoId, motivo, nivel, dias }` | `{ ok: true, sancion: Sancion }` |
| **Equipo** | `/api/equipo` | GET | `?complejoId={id}` | `{ ok: true, equipo: MiembroEquipo[] }` |
| **Precios** | `/api/promociones` | GET | `?complejoId={id}` | `{ ok: true, promociones: Promocion[] }` |
| **Abonos** | `/api/suscripciones` | GET | `?complejoId={id}&estado=` | `{ ok: true, suscripciones: Suscripcion[] }` |
| **Metas** | `/api/metas` | GET | — | `{ ok: true, metas: MetaResumen[] }` |
| **Vitrina Canchas**| `/api/canchas/disponibles`| GET | `?fecha=&horaInicio=&horaFin=&q=&distrito=&tipo=` | `{ ok: true, canchas: CanchaDisponible[], total, limiteAplicado }` |
| **Cotización** | `/api/canchas/{id}/cotizar` | GET | `?fecha=&horaInicio=&horaFin=` | `{ ok: true, total: string, regla: string \| null }` |
| **Reportes** | `/api/reportes/dashboard` | GET | — | `{ ok: true, dashboard: DashboardData }` |
| **Plataforma** | `/api/reportes/global` | GET | — | `{ ok: true, report: ReporteGlobal }` |

---

## 6. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos Next.js | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint Next.js | `npm --prefix reservaya-nextjs-api run lint` | 0 errores (warnings cosméticos aceptados) |
| A3 | Tests unitarios y de contrato | `npm --prefix reservaya-nextjs-api test` | 100% pasando |
| A4 | Build Next.js | `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A5 | Astro build & check intactos | `npm --prefix reservaya-frontend-astro run build` | 0 regresiones |
| A6 | Erradicación de datos RPG ficticios | Inspección de `dashboard/perfil/page.tsx` | Cero referencias a Velocidad, Tiro, Defensa, Resistencia o Armador ficticio |
| A7 | Contraste WCAG AA | Inspección de CTAs primarios y elementos `.on-dark` | Ratio ≥ 4.5:1 (texto regular) y ≥ 8.6:1 en botones verdes `#22C55E` con texto `#060C08` |
| A8 | Prevención de CLS | Auditoría visual de layouts y dimensionamiento de imágenes | CLS ≤ 0.05 en rutas principales |

---

## 7. Checklist de implementación (Fases)

- [x] **Fase 0: Aprobación del borrador** — Aprobada por el humano el 2026-09-27.
- [ ] **Fase 1: Shell y componentes base UI** (`tokens.css`, `Button`, `Card`, `Badge`, `Sidebar`, `TopBar`).
- [~] **Fase 2: Perfil y rutas de usuario** — iniciada: eliminadas las stats RPG de `/dashboard/perfil` (criterio A6), reemplazadas por métricas reales de jugador. Pendiente: `/dashboard/reservas`, `/dashboard/canchas`.
- [ ] **Fase 3: Rutas operativas críticas de Admin** (`/admin/agenda`, `/admin/reservas`, `/admin/caja`, `/admin/horarios`, `/admin/canchas`).
- [ ] **Fase 4: Rutas complementarias de Admin** (`/admin/clientes`, `/admin/equipo`, `/admin/torneos`, `/admin/precios-especiales`, `/admin/abonos`, `/admin/metas`).
- [ ] **Fase 5: Rutas de Plataforma Técnico** (`/tecnico/centros`, `/tecnico/usuarios`, `/tecnico/suscripciones`).
- [ ] **Fase 6: Gates de calidad y verificación** (`typecheck`, `lint`, `test`, `build`, auditoría de contraste y CLS).

---

## 8. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-27 | Redacción de borrador | 📝 Borrador completo | Archivo creado en `docs/specs/drafts/21-operativa.md` |
| 2026-09-27 | Aprobación del humano | ✅ Aprobada | Decisiones de alcance y de las 2 preguntas de producto resueltas |
| 2026-09-27 | A6 (parcial) | 🟡 Fase 2 en curso | RPG stats retiradas de `dashboard/perfil/page.tsx`, reemplazadas por reservas/confirmadas/completadas reales |
