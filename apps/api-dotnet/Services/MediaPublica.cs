using System.Security.Claims;
using ReservaFacil.Api.Security;

namespace ReservaFacil.Api.Services;

// URLs de imágenes subidas por el navegador directo a Cloudflare R2. La API
// solo guarda URLs de imagen bajo MEDIA_PUBLIC_URL/uploads/ (host público del
// bucket); cualquier otra se rechaza. Sin la variable, la persistencia por URL queda
// desactivada (503) y siguen funcionando las subidas multipart heredadas.
public static class MediaPublica
{
    private static readonly string? Base =
        Environment.GetEnvironmentVariable("MEDIA_PUBLIC_URL")?.Trim().TrimEnd('/') is { Length: > 0 } b
            ? b : null;

    private static readonly Uri? BaseUri =
        Base is not null && Uri.TryCreate(Base, UriKind.Absolute, out var u) ? u : null;

    // Ruta obligatoria: <ruta base del bucket>/uploads/ (las claves que firma /api/upload).
    private static readonly string PrefijoRuta = (BaseUri?.AbsolutePath.TrimEnd('/') ?? "") + "/uploads/";

    // Mismas extensiones que ImagenArchivo.DetectarExtensionAsync y lib/media.ts.
    private static readonly string[] Extensiones = [".jpg", ".png", ".webp", ".gif"];

    public static bool Configurada => BaseUri is not null;

    // Devuelve la URL si es una imagen del bucket público; null si no. Esquema y
    // host se comparan sin mayúsculas (RFC 3986); la ruta es sensible a ellas.
    // Con prefijoClave, además la clave debe empezar por él (ver PrefijoPropio):
    // impide adoptar la URL de otro usuario y que luego la API borre ese objeto.
    public static string? Validar(string? url, string? prefijoClave = null)
    {
        if (BaseUri is null || string.IsNullOrWhiteSpace(url))
            return null;
        var v = url.Trim();
        if (v.Length > 500 || v.Any(c => char.IsWhiteSpace(c) || char.IsControl(c) || c is '"' or '<' or '>' or '\\' or '?' or '#'))
            return null;
        if (!Uri.TryCreate(v, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp) ||
            uri.Query.Length > 0 || uri.Fragment.Length > 0 || uri.UserInfo.Length > 0)
            return null;
        if (Uri.Compare(uri, BaseUri, UriComponents.SchemeAndServer, UriFormat.Unescaped,
                StringComparison.OrdinalIgnoreCase) != 0)
            return null;

        // Uri normaliza "/a/../b" → "/b": la ruta cruda se revisa aparte, igual que la
        // decodificada (atrapa %2e%2e y %2f) y la AbsolutePath ya normalizada.
        var sep = v.IndexOf("://", StringComparison.Ordinal);
        var inicio = sep < 0 ? -1 : v.IndexOf('/', sep + 3);
        if (inicio < 0)
            return null;
        var cruda = v[inicio..];
        foreach (var ruta in new[] { cruda, Uri.UnescapeDataString(cruda), uri.AbsolutePath })
        {
            if (!ruta.StartsWith(PrefijoRuta, StringComparison.Ordinal) ||
                ruta.Contains('\\') || ruta.Contains('%') || ruta.Contains("//") ||
                ruta.Split('/').Any(seg => seg is "." or ".."))
                return null;
        }
        if (!Extensiones.Any(ext => uri.AbsolutePath.EndsWith(ext, StringComparison.OrdinalIgnoreCase)))
            return null;
        if (prefijoClave is not null &&
            !uri.AbsolutePath[(PrefijoRuta.Length - "uploads/".Length)..].StartsWith(prefijoClave, StringComparison.Ordinal))
            return null;
        return v;
    }

    // Prefijo de clave que /api/upload (web) firma para este usuario:
    // uploads/<tipo>/<id saneado igual que route.ts>/. La plataforma (TECNICO)
    // gestiona canchas y partidos ajenos: con plataformaTodo le basta uploads/<tipo>/.
    public static string PrefijoPropio(string tipo, ClaimsPrincipal user, bool plataformaTodo = true)
    {
        if (plataformaTodo && ComplejoAccess.EsPlataforma(user))
            return $"uploads/{tipo}/";
        var id = new string(user.IdOrEmpty().Where(c => char.IsAsciiLetterOrDigit(c) || c is '_' or '-').ToArray());
        // Id vacío → "uploads/<tipo>//", que ninguna URL válida puede tener.
        return $"uploads/{tipo}/{id}/";
    }

    // Clave del objeto en el bucket ("uploads/...") de una URL propia válida; null si no lo es.
    public static string? Clave(string? url)
    {
        if (Validar(url) is not { } v || !Uri.TryCreate(v, UriKind.Absolute, out var uri))
            return null;
        return uri.AbsolutePath[(PrefijoRuta.Length - "uploads/".Length)..];
    }

    public sealed class UrlRequest
    {
        public string? Url { get; set; }
    }
}
