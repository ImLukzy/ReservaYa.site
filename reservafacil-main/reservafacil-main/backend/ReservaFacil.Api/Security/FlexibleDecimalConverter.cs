using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ReservaFacil.Api.Security;

public sealed class FlexibleDecimalConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var text = reader.GetString();
            if (text is not null &&
                (decimal.TryParse(text, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var value) ||
                 decimal.TryParse(text, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.CurrentCulture, out value)))
                return value;
            throw new JsonException("Valor numérico inválido");
        }

        if (reader.TokenType == JsonTokenType.Number)
            return reader.GetDecimal();

        throw new JsonException("Se esperaba un número");
    }

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
        => writer.WriteNumberValue(value);
}