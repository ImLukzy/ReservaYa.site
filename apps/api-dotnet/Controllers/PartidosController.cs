using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// Partidos abiertos entre jugadores (/completar-cuadro). Sin complejo
// asociado: cualquiera publica y cualquiera se anota hasta llenar cupos.
[ApiController]
[Route("api/partidos")]
[Authorize]
public class PartidosController : ControllerBase
{
    private static readonly string[] Niveles = { "Principiante", "Intermedio", "Avanzado" };
    private static readonly string[] Formatos =
        { "Fútbol 5", "Fútbol 6", "Fútbol 7", "Fútbol 8", "Fútbol 9", "Fútbol 11" };
    private static readonly string[] Superficies =
        { "Grass sintético", "Losa", "Grass natural" };

    private readonly AppDbContext _db;
    private readonly IRateLimiter _rateLimiter;
    private readonly IWebHostEnvironment _env;
    private readonly AlmacenR2 _r2;
    private readonly ILogger<PartidosController> _logger;

    public PartidosController(AppDbContext db, IRateLimiter rateLimiter, IWebHostEnvironment env,
        AlmacenR2 r2, ILogger<PartidosController> logger)
    {
        _db = db;
        _rateLimiter = rateLimiter;
        _env = env;
        _r2 = r2;
        _logger = logger;
    }

    public sealed class PartidoRequest
    {
        public string? Titulo { get; set; }
        public string? Descripcion { get; set; }
        public string? Formato { get; set; }
        public string? Nivel { get; set; }
        public int? CuposTotales { get; set; }
        public string? Fecha { get; set; }
        public string? Desde { get; set; }
        public string? Hasta { get; set; }
        public string? Distrito { get; set; }
        public string? Cancha { get; set; }
        public string? Superficie { get; set; }
        public decimal? Precio { get; set; }
        public IFormFile? Foto { get; set; }
        // Foto ya subida a R2 por el navegador (alternativa a Foto multipart).
        public string? FotoUrl { get; set; }
    }

    // Vitrina pública: solo partidos de hoy en adelante, ordenados por fecha.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] string? nivel, [FromQuery] string? q)
    {
        var hoy = DateTime.Today;
        var query = _db.PartidosAbiertos.AsNoTracking()
            .Include(p => p.Organizador)
            .Where(p => p.Fecha >= hoy);

        if (!string.IsNullOrWhiteSpace(nivel) && Niveles.Contains(nivel))
            query = query.Where(p => p.Nivel == nivel);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var patron = "%" + q.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(p =>
                EF.Functions.ILike(p.Titulo, patron) ||
                EF.Functions.ILike(p.Distrito, patron) ||
                EF.Functions.ILike(p.Cancha, patron));
        }

        var partidos = await query
            .OrderBy(p => p.Fecha).ThenBy(p => p.DesdeMin)
            .ToListAsync();
        if (partidos.Count == 0)
            return Ok(new { ok = true, partidos = Array.Empty<object>() });

        var ids = partidos.Select(p => p.Id).ToList();
        var conteos = await _db.AnotacionesPartido.AsNoTracking()
            .Where(a => ids.Contains(a.PartidoId))
            .GroupBy(a => a.PartidoId)
            .Select(g => new { PartidoId = g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.PartidoId, x => x.Total);

        var mios = new HashSet<string>();
        var uid = User.IdOrEmpty();
        if (!string.IsNullOrEmpty(uid))
        {
            var propios = await _db.AnotacionesPartido.AsNoTracking()
                .Where(a => ids.Contains(a.PartidoId) && a.UsuarioId == uid)
                .Select(a => a.PartidoId)
                .ToListAsync();
            mios = new HashSet<string>(propios);
        }

        return Ok(new
        {
            ok = true,
            partidos = partidos.Select(p => PartidoShape(p,
                conteos.TryGetValue(p.Id, out var c) ? c : 0,
                mios.Contains(p.Id)))
        });
    }

    // Mis partidos: los que organizo y los que me anoté (hoy en adelante).
    [HttpGet("mios")]
    public async Task<IActionResult> Mios()
    {
        var uid = User.IdOrEmpty();
        var hoy = DateTime.Today;

        var partidos = await _db.PartidosAbiertos.AsNoTracking()
            .Include(p => p.Organizador)
            .Include(p => p.Anotaciones)
            .Where(p => p.Fecha >= hoy && (p.OrganizadorId == uid || p.Anotaciones.Any(a => a.UsuarioId == uid)))
            .OrderBy(p => p.Fecha).ThenBy(p => p.DesdeMin)
            .ToListAsync();

        var organizo = partidos.Where(p => p.OrganizadorId == uid).ToList();
        var meAnote = partidos.Where(p => p.Anotaciones.Any(a => a.UsuarioId == uid)).ToList();

        var idsInscritos = organizo
            .SelectMany(p => p.Anotaciones.Select(a => a.UsuarioId))
            .Distinct().ToList();
        var nombres = idsInscritos.Count == 0
            ? new Dictionary<string, string>()
            : await _db.Usuarios.AsNoTracking()
                .Where(u => idsInscritos.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Nombre);

        string Nom(string id) => nombres.TryGetValue(id, out var n) ? n : "Jugador";

        return Ok(new
        {
            ok = true,
            organizo = organizo.Select(p => PartidoShape(p, p.Anotaciones.Count, false,
                p.Anotaciones.Select(a => Nom(a.UsuarioId)).ToList())),
            meAnote = meAnote.Select(p => PartidoShape(p, p.Anotaciones.Count, true))
        });
    }

    // Publicar un partido (cualquier usuario autenticado). Foto opcional.
    [HttpPost]
    [RequestSizeLimit(3_500_000)]
    public async Task<IActionResult> Crear([FromForm] PartidoRequest request)
    {
        var uid = User.IdOrEmpty();
        if (_rateLimiter.IsLimited($"partidos-pub:{uid}", 20, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiadas publicaciones. Espera un momento antes de reintentar." });

        var titulo = (request.Titulo ?? "").Trim();
        if (titulo.Length < 3 || titulo.Length > 80)
            return BadRequest(new { error = "Título de 3 a 80 caracteres" });

        var formato = (request.Formato ?? "").Trim();
        if (!Formatos.Contains(formato))
            return BadRequest(new { error = "Formato inválido" });

        var nivel = (request.Nivel ?? "").Trim();
        if (!Niveles.Contains(nivel))
            return BadRequest(new { error = "Nivel inválido" });

        if (request.CuposTotales is null || request.CuposTotales < 2 || request.CuposTotales > 30)
            return BadRequest(new { error = "Cupos totales entre 2 y 30" });

        var fecha = DtoFormat.ParseFechaDia(request.Fecha);
        if (fecha is null)
            return BadRequest(new { error = "Fecha inválida" });
        if (fecha.Value.Date < DateTime.Today)
            return BadRequest(new { error = "La fecha no puede ser pasada" });

        if (!TryHora(request.Desde, out var desde) || !TryHora(request.Hasta, out var hasta) || desde >= hasta)
            return BadRequest(new { error = "Horario inválido" });

        var distrito = ComplejosController.NormalizarDistrito(request.Distrito);
        if (distrito is null)
            return BadRequest(new { error = "Distrito inválido (Arequipa)" });

        var cancha = (request.Cancha ?? "").Trim();
        if (cancha.Length < 2 || cancha.Length > 80)
            return BadRequest(new { error = "Cancha de 2 a 80 caracteres" });

        string? superficie = null;
        if (!string.IsNullOrWhiteSpace(request.Superficie))
        {
            superficie = request.Superficie.Trim();
            if (!Superficies.Contains(superficie))
                return BadRequest(new { error = "Superficie inválida" });
        }

        var precio = request.Precio ?? 0;
        if (precio < 0 || precio > 9999)
            return BadRequest(new { error = "Precio inválido" });

        var descripcion = string.IsNullOrWhiteSpace(request.Descripcion)
            ? null : request.Descripcion.Trim()[..Math.Min(500, request.Descripcion.Trim().Length)];

        var id = JwtService.NewId();
        string? fotoUrl = null;
        if (!string.IsNullOrWhiteSpace(request.FotoUrl))
        {
            if (!MediaPublica.Configurada)
                return StatusCode(503, new { error = "La subida de imágenes no está configurada" });
            fotoUrl = MediaPublica.Validar(request.FotoUrl, MediaPublica.PrefijoPropio("partido", User));
            if (fotoUrl is null)
                return BadRequest(new { error = "URL de imagen inválida" });
        }
        else if (request.Foto is not null && request.Foto.Length > 0)
        {
            Response.Headers["Deprecation"] = "true";
            _logger.LogWarning("LegacyUploadUsed {Endpoint} {UserId}", "POST /api/partidos (foto)", uid);
            if (request.Foto.Length > ImagenArchivo.TopeBytes)
                return BadRequest(new { error = "La imagen no puede superar 3 MB" });
            var ext = await ImagenArchivo.DetectarExtensionAsync(request.Foto);
            if (ext is null)
                return BadRequest(new { error = "Solo se aceptan imágenes JPG, PNG, WEBP o GIF" });
            fotoUrl = await ImagenArchivo.GuardarVersionadaAsync(_env, "partidos", id, request.Foto, ext);
        }

        var partido = new PartidoAbierto
        {
            Id = id,
            OrganizadorId = uid,
            Titulo = titulo,
            Descripcion = descripcion,
            Formato = formato,
            Nivel = nivel,
            CuposTotales = request.CuposTotales.Value,
            Distrito = distrito,
            Cancha = cancha,
            Superficie = superficie,
            Precio = precio,
            Fecha = fecha.Value.Date,
            DesdeMin = desde,
            HastaMin = hasta,
            FotoUrl = fotoUrl,
            CreadoEn = DateTime.UtcNow
        };
        _db.PartidosAbiertos.Add(partido);
        await _db.SaveChangesAsync();
        partido.Organizador = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == uid);
        return StatusCode(201, new { ok = true, partido = PartidoShape(partido, 0, false) });
    }

    // Anotarme a un partido (una sola vez; respeta los cupos).
    [HttpPost("{id}/anotarse")]
    public async Task<IActionResult> Anotarse(string id)
    {
        var uid = User.IdOrEmpty();
        if (_rateLimiter.IsLimited($"partidos-join:{uid}", 60, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiados intentos. Espera un momento antes de reintentar." });

        var partido = await _db.PartidosAbiertos
            .Include(p => p.Organizador)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (partido is null)
            return NotFound(new { error = "Partido no encontrado" });
        if (partido.Fecha < DateTime.Today)
            return BadRequest(new { error = "El partido ya pasó" });

        var ya = await _db.AnotacionesPartido.AsNoTracking()
            .AnyAsync(a => a.PartidoId == id && a.UsuarioId == uid);
        if (ya)
            return Conflict(new { error = "Ya estás anotado en este partido" });

        var total = await _db.AnotacionesPartido.CountAsync(a => a.PartidoId == id);
        if (total >= partido.CuposTotales)
            return Conflict(new { error = "El partido ya está lleno" });

        _db.AnotacionesPartido.Add(new AnotacionPartido
        {
            Id = JwtService.NewId(),
            PartidoId = id,
            UsuarioId = uid,
            CreadoEn = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok(new { ok = true, partido = PartidoShape(partido, total + 1, true) });
    }

    // Salirme de un partido al que me anoté.
    [HttpDelete("{id}/anotarse")]
    public async Task<IActionResult> Salirse(string id)
    {
        var uid = User.IdOrEmpty();
        var anotacion = await _db.AnotacionesPartido
            .FirstOrDefaultAsync(a => a.PartidoId == id && a.UsuarioId == uid);
        if (anotacion is null)
            return NotFound(new { error = "No estás anotado en este partido" });
        _db.AnotacionesPartido.Remove(anotacion);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    // Cambiar la foto de un partido propio con una URL ya subida a R2.
    // Mismos permisos que cancelarlo: organizador o plataforma.
    [HttpPut("{id}/foto")]
    public async Task<IActionResult> GuardarFotoUrl(string id, [FromBody] MediaPublica.UrlRequest request)
    {
        if (!MediaPublica.Configurada)
            return StatusCode(503, new { error = "La subida de imágenes no está configurada" });
        var partido = await _db.PartidosAbiertos.Include(p => p.Organizador).FirstOrDefaultAsync(p => p.Id == id);
        if (partido is null)
            return NotFound(new { error = "Partido no encontrado" });
        var uid = User.IdOrEmpty();
        if (!User.IsInRole("TECNICO") && partido.OrganizadorId != uid)
            return StatusCode(403, new { error = "Solo el organizador puede cambiar la foto" });
        var url = request.Url?.Trim() == partido.FotoUrl
            ? MediaPublica.Validar(request.Url)
            : MediaPublica.Validar(request.Url, MediaPublica.PrefijoPropio("partido", User));
        if (url is null)
            return BadRequest(new { error = "URL de imagen inválida" });

        var anterior = partido.FotoUrl;
        partido.FotoUrl = url;
        await _db.SaveChangesAsync();
        if (anterior != url) await _r2.BorrarAsync(anterior, "partido");
        var anotados = await _db.AnotacionesPartido.CountAsync(a => a.PartidoId == id);
        var anotado = await _db.AnotacionesPartido.AnyAsync(a => a.PartidoId == id && a.UsuarioId == uid);
        return Ok(new { ok = true, partido = PartidoShape(partido, anotados, anotado) });
    }

    // Cancelar un partido propio (el organizador o la plataforma).
    [HttpDelete("{id}")]
    public async Task<IActionResult> Eliminar(string id)
    {
        var partido = await _db.PartidosAbiertos.FirstOrDefaultAsync(p => p.Id == id);
        if (partido is null)
            return NotFound(new { error = "Partido no encontrado" });

        var uid = User.IdOrEmpty();
        var esPlataforma = User.IsInRole("TECNICO");
        if (!esPlataforma && partido.OrganizadorId != uid)
            return StatusCode(403, new { error = "Solo el organizador puede cancelarlo" });

        _db.PartidosAbiertos.Remove(partido);
        await _db.SaveChangesAsync();
        await _r2.BorrarAsync(partido.FotoUrl, "partido");

        if (!string.IsNullOrWhiteSpace(partido.FotoUrl) && partido.FotoUrl.StartsWith("/uploads/"))
        {
            try
            {
                var webRoot = _env.WebRootPath;
                if (string.IsNullOrEmpty(webRoot))
                    webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
                var ruta = Path.Combine(webRoot, partido.FotoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(ruta))
                    System.IO.File.Delete(ruta);
            }
            catch { /* mejor esfuerzo */ }
        }
        return Ok(new { ok = true });
    }

    private static bool TryHora(string? value, out int minutos)
    {
        minutos = 0;
        if (string.IsNullOrWhiteSpace(value))
            return false;
        if (!TimeSpan.TryParse(value.Trim(), out var ts))
            return false;
        if (ts < TimeSpan.Zero || ts >= TimeSpan.FromDays(1))
            return false;
        minutos = (int)ts.TotalMinutes;
        return true;
    }

    private static object PartidoShape(PartidoAbierto p, int anotados, bool anotado, List<string>? inscritos = null)
    {
        var fecha = p.Fecha.Date;
        var hoy = DateTime.Today;
        var fechaCorta = fecha == hoy ? "Hoy"
            : fecha == hoy.AddDays(1) ? "Mañana"
            : fecha.ToString("dd/MM");
        var desde = $"{p.DesdeMin / 60:00}:{p.DesdeMin % 60:00}";
        var hasta = $"{p.HastaMin / 60:00}:{p.HastaMin % 60:00}";
        return new
        {
            p.Id,
            p.Titulo,
            p.Descripcion,
            p.Formato,
            p.Nivel,
            p.CuposTotales,
            CuposLibres = Math.Max(0, p.CuposTotales - anotados),
            p.Distrito,
            p.Cancha,
            p.Superficie,
            p.Precio,
            Fecha = fecha.ToString("yyyy-MM-dd"),
            Desde = desde,
            Hasta = hasta,
            Cuando = $"{fechaCorta} {desde}",
            FechaCorta = fechaCorta,
            HoraCorta = desde,
            p.FotoUrl,
            Anotado = anotado,
            Inscritos = inscritos ?? new List<string>(),
            Organizador = p.Organizador == null
                ? null : new { p.Organizador.Id, p.Organizador.Nombre },
            CreadoEn = DtoFormat.Utc(p.CreadoEn)
        };
    }
}
