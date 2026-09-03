using System.Globalization;
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

[ApiController]
[Route("api/reservas")]
public class ReservasController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReservasController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> List()
    {
        var esUsuario = User.RolOr() == Rol.USUARIO;

        var query = _db.Reservas.AsNoTracking()
            .Include(r => r.Cancha)
            .OrderByDescending(r => r.Estado == EstadoReserva.PENDIENTE)
            .ThenByDescending(r => r.CreadoEn)
            .ThenByDescending(r => r.Fecha)
            as IQueryable<Reserva>;

        if (esUsuario)
            query = query.Where(r => r.UsuarioId == User.IdOrEmpty());
        else
            query = query.Include(r => r.Usuario);

        var reservas = await query.ToListAsync();
        return Ok(new { reservas = reservas.Select(r => ReservaDto.From(r, !esUsuario)) });
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> Get(string id)
    {
        var reserva = await _db.Reservas.AsNoTracking()
            .Include(r => r.Cancha)
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (reserva is null)
            return NotFound(new { error = "No encontrada" });

        if (User.RolOr() == Rol.USUARIO && reserva.UsuarioId != User.IdOrEmpty())
            return StatusCode(403, new { error = "Sin permisos" });

        return Ok(new { reserva = ReservaDto.From(reserva, true) });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] ReservaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CanchaId) ||
            string.IsNullOrWhiteSpace(request.Fecha) ||
            request.HoraInicio is null ||
            request.HoraFin is null)
            return BadRequest(new { error = "Faltan campos requeridos" });

        var inicio = request.HoraInicio.Value;
        var fin = request.HoraFin.Value;

        if (inicio < 0 || inicio >= 1440 || fin < 1 || fin > 1440 || fin <= inicio)
            return BadRequest(new
            {
                error = "Horario inválido: la hora de fin debe ser posterior a la de inicio"
            });

        var fecha = ParseFecha(request.Fecha);
        if (fecha is null)
            return BadRequest(new { error = "Fecha inválida" });

        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var cancha = await _db.Canchas.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.CanchaId);
        if (cancha is null || !cancha.Activa)
            return BadRequest(new { error = "Cancha no disponible" });

        var conflicto = await _db.Reservas.AsNoTracking()
            .AnyAsync(r =>
                r.CanchaId == cancha.Id &&
                r.Fecha == fecha.Value &&
                r.Estado == EstadoReserva.CONFIRMADA &&
                r.HoraInicio < fin &&
                r.HoraFin > inicio);

        if (conflicto)
            return Conflict(new { error = "Ya existe una reserva en ese horario" });

        var horas = (decimal)(fin - inicio) / 60m;
        var total = Math.Round(cancha.PrecioPorHora * horas, 2, MidpointRounding.AwayFromZero);

        var reserva = new Reserva
        {
            Id = JwtService.NewId(),
            UsuarioId = User.IdOrEmpty(),
            CanchaId = cancha.Id,
            Fecha = fecha.Value,
            HoraInicio = inicio,
            HoraFin = fin,
            Estado = EstadoReserva.PENDIENTE,
            Total = total,
            Notas = string.IsNullOrWhiteSpace(request.Notas) ? null : request.Notas.Trim(),
            CreadoEn = DateTime.UtcNow
        };

        _db.Reservas.Add(reserva);
        try
        {
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23503" })
        {
            return Conflict(new { error = "La cancha ya no está disponible" });
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "40001" })
        {
            return Conflict(new { error = "El horario acaba de ser reservado. Elige otro horario." });
        }
        catch (PostgresException ex) when (ex.SqlState == "40001")
        {
            return Conflict(new { error = "El horario acaba de ser reservado. Elige otro horario." });
        }

        reserva.Cancha = cancha;
        return StatusCode(201, new { ok = true, reserva = ReservaDto.From(reserva, false) });
    }

    [HttpPatch("{id}")]
    [Authorize]
    public async Task<IActionResult> Patch(string id, [FromBody] ReservaPatchRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var reserva = await _db.Reservas
            .Include(r => r.Cancha)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (reserva is null)
            return NotFound(new { error = "No encontrada" });

        if (User.RolOr() == Rol.USUARIO)
        {
            if (reserva.UsuarioId != User.IdOrEmpty())
                return StatusCode(403, new { error = "Sin permisos" });
            if (!string.IsNullOrEmpty(request.Estado) && request.Estado != "CANCELADA")
                return StatusCode(403, new { error = "Solo puedes cancelar tu reserva" });
        }

        if (!string.IsNullOrEmpty(request.Estado))
        {
            if (!Enum.TryParse<EstadoReserva>(request.Estado, ignoreCase: true, out var estado))
                return BadRequest(new { error = "Estado inválido" });

            if (estado == EstadoReserva.CONFIRMADA &&
                await _db.Reservas.AsNoTracking().AnyAsync(r =>
                    r.Id != reserva.Id &&
                    r.CanchaId == reserva.CanchaId &&
                    r.Fecha == reserva.Fecha &&
                    r.Estado == EstadoReserva.CONFIRMADA &&
                    r.HoraInicio < reserva.HoraFin &&
                    r.HoraFin > reserva.HoraInicio))
            {
                return Conflict(new
                {
                    error = "Ya existe una reserva confirmada en ese horario"
                });
            }

            reserva.Estado = estado;

            if (estado == EstadoReserva.CONFIRMADA)
            {
                await _db.Reservas
                    .Where(r =>
                        r.Id != reserva.Id &&
                        r.CanchaId == reserva.CanchaId &&
                        r.Fecha == reserva.Fecha &&
                        r.Estado == EstadoReserva.PENDIENTE &&
                        r.HoraInicio < reserva.HoraFin &&
                        r.HoraFin > reserva.HoraInicio)
                    .ExecuteUpdateAsync(update => update
                        .SetProperty(r => r.Estado, EstadoReserva.CANCELADA));
            }
        }

        if (request.Notas is not null)
            reserva.Notas = string.IsNullOrWhiteSpace(request.Notas) ? null : request.Notas.Trim();

        try
        {
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "40001" })
        {
            return Conflict(new
            {
                error = "El horario acaba de ser confirmado por otra solicitud"
            });
        }

        var usuarioRol = User.RolOr();
        if (usuarioRol != Rol.USUARIO)
            reserva.Usuario = await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == reserva.UsuarioId);

        return Ok(new { ok = true, reserva = ReservaDto.From(reserva, usuarioRol != Rol.USUARIO) });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN,SUPERADMIN")]
    public async Task<IActionResult> Delete(string id)
    {
        var reserva = await _db.Reservas.FirstOrDefaultAsync(r => r.Id == id);
        if (reserva is null)
            return Ok(new { ok = true });

        _db.Reservas.Remove(reserva);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private static DateTime? ParseFecha(string value)
    {
        if (DateTime.TryParseExact(value, "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
            return DateTime.SpecifyKind(exact.Date, DateTimeKind.Unspecified);
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind, out var parsed))
            return DateTime.SpecifyKind(parsed.Date, DateTimeKind.Unspecified);
        return null;
    }
}