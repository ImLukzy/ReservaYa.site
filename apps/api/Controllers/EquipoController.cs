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
[Route("api/equipo")]
[Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
public class EquipoController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly EmailQueue _emailQueue;
    private readonly PasswordResetOptions _resetOptions;
    private readonly IRateLimiter _rateLimiter;

    public EquipoController(AppDbContext db, EmailQueue emailQueue, PasswordResetOptions resetOptions, IRateLimiter rateLimiter)
    {
        _db = db;
        _emailQueue = emailQueue;
        _resetOptions = resetOptions;
        _rateLimiter = rateLimiter;
    }

    // Cada invitación puede enviar un correo: tope por dueño y por destinatario
    // para que el endpoint no sirva para mandar spam.
    private bool PuedeEnviarCorreo(string email) =>
        !_rateLimiter.IsLimited($"invitar-correo:{email}", 3, TimeSpan.FromDays(1));

    public sealed class MiembroRequest
    {
        public string? ComplejoId { get; set; }
        public string? Email { get; set; }
        public string? Nombre { get; set; }
        public string? RolSede { get; set; }
        public bool? Activo { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId)
    {
        if (string.IsNullOrWhiteSpace(complejoId))
            return BadRequest(new { error = "complejoId es requerido" });

        var existe = await _db.Complejos.AsNoTracking()
            .AnyAsync(c => c.Id == complejoId);
        if (!existe)
            return NotFound(new { error = "Complejo no encontrado" });
        if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        var miembros = await _db.ComplejoMiembros.AsNoTracking()
            .Include(m => m.Usuario)
            .Where(m => m.ComplejoId == complejoId)
            .OrderByDescending(m => m.CreadoEn)
            .ToListAsync();

        return Ok(new { ok = true, equipo = miembros.Select(MiembroShape) });
    }

    // Invitar: crea una membresía pendiente (Activo=false). El rol del
    // invitado no cambia hasta que acepte (POST /api/invitaciones/{id}/aceptar).
    [HttpPost]
    public async Task<IActionResult> Invitar([FromBody] MiembroRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email requerido" });

        var complejo = await _db.Complejos.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ComplejoId);
        if (complejo is null)
            return NotFound(new { error = "Complejo no encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, complejo.Id))
            return StatusCode(403, new { error = "Sin permisos" });

        var rolSede = Rol.ADMIN;
        if (!string.IsNullOrWhiteSpace(request.RolSede))
        {
            if (!Enum.TryParse<Rol>(request.RolSede, ignoreCase: true, out rolSede) ||
                rolSede != Rol.ADMIN)
                return BadRequest(new { error = "rolSede inválido (solo ADMIN: el equipo opera con rol admin)" });
        }

        if (_rateLimiter.IsLimited($"invitar:{User.IdOrEmpty()}", 30, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiadas invitaciones seguidas. Espera un rato e inténtalo de nuevo." });

        var email = request.Email.Trim().ToLowerInvariant();
        var invitador = await _db.Usuarios.AsNoTracking()
            .Where(u => u.Id == User.IdOrEmpty()).Select(u => u.Nombre).FirstOrDefaultAsync() ?? "Un dueño";
        var baseUrl = InvitacionEmail.UrlPublica(_resetOptions);

        var usuario = await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
        if (usuario is null)
        {
            // Sin cuenta: no se crea ninguna; se le invita a registrarse.
            var enCola = PuedeEnviarCorreo(email) &&
                _emailQueue.Enqueue(InvitacionEmail.Registro(email, invitador, complejo.Nombre, baseUrl));
            return NotFound(new
            {
                error = "Esa persona aún no tiene cuenta; le enviamos un correo para registrarse. Vuelve a invitarla cuando se registre.",
                codigo = "SIN_CUENTA",
                correoEnviado = enCola
            });
        }
        if (usuario.Id == User.IdOrEmpty())
            return UnprocessableEntity(new { error = "No puedes invitarte a ti mismo." });
        if (usuario.Rol is Rol.SUPERADMIN or Rol.TECNICO)
            return UnprocessableEntity(new { error = "Esa cuenta no puede unirse a un equipo (es dueño de un centro o personal de la plataforma)." });
        if (!usuario.Activo)
            return UnprocessableEntity(new { error = "Esa cuenta está desactivada." });
        // Un jugador con solicitud de centro en revisión sigue siendo USUARIO
        // (spec 55): volverlo ADMIN la sacaría de la cola del técnico.
        if (await _db.Complejos.AsNoTracking().AnyAsync(c => c.DuenoId == usuario.Id))
            return UnprocessableEntity(new { error = "Esa persona tiene un centro propio o una solicitud de centro en revisión." });

        var miembro = await _db.ComplejoMiembros
            .FirstOrDefaultAsync(m => m.UsuarioId == usuario.Id && m.ComplejoId == complejo.Id);
        if (miembro is { Activo: true })
            return Conflict(new { error = "Esa persona ya es parte del equipo." });
        if (miembro is not null)
        {
            // Idempotente: ya hay una invitación pendiente.
            miembro.Usuario = usuario;
            return Ok(new { ok = true, existente = true, miembro = MiembroShape(miembro) });
        }

        miembro = new ComplejoMiembro
        {
            Id = JwtService.NewId(),
            UsuarioId = usuario.Id,
            ComplejoId = complejo.Id,
            RolSede = rolSede,
            Activo = false,
            CreadoEn = DateTime.UtcNow
        };
        _db.ComplejoMiembros.Add(miembro);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            // Carrera: otra invitación simultánea ganó (unique usuarioId+complejoId).
            return Conflict(new { error = "Ya existe una invitación o membresía para esa persona." });
        }

        var correoEnviado = PuedeEnviarCorreo(email) && _emailQueue.Enqueue(
            InvitacionEmail.Aviso(usuario.Email, usuario.Nombre, invitador, complejo.Nombre, baseUrl));
        miembro.Usuario = usuario;
        return StatusCode(201, new { ok = true, existente = false, miembro = MiembroShape(miembro), correoEnviado });
    }

    // Solo cambia RolSede. El estado (pendiente/activo) lo deciden la
    // invitación y su aceptación; para quitar a alguien se usa DELETE.
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] MiembroRequest request)
    {
        var miembro = await _db.ComplejoMiembros
            .Include(m => m.Usuario)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (miembro is null)
            return NotFound(new { error = "No encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, miembro.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        if (request.Activo is not null)
            return BadRequest(new { error = "El estado no se edita: la persona acepta la invitación y para quitarla se usa DELETE /api/equipo/{id}." });
        if (!string.IsNullOrWhiteSpace(request.RolSede))
        {
            if (!Enum.TryParse<Rol>(request.RolSede, ignoreCase: true, out var rolSede) ||
                rolSede != Rol.ADMIN)
                return BadRequest(new { error = "rolSede inválido (solo ADMIN: el equipo opera con rol admin)" });
            miembro.RolSede = rolSede;
        }

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, miembro = MiembroShape(miembro) });
    }

    // Quita a un miembro activo o cancela una invitación pendiente: siempre
    // borra el registro (Activo=false significa solo "pendiente").
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var miembro = await _db.ComplejoMiembros.FirstOrDefaultAsync(m => m.Id == id);
        if (miembro is null)
            return Ok(new { ok = true });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, miembro.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        var eraActivo = miembro.Activo;
        _db.ComplejoMiembros.Remove(miembro);
        await _db.SaveChangesAsync();
        // Salir del equipo revoca el dashboard admin (si no tiene otra sede).
        // Una invitación pendiente nunca cambió el rol: nada que revocar.
        if (eraActivo)
            await ReconciliarRolAsync(miembro.UsuarioId);
        return Ok(new { ok = true });
    }

    // Salir del equipo revoca el dashboard admin, salvo que tenga otra sede
    // activa o sea dueño de algún complejo. Solo baja ADMIN→USUARIO (nunca
    // sube ni toca SUPERADMIN/TECNICO). Invalida la sesión si el rol cambió.
    private async Task ReconciliarRolAsync(string usuarioId)
    {
        var u = await _db.Usuarios.FirstOrDefaultAsync(x => x.Id == usuarioId);
        if (u is null || u.Rol != Rol.ADMIN)
            return;
        var sigue = await _db.ComplejoMiembros.AsNoTracking()
                .AnyAsync(m => m.UsuarioId == usuarioId && m.Activo) ||
            await _db.Complejos.AsNoTracking().AnyAsync(c => c.DuenoId == usuarioId);
        if (sigue)
            return;
        u.Rol = Rol.USUARIO;
        u.TokenVersion += 1;
        await _db.SaveChangesAsync();
    }

    private static object MiembroShape(ComplejoMiembro m) => new
    {
        m.Id,
        m.ComplejoId,
        m.RolSede,
        m.Activo,
        Estado = m.Activo ? "ACTIVO" : "PENDIENTE",
        CreadoEn = DtoFormat.Utc(m.CreadoEn),
        Usuario = m.Usuario is null
            ? null
            : new { m.Usuario.Id, m.Usuario.Nombre, m.Usuario.Email, m.Usuario.Rol, m.Usuario.Activo }
    };
}
