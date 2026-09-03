using System.Text.Json.Serialization;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Dtos;

public class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class RegisterRequest
{
    public string? Nombre { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class CanchaRequest
{
    public string? Nombre { get; set; }
    public TipoCancha? Tipo { get; set; }
    public string? Descripcion { get; set; }
    public decimal? PrecioPorHora { get; set; }
    public int? Capacidad { get; set; }
    public bool? Activa { get; set; }
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

public class UsuarioPatchRequest
{
    public string? Nombre { get; set; }
    public string? Email { get; set; }
    public string? Rol { get; set; }
    public bool? Activo { get; set; }
    public string? Password { get; set; }
}

public record UsuarioSesionDto(string Id, string Nombre, string Email, Rol Rol, int Tv);

public record CanchaDto(
    string Id,
    string Nombre,
    TipoCancha Tipo,
    string? Descripcion,
    string PrecioPorHora,
    int Capacidad,
    bool Activa,
    string? Imagen,
    DateTime CreadoEn)
{
    public static CanchaDto From(Cancha c) => new(
        c.Id,
        c.Nombre,
        c.Tipo,
        c.Descripcion,
        DtoFormat.Money(c.PrecioPorHora),
        c.Capacidad,
        c.Activa,
        c.Imagen,
        DtoFormat.Utc(c.CreadoEn));
}

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