# Contratos de respuesta y reglas transversales

Las expresiones de manifest.json son C# fuente, no muestras JSON capturadas. Los DTOs siguientes fijan nombres, tipos y conversiones. Cada caso conserva tipos JSON en la futura comparación. No aprobar una ruta por comparar solo status o claves de primer nivel.

## Serialización

Program usa camelCase y enumsstring; DtoFormat.Money devuelve texto con2decimales. Conservar nombres explícitos `_count`, null/omisión, DateTimeUtc y decimales numéricos de respuestas anónimas cuando el código no usa Money. No convertir todo dinero a número ni a string indiscriminadamente.

## apps/api/Dtos/Dtos.cs

```csharp
using System.Text.Json.Serialization;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Dtos;

public class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class ForgotPasswordRequest
{
    public string? Email { get; set; }
}

public class ResetPasswordRequest
{
    public string? Token { get; set; }
    public string? Password { get; set; }
}

public class RegisterRequest
{
    public string? Nombre { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? FechaNacimiento { get; set; }
    public string? Username { get; set; }
}

public class GoogleCompleteRegisterRequest
{
    public string? T { get; set; }
    public string? FechaNacimiento { get; set; }
    public string? Username { get; set; }
}

public class CanchaRequest
{
    public string? Nombre { get; set; }
    public TipoCancha? Tipo { get; set; }
    public string? Descripcion { get; set; }
    public decimal? PrecioPorHora { get; set; }
    public int? Capacidad { get; set; }
    public bool? Activa { get; set; }
    public string? ComplejoId { get; set; }
    public bool? Techada { get; set; }
    public string? Superficie { get; set; }
    public string? Imagen { get; set; }
}

public class ReservaRequest
{
    public string? CanchaId { get; set; }
    public string? Fecha { get; set; }
    public int? HoraInicio { get; set; }
    public int? HoraFin { get; set; }
    public string? Notas { get; set; }
}

public class ReservaPatchRequest
{
    public string? Estado { get; set; }
    public string? Notas { get; set; }
}

public class ReservaValidarRequest
{
    public string? Codigo { get; set; }
}

public class UsuarioPatchRequest
{
    public string? Nombre { get; set; }
    public string? Email { get; set; }
    public string? Rol { get; set; }
    public bool? Activo { get; set; }
    public string? Password { get; set; }
}

// Autoservicio del jugador: solo username (1 vez/año), fecha de nacimiento
// por única vez si está vacía, y cambio de clave. Nombre y correo inmutables.
public class MiPerfilPatchRequest
{
    public string? Nombre { get; set; }
    public string? Email { get; set; }
    public string? Username { get; set; }
    public string? FechaNacimiento { get; set; }
    public string? Password { get; set; }
    public string? CurrentPassword { get; set; }
    public string? Telefono { get; set; }
}


public record CanchaDto(
    string Id,
    string Nombre,
    TipoCancha Tipo,
    string? Descripcion,
    string PrecioPorHora,
    int Capacidad,
    bool Techada,
    string? Superficie,
    bool Activa,
    string? Imagen,
    string? ComplejoId,
    DateTime CreadoEn,
    CanchaComplejoDto? Complejo,
    CanchaDuenoDto? Dueno)
{
    public static CanchaDto From(Cancha c) => new(
        c.Id,
        c.Nombre,
        c.Tipo,
        c.Descripcion,
        DtoFormat.Money(c.PrecioPorHora),
        c.Capacidad,
        c.Techada,
        c.Superficie,
        c.Activa,
        c.Imagen,
        c.ComplejoId,
        DtoFormat.Utc(c.CreadoEn),
        c.Complejo is null
            ? null
            : new CanchaComplejoDto(c.Complejo.Id, c.Complejo.Nombre, c.Complejo.Distrito, c.Complejo.Ciudad),
        c.Complejo?.Dueno is null
            ? null
            : new CanchaDuenoDto(c.Complejo.Dueno.Id, c.Complejo.Dueno.Nombre));
}

public record CanchaComplejoDto(string Id, string Nombre, string Distrito, string Ciudad);

public record CanchaDuenoDto(string Id, string Nombre);

public record UsuarioReservaDto(string Id, string Nombre, string Email, Rol Rol, bool Activo, DateTime CreadoEn)
{
    public static UsuarioReservaDto From(Usuario u) => new(
        u.Id,
        u.Nombre,
        u.Email,
        u.Rol,
        u.Activo,
        DtoFormat.Utc(u.CreadoEn));
}

public record ReservaCountDto(int Reservas);

public record UsuarioResumenDto(
    string Id,
    string Nombre,
    string Email,
    Rol Rol,
    bool Activo,
    DateTime CreadoEn,
    [property: JsonPropertyName("_count")] ReservaCountDto Count)
{
    public static UsuarioResumenDto From(
        string id, string nombre, string email, Rol rol, bool activo, DateTime creadoEn, int reservas) =>
        new(id, nombre, email, rol, activo, DtoFormat.Utc(creadoEn), new ReservaCountDto(reservas));
}

public record ReservaDto(
    string Id,
    string Codigo,
    string UsuarioId,
    string CanchaId,
    DateTime Fecha,
    int HoraInicio,
    int HoraFin,
    EstadoReserva Estado,
    string Total,
    string? Notas,
    DateTime CreadoEn,
    CanchaDto Cancha,
    UsuarioReservaDto? Usuario)
{
    public static ReservaDto From(Reserva r, bool incluirUsuario) => new(
        r.Id,
        r.Codigo,
        r.UsuarioId,
        r.CanchaId,
        DtoFormat.Utc(r.Fecha),
        r.HoraInicio,
        r.HoraFin,
        r.Estado,
        DtoFormat.Money(r.Total),
        r.Notas,
        DtoFormat.Utc(r.CreadoEn),
        CanchaDto.From(r.Cancha!),
        incluirUsuario && r.Usuario is not null ? UsuarioReservaDto.From(r.Usuario) : null);
}
```

## apps/api/Dtos/ReportesDtos.cs

```csharp
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Dtos;

public record DashboardUsuarioDto(
    int Reservas,
    int ReservasConfirmadas,
    int CanchasActivas,
    List<ReservaDto> UltimasReservas);

public record DashboardAdminDto(
    int TotalReservas,
    int ReservasPendientes,
    int CanchasActivas,
    string Ingresos,
    List<ReservaDto> UltimasReservas);

public record DashboardSuperadminDto(
    int Usuarios,
    int Administradores,
    int Reservas,
    int Canchas,
    string Ingresos);

public record ReservasPorEstadoDto(EstadoReserva Estado, int Cantidad);

public record CanchaReporteDto(
    string Id,
    string Nombre,
    TipoCancha Tipo,
    bool Activa,
    string PrecioPorHora,
    int Reservas,
    string Ingresos);

public record TopCanchaDto(
    string Id,
    string Nombre,
    TipoCancha Tipo,
    int Reservas,
    string Ingresos);

public record GlobalReportDto(
    int TotalUsuarios,
    int TotalReservas,
    List<ReservasPorEstadoDto> ReservasPorEstado,
    List<TopCanchaDto> TopCanchas,
    List<CanchaReporteDto> Canchas,
    string IngresosTotales,
    string Promedio,
    List<ReservaDto> UltimasReservas);
```

## apps/api/Dtos/DtoFormat.cs

```csharp
using System.Globalization;

namespace ReservaFacil.Api.Dtos;

internal static class DtoFormat
{
    public static string Money(decimal value) =>
        value.ToString("0.00", CultureInfo.InvariantCulture);

    public static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

    // Día de calendario para reservas/cotizaciones (no instante horario).
    public static DateTime? ParseFechaDia(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (DateTime.TryParseExact(value.Trim(), "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
            return DateTime.SpecifyKind(exact.Date, DateTimeKind.Unspecified);
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind, out var parsed))
            return DateTime.SpecifyKind(parsed.Date, DateTimeKind.Unspecified);
        return null;
    }
}
```

### CajaController.cs:57

```csharp
private static object MovimientoJson(MovimientoCaja m) => new
    {
        id = m.Id,
        descripcion = m.Descripcion,
        monto = DtoFormat.Money(m.Monto),
        metodoPago = m.MetodoPago.ToString(),
        tipo = m.Tipo.ToString(),
        creadoEn = DtoFormat.Utc(m.CreadoEn)
    };
```

### CajaController.cs:67

```csharp
private static object CajaJson(CajaSesion c) => new
    {
        id = c.Id,
        estado = c.Estado.ToString(),
        montoInicial = DtoFormat.Money(c.MontoInicial),
        montoFinal = c.MontoFinal.HasValue ? DtoFormat.Money(c.MontoFinal.Value) : null,
        abiertaEn = DtoFormat.Utc(c.AbiertaEn),
        cerradaEn = c.CerradaEn.HasValue ? (DateTime?)DtoFormat.Utc(c.CerradaEn.Value) : null
    };
```

### CajaController.cs:77

```csharp
private static object ProductoJson(Producto p) => new
    {
        id = p.Id,
        nombre = p.Nombre,
        categoria = p.Categoria,
        precio = DtoFormat.Money(p.Precio),
        stock = p.Stock,
        activo = p.Activo
    };
```

### CajaController.cs:133

```csharp
private static object ResumenVacio() => new
    {
        montoInicial = DtoFormat.Money(0),
        ingresos = DtoFormat.Money(0),
        egresos = DtoFormat.Money(0),
        esperado = DtoFormat.Money(0),
        movimientos = 0
    };
```

### ComplejosController.cs:321

```csharp
private static object ComplejoShape(
        Complejo c, int totalCanchas, int reservasProximas, double ocupacion, object? suscripcion = null) => new
    {
        c.Id,
        c.Nombre,
        c.Slug,
        c.Direccion,
        c.Distrito,
        c.Ciudad,
        c.Telefono,
        c.Email,
        c.Descripcion,
        c.Publicado,
        c.DuenoId,
        TotalCanchas = totalCanchas,
        ReservasProximas = reservasProximas,
        Ocupacion = ocupacion,
        Suscripcion = suscripcion,
        CreadoEn = DtoFormat.Utc(c.CreadoEn)
    };
```

### EquipoController.cs:227

```csharp
private static object MiembroShape(ComplejoMiembro m) => new
    {
        m.Id,
        m.ComplejoId,
        m.RolSede,
        m.Activo,
        Estado = m.Activo ? "ACTIVO" : "PENDIENTE",
        CreadoEn = DtoFormat.Utc(m.CreadoEn),
        Usuario = m.Usuario is null
            ? null
            : new { m.Usuario.Id, m.Usuario.Nombre, m.Usuario.Email, m.Usuario.Rol, m.Usuario.Activo }
    };
```

### MetasController.cs:29

```csharp
private static object MetaJson(Meta m) => new
    {
        id = m.Id,
        titulo = m.Titulo,
        tipo = m.Tipo.ToString(),
        objetivo = DtoFormat.Money(m.Objetivo),
        actual = DtoFormat.Money(m.Actual),
        periodoInicio = DtoFormat.Utc(m.PeriodoInicio).ToString("yyyy-MM-dd"),
        periodoFin = DtoFormat.Utc(m.PeriodoFin).ToString("yyyy-MM-dd")
    };
```

### PromocionesController.cs:341

```csharp
private static object PromocionShape(Promocion p) => new
    {
        p.Id,
        p.ComplejoId,
        p.CanchaId,
        p.Nombre,
        p.Codigo,
        p.Tipo,
        Valor = DtoFormat.Money(p.Valor),
        p.UsosMax,
        p.UsosActuales,
        p.Activa,
        p.HoraDesde,
        p.HoraHasta,
        Desde = p.FechaInicio.HasValue ? p.FechaInicio.Value.ToString("yyyy-MM-dd") : null,
        Hasta = p.FechaFin.HasValue ? p.FechaFin.Value.ToString("yyyy-MM-dd") : null,
        p.PrecioDia,
        p.PrecioTarde,
        p.PrecioNoche,
        InicioTarde = p.InicioTarde.HasValue ? $"{p.InicioTarde.Value / 60:D2}:{p.InicioTarde.Value % 60:D2}" : null,
        InicioNoche = p.InicioNoche.HasValue ? $"{p.InicioNoche.Value / 60:D2}:{p.InicioNoche.Value % 60:D2}" : null,
        p.RepetirAnual,
        p.Descripcion,
        CreadoEn = DtoFormat.Utc(p.CreadoEn)
    };
```

### ResenasController.cs:162

```csharp
private static object ResenaPublicaShape(Resena r) => new
    {
        r.Id,
        r.Puntuacion,
        r.Comentario,
        r.RespuestaDueno,
        CreadoEn = DtoFormat.Utc(r.CreadoEn),
        Usuario = r.Usuario is null ? null : new { r.Usuario.Id, r.Usuario.Nombre }
    };
```

### ResenasController.cs:172

```csharp
private static object ResenaShape(Resena r) => new
    {
        r.Id,
        r.ComplejoId,
        r.Puntuacion,
        r.Comentario,
        r.RespuestaDueno,
        CreadoEn = DtoFormat.Utc(r.CreadoEn),
        Usuario = r.Usuario is null
            ? null
            : new { r.Usuario.Id, r.Usuario.Nombre, r.Usuario.Email }
    };
```

### TorneosController.cs:454

```csharp
private static object TorneoShape(Torneo t) => new
    {
        t.Id,
        t.ComplejoId,
        t.Nombre,
        t.Deporte,
        FechaInicio = DtoFormat.Utc(t.FechaInicio),
        FechaFin = t.FechaFin.HasValue ? DtoFormat.Utc(t.FechaFin.Value) : (DateTime?)null,
        CostoInscripcion = DtoFormat.Money(t.CostoInscripcion),
        t.CupoMax,
        t.Premio,
        t.Reglamento,
        t.Estado,
        CreadoEn = DtoFormat.Utc(t.CreadoEn)
    };
```

### TorneosController.cs:470

```csharp
private static object InscripcionShape(InscripcionTorneo i) => new
    {
        i.Id,
        i.TorneoId,
        i.Equipo,
        i.CapitanId,
        i.Telefono,
        i.Pagado,
        CreadoEn = DtoFormat.Utc(i.CreadoEn)
    };
```

### TorneosController.cs:481

```csharp
private static object PartidoShape(PartidoTorneo p) => new
    {
        p.Id,
        p.TorneoId,
        p.Fase,
        p.EquipoA,
        p.EquipoB,
        p.GolesA,
        p.GolesB,
        p.Fecha,
        p.CanchaId,
        p.Ganador
    };
```

## Autorización y efectos

- Sin cookie o firma inválida en `[Authorize]`:401 `{error:"No autenticado"}`. Token firmado válido pero tv/activo no cumple ValidSessionHandler:403 `{error:"Sin permisos"}`. Rol insuficiente:403.
- Modelo inválido puede producir ProblemDetails400 antes de entrar al método, especialmente Reclamos; JSON malformado, número/bool/query no convertible también se captura.
- Middleware de gestión vencida:403 `{error:"Suscríbete para reactivar tu cancha."}`; exime auth/suscripciones, metadataAllowAnonymous y rolesUSUARIO/TECNICO. Una ruta sin Authorize no implica metadataAllowAnonymous.
- READ no implica ausencia de efectos: Googlecallback vincula cuenta/establece cookie; no shadow. Logout revoca tv si token válido. R2/email no se duplican en paridad.
- Usuarios/solicitudes/reportes no deben exponer contraseña,googleId interno ni secretos. Verificar el cuerpo completo y scope.
