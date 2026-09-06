using System.Globalization;

namespace ReservaFacil.Api.Dtos;

internal static class DtoFormat
{
    public static string Money(decimal value) =>
        value.ToString("0.00", CultureInfo.InvariantCulture);

    public static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

    // Día de calendario para reservas/cotizaciones (no instante horario).
    public static DateTime? ParseFechaDia(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (DateTime.TryParseExact(value.Trim(), "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
            return DateTime.SpecifyKind(exact.Date, DateTimeKind.Unspecified);
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind, out var parsed))
            return DateTime.SpecifyKind(parsed.Date, DateTimeKind.Unspecified);
        return null;
    }
}