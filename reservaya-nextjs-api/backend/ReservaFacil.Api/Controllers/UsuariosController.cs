using Bcrypt = BCrypt.Net.BCrypt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;

namespace ReservaFacil.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
public class UsuariosController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsuariosController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "SUPERADMIN")]
    public async Task<IActionResult> List()
    {
        var usuarios = await _db.Usuarios.AsNoTracking()
            .OrderByDescending(u => u.CreadoEn)
            .Select(u => new
            {
                u.Id,
                u.Nombre,
                u.Email,
                u.Rol,
                u.Activo,
                u.CreadoEn,
                Reservas = u.Reservas.Count
            })
            .ToListAsync();

        var dto = usuarios.Select(u =>
            UsuarioResumenDto.From(u.Id, u.Nombre, u.Email, u.Rol, u.Activo, u.CreadoEn, u.Reservas));

        return Ok(new { usuarios = dto });
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "SUPERADMIN")]
    public async Task<IActionResult> Patch(string id, [FromBody] UsuarioPatchRequest request)
    {
        if (id == User.IdOrEmpty())
            return BadRequest(new { error = "No puedes modificar tu propia cuenta" });

        var nombre = string.IsNullOrWhiteSpace(request.Nombre) ? null : request.Nombre.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        var rol = string.IsNullOrWhiteSpace(request.Rol) ? null : request.Rol.Trim();
        var password = string.IsNullOrEmpty(request.Password) ? null : request.Password;

        if (nombre is null && email is null && rol is null &&
            request.Activo is null && password is null)
            return BadRequest(new { error = "No hay campos válidos para actualizar" });

        if (rol is not null &&
            (rol != "USUARIO" && rol != "ADMIN" && rol != "SUPERADMIN"))
            return BadRequest(new { error = "Rol inválido" });

        if (password is not null && password.Length < 6)
            return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres" });

        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == id);
        if (usuario is null)
            return NotFound(new { error = "Usuario no encontrado" });

        if (email is not null && email != usuario.Email)
        {
            var duplicado = await _db.Usuarios.AsNoTracking()
                .AnyAsync(u => u.Id != id && u.Email == email);
            if (duplicado)
                return Conflict(new { error = "El email ya está registrado" });
        }

        if (nombre is not null) usuario.Nombre = nombre;
        if (email is not null) usuario.Email = email;
        if (rol is not null) usuario.Rol = Enum.Parse<Rol>(rol);
        if (request.Activo is not null) usuario.Activo = request.Activo.Value;
        if (password is not null) usuario.Password = Bcrypt.HashPassword(password, 10);

        var invalidaSesion = rol is not null || request.Activo == false || password is not null;
        if (invalidaSesion)
            usuario.TokenVersion += 1;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "El email ya está registrado" });
        }

        return Ok(new
        {
            ok = true,
            usuario = new
            {
                usuario.Id,
                usuario.Nombre,
                usuario.Email,
                usuario.Rol,
                usuario.Activo
            }
        });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SUPERADMIN")]
    public async Task<IActionResult> Delete(string id)
    {
        if (id == User.IdOrEmpty())
            return BadRequest(new { error = "No puedes eliminarte a ti mismo" });

        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == id);
        if (usuario is null)
            return NotFound(new { error = "Usuario no encontrado" });

        _db.Usuarios.Remove(usuario);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23503" })
        {
            return Conflict(new
            {
                error = "No se puede eliminar: el usuario tiene reservas asociadas. Desactívalo en su lugar."
            });
        }

        return Ok(new { ok = true });
    }
}