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
    private readonly IRateLimiter _rateLimiter;
    private readonly IWebHostEnvironment _env;

    public UsuariosController(AppDbContext db, IRateLimiter rateLimiter, IWebHostEnvironment env)
    {
        _db = db;
        _rateLimiter = rateLimiter;
        _env = env;
    }

    // Autocompletado público para el sorteador (/sortear): solo devuelve
    // id + nombre de usuarios activos (sin emails). Mínimo 2 letras, top 8.
    [HttpGet("buscar")]
    [AllowAnonymous]
    public async Task<IActionResult> Buscar([FromQuery] string q = "")
    {
        var forwarded = Request.Headers["X-Forwarded-For"].ToString();
        var clientIp = !string.IsNullOrEmpty(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (_rateLimiter.IsLimited($"buscar:{clientIp}", 30, TimeSpan.FromMinutes(1)))
            return StatusCode(429, new { error = "Demasiadas búsquedas. Intenta de nuevo en un momento." });

        var term = (q ?? "").Trim().TrimStart('@').Replace("%", "").Replace("_", "");
        if (term.Length < 2)
            return Ok(new { usuarios = Array.Empty<object>() });
        if (term.Length > 50)
            term = term[..50];

        var patron = $"%{term}%";
        // ILike = case-insensitive en Postgres (Like no encuentra "juan" vs "Juan").
        // Solo por nombre y username: buscar por email permitiría enumerar cuentas.
        var usuarios = await _db.Usuarios.AsNoTracking()
            .Where(u => u.Activo && (EF.Functions.ILike(u.Nombre, patron) ||
                (u.Username != null && EF.Functions.ILike(u.Username, patron))))
            .OrderBy(u => u.Nombre)
            .Take(8)
            .Select(u => new { u.Id, u.Nombre, Username = u.Username })
            .ToListAsync();

        return Ok(new { usuarios });
    }

    [HttpGet]
    [Authorize(Roles = "TECNICO")]
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

    // Clientes del dueño: usuarios que reservaron en su alcance (con conteos
    // y sanciones activas). TECNICO ve a todos los que tengan reservas.
    [HttpGet("clientes")]
    [Authorize(Roles = "SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Clientes()
    {
        var baseQ = _db.Usuarios.AsNoTracking().AsQueryable();
        if (User.RolOr() != Rol.TECNICO)
        {
            // Alcance estricto del dueño: propios + membresías (nunca "todo").
            var ids = await ComplejoAccess.IdsPropiosAsync(_db, User);
            if (ids.Count == 0)
                return Ok(new { ok = true, clientes = Array.Empty<object>() });
            var canchaIds = await _db.Canchas.AsNoTracking()
                .Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!))
                .Select(c => c.Id).ToListAsync();
            var userIds = await _db.Reservas.AsNoTracking()
                .Where(r => (r.ComplejoId != null && ids.Contains(r.ComplejoId!)) ||
                    (r.ComplejoId == null && canchaIds.Contains(r.CanchaId)))
                .Select(r => r.UsuarioId).Distinct().ToListAsync();
            if (userIds.Count == 0)
                return Ok(new { ok = true, clientes = Array.Empty<object>() });
            baseQ = baseQ.Where(u => userIds.Contains(u.Id));
        }

        var clientes = await baseQ
            .Where(u => u.Reservas.Any())
            .OrderByDescending(u => u.CreadoEn)
            .Select(u => new
            {
                u.Id,
                u.Nombre,
                u.Email,
                u.Rol,
                u.Activo,
                u.CreadoEn,
                Reservas = u.Reservas.Count,
                Confirmadas = u.Reservas.Count(r => r.Estado == EstadoReserva.CONFIRMADA),
                UltimaReserva = u.Reservas.Max(r => (DateTime?)r.Fecha),
                SancionesActivas = u.SancionesRecibidas.Count(s => s.Activa)
            })
            .Take(200)
            .ToListAsync();

        return Ok(new { ok = true, clientes });
    }

    // Historial de un usuario: reservas (+ sanciones). El dueño solo ve a
    // quienes reservaron en su alcance; TECNICO ve todo.
    [HttpGet("{id}/historial")]
    [Authorize(Roles = "SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Historial(string id)
    {
        var usuario = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);
        if (usuario is null)
            return NotFound(new { error = "Usuario no encontrado" });

        var reservasQ = _db.Reservas.AsNoTracking()
            .Include(r => r.Cancha)
            .Where(r => r.UsuarioId == id);
        var sancionesQ = _db.Sanciones.AsNoTracking()
            .Include(s => s.Complejo)
            .Where(s => s.UsuarioId == id);
        if (User.RolOr() != Rol.TECNICO)
        {
            var ids = await ComplejoAccess.IdsPropiosAsync(_db, User);
            var canchaIds = await _db.Canchas.AsNoTracking()
                .Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!))
                .Select(c => c.Id).ToListAsync();
            reservasQ = reservasQ.Where(r =>
                (r.ComplejoId != null && ids.Contains(r.ComplejoId!)) ||
                (r.ComplejoId == null && canchaIds.Contains(r.CanchaId)));
            sancionesQ = sancionesQ.Where(s => ids.Contains(s.ComplejoId));
            var tieneAlgo = await reservasQ.AnyAsync() || await sancionesQ.AnyAsync();
            if (!tieneAlgo)
                return NotFound(new { error = "Usuario no encontrado" });
        }

        var reservas = await reservasQ
            .OrderByDescending(r => r.CreadoEn)
            .ToListAsync();
        var sanciones = await sancionesQ
            .OrderByDescending(s => s.CreadoEn)
            .ToListAsync();

        return Ok(new
        {
            ok = true,
            usuario = new
            {
                usuario.Id,
                usuario.Nombre,
                usuario.Email,
                usuario.Rol,
                usuario.Activo,
                CreadoEn = DtoFormat.Utc(usuario.CreadoEn)
            },
            stats = new
            {
                reservas = reservas.Count,
                confirmadas = reservas.Count(r => r.Estado == EstadoReserva.CONFIRMADA),
                canceladas = reservas.Count(r => r.Estado == EstadoReserva.CANCELADA),
                sancionesActivas = sanciones.Count(s => s.Activa)
            },
            reservas = reservas.Select(r => ReservaDto.From(r, false)),
            sanciones = sanciones.Select(s => new
            {
                s.Id,
                s.ComplejoId,
                Complejo = s.Complejo != null ? s.Complejo.Nombre : "",
                s.Nivel,
                s.Motivo,
                s.Activa,
                CreadoEn = DtoFormat.Utc(s.CreadoEn)
            })
        });
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "TECNICO")]
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
            (rol != "USUARIO" && rol != "ADMIN" &&
             rol != "SUPERADMIN" && rol != "TECNICO"))
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

    // Autoservicio del jugador: edita su username (1 vez por año), fija su
    // fecha de nacimiento por única vez si está vacía y cambia su clave.
    // Nombre y correo son inmutables (se fijan al registrarse).
    [HttpPatch("me")]
    [Authorize]
    public async Task<IActionResult> PatchMe([FromBody] MiPerfilPatchRequest request)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == User.IdOrEmpty());
        if (usuario is null)
            return Unauthorized(new { error = "Sesión inválida" });

        if (!string.IsNullOrWhiteSpace(request.Nombre) &&
            !string.Equals(request.Nombre.Trim(), usuario.Nombre, StringComparison.Ordinal))
            return BadRequest(new { error = "El nombre no se puede cambiar" });
        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !string.Equals(request.Email.Trim(), usuario.Email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "El correo no se puede cambiar" });

        var username = string.IsNullOrWhiteSpace(request.Username)
            ? null : PerfilReglas.NormalizarUsername(request.Username);
        DateTime? nacimiento = null;
        if (!string.IsNullOrWhiteSpace(request.FechaNacimiento))
        {
            if (usuario.FechaNacimiento.HasValue)
                return BadRequest(new { error = "La fecha de nacimiento no se puede cambiar" });
            nacimiento = DtoFormat.ParseFechaDia(request.FechaNacimiento);
            if (nacimiento is null || nacimiento.Value.Date > DateTime.UtcNow.Date.AddYears(-5) ||
                nacimiento.Value.Date < new DateTime(1900, 1, 1))
                return BadRequest(new { error = "Fecha de nacimiento inválida" });
        }
        var password = string.IsNullOrEmpty(request.Password) ? null : request.Password;
        if (password is not null)
        {
            if (password.Length < 6)
                return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres" });
            if (string.IsNullOrEmpty(request.CurrentPassword) ||
                !VerificarClave(request.CurrentPassword, usuario.Password))
                return StatusCode(403, new { error = "Tu contraseña actual no es correcta" });
        }

        if (username is null && nacimiento is null && password is null && request.Telefono is null)
            return BadRequest(new { error = "No hay campos válidos para actualizar" });

        if (username is not null && username != usuario.Username)
        {
            if (!PerfilReglas.UsernameValido(username))
                return BadRequest(new { error = "Tu usuario: 3-20 caracteres (letras, números, _ . -)" });
            var proximo = PerfilReglas.ProximoCambioUsername(usuario.UsernameCambiadoEn);
            if (proximo is not null)
                return Conflict(new
                {
                    error = $"Podrás cambiar tu usuario el {proximo.Value:dd/MM/yyyy}",
                    proximoCambio = proximo
                });
            var duplicado = await _db.Usuarios.AsNoTracking()
                .AnyAsync(u => u.Id != usuario.Id && u.Username == username);
            if (duplicado)
                return Conflict(new { error = "Ese usuario ya está en uso" });
            usuario.Username = username;
            usuario.UsernameCambiadoEn = DateTime.UtcNow;
        }
        if (nacimiento is not null)
            usuario.FechaNacimiento = nacimiento.Value.Date;
        if (request.Telefono is not null)
        {
            // Vacío = quitar el teléfono; con valor debe ser válido.
            if (string.IsNullOrWhiteSpace(request.Telefono))
                usuario.Telefono = null;
            else if (!PerfilReglas.TelefonoValido(request.Telefono))
                return BadRequest(new { error = "Teléfono inválido (7-15 dígitos)" });
            else
                usuario.Telefono = request.Telefono.Trim();
        }
        if (password is not null)
        {
            usuario.Password = Bcrypt.HashPassword(password, 10);
            usuario.TokenVersion += 1;
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "Ese usuario ya está en uso" });
        }

        return Ok(new
        {
            ok = true,
            sesionCerrada = password is not null,
            usuario = new
            {
                usuario.Id,
                usuario.Nombre,
                usuario.Email,
                fechaNacimiento = usuario.FechaNacimiento.HasValue
                    ? usuario.FechaNacimiento.Value.ToString("yyyy-MM-dd") : null,
                username = usuario.Username,
                telefono = usuario.Telefono,
                fotoUrl = usuario.FotoUrl,
                proximoCambioUsername = PerfilReglas.ProximoCambioUsername(usuario.UsernameCambiadoEn)
            }
        });
    }

    // Foto de perfil desde archivo. Mismo criterio que canchas: tipo real por
    // bytes mágicos, tope 3 MB, versionado {id}-{unix}.{ext}.
    [HttpPost("me/foto")]
    [Authorize]
    [RequestSizeLimit(3_500_000)]
    public async Task<IActionResult> SubirFoto(IFormFile archivo)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == User.IdOrEmpty());
        if (usuario is null)
            return Unauthorized(new { error = "Sesión inválida" });
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { error = "Archivo requerido" });
        if (archivo.Length > 3 * 1024 * 1024)
            return BadRequest(new { error = "La imagen no puede superar 3 MB" });

        var ext = await DetectarExtensionImagenAsync(archivo);
        if (ext is null)
            return BadRequest(new { error = "Solo se aceptan imágenes JPG, PNG, WEBP o GIF" });

        var dir = Path.Combine(_env.WebRootPath, "uploads", "perfiles");
        Directory.CreateDirectory(dir);
        var nombre = $"{usuario.Id}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{ext}";
        await using (var fs = System.IO.File.Create(Path.Combine(dir, nombre)))
            await archivo.CopyToAsync(fs);

        foreach (var previo in Directory.EnumerateFiles(dir, $"{usuario.Id}-*.*"))
        {
            if (!previo.EndsWith(nombre, StringComparison.OrdinalIgnoreCase))
            {
                try { System.IO.File.Delete(previo); } catch { /* mejor esfuerzo */ }
            }
        }

        usuario.FotoUrl = $"/uploads/perfiles/{nombre}";
        await _db.SaveChangesAsync();
        return Ok(new { ok = true, fotoUrl = usuario.FotoUrl });
    }

    private static async Task<string?> DetectarExtensionImagenAsync(IFormFile archivo)
    {
        byte[] head = new byte[12];
        await using (var stream = archivo.OpenReadStream())
            _ = await stream.ReadAsync(head.AsMemory(0, 12));
        if (head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF)
            return ".jpg";
        if (head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47)
            return ".png";
        if (head[0] == 0x52 && head[1] == 0x49 && head[2] == 0x46 && head[3] == 0x46 &&
            head[8] == 0x57 && head[9] == 0x45 && head[10] == 0x42 && head[11] == 0x50)
            return ".webp";
        if (head[0] == 0x47 && head[1] == 0x49 && head[2] == 0x46)
            return ".gif";
        return null;
    }

    private static bool VerificarClave(string password, string hash)
    {
        try
        {
            return Bcrypt.Verify(password, hash);
        }
        catch
        {
            return false;
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "TECNICO")]
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
            ex.InnerException is PostgresException { SqlState: "23503" or "23001" })
        {
            return Conflict(new
            {
                error = "No se puede eliminar: el usuario tiene reservas asociadas. Desactívalo en su lugar."
            });
        }

        return Ok(new { ok = true });
    }
}