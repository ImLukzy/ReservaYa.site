using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// Metas comerciales del complejo. Consume el panel /admin/metas (CRUD real).
[ApiController]
[Route("api/metas")]
[Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
public class MetasController : ControllerBase
{
    private readonly AppDbContext _db;

    public MetasController(AppDbContext db)
    {
        _db = db;
    }

    private Task<string?> ComplejoDelUsuarioAsync() =>
        ComplejoAccess.PrimeroAsync(_db, User);

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

    private static DateTime? ParseFecha(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (DateTime.TryParseExact(value.Trim(), "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
            return DateTime.SpecifyKind(exact.Date, DateTimeKind.Unspecified);
        return null;
    }

    // GET /api/metas — metas del complejo.
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return Ok(new { metas = Array.Empty<object>() });

        var metas = await _db.Metas.AsNoTracking()
            .Where(m => m.ComplejoId == complejoId)
            .OrderBy(m => m.PeriodoFin)
            .ToListAsync();

        return Ok(new { metas = metas.Select(MetaJson) });
    }

    public class MetaRequest
    {
        public string? Titulo { get; set; }
        public string? Tipo { get; set; }
        public decimal? Objetivo { get; set; }
        public decimal? Actual { get; set; }
        public string? PeriodoInicio { get; set; }
        public string? PeriodoFin { get; set; }
    }

    // POST /api/metas — { titulo, tipo INGRESOS/OCUPACION/RESERVAS, objetivo, periodoInicio, periodoFin }.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MetaRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return BadRequest(new { error = "Primero crea tu complejo para definir metas" });
        if (string.IsNullOrWhiteSpace(request.Titulo))
            return BadRequest(new { error = "El título es obligatorio" });
        if (!Enum.TryParse<TipoMeta>(request.Tipo ?? "", ignoreCase: true, out var tipo))
            return BadRequest(new { error = "Tipo inválido: usa INGRESOS, OCUPACION o RESERVAS" });
        if (request.Objetivo is null || request.Objetivo <= 0)
            return BadRequest(new { error = "El objetivo debe ser mayor que cero" });

        var inicio = ParseFecha(request.PeriodoInicio);
        var fin = ParseFecha(request.PeriodoFin);
        if (inicio is null || fin is null)
            return BadRequest(new { error = "Indica el periodo con fechas válidas (aaaa-mm-dd)" });
        if (fin < inicio)
            return BadRequest(new { error = "La fecha de fin debe ser posterior a la de inicio" });

        var meta = new Meta
        {
            Id = JwtService.NewId(),
            ComplejoId = complejoId,
            Titulo = request.Titulo.Trim(),
            Tipo = tipo,
            Objetivo = Math.Round(request.Objetivo.Value, 2, MidpointRounding.AwayFromZero),
            Actual = 0,
            PeriodoInicio = inicio.Value,
            PeriodoFin = fin.Value
        };
        _db.Metas.Add(meta);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, meta = MetaJson(meta) });
    }

    // PATCH /api/metas/{id} — actualiza título, tipo, objetivo, avance o periodo.
    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(string id, [FromBody] MetaRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        var meta = await _db.Metas
            .FirstOrDefaultAsync(m => m.Id == id && (complejoId == null || m.ComplejoId == complejoId));
        if (meta is null)
            return NotFound(new { error = "Meta no encontrada" });

        if (!string.IsNullOrWhiteSpace(request.Titulo))
            meta.Titulo = request.Titulo.Trim();
        if (request.Tipo is not null)
        {
            if (!Enum.TryParse<TipoMeta>(request.Tipo, ignoreCase: true, out var tipo))
                return BadRequest(new { error = "Tipo inválido: usa INGRESOS, OCUPACION o RESERVAS" });
            meta.Tipo = tipo;
        }
        if (request.Objetivo is not null)
        {
            if (request.Objetivo <= 0)
                return BadRequest(new { error = "El objetivo debe ser mayor que cero" });
            meta.Objetivo = Math.Round(request.Objetivo.Value, 2, MidpointRounding.AwayFromZero);
        }
        if (request.Actual is not null)
        {
            if (request.Actual < 0)
                return BadRequest(new { error = "El avance no puede ser negativo" });
            meta.Actual = Math.Round(request.Actual.Value, 2, MidpointRounding.AwayFromZero);
        }
        if (request.PeriodoInicio is not null)
        {
            var inicio = ParseFecha(request.PeriodoInicio);
            if (inicio is null)
                return BadRequest(new { error = "Fecha de inicio inválida (aaaa-mm-dd)" });
            meta.PeriodoInicio = inicio.Value;
        }
        if (request.PeriodoFin is not null)
        {
            var fin = ParseFecha(request.PeriodoFin);
            if (fin is null)
                return BadRequest(new { error = "Fecha de fin inválida (aaaa-mm-dd)" });
            meta.PeriodoFin = fin.Value;
        }
        if (meta.PeriodoFin < meta.PeriodoInicio)
            return BadRequest(new { error = "La fecha de fin debe ser posterior a la de inicio" });

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, meta = MetaJson(meta) });
    }

    // DELETE /api/metas/{id}.
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        var meta = await _db.Metas
            .FirstOrDefaultAsync(m => m.Id == id && (complejoId == null || m.ComplejoId == complejoId));
        if (meta is null)
            return Ok(new { ok = true });

        _db.Metas.Remove(meta);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
