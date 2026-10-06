using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

[ApiController]
[Route("api/resenas")]
[Authorize]
public class ResenasController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResenasController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class RespuestaRequest
    {
        public string? Respuesta { get; set; }
    }

    public sealed class ResenaRequest
    {
        public string? ComplejoId { get; set; }
        public int? Puntuacion { get; set; }
        public string? Comentario { get; set; }
    }

    // Lectura pública para la vitrina (promedio + comentarios). Solo locales
    // visibles (publicados con suscripción vigente).
    [HttpGet("publicas")]
    [AllowAnonymous]
    public async Task<IActionResult> Publicas([FromQuery] string? complejoId)
    {
        if (string.IsNullOrWhiteSpace(complejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (!(await ComplejoAccess.IdsVisiblesAsync(_db)).Contains(complejoId))
            return NotFound(new { error = "No encontrado" });

        var resenas = await _db.Resenas.AsNoTracking()
            .Include(r => r.Usuario)
            .Where(r => r.ComplejoId == complejoId)
            .OrderByDescending(r => r.CreadoEn)
            .ToListAsync();
        return Ok(new
        {
            ok = true,
            promedio = resenas.Count == 0 ? 0 : Math.Round(resenas.Average(r => r.Puntuacion), 1),
            total = resenas.Count,
            resenas = resenas.Select(ResenaPublicaShape)
        });
    }

    // Calificar tras la experiencia: solo quien completó una reserva en el
    // local. Crea o actualiza la reseña propia (una por jugador y local).
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] ResenaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (request.Puntuacion is null || request.Puntuacion < 1 || request.Puntuacion > 5)
            return BadRequest(new { error = "Puntuación de 1 a 5" });
        var comentario = string.IsNullOrWhiteSpace(request.Comentario)
            ? null : request.Comentario.Trim()[..Math.Min(500, request.Comentario.Trim().Length)];

        var complejoId = request.ComplejoId;
        var existe = await _db.Complejos.AsNoTracking().AnyAsync(c => c.Id == complejoId);
        if (!existe)
            return NotFound(new { error = "No encontrado" });

        var jugo = await _db.Reservas.AsNoTracking().AnyAsync(r =>
            r.UsuarioId == User.IdOrEmpty() && r.Estado == EstadoReserva.COMPLETADA &&
            (r.ComplejoId == complejoId || (r.Cancha != null && r.Cancha.ComplejoId == complejoId)));
        if (!jugo)
            return StatusCode(403, new { error = "Solo puedes calificar locales donde ya jugaste" });

        var resena = await _db.Resenas
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.ComplejoId == complejoId && r.UsuarioId == User.IdOrEmpty());
        if (resena is null)
        {
            resena = new Resena
            {
                Id = JwtService.NewId(),
                ComplejoId = complejoId,
                UsuarioId = User.IdOrEmpty(),
                Puntuacion = request.Puntuacion.Value,
                Comentario = comentario,
                CreadoEn = DateTime.UtcNow
            };
            _db.Resenas.Add(resena);
        }
        else
        {
            resena.Puntuacion = request.Puntuacion.Value;
            resena.Comentario = comentario;
        }
        await _db.SaveChangesAsync();
        return Ok(new { ok = true, resena = ResenaShape(resena) });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId)
    {
        var query = _db.Resenas.AsNoTracking()
            .Include(r => r.Usuario)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(complejoId))
        {
            if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId))
                return StatusCode(403, new { error = "Sin permisos" });
            query = query.Where(r => r.ComplejoId == complejoId);
        }
        else
        {
            // Sin filtro: solo el alcance propio (incluye emails de autores).
            var ids = await ComplejoAccess.IdsAsync(_db, User);
            if (ids is not null)
            {
                if (ids.Count == 0)
                    return Ok(new { ok = true, resenas = Array.Empty<object>() });
                query = query.Where(r => ids.Contains(r.ComplejoId));
            }
        }

        var resenas = await query
            .OrderByDescending(r => r.CreadoEn)
            .ToListAsync();

        return Ok(new { ok = true, resenas = resenas.Select(ResenaShape) });
    }

    [HttpPost("{id}/responder")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Responder(string id, [FromBody] RespuestaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Respuesta))
            return BadRequest(new { error = "Respuesta requerida" });

        var resena = await _db.Resenas
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (resena is null)
            return NotFound(new { error = "No encontrada" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, resena.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        resena.RespuestaDueno = request.Respuesta.Trim();
        await _db.SaveChangesAsync();

        return Ok(new { ok = true, resena = ResenaShape(resena) });
    }

    // Pública: sin emails de autores.
    private static object ResenaPublicaShape(Resena r) => new
    {
        r.Id,
        r.Puntuacion,
        r.Comentario,
        r.RespuestaDueno,
        CreadoEn = DtoFormat.Utc(r.CreadoEn),
        Usuario = r.Usuario is null ? null : new { r.Usuario.Id, r.Usuario.Nombre }
    };

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
}
