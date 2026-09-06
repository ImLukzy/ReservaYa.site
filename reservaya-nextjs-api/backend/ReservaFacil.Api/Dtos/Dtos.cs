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