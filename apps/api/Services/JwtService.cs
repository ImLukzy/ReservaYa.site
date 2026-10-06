using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Services;

public record JwtData(string Id, string Email, string Nombre, Rol Rol, int TokenVersion);

public record GooglePendingTokenClaims(string Sub, string Email, string Name, string? Picture);

public class JwtService
{
    public const string CookieName = "token";
    public static readonly TimeSpan Ttl = TimeSpan.FromDays(7);

    private readonly SymmetricSecurityKey _key;
    // Clave propia del registro pendiente de Google: un token pendiente nunca valida como sesión.
    private readonly SymmetricSecurityKey _pendingKey;

    public JwtService(string secret)
    {
        if (string.IsNullOrEmpty(secret) || secret.Length < 32)
            throw new InvalidOperationException(
                "JWT_SECRET no está definida o tiene menos de 32 caracteres. Configúrala en el archivo .env");
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        _pendingKey = new SymmetricSecurityKey(System.Security.Cryptography.HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes("google-pendiente")));
    }

    public string CreateToken(string id, string email, string nombre, Rol rol, int tokenVersion)
    {
        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim("id", id),
            new Claim("email", email),
            new Claim("nombre", nombre),
            new Claim("rol", rol.ToString()),
            new Claim("tv", tokenVersion.ToString(), ClaimValueTypes.Integer)
        };

        var token = new JwtSecurityToken(
            issuer: null,
            audience: null,
            claims: claims,
            notBefore: now,
            expires: now.Add(Ttl),
            signingCredentials: new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public JwtData? Validate(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _key,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(10),
                ValidAlgorithms = new[] { "HS256" }
            }, out _);

            var id = principal.FindFirstValue("id");
            if (string.IsNullOrEmpty(id)) return null;

            var tv = int.TryParse(principal.FindFirstValue("tv"), out var parsed) ? parsed : 0;
            var rol = Enum.TryParse<Rol>(principal.FindFirstValue("rol"), out var r) ? r : Rol.USUARIO;

            return new JwtData(
                id,
                principal.FindFirstValue("email") ?? "",
                principal.FindFirstValue("nombre") ?? "",
                rol,
                tv);
        }
        catch
        {
            return null;
        }
    }

    public string CreateGooglePendingToken(string sub, string email, string name, string? picture)
    {
        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim("sub", sub),
            new Claim("email", email),
            new Claim("name", name),
            new Claim("picture", picture ?? "")
        };

        var token = new JwtSecurityToken(
            issuer: null,
            audience: "google-pendiente",
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(10),
            signingCredentials: new SigningCredentials(_pendingKey, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public GooglePendingTokenClaims? ValidateGooglePendingToken(string token)
    {
        try
        {
            // Sin mapeo de claims: "sub" y "email" se leen con su nombre original.
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = true,
                ValidAudience = "google-pendiente",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _pendingKey,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(10),
                ValidAlgorithms = new[] { "HS256" }
            }, out _);

            var sub = principal.FindFirstValue("sub");
            var email = principal.FindFirstValue("email");
            if (string.IsNullOrEmpty(sub) || string.IsNullOrEmpty(email))
                return null;

            return new GooglePendingTokenClaims(
                sub,
                email,
                principal.FindFirstValue("name") ?? "",
                principal.FindFirstValue("picture"));
        }
        catch
        {
            return null;
        }
    }

    public static string NewId() => Guid.NewGuid().ToString("N");
}