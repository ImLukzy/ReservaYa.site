using Bcrypt = BCrypt.Net.BCrypt;
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
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string DummyHash = "$2b$10$Qbvnz2V7d7r63v/L9yyl6uJW2VFsqnai64.tYwftiPeOwaWYOUTuu";

    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly IRateLimiter _rateLimiter;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext db,
        JwtService jwt,
        IRateLimiter rateLimiter,
        ILogger<AuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _rateLimiter = rateLimiter;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Email y contraseña requeridos" });

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var usuario = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // El rate-limit aplica a TODOS, incluidas cuentas ADMIN/SUPERADMIN:
        // son las más valiosas para un ataque de fuerza bruta. Mismo mensaje
        // genérico para no revelar si el email existe.
        if (_rateLimiter.IsLimited(
                $"login:{ClientIp()}:{normalizedEmail}", 5, TimeSpan.FromMinutes(15)))
            return StatusCode(429, new { error = "No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente." });

        var passwordOk = usuario is not null
            ? SafeVerify(request.Password, usuario!.Password)
            : SafeVerify(request.Password, DummyHash);

        if (usuario is null || !passwordOk || !usuario.Activo)
            return Unauthorized(new { error = "Credenciales inválidas" });

        // El login correcto limpia los intentos fallidos: solo la fuerza bruta
        // acumula hasta el 429, un usuario normal jamás se bloquea solo.
        _rateLimiter.Reset($"login:{ClientIp()}:{normalizedEmail}");

        var token = _jwt.CreateToken(usuario.Id, usuario.Email, usuario.Nombre, usuario.Rol, usuario.TokenVersion);
        SetTokenCookie(token);

        return Ok(new
        {
            ok = true,
            usuario = new { usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Todos los campos son requeridos" });

        if (request.Password.Length < 6)
            return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres" });

        // Fecha de nacimiento obligatoria e inmutable después del registro.
        var nacimiento = DtoFormat.ParseFechaDia(request.FechaNacimiento);
        if (nacimiento is null)
            return BadRequest(new { error = "La fecha de nacimiento es obligatoria" });
        var hoy = DateTime.UtcNow.Date;
        if (nacimiento.Value.Date > hoy.AddYears(-5) || nacimiento.Value.Date < new DateTime(1900, 1, 1))
            return BadRequest(new { error = "Fecha de nacimiento inválida" });

        // Username obligatorio, único, editable como máximo 1 vez por año.
        var username = (request.Username ?? "").Trim().ToLowerInvariant();
        if (!PerfilReglas.UsernameValido(username))
            return BadRequest(new { error = "Tu usuario: 3-20 caracteres (letras, números, _ . -)" });

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (_rateLimiter.IsLimited(
                $"register:{ClientIp()}:{normalizedEmail}", 5, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiados intentos. Intenta de nuevo más tarde" });

        var existente = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Email == normalizedEmail || u.Username == username);
        if (existente)
            return Conflict(new { error = "El email o usuario ya está registrado" });

        var usuario = new Usuario
        {
            Id = JwtService.NewId(),
            Nombre = request.Nombre.Trim(),
            Email = normalizedEmail,
            FechaNacimiento = nacimiento.Value.Date,
            Username = username,
            UsernameCambiadoEn = DateTime.UtcNow,
            Password = Bcrypt.HashPassword(request.Password, 10),
            Rol = Rol.USUARIO,
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
            return Conflict(new { error = "El email o usuario ya está registrado" });
        }

        var token = _jwt.CreateToken(usuario.Id, usuario.Email, usuario.Nombre, usuario.Rol, usuario.TokenVersion);
        SetTokenCookie(token);

        return Ok(new
        {
            ok = true,
            usuario = new { usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol }
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var cookie = Request.Cookies[JwtService.CookieName];
        if (!string.IsNullOrEmpty(cookie))
        {
            var data = _jwt.Validate(cookie);
            if (data is not null)
            {
                try
                {
                    await _db.Usuarios
                        .Where(u => u.Id == data.Id && u.TokenVersion == data.TokenVersion)
                        .ExecuteUpdateAsync(s => s.SetProperty(u => u.TokenVersion, u => u.TokenVersion + 1));
                }
                catch (Exception exception)
                {
                    _logger.LogWarning(exception, "No se pudo invalidar la sesión durante el cierre de sesión");
                }
            }
        }

        Response.Cookies.Delete(JwtService.CookieName);
        return Ok(new { ok = true });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var u = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == User.IdOrEmpty());
        if (u is null)
            return Unauthorized(new { error = "Sesión inválida" });
        // Nota: la frescura del token (tv) y cuenta activa las exige el
        // ValidSessionHandler global antes de llegar aquí (403 si cambió el
        // rol por alta/baja de equipo: toca reingresar).
        return Ok(new
        {
            usuario = new
            {
                id = u.Id,
                email = u.Email,
                nombre = u.Nombre,
                rol = u.Rol.ToString(),
                tv = u.TokenVersion,
                fechaNacimiento = u.FechaNacimiento.HasValue
                    ? u.FechaNacimiento.Value.ToString("yyyy-MM-dd") : null,
                username = u.Username,
                telefono = u.Telefono,
                fotoUrl = u.FotoUrl,
                usernameCambiadoEn = u.UsernameCambiadoEn,
                proximoCambioUsername = PerfilReglas.ProximoCambioUsername(u.UsernameCambiadoEn)
            }
        });
    }

    private void SetTokenCookie(string token)
    {
        // En prod el panel/landing (vercel/pages) llaman a la API (render):
        // cross-site exige SameSite=None + Secure. En dev se mantiene Lax.
        var crossSite = Environment.GetEnvironmentVariable("COOKIE_SECURE") == "true";
        Response.Cookies.Append(JwtService.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps || crossSite,
            SameSite = crossSite ? SameSiteMode.None : SameSiteMode.Lax,
            MaxAge = JwtService.Ttl,
            Path = "/"
        });
    }

    private string ClientIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();
        return Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static bool SafeVerify(string password, string hash)
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
}