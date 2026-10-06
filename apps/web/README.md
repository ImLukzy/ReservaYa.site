# ReservaYa — Web pública y panel Next.js

## Regla de oro: 0 migraciones pendientes

La DB (Neon), `prisma/schema.prisma` y el modelo EF Core
(`../api/Models/Entities.cs` + `../api/Data/AppDbContext.cs`) deben estar
idénticos. Toda la deriva pasada rompió el dashboard con 500s.

El dueño del DDL es EF Core (`../api/Migrations`, baseline registrado
en `__EFMigrationsHistory`). Prisma es espejo de lectura (seed, Studio,
`db:check`): `prisma/schema.prisma` es espejo protegido. No editarlo ni ejecutar migraciones en esta tarea.

```powershell
npm run db:check   # exit 0 = limpio · exit 1 = hay deriva
```

El script compara las 17 tablas/columnas mapeadas en EF, los nombres
explícitos de PKs/índices/FKs y las etiquetas de enum (`MapEnum<>`) contra
la DB real, sin tocar datos.

Las instrucciones antiguas de cambios de esquema se conservan solo como historia en [el README anterior](../../docs/specs/archivo/web-readme-previo-f4.md). En esta tarea no se ejecuta ninguna migración ni seed; los archivos protegidos conservan los bytes previos.

## Desarrollo local

```powershell
npm ci
Copy-Item .env.example .env   # pide DATABASE_URL de Neon
npm run dev                   # panel en http://localhost:3000
```

La API corre en `http://localhost:5000` (desde la raíz: `npm run dev:api`;
el proyecto es `apps/api/ReservaFacil.Api.csproj`, nombre conservado a propósito) y Next proxya `/api/*`.
Desde la raíz: `npm run dev:all` levanta API + web pública/panel.

## Marketplace: suscripción, buscador y precios por franja

- **Visibilidad**: el jugador solo descubre canchas activas de complejos
  **publicados con suscripción vigente** (más legacy sin complejo).
  Sin filtro muestra las 10 primeras + `total`: `GET /api/canchas/disponibles`
  acepta texto, distrito, ciudad, dueño o local (vacío = top 10).
  Opciones: `GET /api/canchas/opciones`.
- **Suscripción** (`api/suscripciones`, planes MENSUAL/TRIMESTRAL/ANUAL):
  al crear/renovar queda ACTIVA (MVP sin pasarela de pago) y caduca por
  `fechaFin`; renovar marca la anterior VENCIDA; cancelar oculta la vitrina.
- **Precios por franja**: `Promocion` tipo `PRECIO_ESPECIAL` con
  precioDia/Tarde/Noche + umbrales (def. 17:00/20:00). El total (cotizar,
  disponibles y crear reserva) se calcula por hora en el backend
  (`Services/PrecioCancha`); el frontend solo estima. Prioridad por hora:
  cancha > complejo > global.

## Horario operativo + roles

- **Horario** (tabla `Horario`): cada local tiene 7 filas Lun–Dom
  (apertura/cierre en minutos + `activo`). Si no hay, la primera reserva lo
  genera solo (Lun–Dom 08:00–21:00). `POST /api/reservas` rechaza fuera de
  horario (`Fuera de horario (HH:MM–HH:MM)`) o día cerrado
  (`Cerrado ese día (...)`). Gestión: `GET/PUT /api/horarios` + página
  `/admin/horarios` (dueño/tecnico); el modal de agenda muestra el resumen.
- **Roles**: `USUARIO` (jugador), `ADMIN` (trabajador: el dueño lo da de alta
  en su local y se activa su panel admin con alcance a esa sede; al salir se
  revoca), `SUPERADMIN` (dueño: opera solo sus complejos, con poderes de
  plataforma acotados a su sede — altas/bajas de equipo, config),
  `TECNICO` (plataforma global, `/tecnico`). `PERSONAL` en desuso (etiqueta
  conservada en Postgres). Sanciones (`api/sanciones`): un jugador BLOQUEADO
  no puede reservar (403) y validar-código lo avisa; historial en
  `/admin/clientes`.
- **Multitenancy estricta**: cada `SUPERADMIN` opera SOLO sus complejos
  (`DuenoId` + membresías); solo `TECNICO` ve todo. El dueño da de alta a sus
  trabajadores con `POST /api/equipo` (roles de sede `PERSONAL`/`ADMIN`).
  Reservas con alcance (create/get/validar/patch/delete → 403 cross-owner);
  el trabajador opera la sede pero no configura (403 en horarios/precios/
  equipo/promos). El jugador solo reserva vitrina visible (publicado +
  suscripción vigente).
- **Identidad del jugador** (migración `PerfilJugador`): registro exige
  nombre + fecha de nacimiento + username (único, 3-20 `[a-z0-9_.-]`).
  Nombre, correo y fecha inmutables tras el registro (`400`); username
  mutable 1 vez por año (`409` + `proximoCambio`).   Autoservicio:
  `PATCH /api/usuarios/me`; lectura: `GET /api/auth/me`. Usuarios legacy
  sin fecha/username los fijan por única vez desde `/dashboard/perfil`.
  Teléfono editable (7-15 dígitos, se puede quitar) y foto de perfil
  (`POST /api/usuarios/me/foto`, JPG/PNG/WEBP/GIF ≤3 MB, mage `FotoUrl`).
- **Reseñas post-experiencia** (sin migración): `POST /api/resenas`
  (1-5 + comentario ≤500, crea o actualiza la propia; exige reserva
  COMPLETADA en el local, 403 si no jugó) y `GET /api/resenas/publicas`
  (anónimo, solo vitrina visible: promedio + lista sin emails). UI:
  `CalificarBtn` en Mis Reservas (Next) y opiniones en `/canchas` (Next).
- **Arequipa-only**: `Ciudad` fija "Arequipa", `Distrito` solo de la lista de
  29 (`ComplejosController.DistritosArequipa`); todo lo demás se rechaza.


## Proyecto unificado

Web pública y panel usan el mismo origen y la misma UI en `components/ui`; API .NET en `../api`. Los comandos completos y el runner multiplataforma están en [README raíz](../../README.md). Desde la raíz, `npm run dev:all` inicia API y web; desde esta carpeta, `npm run dev` conserva webpack. No leer JWT cliente ni editar secretos.
