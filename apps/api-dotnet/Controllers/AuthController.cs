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

    private const string EnlaceInvalido = "Enlace inválido o vencido";

    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly IRateLimiter _rateLimiter;
    private readonly ILogger<AuthController> _logger;
    private readonly PasswordResetTokens _resetTokens;
    private readonly PasswordResetOptions _resetOptions;
    private readonly EmailQueue _emailQueue;
    private readonly GoogleOAuth? _googleOAuth;

    public AuthController(
        AppDbContext db,
        JwtService jwt,
        IRateLimiter rateLimiter,
        ILogger<AuthController> logger,
        PasswordResetTokens resetTokens,
        PasswordResetOptions resetOptions,
        EmailQueue emailQueue,
        GoogleOAuth? googleOAuth = null)
    {
        _db = db;
        _jwt = jwt;
        _rateLimiter = rateLimiter;
        _logger = logger;
        _resetTokens = resetTokens;
        _resetOptions = resetOptions;
        _emailQueue = emailQueue;
        _googleOAuth = googleOAuth;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Email y contraseña requeridos" });

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // El rate-limit aplica a TODOS, incluidas cuentas ADMIN/SUPERADMIN:
        // son las más valiosas para un ataque de fuerza bruta. Mismo mensaje
        // genérico para no revelar si el email existe.
        if (_rateLimiter.IsLimited(
                $"login:{ClientIp()}:{normalizedEmail}", 5, TimeSpan.FromMinutes(15)))
            return StatusCode(429, new { error = "No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente." });

        var usuario = await _db.Usuarios.AsNoTracking()
            .Where(u => u.Email == normalizedEmail)
            .Select(u => new { u.Id, u.Email, u.Nombre, u.Password, u.Rol, u.Activo, u.TokenVersion })
            .FirstOrDefaultAsync();

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
        if (nacimiento.Value.Date < new DateTime(1900, 1, 1) || nacimiento.Value.Date > hoy)
            return BadRequest(new { error = "Fecha de nacimiento inválida" });
        if (nacimiento.Value.Date > hoy.AddYears(-14))
            return BadRequest(new { error = "Debes tener al menos 14 años para crear una cuenta." });

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

        DeleteTokenCookie();
        return Ok(new { ok = true });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var normalizedEmail = (request.Email ?? "").Trim().ToLowerInvariant();
        if (normalizedEmail.Length > 254 || !System.Net.Mail.MailAddress.TryCreate(normalizedEmail, out _))
            return BadRequest(new { error = "Escribe un correo válido" });

        if (_rateLimiter.IsLimited($"forgot:{ClientIp()}:{normalizedEmail}", 5, TimeSpan.FromHours(1)) ||
            _rateLimiter.IsLimited($"forgot:{ClientIp()}", 20, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiados intentos. Espera unos minutos" });

        var usuario = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Misma respuesta exista o no la cuenta; el envío va por la cola.
        if (usuario is { Activo: true } && !string.IsNullOrEmpty(_resetOptions.ResetUrl))
        {
            var link = $"{_resetOptions.ResetUrl}#t={_resetTokens.Create(usuario)}";
            if (!_emailQueue.Enqueue(PasswordResetEmail.Build(usuario.Nombre, usuario.Email, link)))
                _logger.LogError("Cola de emails llena: no se encoló la recuperación de {UserId}", usuario.Id);
        }

        return Ok(new { ok = true });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (_rateLimiter.IsLimited($"reset:{ClientIp()}", 10, TimeSpan.FromMinutes(15)))
            return StatusCode(429, new { error = "Demasiados intentos. Espera unos minutos" });

        var claims = _resetTokens.Read(request.Token ?? "");
        if (claims is null)
            return BadRequest(new { error = EnlaceInvalido });

        if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 6)
            return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres" });

        var usuario = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == claims.UserId);
        if (usuario is null || !usuario.Activo || usuario.TokenVersion != claims.TokenVersion ||
            !PasswordResetTokens.SameFingerprint(usuario.Password, claims.PasswordFingerprint))
            return BadRequest(new { error = EnlaceInvalido });

        // Condicionado a TokenVersion y hash actuales: un segundo uso del mismo enlace
        // (o uno en paralelo) no actualiza filas. TokenVersion+1 cierra todas las sesiones.
        var nuevoHash = Bcrypt.HashPassword(request.Password, 10);
        var filas = await _db.Usuarios
            .Where(u => u.Id == usuario.Id && u.TokenVersion == claims.TokenVersion && u.Password == usuario.Password)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Password, nuevoHash)
                .SetProperty(u => u.TokenVersion, u => u.TokenVersion + 1));
        if (filas == 0)
            return BadRequest(new { error = EnlaceInvalido });

        DeleteTokenCookie();
        _logger.LogInformation("Contraseña restablecida para el usuario {UserId}", usuario.Id);
        return Ok(new { ok = true });
    }

    [HttpPost("refrescar")]
    [Authorize]
    public async Task<IActionResult> Refrescar()
    {
        var usuario = await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == User.IdOrEmpty());
        if (usuario is null || !usuario.Activo) return Unauthorized(new { error = "Sesión inválida" });
        SetTokenCookie(_jwt.CreateToken(usuario.Id, usuario.Email, usuario.Nombre, usuario.Rol, usuario.TokenVersion));
        return Ok(new { ok = true, usuario = new { usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol } });
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
                fechaNacimiento = PerfilReglas.FechaCorta(u.FechaNacimiento),
                username = u.Username,
                telefono = u.Telefono,
                fotoUrl = u.FotoUrl,
                usernameCambiadoEn = u.UsernameCambiadoEn,
                proximoCambioUsername = PerfilReglas.ProximoCambioUsername(u.UsernameCambiadoEn)
            }
        });
    }

    [HttpGet("google")]
    public IActionResult GoogleLogin([FromQuery] string? returnUrl)
    {
        if (_googleOAuth is null)
            return StatusCode(503, new { error = "Google OAuth no está configurado" });

        var validReturnUrl = ValidateReturnUrl(returnUrl);
        var state = _googleOAuth.GenerateState();

        var stateCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps || Environment.GetEnvironmentVariable("COOKIE_SECURE") == "true",
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromMinutes(10),
            Path = "/"
        };
        Response.Cookies.Append("__oauth_state", state, stateCookieOptions);

        if (!string.IsNullOrEmpty(validReturnUrl))
        {
            Response.Cookies.Append("__oauth_returnurl", validReturnUrl, new CookieOptions
            {
                HttpOnly = true,
                Secure = HttpContext.Request.IsHttps || Environment.GetEnvironmentVariable("COOKIE_SECURE") == "true",
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromMinutes(10),
                Path = "/"
            });
        }

        var redirectUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
            $"scope=openid+email+profile&" +
            $"response_type=code&" +
            $"redirect_uri={Uri.EscapeDataString(_googleOAuth.RedirectUri)}&" +
            $"client_id={Uri.EscapeDataString(_googleOAuth.ClientId ?? "")}&" +
            $"state={Uri.EscapeDataString(state)}";

        return Redirect(redirectUrl);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? state)
    {
        if (_googleOAuth is null)
            return Redirect($"{GetPublicAppUrl()}/login?error=google");

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        {
            _logger.LogWarning("Google callback missing code or state");
            return Redirect($"{GetPublicAppUrl()}/login?error=google");
        }

        Request.Cookies.TryGetValue("__oauth_state", out var stateFromCookie);
        var profile = await _googleOAuth.ExchangeCodeForProfile(code, state, stateFromCookie);
        if (profile is null)
            return Redirect($"{GetPublicAppUrl()}/login?error=google");

        Response.Cookies.Delete("__oauth_state");
        Request.Cookies.TryGetValue("__oauth_returnurl", out var returnUrl);
        Response.Cookies.Delete("__oauth_returnurl");

        var correo = profile.Email.Trim().ToLowerInvariant();
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.GoogleId == profile.Sub)
            ?? await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == correo);

        if (usuario is not null)
        {
            // Cuenta desactivada o ya vinculada a otra cuenta de Google: no se entra.
            if (!usuario.Activo || (usuario.GoogleId is not null && usuario.GoogleId != profile.Sub))
                return Redirect($"{GetPublicAppUrl()}/login?error=google");

            if (usuario.GoogleId is null)
            {
                usuario.GoogleId = profile.Sub;
                usuario.AvatarUrl ??= profile.Picture;
                await _db.SaveChangesAsync();
            }

            var token = _jwt.CreateToken(usuario.Id, usuario.Email, usuario.Nombre, usuario.Rol, usuario.TokenVersion);
            SetTokenCookie(token);
            return Redirect(UrlTrasGoogle(returnUrl));
        }

        var pendingToken = _jwt.CreateGooglePendingToken(profile.Sub, profile.Email, profile.Name, profile.Picture);
        var redirectToComplete = $"{GetPublicAppUrl()}/completar-registro?t={Uri.EscapeDataString(pendingToken)}";
        return Redirect(redirectToComplete);
    }

    [HttpPost("google/completar")]
    public async Task<IActionResult> GoogleCompleteRegister([FromBody] GoogleCompleteRegisterRequest request)
    {
        if (_googleOAuth is null)
            return StatusCode(503, new { error = "Google OAuth no está configurado" });

        var claims = _jwt.ValidateGooglePendingToken(request.T ?? "");
        if (claims is null)
            return BadRequest(new { error = "Token inválido o vencido" });

        var nacimiento = DtoFormat.ParseFechaDia(request.FechaNacimiento);
        if (nacimiento is null)
            return BadRequest(new { error = "La fecha de nacimiento es obligatoria" });
        var hoy = DateTime.UtcNow.Date;
        if (nacimiento.Value.Date < new DateTime(1900, 1, 1) || nacimiento.Value.Date > hoy)
            return BadRequest(new { error = "Fecha de nacimiento inválida" });
        if (nacimiento.Value.Date > hoy.AddYears(-14))
            return BadRequest(new { error = "Debes tener al menos 14 años para crear una cuenta." });

        var username = (request.Username ?? "").Trim().ToLowerInvariant();
        if (!PerfilReglas.UsernameValido(username))
            return BadRequest(new { error = "Tu usuario: 3-20 caracteres (letras, números, _ . -)" });

        if (_rateLimiter.IsLimited(
                $"register:{ClientIp()}:{claims.Email}", 5, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiados intentos. Intenta de nuevo más tarde" });

        var existente = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Username == username);
        if (existente)
            return Conflict(new { error = "El usuario ya está registrado" });

        var randomPassword = new byte[32];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomPassword);
        }

        var usuario = new Usuario
        {
            Id = JwtService.NewId(),
            Nombre = claims.Name ?? "",
            Email = claims.Email,
            FechaNacimiento = nacimiento.Value.Date,
            Username = username,
            UsernameCambiadoEn = DateTime.UtcNow,
            Password = Bcrypt.HashPassword(Convert.ToBase64String(randomPassword), 10),
            GoogleId = claims.Sub,
            AvatarUrl = claims.Picture,
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
                ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "El usuario ya está registrado" });
        }

        var token = _jwt.CreateToken(usuario.Id, usuario.Email, usuario.Nombre, usuario.Rol, usuario.TokenVersion);
        SetTokenCookie(token);

        return Ok(new
        {
            ok = true,
            usuario = new { usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol }
        });
    }

    // La API solo guarda el returnUrl; la landing lo vuelve a validar (getSafeReturnUrl en login.astro).
    private static string? ValidateReturnUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || url.Length > 512)
            return null;
        if (url.StartsWith('/') && !url.StartsWith("//", StringComparison.Ordinal) && !url.StartsWith("/\\", StringComparison.Ordinal))
            return url;
        return Uri.TryCreate(url, UriKind.Absolute, out var abs) && (abs.Scheme == Uri.UriSchemeHttp || abs.Scheme == Uri.UriSchemeHttps)
            ? url
            : null;
    }

    // Origen de la landing: el de PASSWORD_RESET_URL (ya apunta a la landing); FRONTEND_ORIGIN es una lista para CORS.
    private static string GetPublicAppUrl()
    {
        var reset = Environment.GetEnvironmentVariable("PASSWORD_RESET_URL");
        return Uri.TryCreate(reset, UriKind.Absolute, out var uri)
            ? uri.GetLeftPart(UriPartial.Authority)
            : "http://localhost:3000";
    }

    // Tras entrar con Google se vuelve al login de la landing, que ya lleva a cada rol a su inicio.
    private static string UrlTrasGoogle(string? returnUrl)
    {
        var destino = $"{GetPublicAppUrl()}/login?google=ok";
        return string.IsNullOrEmpty(returnUrl) ? destino : $"{destino}&returnUrl={Uri.EscapeDataString(returnUrl)}";
    }

    private void SetTokenCookie(string token)
    {
        var options = TokenCookieOptions();
        options.MaxAge = JwtService.Ttl;
        Response.Cookies.Append(JwtService.CookieName, token, options);
    }

    // El borrado repite Path/Secure/SameSite de la creación para que el navegador reemplace la misma cookie.
    private void DeleteTokenCookie() => Response.Cookies.Delete(JwtService.CookieName, TokenCookieOptions());

    private CookieOptions TokenCookieOptions()
    {
        // En prod el panel/landing (vercel/pages) llaman a la API (render):
        // cross-site exige SameSite=None + Secure. En dev se mantiene Lax.
        var crossSite = Environment.GetEnvironmentVariable("COOKIE_SECURE") == "true";
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps || crossSite,
            SameSite = crossSite ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/"
        };
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