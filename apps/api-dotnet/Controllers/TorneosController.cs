using System.Globalization;
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
[Route("api/torneos")]
[Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
public class TorneosController : ControllerBase
{
    private readonly AppDbContext _db;

    public TorneosController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class TorneoRequest
    {
        public string? ComplejoId { get; set; }
        public string? Nombre { get; set; }
        public string? Deporte { get; set; }
        public string? FechaInicio { get; set; }
        public string? FechaFin { get; set; }
        public decimal? CostoInscripcion { get; set; }
        public int? CupoMax { get; set; }
        public string? Premio { get; set; }
        public string? Reglamento { get; set; }
        public string? Estado { get; set; }
    }

    public sealed class InscripcionRequest
    {
        public string? Equipo { get; set; }
        public string? CapitanId { get; set; }
        public string? Telefono { get; set; }
        public bool? Pagado { get; set; }
    }

    public sealed class PartidoRequest
    {
        public string? Fase { get; set; }
        public string? EquipoA { get; set; }
        public string? EquipoB { get; set; }
        public string? Fecha { get; set; }
        public string? CanchaId { get; set; }
        public int? GolesA { get; set; }
        public int? GolesB { get; set; }
        public string? Ganador { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId)
    {
        var query = _db.Torneos.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(complejoId))
        {
            if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId))
                return StatusCode(403, new { error = "Sin permisos" });
            query = query.Where(t => t.ComplejoId == complejoId);
        }
        else
        {
            var ids = await ComplejoAccess.IdsAsync(_db, User);
            if (ids is not null)
            {
                if (ids.Count == 0)
                    return Ok(new { ok = true, torneos = Array.Empty<object>() });
                query = query.Where(t => ids.Contains(t.ComplejoId));
            }
        }

        var rows = await query
            .OrderByDescending(t => t.CreadoEn)
            .Select(t => new
            {
                t.Id,
                t.ComplejoId,
                t.Nombre,
                t.Deporte,
                t.FechaInicio,
                t.FechaFin,
                t.CostoInscripcion,
                t.CupoMax,
                t.Premio,
                t.Reglamento,
                t.Estado,
                t.CreadoEn,
                Inscripciones = t.Inscripciones.Count,
                Partidos = t.Partidos.Count
            })
            .ToListAsync();

        return Ok(new
        {
            ok = true,
            torneos = rows.Select(t => new
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
                CreadoEn = DtoFormat.Utc(t.CreadoEn),
                _count = new { inscripciones = t.Inscripciones, partidos = t.Partidos }
            })
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var torneo = await _db.Torneos.AsNoTracking()
            .Include(t => t.Inscripciones.OrderBy(i => i.CreadoEn))
            .Include(t => t.Partidos.OrderBy(p => p.Fecha))
            .FirstOrDefaultAsync(t => t.Id == id);
        if (torneo is null)
            return NotFound(new { error = "No encontrado" });
        if (!await ComplejoAccess.TieneAccesoAsync(_db, User, torneo.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        return Ok(new
        {
            ok = true,
            torneo = TorneoShape(torneo),
            inscripciones = torneo.Inscripciones.Select(InscripcionShape),
            partidos = torneo.Partidos.Select(PartidoShape)
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TorneoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { error = "Nombre requerido" });

        var inicio = ParseFecha(request.FechaInicio);
        if (inicio is null)
            return BadRequest(new { error = "fechaInicio inválida (yyyy-MM-dd)" });
        DateTime? fin = null;
        if (!string.IsNullOrWhiteSpace(request.FechaFin))
        {
            fin = ParseFecha(request.FechaFin);
            if (fin is null)
                return BadRequest(new { error = "fechaFin inválida (yyyy-MM-dd)" });
            if (fin < inicio)
                return BadRequest(new { error = "fechaFin debe ser posterior a fechaInicio" });
        }

        var deporte = TipoCancha.FUTBOL7;
        if (!string.IsNullOrWhiteSpace(request.Deporte) &&
            !Enum.TryParse<TipoCancha>(request.Deporte, ignoreCase: true, out deporte))
            return BadRequest(new { error = "Deporte inválido" });

        if (request.CostoInscripcion is not null && request.CostoInscripcion < 0)
            return BadRequest(new { error = "Costo de inscripción inválido" });
        if (request.CupoMax is not null && request.CupoMax <= 0)
            return BadRequest(new { error = "Cupo máximo inválido" });

        var existe = await _db.Complejos.AsNoTracking()
            .AnyAsync(c => c.Id == request.ComplejoId);
        if (!existe)
            return BadRequest(new { error = "Complejo no encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, request.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        var torneo = new Torneo
        {
            Id = JwtService.NewId(),
            ComplejoId = request.ComplejoId,
            Nombre = request.Nombre.Trim(),
            Deporte = deporte,
            FechaInicio = inicio.Value,
            FechaFin = fin,
            CostoInscripcion = request.CostoInscripcion ?? 0m,
            CupoMax = request.CupoMax ?? 16,
            Premio = string.IsNullOrWhiteSpace(request.Premio) ? null : request.Premio.Trim(),
            Reglamento = string.IsNullOrWhiteSpace(request.Reglamento) ? null : request.Reglamento.Trim(),
            Estado = EstadoTorneo.BORRADOR,
            CreadoEn = DateTime.UtcNow
        };
        _db.Torneos.Add(torneo);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, torneo = TorneoShape(torneo) });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] TorneoRequest request)
    {
        var torneo = await _db.Torneos.FirstOrDefaultAsync(t => t.Id == id);
        if (torneo is null)
            return NotFound(new { error = "No encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, torneo.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            torneo.Nombre = request.Nombre.Trim();
        if (!string.IsNullOrWhiteSpace(request.Deporte))
        {
            if (!Enum.TryParse<TipoCancha>(request.Deporte, ignoreCase: true, out var deporte))
                return BadRequest(new { error = "Deporte inválido" });
            torneo.Deporte = deporte;
        }
        if (!string.IsNullOrWhiteSpace(request.FechaInicio))
        {
            var inicio = ParseFecha(request.FechaInicio);
            if (inicio is null)
                return BadRequest(new { error = "fechaInicio inválida (yyyy-MM-dd)" });
            torneo.FechaInicio = inicio.Value;
        }
        if (request.FechaFin is not null)
        {
            if (string.IsNullOrWhiteSpace(request.FechaFin))
                torneo.FechaFin = null;
            else
            {
                var fin = ParseFecha(request.FechaFin);
                if (fin is null)
                    return BadRequest(new { error = "fechaFin inválida (yyyy-MM-dd)" });
                torneo.FechaFin = fin;
            }
        }
        if (torneo.FechaFin.HasValue && torneo.FechaFin < torneo.FechaInicio)
            return BadRequest(new { error = "fechaFin debe ser posterior a fechaInicio" });
        if (request.CostoInscripcion is not null)
        {
            if (request.CostoInscripcion < 0)
                return BadRequest(new { error = "Costo de inscripción inválido" });
            torneo.CostoInscripcion = request.CostoInscripcion.Value;
        }
        if (request.CupoMax is not null)
        {
            if (request.CupoMax <= 0)
                return BadRequest(new { error = "Cupo máximo inválido" });
            torneo.CupoMax = request.CupoMax.Value;
        }
        if (request.Premio is not null)
            torneo.Premio = string.IsNullOrWhiteSpace(request.Premio) ? null : request.Premio.Trim();
        if (request.Reglamento is not null)
            torneo.Reglamento = string.IsNullOrWhiteSpace(request.Reglamento) ? null : request.Reglamento.Trim();
        if (!string.IsNullOrWhiteSpace(request.Estado))
        {
            if (!Enum.TryParse<EstadoTorneo>(request.Estado, ignoreCase: true, out var estado))
                return BadRequest(new { error = "Estado inválido" });
            torneo.Estado = estado;
        }

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, torneo = TorneoShape(torneo) });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var torneo = await _db.Torneos.FirstOrDefaultAsync(t => t.Id == id);
        if (torneo is null)
            return Ok(new { ok = true });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, torneo.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        _db.Torneos.Remove(torneo);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpPost("{id}/inscripciones")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Inscribir(string id, [FromBody] InscripcionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Equipo))
            return BadRequest(new { error = "Nombre del equipo requerido" });

        var torneo = await _db.Torneos.FirstOrDefaultAsync(t => t.Id == id);
        if (torneo is null)
            return NotFound(new { error = "Torneo no encontrado" });
        // Recepción puede inscribir equipos de su sede; resto requiere acceso.
        if (!await ComplejoAccess.TieneAccesoAsync(_db, User, torneo.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        var inscritos = await _db.InscripcionesTorneo.AsNoTracking()
            .CountAsync(i => i.TorneoId == id);
        if (inscritos >= torneo.CupoMax)
            return Conflict(new { error = "Cupo máximo alcanzado" });

        var capitanId = string.IsNullOrWhiteSpace(request.CapitanId)
            ? Security.PrincipalExtensions.IdOrEmpty(User)
            : request.CapitanId.Trim();
        var capitanExiste = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == capitanId);
        if (!capitanExiste)
            return BadRequest(new { error = "Capitán no encontrado" });

        var insc = new InscripcionTorneo
        {
            Id = JwtService.NewId(),
            TorneoId = id,
            Equipo = request.Equipo.Trim(),
            CapitanId = capitanId,
            Telefono = string.IsNullOrWhiteSpace(request.Telefono) ? null : request.Telefono.Trim(),
            Pagado = request.Pagado ?? false,
            CreadoEn = DateTime.UtcNow
        };
        _db.InscripcionesTorneo.Add(insc);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "Ese equipo ya está inscrito" });
        }

        return StatusCode(201, new { ok = true, inscripcion = InscripcionShape(insc) });
    }

    [HttpPost("{id}/partidos")]
    public async Task<IActionResult> CrearPartido(string id, [FromBody] PartidoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.EquipoA) || string.IsNullOrWhiteSpace(request.EquipoB))
            return BadRequest(new { error = "Ambos equipos son requeridos" });
        if (request.EquipoA.Trim() == request.EquipoB.Trim())
            return BadRequest(new { error = "Los equipos deben ser distintos" });

        var torneo = await _db.Torneos.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (torneo is null)
            return NotFound(new { error = "Torneo no encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, torneo.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        DateTime? fecha = null;
        if (!string.IsNullOrWhiteSpace(request.Fecha))
        {
            if (!DateTime.TryParse(request.Fecha, CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind, out var parsed))
                return BadRequest(new { error = "Fecha inválida" });
            fecha = parsed;
        }
        if (!string.IsNullOrWhiteSpace(request.CanchaId))
        {
            var existe = await _db.Canchas.AsNoTracking()
                .AnyAsync(c => c.Id == request.CanchaId);
            if (!existe)
                return BadRequest(new { error = "Cancha no encontrada" });
        }

        var partido = new PartidoTorneo
        {
            Id = JwtService.NewId(),
            TorneoId = id,
            Fase = string.IsNullOrWhiteSpace(request.Fase) ? "Grupos" : request.Fase.Trim(),
            EquipoA = request.EquipoA.Trim(),
            EquipoB = request.EquipoB.Trim(),
            Fecha = fecha,
            CanchaId = string.IsNullOrWhiteSpace(request.CanchaId) ? null : request.CanchaId
        };
        if (request.GolesA is not null)
        {
            if (request.GolesA < 0) return BadRequest(new { error = "Goles inválidos" });
            partido.GolesA = request.GolesA;
        }
        if (request.GolesB is not null)
        {
            if (request.GolesB < 0) return BadRequest(new { error = "Goles inválidos" });
            partido.GolesB = request.GolesB;
        }
        partido.Ganador = string.IsNullOrWhiteSpace(request.Ganador)
            ? CalcularGanador(partido)
            : request.Ganador.Trim();
        _db.PartidosTorneo.Add(partido);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, partido = PartidoShape(partido) });
    }

    [HttpPut("partidos/{partidoId}")]
    public async Task<IActionResult> ActualizarPartido(string partidoId, [FromBody] PartidoRequest request)
    {
        var partido = await _db.PartidosTorneo.FirstOrDefaultAsync(p => p.Id == partidoId);
        if (partido is null)
            return NotFound(new { error = "Partido no encontrado" });
        var torneoDelPartido = await _db.Torneos.AsNoTracking().FirstOrDefaultAsync(t => t.Id == partido.TorneoId);
        if (torneoDelPartido is null)
            return NotFound(new { error = "Torneo no encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, torneoDelPartido.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        if (!string.IsNullOrWhiteSpace(request.Fase))
            partido.Fase = request.Fase.Trim();
        if (!string.IsNullOrWhiteSpace(request.EquipoA))
            partido.EquipoA = request.EquipoA.Trim();
        if (!string.IsNullOrWhiteSpace(request.EquipoB))
            partido.EquipoB = request.EquipoB.Trim();
        if (request.Fecha is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Fecha))
                partido.Fecha = null;
            else if (DateTime.TryParse(request.Fecha, CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind, out var parsed))
                partido.Fecha = parsed;
            else
                return BadRequest(new { error = "Fecha inválida" });
        }
        if (request.CanchaId is not null)
            partido.CanchaId = string.IsNullOrWhiteSpace(request.CanchaId) ? null : request.CanchaId;
        if (request.GolesA is not null)
        {
            if (request.GolesA < 0)
                return BadRequest(new { error = "Goles inválidos" });
            partido.GolesA = request.GolesA;
        }
        if (request.GolesB is not null)
        {
            if (request.GolesB < 0)
                return BadRequest(new { error = "Goles inválidos" });
            partido.GolesB = request.GolesB;
        }

        if (!string.IsNullOrWhiteSpace(request.Ganador))
            partido.Ganador = request.Ganador.Trim();
        else if (request.GolesA is not null || request.GolesB is not null)
            partido.Ganador = CalcularGanador(partido);

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, partido = PartidoShape(partido) });
    }

    private static string? CalcularGanador(PartidoTorneo p)
    {
        if (!p.GolesA.HasValue || !p.GolesB.HasValue)
            return p.Ganador;
        if (p.GolesA > p.GolesB) return p.EquipoA;
        if (p.GolesB > p.GolesA) return p.EquipoB;
        return "EMPATE";
    }

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

    private static DateTime? ParseFecha(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (DateTime.TryParseExact(value.Trim(), "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
            return DateTime.SpecifyKind(exact.Date, DateTimeKind.Unspecified);
        return null;
    }
}
