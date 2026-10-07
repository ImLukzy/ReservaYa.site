using Amazon.Runtime;
using Amazon.S3;

namespace ReservaFacil.Api.Services;

// Borra del bucket R2 la imagen que una foto nueva reemplazó (o la de una cancha
// o partido eliminado). Mejor esfuerzo y siempre después de SaveChanges: si falla,
// la BD ya quedó bien y solo queda un huérfano. Sin las vars R2_* solo registra.
public sealed class AlmacenR2 : IDisposable
{
    private readonly AmazonS3Client? _s3;
    private readonly string? _bucket;
    private readonly ILogger<AlmacenR2> _logger;

    public AlmacenR2(ILogger<AlmacenR2> logger)
    {
        _logger = logger;
        string? Var(string n) => Environment.GetEnvironmentVariable(n)?.Trim() is { Length: > 0 } v ? v : null;
        var endpoint = Var("R2_ENDPOINT");
        var accessKey = Var("R2_ACCESS_KEY_ID");
        var secretKey = Var("R2_SECRET_ACCESS_KEY");
        _bucket = Var("R2_BUCKET_NAME");
        if (endpoint is null || accessKey is null || secretKey is null || _bucket is null)
            return;
        _s3 = new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = true,
            AuthenticationRegion = "auto",
            // R2 no admite los checksums CRC que el SDK v4 añade por defecto.
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
        });
    }

    // Solo actúa sobre URLs MEDIA_PUBLIC_URL/uploads/<tipo>/... del tipo de la
    // entidad (perfil, partido, cancha); /uploads locales, enlaces externos y
    // claves de otro tipo se ignoran.
    public async Task BorrarAsync(string? url, string tipo)
    {
        if (MediaPublica.Clave(url) is not { } clave)
            return;
        if (!clave.StartsWith($"uploads/{tipo}/", StringComparison.Ordinal))
        {
            _logger.LogWarning("R2 borrado omitido: {Clave} no es de tipo {Tipo}", clave, tipo);
            return;
        }
        if (_s3 is null)
        {
            _logger.LogWarning("R2 sin configurar: no se borró {Clave}", clave);
            return;
        }
        try
        {
            await _s3.DeleteObjectAsync(_bucket, clave);
            _logger.LogInformation("R2 objeto borrado {Clave}", clave);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "R2 no se pudo borrar {Clave}", clave);
        }
    }

    public void Dispose() => _s3?.Dispose();
}
