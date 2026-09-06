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
        {
            query = query.Where(r => r.UsuarioId == User.IdOrEmpty());
        }
        else
        {
            // Staff solo ve reservas de su alcance (propios + membresías).
            // Incluye reservas legacy sin complejoId cuya cancha es del alcance.
            var ids = await ComplejoAccess.IdsAsync(_db, User);
            if (ids is not null)
            {
                if (ids.Count == 0)
                    return Ok(new { reservas = Array.Empty<ReservaDto>() });
                var canchaIds = await _db.Canchas.AsNoTracking()
                    .Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!))
                    .Select(c => c.Id).ToListAsync();
                query = query.Where(r =>
                    (r.ComplejoId != null && ids.Contains(r.ComplejoId!)) ||
                    (r.ComplejoId == null && canchaIds.Contains(r.CanchaId)));
            }
            query = query.Include(r => r.Usuario);
        }

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
        if (User.RolOr() != Rol.USUARIO && !await AlcanceReservaOkAsync(reserva))
            return StatusCode(403, new { error = "Sin permisos" });

        return Ok(new { reserva = ReservaDto.From(reserva, true) });
    }
    // Validación de código QR en recepción (/admin/validar-codigo).
    // Solo confirma reservas CONFIRMADAS y deja constancia de quién/cuándo validó.
    [HttpPost("validar")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Validar([FromBody] ReservaValidarRequest request)
    {
        var codigo = (request.Codigo ?? "").Trim().ToUpperInvariant();
        if (codigo.Length < 3)
            return BadRequest(new { error = "Código inválido" });

        var reserva = await _db.Reservas
            .Include(r => r.Cancha)
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.Codigo == codigo);
        if (reserva is null)
            return NotFound(new { error = "Código no válido" });

        // Recepción solo valida códigos de su sede (plataforma: todo).
        if (!await AlcanceReservaOkAsync(reserva))
            return StatusCode(403, new { error = "Sin permisos" });

        if (reserva.Estado != EstadoReserva.CONFIRMADA)
        {
            var motivo = reserva.Estado switch
            {
                EstadoReserva.PENDIENTE => "La reserva aún está pendiente de confirmación",
                EstadoReserva.CANCELADA => "La reserva fue cancelada",
                EstadoReserva.COMPLETADA => "La reserva ya fue utilizada",
                _ => "La reserva no está confirmada"
            };
            return Conflict(new { error = motivo });
        }

        reserva.ValidadaEn = DateTime.UtcNow;
        reserva.ValidadaPorId = User.IdOrEmpty();
        await _db.SaveChangesAsync();

        // Aviso para recepción: sanciones activas del jugador en este local.
        object? restriccion = null;
        var complejoReserva = reserva.ComplejoId ?? reserva.Cancha?.ComplejoId;
        if (complejoReserva is not null)
        {
            var san = await _db.Sanciones.AsNoTracking()
                .Where(s => s.Activa && s.UsuarioId == reserva.UsuarioId && s.ComplejoId == complejoReserva)
                .OrderByDescending(s => s.Nivel == NivelSancion.BLOQUEO)
                .ThenByDescending(s => s.CreadoEn)
                .FirstOrDefaultAsync();
            if (san is not null)
                restriccion = new { nivel = san.Nivel.ToString(), motivo = san.Motivo };
        }

        return Ok(new
        {
            ok = true,
            reserva = new
            {
                codigo = reserva.Codigo,
                cancha = reserva.Cancha != null ? reserva.Cancha.Nombre : "",
                usuario = reserva.Usuario != null ? reserva.Usuario.Nombre : "",
                fecha = reserva.Fecha,
                horaInicio = reserva.HoraInicio,
                horaFin = reserva.HoraFin,
                estado = reserva.Estado.ToString(),
                restriccion
            }
        });
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

        // Alcance: el jugador solo reserva vitrina visible (publicado +
        // suscripción vigente, o legacy sin complejo); el staff solo su sede.
        var rolActual = User.RolOr();
        if (rolActual == Rol.USUARIO)
        {
            if (cancha.ComplejoId is not null &&
                !(await ComplejoAccess.IdsVisiblesAsync(_db)).Contains(cancha.ComplejoId))
                return BadRequest(new { error = "Cancha no disponible" });
        }
        else if (!ComplejoAccess.EsPlataforma(User) && cancha.ComplejoId is not null &&
            !await ComplejoAccess.TieneAccesoAsync(_db, User, cancha.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        // Bloqueo del dueño: si el local restringió a este usuario, no puede reservar.
        if (cancha.ComplejoId is not null && await _db.Sanciones.AsNoTracking().AnyAsync(s =>
            s.Activa && s.Nivel == NivelSancion.BLOQUEO &&
            s.UsuarioId == User.IdOrEmpty() && s.ComplejoId == cancha.ComplejoId))
            return StatusCode(403, new { error = "Este local restringió tu acceso. Contacta al administrador." });

        var conflicto = await _db.Reservas.AsNoTracking()
            .AnyAsync(r =>
                r.CanchaId == cancha.Id &&
                r.Fecha == fecha.Value &&
                r.Estado == EstadoReserva.CONFIRMADA &&
                r.HoraInicio < fin &&
                r.HoraFin > inicio);

        if (conflicto)
            return Conflict(new { error = "Ya existe una reserva en ese horario" });

        var fueraHorario = await HorariosController.ValidarSlotAsync(
            _db, cancha.ComplejoId, cancha.Id, fecha.Value, inicio, fin);
        if (fueraHorario is not null)
            return BadRequest(new { error = fueraHorario });

        var promos = await PrecioCancha.PromosAplicablesAsync(
            _db, new[] { cancha.Id }, new[] { cancha.ComplejoId });
        var total = PrecioCancha.Cotizar(cancha.PrecioPorHora, promos, fecha.Value, inicio, fin).Total;

        var reserva = new Reserva
        {
            Id = JwtService.NewId(),
            Codigo = NuevoCodigo(),
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
        for (var intento = 0; ; intento++)
        {
            try
            {
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                break;
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is PostgresException { SqlState: "23503" })
            {
                return Conflict(new { error = "La cancha ya no está disponible" });
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is PostgresException { SqlState: "23505" })
            {
                // Colisión del código QR (RF-XXXX): regenerar y reintentar.
                if (intento >= 2)
                    return Conflict(new { error = "La reserva no pudo registrarse. Intenta de nuevo." });
                reserva.Codigo = NuevoCodigo();
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
        }

        // Primera reserva del complejo: genera su horario Lun-Dom por defecto.
        // OJO: va ANTES de asignar reserva.Cancha (esa navegación deja a la
        // cancha como Added en el contexto y otro SaveChanges intentaría
        // re-insertarla: 23505). Y es mejor esfuerzo: si falla, la reserva
        // igual queda registrada.
        if (cancha.ComplejoId is not null)
        {
            try { await HorariosController.AsegurarHorarioAsync(_db, cancha.ComplejoId); }
            catch { /* mejor esfuerzo */ }
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
        else if (!await AlcanceReservaOkAsync(reserva))
            return StatusCode(403, new { error = "Sin permisos" });

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
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Delete(string id)
    {
        var reserva = await _db.Reservas.FirstOrDefaultAsync(r => r.Id == id);
        if (reserva is null)
            return Ok(new { ok = true });
        if (!await AlcanceReservaOkAsync(reserva))
            return StatusCode(403, new { error = "Sin permisos" });

        _db.Reservas.Remove(reserva);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // Código QR de recepción: RF-XXXX (4 hex únicos, ej. RF-8K2P).
    private static string NuevoCodigo() =>
        "RF-" + Guid.NewGuid().ToString("N")[..4].ToUpperInvariant();

    private static string? ComplejoDeReserva(Reserva reserva) =>
        reserva.ComplejoId ?? reserva.Cancha?.ComplejoId;

    // Staff de otra sede no ve ni toca reservas ajenas. USUARIO se valida
    // aparte (solo sus propias reservas). Null (legacy) = sin dueño.
    private async Task<bool> AlcanceReservaOkAsync(Reserva reserva)
    {
        if (ComplejoAccess.EsPlataforma(User))
            return true;
        var complejoId = ComplejoDeReserva(reserva);
        if (complejoId is null)
            return true;
        return await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId);
    }

    private static DateTime? ParseFecha(string value) => DtoFormat.ParseFechaDia(value);
}