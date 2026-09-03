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

        var cuentaAdministrativa = usuario is not null &&
            (usuario.Rol == Rol.ADMIN || usuario.Rol == Rol.SUPERADMIN);

        if (!cuentaAdministrativa && _rateLimiter.IsLimited(
                $"login:{ClientIp()}:{normalizedEmail}", 5, TimeSpan.FromMinutes(15)))
            return StatusCode(429, new { error = "No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente." });

        var passwordOk = usuario is not null
            ? SafeVerify(request.Password, usuario!.Password)
            : SafeVerify(request.Password, DummyHash);

        if (usuario is null || !passwordOk || !usuario.Activo)
            return Unauthorized(new { error = "Credenciales inválidas" });

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

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (_rateLimiter.IsLimited(
                $"register:{ClientIp()}:{normalizedEmail}", 5, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiados intentos. Intenta de nuevo más tarde" });

        var existente = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Email == normalizedEmail);
        if (existente)
            return Conflict(new { error = "El email ya está registrado" });

        var usuario = new Usuario
        {
            Id = JwtService.NewId(),
            Nombre = request.Nombre.Trim(),
            Email = normalizedEmail,
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
            return Conflict(new { error = "El email ya está registrado" });
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
    public IActionResult Me()
        => Ok(new
        {
            usuario = new
            {
                id = User.IdOrEmpty(),
                email = User.FindFirst("email")?.Value ?? "",
                nombre = User.FindFirst("nombre")?.Value ?? "",
                rol = User.RolOr(),
                tv = int.TryParse(User.FindFirst("tv")?.Value, out var tv) ? tv : 0
            }
        });

    private void SetTokenCookie(string token)
        => Response.Cookies.Append(JwtService.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps || Environment.GetEnvironmentVariable("COOKIE_SECURE") == "true",
            SameSite = SameSiteMode.Lax,
            MaxAge = JwtService.Ttl,
            Path = "/"
        });

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