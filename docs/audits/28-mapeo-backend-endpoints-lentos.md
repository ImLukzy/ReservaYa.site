# Mapeo Técnico de Rendimiento Backend (.NET Core + Neon PostgreSQL)
## Spec 28 — Lote 5: Diagnóstico y Optimización de Endpoints Críticos

> **Fecha:** 2026-09-28  
> **Autor:** Auditor-Gemini (`auditor-gemini-mujcn8iw`)  
> **Destinatarios:** `god` (Claudio), `Oscar-code`, `JIM-QA`  
> **Contexto:** Tras agotar las optimizaciones del frontend en L1–L3 (deduplicación de sesión con `React.cache()`, paralelización de waterfalls y prefetch de Astro), el tiempo de respuesta en SSR permanece condicionado por el piso de latencia de la API .NET (150ms–360ms por endpoint). Lukas autorizó formalmente la optimización del backend en `ILK-10` (18:56Z).

---

## 1. Causa Raíz Estructural: La Penalización RTT de Neon DB

La base de datos PostgreSQL corre en **Neon serverless** remoto. Cada consulta EF Core (`await ...ToListAsync()`, `CountAsync()`) incurre en un viaje de ida y vuelta de red (RTT) de **~70ms a ~110ms**.
Por ende, cualquier endpoint que ejecute **3 o 4 consultas secuenciales** (`await` encadenados) tiene un piso físico infranqueable de **250ms a 400ms**, independientemente de la velocidad de CPU o del frontend.

---

## 2. Mapa Detallado por Endpoint

### Endpoint 1: `GET /api/canchas/disponibles`
- **Uso en frontend:** `/dashboard/canchas` y `canchas.astro`.
- **Latencia observada:** **346.2ms – 351.1ms** (caliente).
- **Ubicación:** `apps/api/Controllers/CanchasController.cs:248-368`
- **Cadena de consultas actual (4 round-trips secuenciales):**
  1. `L274`: `await ComplejoAccess.IdsVisiblesAsync(_db)`:
     - Realiza una consulta con `Join` entre `Suscripciones` y `Complejos` para traer a memoria un `HashSet<string>` con todos los IDs de complejos visibles. (~80ms).
  2. `L307`: `await canchasQuery.CountAsync()`:
     - Ejecuta un `SELECT COUNT(*)` sobre `Canchas` con filtro `IN (@__visibles_0, ...)`. (~85ms).
  3. `L314/318`: `await canchasQuery.Take(10).ToListAsync()`:
     - Ejecuta un `SELECT ...` con `Include(c => c.Complejo).ThenInclude(c => c.Dueno)`. (~95ms).
  4. `L330` (si hay slot): `await _db.Reservas.Where(...).ToHashSetAsync()` + `L337`: `PrecioCancha.PromosAplicablesAsync`. (~90ms).
- **Problemas identificados:**
  - **Doble consulta Count + List:** Se lanza un `CountAsync()` separado de `ToListAsync()`.
  - **Materialización intermedia de IDs:** `IdsVisiblesAsync` descarga a memoria los IDs para luego inyectarlos en la cláusula `IN` de la consulta de canchas, en lugar de resolverlo como subconsulta o inner join directo en SQL.
- **Propuesta de optimización para L5:**
  - Integrar la condición de suscripción activa directamente en la expresión de EF Core (`c.ComplejoId == null || _db.Suscripciones.Any(s => s.ComplejoId == c.ComplejoId && s.Estado == EstadoSuscripcion.ACTIVA && s.FechaFin >= hoy)`), ahorrando 1 round-trip completo (-85ms).
  - En portada sin filtros (`sinFiltros && slot is null`), traer `Take(11).ToListAsync()`: si `count == 11`, `limiteAplicado = true`, evitando el `CountAsync()` independiente (-85ms).
  - **Impacto estimado:** Latencia reducida de **~346ms a ~170ms** (-50%).

---

### Endpoint 2: `GET /api/reportes/dashboard`
- **Uso en frontend:** `/dashboard` (página principal del jugador).
- **Latencia observada:** Componente principal de los **680ms** en `/dashboard`.
- **Ubicación:** `apps/api/Controllers/ReportesController.cs:119-142` (`DashboardUsuarioAsync`)
- **Cadena de consultas actual (4 round-trips secuenciales):**
  1. `L123`: `await _db.Reservas.CountAsync(r => r.UsuarioId == userId)` (~75ms).
  2. `L125`: `await _db.Reservas.CountAsync(r => r.UsuarioId == userId && r.Estado == EstadoReserva.CONFIRMADA)` (~75ms).
  3. `L127`: `await _db.Canchas.CountAsync(c => c.Activa)` (~75ms).
  4. `L129`: `await _db.Reservas.Include(r => r.Cancha).Where(r => r.UsuarioId == userId).OrderByDescending(...).Take(5).ToListAsync()` (~90ms).
- **Problemas identificados:**
  - Las dos primeras consultas (`Count` total y `Count` confirmadas) pegan a la misma tabla `Reservas` filtrando por el mismo `UsuarioId`.
  - La tercera consulta (`Canchas.Count(Activa)`) es un dato global idéntico para todos los usuarios que no cambia entre segundos.
- **Propuesta de optimización para L5:**
  - Unificar las estadísticas de usuario en una sola consulta agrupada o condicional:
    ```csharp
    var stats = await _db.Reservas.AsNoTracking()
        .Where(r => r.UsuarioId == userId)
        .GroupBy(r => 1)
        .Select(g => new {
            Total = g.Count(),
            Confirmadas = g.Count(r => r.Estado == EstadoReserva.CONFIRMADA)
        })
        .FirstOrDefaultAsync();
    ```
  - Cachear `canchasActivas` con `IMemoryCache` (duración 5 minutos) o calcularlo en paralelo.
  - Ejecutar la consulta de `ultimas` reservas y las estadísticas con `Task.WhenAll` (o en un único lote de datos).
  - **Impacto estimado:** Latencia reducida de **~315ms a ~110ms** (-65%).

---

### Endpoint 3: `GET /api/complejos`
- **Uso en frontend:** `/admin/agenda` (provoca que la agenda ronde los **993ms**).
- **Latencia observada:** **~320ms**.
- **Ubicación:** `apps/api/Controllers/ComplejosController.cs:65-91`
- **Cadena de consultas actual (5 round-trips secuenciales):**
  1. `L69`: `ComplejoAccess.IdsAsync`: consulta complejos propios + consulta miembros de complejo (2 queries).
  2. `L75`: `await query.OrderBy(...).ToListAsync()`.
  3. `L77`: `await OcupacionPorComplejoAsync(ids)`:
     - Ejecuta consulta de canchas del complejo.
     - Ejecuta consulta de reservas de los próximos 7 días.
     - Ejecuta consulta de reservas sin complejo directo.
  4. `L78`: `await SuscripcionesVigentesAsync(ids)`.
- **Problemas identificados:**
  - Cascada masiva de queries (hasta 6 viajes a Neon) para calcular estadísticas auxiliares (`ocupacion`, `totalCanchas`) en una llamada que `/admin/agenda` solo utiliza para poblar el selector de complejos.
- **Propuesta de optimización para L5:**
  - Cuando se solicite la lista para selectores simples o vistas operativas, evitar el cálculo pesado de ocupación a 7 días si no es requerido, o paralelizar las consultas independientes de `Stats` y `Suscripciones` con `Task.WhenAll`.
  - Cachear `SuscripcionesVigentes` en memoria.
  - **Impacto estimado:** Latencia reducida de **~320ms a ~130ms** (-60%).

---

### Endpoint 4: `GET /api/partidos/mios`
- **Uso en frontend:** `/dashboard/partidos`.
- **Latencia observada:** **336.4ms – 341.4ms**.
- **Ubicación:** `apps/api/Controllers/PartidosController.cs:108-152`
- **Cadena de consultas actual (4 round-trips secuenciales):**
  1. `L114`: `PartidosAbiertos.Where(OrganizadorId == uid).ToListAsync()` (~85ms).
  2. `L121`: `AnotacionesPartido.Where(UsuarioId == uid).Select(PartidoId).ToListAsync()` (~75ms).
  3. `L127`: `PartidosAbiertos.Where(meAnoteIds.Contains(p.Id)).ToListAsync()` (~85ms).
  4. `L139`: `Usuarios.Where(idsInscritos.Contains(u.Id)).ToDictionaryAsync()` (~80ms).
- **Problemas identificados:**
  - Cuatro queries lineales. La query 2 y 3 pueden resolverse en una sola con subconsulta o join (`PartidosAbiertos.Where(p => p.Anotaciones.Any(a => a.UsuarioId == uid))`).
  - La query 4 de nombres de inscritos puede incluirse con proyección o join.
- **Propuesta de optimización para L5:**
  - Unificar en 2 consultas (partidos organizados + partidos anotados en paralelo o join único), reduciendo los round-trips a la mitad.
  - **Impacto estimado:** Latencia reducida de **~340ms a ~160ms** (-53%).

---

### Endpoint 5: `GET /api/reservas`
- **Uso en frontend:** `/dashboard/reservas`, `/dashboard`, `/admin/agenda`, `/dashboard/perfil`.
- **Latencia observada:** **~350ms** para roles staff / admin; ~180ms para usuarios regulares.
- **Ubicación:** `apps/api/Controllers/ReservasController.cs:28-64`
- **Problemas identificados:**
  - Para staff/admin: calcula `ComplejoAccess.IdsAsync`, luego consulta `Canchas.Where(ComplejoId)`, y finalmente filtra reservas por ambos conjuntos con `Contains`.
- **Propuesta de optimización para L5:**
  - Simplificar la resolución de pertenencia mediante subconsulta SQL en vez de cargar listas de IDs a C# para reinyectarlas con `IN (...)`.

---

## 3. Matriz de Resumen y Ganancia Proyectada

| Endpoint | Controlador (.NET) | RTTs Actuales | Latencia Actual (Mediana) | Optimización Propuesta | Latencia Proyectada |
|---|---|:---:|:---:|---|:---:|
| `GET /api/canchas/disponibles` | `CanchasController.cs` | 4 queries | 346.2 ms | Subconsulta en EF Core sin materializar `IdsVisibles` + eliminar `CountAsync` en portada | **~170 ms** |
| `GET /api/reportes/dashboard` | `ReportesController.cs` | 4 queries | ~315 ms | Unificar conteos de reservas en 1 query + `IMemoryCache` en canchas activas | **~110 ms** |
| `GET /api/complejos` | `ComplejosController.cs` | 5 queries | ~320 ms | Proyección liviana sin estadísticas de 7 días pesadas / paralelización | **~130 ms** |
| `GET /api/partidos/mios` | `PartidosController.cs` | 4 queries | 338.8 ms | Resolver anotaciones vía `p.Anotaciones.Any(...)` en 1 sola query | **~160 ms** |

---

## 4. Impacto Proyectado en las Metas Incumplidas de la Spec 28

Al reducir la latencia de estos 4 endpoints a la mitad, los tiempos de respuesta medidos por `JIM-QA` en Next.js SSR pasarán a cumplir holgadamente los umbrales:

1. **`/dashboard/canchas` (Meta A8 < 500ms):**
   - Actualmente: **524.5 ms** (falló por 24.5 ms).
   - Con API optimizada (~170ms en vez de 346ms): **Proyectado ~350 ms** (✅ CUMPLE con margen de 150ms).
2. **`/admin/agenda` (Meta A9 < 800ms):**
   - Actualmente: **993.8 ms** (falló por 193.8 ms).
   - Con API optimizada (`canchas` + `complejos` pasando de 480ms combinados a ~250ms): **Proyectado ~680 ms** (✅ CUMPLE con margen de 120ms).
3. **`/dashboard` (Meta A10 < 600ms):**
   - Actualmente: **680.7 ms** (falló por 80.7 ms).
   - Con API optimizada (`dashboard` pasando de 315ms a ~110ms): **Proyectado ~470 ms** (✅ CUMPLE con margen de 130ms).

---

## 5. Recomendación de Ejecución para L5

1. **god:** Aprobar formalmente el plan de intervención backend basado en este mapeo.
2. **Oscar-code:** Implementar las optimizaciones C# en `CanchasController.cs`, `ReportesController.cs`, `ComplejosController.cs` y `PartidosController.cs`.
3. **JIM-QA:** Re-medir latencias de endpoints individuales de la API .NET y los 3 SSR de Next.js (`A8`, `A9`, `A10`).
4. **god:** Revisión de diff línea por línea (cero cambios en esquemas de BD, cero migraciones, contratos DTO 100% intactos).
