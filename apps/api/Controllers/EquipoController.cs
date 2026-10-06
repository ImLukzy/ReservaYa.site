using Bcrypt = BCrypt.Net.BCrypt;
using System.Security.Cryptography;
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

    public EquipoController(AppDbContext db)
    {
        _db = db;
    }

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

    [HttpPost]
    public async Task<IActionResult> Agregar([FromBody] MiembroRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email requerido" });

        var existe = await _db.Complejos.AsNoTracking()
            .AnyAsync(c => c.Id == request.ComplejoId);
        if (!existe)
            return NotFound(new { error = "Complejo no encontrado" });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, request.ComplejoId!))
            return StatusCode(403, new { error = "Sin permisos" });

        var rolSede = Rol.ADMIN;
        if (!string.IsNullOrWhiteSpace(request.RolSede))
        {
            if (!Enum.TryParse<Rol>(request.RolSede, ignoreCase: true, out rolSede) ||
                rolSede != Rol.ADMIN)
                return BadRequest(new { error = "rolSede inválido (solo ADMIN: el equipo opera con rol admin)" });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
        string? passwordTemporal = null;

        if (usuario is null)
        {
            passwordTemporal = Convert.ToHexString(RandomNumberGenerator.GetBytes(6));
            usuario = new Usuario
            {
                Id = JwtService.NewId(),
                Nombre = string.IsNullOrWhiteSpace(request.Nombre)
                    ? email.Split('@')[0]
                    : request.Nombre.Trim(),
                Email = email,
                Password = Bcrypt.HashPassword(passwordTemporal, 10),
                Rol = Rol.ADMIN,
                Activo = true,
                TokenVersion = 0,
                CreadoEn = DateTime.UtcNow
            };
            _db.Usuarios.Add(usuario);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is PostgresException { SqlState: "23505" })
            {
                // Carrera: otro request creó el usuario. Releer.
                usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
                passwordTemporal = null;
                if (usuario is null)
                    return Conflict(new { error = "El email ya está registrado" });
            }
        }

        var miembro = await _db.ComplejoMiembros
            .FirstOrDefaultAsync(m => m.UsuarioId == usuario.Id && m.ComplejoId == request.ComplejoId);
        if (miembro is not null)
        {
            // Idempotente por unique(usuarioId, complejoId): reactivar y listo.
            miembro.Activo = true;
            miembro.RolSede = rolSede;
            await ActivarRolAdminAsync(usuario.Id);
            await _db.SaveChangesAsync();
            miembro.Usuario = usuario;
            return Ok(new
            {
                ok = true,
                existente = true,
                miembro = MiembroShape(miembro)
            });
        }

        miembro = new ComplejoMiembro
        {
            Id = JwtService.NewId(),
            UsuarioId = usuario.Id,
            ComplejoId = request.ComplejoId,
            RolSede = rolSede,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };
        _db.ComplejoMiembros.Add(miembro);
        // Ser del equipo activa el dashboard admin (alcance: este local).
        await ActivarRolAdminAsync(usuario.Id);
        await _db.SaveChangesAsync();

        miembro.Usuario = usuario;
        return StatusCode(201, new
        {
            ok = true,
            existente = false,
            miembro = MiembroShape(miembro),
            passwordTemporal,
            usuarioNuevo = passwordTemporal is not null
        });
    }

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
            miembro.Activo = request.Activo.Value;
        if (!string.IsNullOrWhiteSpace(request.RolSede))
        {
            if (!Enum.TryParse<Rol>(request.RolSede, ignoreCase: true, out var rolSede) ||
                rolSede != Rol.ADMIN)
                return BadRequest(new { error = "rolSede inválido (solo ADMIN: el equipo opera con rol admin)" });
            miembro.RolSede = rolSede;
        }

        await _db.SaveChangesAsync();
        if (request.Activo == false)
            await ReconciliarRolAsync(miembro.UsuarioId);
        return Ok(new { ok = true, miembro = MiembroShape(miembro) });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var miembro = await _db.ComplejoMiembros.FirstOrDefaultAsync(m => m.Id == id);
        if (miembro is null)
            return Ok(new { ok = true });
        if (!await ComplejoAccess.EsDuenoAsync(_db, User, miembro.ComplejoId))
            return StatusCode(403, new { error = "Sin permisos" });

        _db.ComplejoMiembros.Remove(miembro);
        await _db.SaveChangesAsync();
        // Salir del equipo revoca el dashboard admin (si no tiene otra sede).
        await ReconciliarRolAsync(miembro.UsuarioId);
        return Ok(new { ok = true });
    }

    // Entrar al equipo otorga rol ADMIN global (alcance real: sus sedes).
    // Invalida la sesión para que el próximo ingreso traiga el nuevo rol.
    private async Task ActivarRolAdminAsync(string usuarioId)
    {
        var u = await _db.Usuarios.FirstOrDefaultAsync(x => x.Id == usuarioId);
        if (u is null || u.Rol == Rol.SUPERADMIN || u.Rol == Rol.TECNICO || u.Rol == Rol.ADMIN)
            return;
        u.Rol = Rol.ADMIN;
        u.TokenVersion += 1;
    }

    // Salir del equipo (o desactivación) revoca el dashboard admin, salvo que
    // tenga otra sede activa o sea dueño de algún complejo. Nunca toca
    // SUPERADMIN/TECNICO. Invalida la sesión si el rol cambió.
    private async Task ReconciliarRolAsync(string usuarioId)
    {
        var u = await _db.Usuarios.FirstOrDefaultAsync(x => x.Id == usuarioId);
        if (u is null || u.Rol == Rol.SUPERADMIN || u.Rol == Rol.TECNICO)
            return;
        var sigue = await _db.ComplejoMiembros.AsNoTracking()
                .AnyAsync(m => m.UsuarioId == usuarioId && m.Activo) ||
            await _db.Complejos.AsNoTracking().AnyAsync(c => c.DuenoId == usuarioId);
        var nuevo = sigue ? Rol.ADMIN : Rol.USUARIO;
        if (u.Rol == nuevo)
            return;
        u.Rol = nuevo;
        u.TokenVersion += 1;
        await _db.SaveChangesAsync();
    }

    private static object MiembroShape(ComplejoMiembro m) => new
    {
        m.Id,
        m.ComplejoId,
        m.RolSede,
        m.Activo,
        CreadoEn = DtoFormat.Utc(m.CreadoEn),
        Usuario = m.Usuario is null
            ? null
            : new { m.Usuario.Id, m.Usuario.Nombre, m.Usuario.Email, m.Usuario.Rol, m.Usuario.Activo }
    };
}
