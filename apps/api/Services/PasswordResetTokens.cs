using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Services;

public record PasswordResetClaims(string UserId, int TokenVersion, string PasswordFingerprint);

// Enlace de recuperación sin estado (spec 15): HMAC-SHA256 con una clave derivada
// de JWT_SECRET, distinta de la del JWT de sesión. Es de un solo uso porque el
// reseteo cambia el hash de la contraseña e incrementa TokenVersion.
public class PasswordResetTokens
{
    public static readonly TimeSpan Ttl = TimeSpan.FromMinutes(30);
    private const int MaxTokenLength = 512;

    private readonly byte[] _key;
    private readonly TimeProvider _time;

    public PasswordResetTokens(string jwtSecret, TimeProvider? time = null)
    {
        _key = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(jwtSecret),
            Encoding.UTF8.GetBytes("reservaya:password-reset:v1"));
        _time = time ?? TimeProvider.System;
    }

    public string Create(Usuario usuario)
    {
        var payload = JsonSerializer.SerializeToUtf8Bytes(new Payload(
            usuario.Id,
            usuario.TokenVersion,
            PasswordFingerprint(usuario.Password),
            _time.GetUtcNow().Add(Ttl).ToUnixTimeSeconds()));
        return $"{Base64Url.EncodeToString(payload)}.{Base64Url.EncodeToString(HMACSHA256.HashData(_key, payload))}";
    }

    // Devuelve null si el token está mal formado, la firma no coincide o venció.
    public PasswordResetClaims? Read(string token)
    {
        if (string.IsNullOrEmpty(token) || token.Length > MaxTokenLength) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        try
        {
            var payload = Base64Url.DecodeFromChars(parts[0]);
            var signature = Base64Url.DecodeFromChars(parts[1]);
            if (!CryptographicOperations.FixedTimeEquals(signature, HMACSHA256.HashData(_key, payload)))
                return null;

            var data = JsonSerializer.Deserialize<Payload>(payload);
            if (data is null || string.IsNullOrEmpty(data.Sub) || string.IsNullOrEmpty(data.Ph)) return null;
            if (_time.GetUtcNow().ToUnixTimeSeconds() >= data.Exp) return null;

            return new PasswordResetClaims(data.Sub, data.Tv, data.Ph);
        }
        catch (Exception exception) when (exception is FormatException or JsonException)
        {
            return null;
        }
    }

    // Huella corta del hash BCrypt: si la contraseña cambia, los enlaces viejos dejan de valer.
    public static string PasswordFingerprint(string passwordHash) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)))[..16];

    public static bool SameFingerprint(string passwordHash, string fingerprint) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(PasswordFingerprint(passwordHash)),
            Encoding.ASCII.GetBytes(fingerprint));

    private sealed record Payload(
        [property: System.Text.Json.Serialization.JsonPropertyName("sub")] string Sub,
        [property: System.Text.Json.Serialization.JsonPropertyName("tv")] int Tv,
        [property: System.Text.Json.Serialization.JsonPropertyName("ph")] string Ph,
        [property: System.Text.Json.Serialization.JsonPropertyName("exp")] long Exp);
}
