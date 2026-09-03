using System.Globalization;

namespace ReservaFacil.Api.Dtos;

internal static class DtoFormat
{
    public static string Money(decimal value) =>
        value.ToString("0.00", CultureInfo.InvariantCulture);

    public static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}