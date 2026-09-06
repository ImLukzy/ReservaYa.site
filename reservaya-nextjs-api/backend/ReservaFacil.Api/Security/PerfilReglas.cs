using System.Text.RegularExpressions;

namespace ReservaFacil.Api.Security;

// Reglas de identidad del jugador: nombre y fecha inmutables tras el
// registro; username único, 3-20 caracteres, mutable 1 vez por año.
internal static partial class PerfilReglas
{
    [GeneratedRegex("^[a-z0-9_.-]{3,20}$")]
    private static partial Regex UsernameRegex();

    [GeneratedRegex(@"^[+\d][\d\s().-]*$")]
    private static partial Regex TelefonoRegex();

    public static string NormalizarUsername(string? value) =>
        (value ?? "").Trim().ToLowerInvariant();

    public static bool UsernameValido(string? value) =>
        !string.IsNullOrEmpty(value) && UsernameRegex().IsMatch(value);

    // Teléfono flexible internacional: 7-15 dígitos (+, espacios, guiones).
    public static bool TelefonoValido(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var v = value.Trim();
        if (v.Length < 7 || v.Length > 20 || !TelefonoRegex().IsMatch(v)) return false;
        var digitos = 0;
        foreach (var c in v) if (char.IsDigit(c)) digitos++;
        return digitos >= 7 && digitos <= 15;
    }

    // Próximo cambio permitido. Null = puede cambiar ahora.
    public static DateTime? ProximoCambioUsername(DateTime? cambiadoEn)
    {
        if (cambiadoEn is null) return null;
        var proximo = cambiadoEn.Value.AddYears(1);
        return proximo <= DateTime.UtcNow ? null : proximo;
    }
}
