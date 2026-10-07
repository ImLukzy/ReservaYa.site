using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;

namespace ReservaFacil.Api.Controllers;

// Bandeja del invitado: una invitación de equipo es un ComplejoMiembro con
// Activo=false (sin migración). Aceptar la activa y da rol ADMIN; rechazar la
// borra. Solo el propio invitado ve y decide sus invitaciones.
[ApiController]
[Route("api/invitaciones")]
[Authorize]
public class InvitacionesController(AppDbContext db) : ControllerBase
{
    [HttpGet("mias")]
    public async Task<IActionResult> Mias(CancellationToken ct)
    {
        var mine = User.IdOrEmpty();
        var rows = await db.ComplejoMiembros.AsNoTracking()
            .Where(m => m.UsuarioId == mine && !m.Activo && m.Complejo != null)
            .OrderByDescending(m => m.CreadoEn)
            .Select(m => new
            {
                m.Id,
                m.CreadoEn,
                Complejo = new { m.Complejo!.Id, m.Complejo.Nombre, m.Complejo.Distrito },
                InvitadoPor = m.Complejo.Dueno == null ? null : m.Complejo.Dueno.Nombre
            })
            .ToListAsync(ct);

        return Ok(new
        {
            ok = true,
            invitaciones = rows.Select(r => new
            {
                r.Id,
                r.Complejo,
                InvitadoPor = r.InvitadoPor == null ? null : new { Nombre = r.InvitadoPor },
                CreadoEn = DtoFormat.Utc(r.CreadoEn)
            })
        });
    }

    [HttpPost("{id}/aceptar")]
    public async Task<IActionResult> Aceptar(string id, CancellationToken ct)
    {
        var mine = User.IdOrEmpty();
        var miembro = await db.ComplejoMiembros.Include(m => m.Complejo)
            .FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == mine && !m.Activo, ct);
        if (miembro is null)
            return NotFound(new { error = "La invitación ya no está disponible (quizá la cancelaron)." });

        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == mine, ct);
        if (usuario is null)
            return Unauthorized(new { error = "Sesión inválida" });
        if (usuario.Rol is Rol.SUPERADMIN or Rol.TECNICO)
            return Conflict(new { error = "Tu cuenta no puede unirse a un equipo (eres dueño de un centro o personal de la plataforma)." });
        if (await db.Complejos.AsNoTracking().AnyAsync(c => c.DuenoId == mine, ct))
            return Conflict(new { error = "Tienes una solicitud de centro en revisión; no puedes unirte a un equipo mientras tanto." });

        miembro.Activo = true;
        // Subida de privilegio: no incrementa TokenVersion (mismo criterio que
        // la aprobación de centros, spec 55). La web llama a
        // POST /api/auth/refrescar para reemitir la cookie con el rol de BD.
        if (usuario.Rol == Rol.USUARIO)
            usuario.Rol = Rol.ADMIN;
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            ok = true,
            complejo = new { miembro.Complejo!.Id, miembro.Complejo.Nombre },
            requiereRefrescarSesion = true
        });
    }

    [HttpPost("{id}/rechazar")]
    public async Task<IActionResult> Rechazar(string id, CancellationToken ct)
    {
        var mine = User.IdOrEmpty();
        var miembro = await db.ComplejoMiembros
            .FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == mine && !m.Activo, ct);
        if (miembro is null)
            return NotFound(new { error = "La invitación ya no está disponible." });

        // Rechazar borra la invitación; el rol nunca cambió.
        db.ComplejoMiembros.Remove(miembro);
        await db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
