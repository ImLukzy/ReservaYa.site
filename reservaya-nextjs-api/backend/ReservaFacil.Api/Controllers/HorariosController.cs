using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// Horario operativo semanal Lun-Dom por complejo (override opcional por cancha).
// Se genera 08:00-21:00 automáticamente con la primera reserva del complejo
// y desde entonces valida nuevas reservas. Sin horario: sin validación.
[ApiController]
[Route("api/horarios")]
[Authorize]
public class HorariosController : ControllerBase
{
    public const int AperturaDefecto = 8 * 60;
    public const int CierreDefecto = 21 * 60;

    private readonly AppDbContext _db;

    public HorariosController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class DiaRequest
    {
        public int Dia { get; set; }
        public int? Apertura { get; set; }
        public int? Cierre { get; set; }
        public bool? Activo { get; set; }
    }

    public sealed class HorarioRequest
    {
        public string? ComplejoId { get; set; }
        public string? CanchaId { get; set; }
        public List<DiaRequest>? Dias { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId, [FromQuery] string? canchaId)
    {
        if (string.IsNullOrWhiteSpace(complejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        var query = _db.Horarios.AsNoTracking().Where(h => h.ComplejoId == complejoId);
        if (!string.IsNullOrWhiteSpace(canchaId))
            query = query.Where(h => h.CanchaId == canchaId);

        var rows = await query.OrderBy(h => h.CanchaId).ThenBy(h => h.DiaSemana).ToListAsync();
        return Ok(new
        {
            ok = true,
            horarios = rows.Select(h => new
            {
                h.Id,
                h.ComplejoId,
                h.CanchaId,
                h.DiaSemana,
                Dia = NombreDia(h.DiaSemana),
                h.AperturaMin,
                h.CierreMin,
                Apertura = $"{h.AperturaMin / 60:D2}:{h.AperturaMin % 60:D2}",
                Cierre = $"{h.CierreMin / 60:D2}:{h.CierreMin % 60:D2}",
                h.Activo
            })
        });
    }

    // Reemplaza el horario del alcance (complejo o cancha). Solo dueño/plataforma.
    [HttpPut]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Reemplazar([FromBody] HorarioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, request.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });
        if (request.Dias is null || request.Dias.Count == 0)
            return BadRequest(new { error = "Envía al menos un día" });

        var canchaId = string.IsNullOrWhiteSpace(request.CanchaId) ? null : request.CanchaId.Trim();
        if (canchaId is not null)
        {
            var ok = await _db.Canchas.AsNoTracking()
                .AnyAsync(c => c.Id == canchaId && c.ComplejoId == request.ComplejoId);
            if (!ok)
                return BadRequest(new { error = "La cancha no es de ese complejo" });
        }

        var vistos = new HashSet<int>();
        foreach (var d in request.Dias)
        {
            if (d.Dia < 0 || d.Dia > 6)
                return BadRequest(new { error = "Día inválido (0 = domingo, 6 = sábado)" });
            if (!vistos.Add(d.Dia))
                return BadRequest(new { error = "Día duplicado" });
            var ap = d.Apertura ?? AperturaDefecto;
            var ci = d.Cierre ?? CierreDefecto;
            if (ap < 0 || ap >= 1440 || ci < 1 || ci > 1440 || ci <= ap)
                return BadRequest(new { error = $"Horario inválido el día {d.Dia}" });
        }

        var viejos = await _db.Horarios
            .Where(h => h.ComplejoId == request.ComplejoId && h.CanchaId == canchaId)
            .ToListAsync();
        _db.Horarios.RemoveRange(viejos);
        foreach (var d in request.Dias)
        {
            _db.Horarios.Add(new HorarioOperativo
            {
                Id = JwtService.NewId(),
                ComplejoId = request.ComplejoId,
                CanchaId = canchaId,
                DiaSemana = d.Dia,
                AperturaMin = d.Apertura ?? AperturaDefecto,
                CierreMin = d.Cierre ?? CierreDefecto,
                Activo = d.Activo ?? true,
                CreadoEn = DateTime.UtcNow
            });
        }
        await _db.SaveChangesAsync();

        return Ok(new { ok = true });
    }

    // Genera Lun-Dom 08:00-21:00 si el complejo aún no tiene horario.
    // Lo llama Crear reserva (también sirve para backfill).
    internal static async Task AsegurarHorarioAsync(AppDbContext db, string complejoId)
    {
        var existe = await db.Horarios.AsNoTracking()
            .AnyAsync(h => h.ComplejoId == complejoId && h.CanchaId == null);
        if (existe)
            return;
        var ahora = DateTime.UtcNow;
        for (var dia = 0; dia <= 6; dia++)
        {
            db.Horarios.Add(new HorarioOperativo
            {
                Id = JwtService.NewId(),
                ComplejoId = complejoId,
                CanchaId = null,
                DiaSemana = dia,
                AperturaMin = AperturaDefecto,
                CierreMin = CierreDefecto,
                Activo = true,
                CreadoEn = ahora
            });
        }
        await db.SaveChangesAsync();
    }

    // null = sin horario aplicable (sin validación). Si hay horario, valida y
    // devuelve mensaje de error o null si el slot encaja.
    internal static async Task<string?> ValidarSlotAsync(
        AppDbContext db, string? complejoId, string? canchaId,
        DateTime fecha, int inicio, int fin)
    {
        if (complejoId is null)
            return null;
        List<HorarioOperativo> filas;
        if (canchaId is not null)
        {
            filas = await db.Horarios.AsNoTracking()
                .Where(h => h.ComplejoId == complejoId && h.CanchaId == canchaId)
                .ToListAsync();
        }
        else
            filas = new List<HorarioOperativo>();
        if (filas.Count == 0)
        {
            filas = await db.Horarios.AsNoTracking()
                .Where(h => h.ComplejoId == complejoId && h.CanchaId == null)
                .ToListAsync();
        }
        if (filas.Count == 0)
            return null;

        var dia = filas.FirstOrDefault(h => h.DiaSemana == (int)fecha.DayOfWeek);
        if (dia is null || !dia.Activo)
            return $"Cerrado ese día ({NombreDia((int)fecha.DayOfWeek)})";
        if (inicio < dia.AperturaMin || fin > dia.CierreMin)
            return $"Fuera de horario ({dia.AperturaMin / 60:D2}:{dia.AperturaMin % 60:D2}–{dia.CierreMin / 60:D2}:{dia.CierreMin % 60:D2})";
        return null;
    }

    internal static string NombreDia(int dia) => dia switch
    {
        0 => "Domingo",
        1 => "Lunes",
        2 => "Martes",
        3 => "Miércoles",
        4 => "Jueves",
        5 => "Viernes",
        _ => "Sábado",
    };
}
