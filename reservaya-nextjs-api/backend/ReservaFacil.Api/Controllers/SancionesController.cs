using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// Sanciones del dueño al jugador que reservó:
// ADVERTENCIA califica/amonesta (visible, no bloquea),
// BLOQUEO impide nuevas reservas y avisa en recepción al validar.
[ApiController]
[Route("api/sanciones")]
[Authorize(Roles = "SUPERADMIN,TECNICO")]
public class SancionesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SancionesController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class SancionRequest
    {
        public string? ComplejoId { get; set; }
        public string? UsuarioId { get; set; }
        public string? Nivel { get; set; }
        public string? Motivo { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId, [FromQuery] bool? soloActivas)
    {
        var query = _db.Sanciones.AsNoTracking()
            .Include(s => s.Usuario)
            .Include(s => s.Complejo)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(complejoId))
        {
            if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId))
                return StatusCode(403, new { error = "Sin permisos" });
            query = query.Where(s => s.ComplejoId == complejoId);
        }
        else if (User.RolOr() != Rol.TECNICO)
        {
            var ids = await ComplejoAccess.IdsPropiosAsync(_db, User);
            query = query.Where(s => ids.Contains(s.ComplejoId));
        }
        if (soloActivas == true)
            query = query.Where(s => s.Activa);

        var rows = await query.OrderByDescending(s => s.CreadoEn).Take(200).ToListAsync();
        return Ok(new { ok = true, sanciones = rows.Select(SancionShape) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SancionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId) ||
            string.IsNullOrWhiteSpace(request.UsuarioId) ||
            string.IsNullOrWhiteSpace(request.Motivo))
            return BadRequest(new { error = "complejoId, usuarioId y motivo son requeridos" });
        if (!Enum.TryParse<NivelSancion>(request.Nivel, ignoreCase: true, out var nivel))
            return BadRequest(new { error = "Nivel inválido (ADVERTENCIA, BLOQUEO)" });
        if (request.Motivo.Trim().Length < 3)
            return BadRequest(new { error = "Motivo requerido (mínimo 3 caracteres)" });

        if (!await ComplejoAccess.EsDuenoAsync(_db, User, request.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });
        var usuarioExiste = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == request.UsuarioId);
        if (!usuarioExiste)
            return BadRequest(new { error = "Usuario no encontrado" });

        var duplicada = await _db.Sanciones.AsNoTracking().AnyAsync(s =>
            s.ComplejoId == request.ComplejoId && s.UsuarioId == request.UsuarioId &&
            s.Nivel == nivel && s.Activa);
        if (duplicada)
            return Conflict(new { error = "Ya existe una sanción activa de ese nivel para este usuario" });

        var sancion = new Sancion
        {
            Id = JwtService.NewId(),
            ComplejoId = request.ComplejoId,
            UsuarioId = request.UsuarioId!,
            Nivel = nivel,
            Motivo = request.Motivo.Trim(),
            Activa = true,
            CreadoPorId = User.IdOrEmpty(),
            CreadoEn = DateTime.UtcNow
        };
        _db.Sanciones.Add(sancion);
        await _db.SaveChangesAsync();
        return StatusCode(201, new { ok = true, sancion = SancionShape(sancion) });
    }

    [HttpPatch("{id}/desactivar")]
    public async Task<IActionResult> Desactivar(string id)
    {
        var sancion = await _db.Sanciones.FirstOrDefaultAsync(s => s.Id == id);
        if (sancion is null)
            return NotFound(new { error = "No encontrada" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, sancion.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        sancion.Activa = false;
        await _db.SaveChangesAsync();
        return Ok(new { ok = true, sancion = SancionShape(sancion) });
    }

    internal static object SancionShape(Sancion s) => new
    {
        s.Id,
        s.ComplejoId,
        Complejo = s.Complejo != null ? s.Complejo.Nombre : "",
        s.UsuarioId,
        Usuario = s.Usuario != null ? new { s.Usuario.Id, s.Usuario.Nombre, s.Usuario.Email } : null,
        s.Nivel,
        s.Motivo,
        s.Activa,
        CreadoEn = DtoFormat.Utc(s.CreadoEn)
    };
}
