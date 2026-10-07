using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace ReservaFacil.Api.Services;

// Subida de imágenes con el mismo criterio en canchas y perfiles:
// tipo real por bytes mágicos (no solo ContentType), versionado
// {id}-{unix}.{ext} para romper caché y limpieza de versiones viejas.
// WebRootPath puede ser nulo si wwwroot no existe en el despliegue
// (está gitignoredo): se usa ContentRoot/wwwroot como respaldo.
public static class ImagenArchivo
{
    public const long TopeBytes = 3 * 1024 * 1024;

    public static async Task<string?> DetectarExtensionAsync(IFormFile archivo)
    {
        byte[] head = new byte[12];
        await using (var stream = archivo.OpenReadStream())
            _ = await stream.ReadAsync(head.AsMemory(0, 12));
        if (head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF)
            return ".jpg";
        if (head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47)
            return ".png";
        if (head[0] == 0x52 && head[1] == 0x49 && head[2] == 0x46 && head[3] == 0x46 &&
            head[8] == 0x57 && head[9] == 0x45 && head[10] == 0x42 && head[11] == 0x50)
            return ".webp";
        if (head[0] == 0x47 && head[1] == 0x49 && head[2] == 0x46)
            return ".gif";
        return null;
    }

    public static bool ExcedeTope(IFormFile? archivo) =>
        archivo is null || archivo.Length == 0 || archivo.Length > TopeBytes;

    public static async Task<string> GuardarVersionadaAsync(
        IWebHostEnvironment env, string subcarpeta, string id, IFormFile archivo, string ext)
    {
        var webRoot = env.WebRootPath;
        if (string.IsNullOrEmpty(webRoot))
            webRoot = Path.Combine(env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", subcarpeta);
        Directory.CreateDirectory(dir);
        var nombre = $"{id}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{ext}";
        await using (var fs = System.IO.File.Create(Path.Combine(dir, nombre)))
            await archivo.CopyToAsync(fs);

        foreach (var previo in Directory.EnumerateFiles(dir, $"{id}-*.*"))
        {
            if (!previo.EndsWith(nombre, StringComparison.OrdinalIgnoreCase))
            {
                try { System.IO.File.Delete(previo); } catch { /* mejor esfuerzo */ }
            }
        }
        return $"/uploads/{subcarpeta}/{nombre}";
    }
}
