using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// Suscripción de publicación: el dueño la SOLICITA (PENDIENTE) y el equipo
// técnico la APRUEBA (ACTIVA) o rechaza. Solo las ACTIVA vigentes publican.
// Hook de pagos: validar comprobante en Create antes de activar.
[ApiController]
[Route("api/suscripciones")]
[Authorize]
public class SuscripcionesController : ControllerBase
{
    private static readonly Dictionary<TipoPlan, int> DiasPorPlan = new()
    {
        [TipoPlan.MENSUAL] = 30,
        [TipoPlan.TRIMESTRAL] = 90,
        [TipoPlan.ANUAL] = 365,
    };

    private readonly AppDbContext _db;

    public SuscripcionesController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class SuscripcionRequest
    {
        public string? ComplejoId { get; set; }
        public string? Plan { get; set; }
    }

    [HttpGet("estado")]
    public async Task<IActionResult> Estado()
    {
        // Scope remains the same; keep it in SQL and avoid two queries per center.
        var ids = ComplejoAccess.IdsQuery(_db, User, incluirBloqueados: true);
        var query = _db.Complejos.AsNoTracking().AsQueryable();
        if (ids is not null) query = query.Where(c => ids.Contains(c.Id));
        var ahora = DateTime.UtcNow;
        var hoy = DateTime.SpecifyKind(ahora.Date, DateTimeKind.Unspecified);
        var rows = await query.OrderBy(c => c.CreadoEn).Select(c => new
        {
            c.Id, c.Nombre, c.Publicado, c.CreadoEn,
            RolDueno = c.Dueno != null ? (Rol?)c.Dueno.Rol : null,
            Activa = c.Suscripciones.Any(s => s.Estado == EstadoSuscripcion.ACTIVA && s.FechaInicio <= hoy && s.FechaFin >= hoy),
            Cantidad = c.Canchas.Count(),
        }).ToListAsync();
        var estados = new List<object>();
        foreach (var c in rows)
        {
            var activa = c.Activa;
            var fin = c.CreadoEn.AddDays(30);
            var pendiente = !c.Publicado && c.RolDueno == Rol.USUARIO;
            var prueba = !pendiente && !activa && c.RolDueno != Rol.USUARIO && fin > ahora;
            estados.Add(new { complejoId = c.Id, nombre = c.Nombre, enPrueba = prueba,
                pendiente, estadoSolicitud = pendiente ? "PENDIENTE" : "APROBADA", diasRestantes = prueba ? (int)Math.Ceiling((fin - ahora).TotalDays) : 0,
                pruebaHasta = DtoFormat.Utc(fin), activa, vencida = !pendiente && !activa && !prueba,
                bloqueada = pendiente || (!activa && !prueba), canchasPermitidas = prueba ? (int?)1 : null,
                puedeCrearCancha = !pendiente && (activa || (prueba && c.Cantidad == 0)) });
        }
        return Ok(new { ok = true, complejos = estados });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId, [FromQuery] string? estado)
    {
        var query = _db.Suscripciones.AsNoTracking()
            .Include(s => s.Complejo)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(complejoId))
        {
            if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId, incluirBloqueados: true))
                return StatusCode(403, new { error = "Sin permisos" });
            query = query.Where(s => s.ComplejoId == complejoId);
        }
        else if (User.RolOr() != Rol.TECNICO)
        {
            var ids = await ComplejoAccess.IdsAsync(_db, User, incluirBloqueados: true) ?? new List<string>();
            query = query.Where(s => ids.Contains(s.ComplejoId));
        }
        if (!string.IsNullOrWhiteSpace(estado))
        {
            if (!Enum.TryParse<EstadoSuscripcion>(estado, ignoreCase: true, out var est))
                return BadRequest(new { error = "Estado inválido" });
            query = query.Where(s => s.Estado == est);
        }

        var rows = await query.OrderByDescending(s => s.CreadoEn).ToListAsync();
        return Ok(new { ok = true, suscripciones = rows.Select(SuscripcionShape) });
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Create([FromBody] SuscripcionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (!Enum.TryParse<TipoPlan>(request.Plan, ignoreCase: true, out var plan) || !Enum.IsDefined(typeof(TipoPlan), plan))
            return BadRequest(new { error = "Plan inválido (MENSUAL, TRIMESTRAL, ANUAL)" });

        var complejo = await _db.Complejos.FirstOrDefaultAsync(c => c.Id == request.ComplejoId);
        if (complejo is null)
            return BadRequest(new { error = "Complejo no encontrado" });
        if (await _db.Usuarios.AnyAsync(u => u.Id == complejo.DuenoId && u.Rol == Rol.USUARIO))
            return Conflict(new { error = "Aprueba primero la solicitud del jugador." });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, request.ComplejoId, incluirBloqueados: true))
            return StatusCode(403, new { error = "Sin permisos" });

        var hoy = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Unspecified);
        var sub = new Suscripcion
        {
            Id = JwtService.NewId(),
            ComplejoId = request.ComplejoId,
            Plan = plan,
            Estado = EstadoSuscripcion.PENDIENTE,
            FechaInicio = hoy,
            FechaFin = hoy.AddDays(DiasPorPlan[plan]),
            CreadoEn = DateTime.UtcNow
        };

        _db.Suscripciones.Add(sub);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, suscripcion = SuscripcionShape(sub) });
    }

    // Aprueba la solicitud: activa la suscripción, jubila anteriores y publica.
    [HttpPatch("{id}/aprobar")]
    [Authorize(Roles = "TECNICO")]
    public async Task<IActionResult> Aprobar(string id)
    {
        var sub = await _db.Suscripciones
            .Include(s => s.Complejo)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (sub is null)
            return NotFound(new { error = "No encontrada" });
        if (sub.Estado != EstadoSuscripcion.PENDIENTE)
            return BadRequest(new { error = "Solo se pueden aprobar solicitudes pendientes" });

        if (sub.Complejo is not null && await _db.Usuarios.AnyAsync(u => u.Id == sub.Complejo.DuenoId && u.Rol == Rol.USUARIO))
            return Conflict(new { error = "Aprueba primero la solicitud del jugador." });

        await _db.Suscripciones
            .Where(s => s.ComplejoId == sub.ComplejoId && s.Id != sub.Id &&
                s.Estado == EstadoSuscripcion.ACTIVA)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.Estado, EstadoSuscripcion.VENCIDA));
        sub.FechaInicio = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Unspecified);
        sub.FechaFin = sub.FechaInicio.AddDays(DiasPorPlan[sub.Plan]);
        sub.Estado = EstadoSuscripcion.ACTIVA;
        if (sub.Complejo is not null)
            sub.Complejo.Publicado = true;
        await _db.SaveChangesAsync();

        return Ok(new { ok = true, suscripcion = SuscripcionShape(sub) });
    }

    [HttpPatch("{id}/rechazar")]
    [Authorize(Roles = "TECNICO")]
    public async Task<IActionResult> Rechazar(string id)
    {
        var sub = await _db.Suscripciones.FirstOrDefaultAsync(s => s.Id == id);
        if (sub is null)
            return NotFound(new { error = "No encontrada" });
        if (sub.Estado != EstadoSuscripcion.PENDIENTE)
            return BadRequest(new { error = "Solo se pueden rechazar solicitudes pendientes" });

        sub.Estado = EstadoSuscripcion.RECHAZADA;
        await _db.SaveChangesAsync();
        return Ok(new { ok = true, suscripcion = SuscripcionShape(sub) });
    }

    [HttpPatch("{id}/cancelar")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Cancelar(string id)
    {
        var sub = await _db.Suscripciones.FirstOrDefaultAsync(s => s.Id == id);
        if (sub is null)
            return NotFound(new { error = "No encontrada" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, sub.ComplejoId, incluirBloqueados: true))
            return StatusCode(403, new { error = "Sin permisos" });

        sub.Estado = EstadoSuscripcion.CANCELADA;
        await _db.SaveChangesAsync();
        return Ok(new { ok = true, suscripcion = SuscripcionShape(sub) });
    }

    internal static object SuscripcionShape(Suscripcion s)
    {
        var hoy = DateTime.UtcNow.Date;
        var fin = s.FechaFin.Date;
        return new
        {
            s.Id,
            s.ComplejoId,
            ComplejoNombre = s.Complejo != null ? s.Complejo.Nombre : "",
            s.Plan,
            s.Estado,
            FechaInicio = DtoFormat.Utc(DateTime.SpecifyKind(s.FechaInicio.Date, DateTimeKind.Utc)),
            FechaFin = DtoFormat.Utc(DateTime.SpecifyKind(fin, DateTimeKind.Utc)),
            DiasRestantes = Math.Max(0, (fin - hoy).Days),
            Vigente = s.Estado == EstadoSuscripcion.ACTIVA && fin >= hoy,
            CreadoEn = DtoFormat.Utc(s.CreadoEn)
        };
    }
}
