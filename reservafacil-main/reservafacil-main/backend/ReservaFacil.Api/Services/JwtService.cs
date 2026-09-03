using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Services;

public record JwtData(string Id, string Email, string Nombre, Rol Rol, int TokenVersion);

public class JwtService
{
    public const string CookieName = "token";
    public static readonly TimeSpan Ttl = TimeSpan.FromDays(7);

    private readonly SymmetricSecurityKey _key;

    public JwtService(string secret)
    {
        if (string.IsNullOrEmpty(secret) || secret.Length < 32)
            throw new InvalidOperationException(
                "JWT_SECRET no está definida o tiene menos de 32 caracteres. Configúrala en el archivo .env");
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
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

    public static string NewId() => Guid.NewGuid().ToString("N");
}