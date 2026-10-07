using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

[ApiController]
[Route("api/canchas")]
public class CanchasController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<CanchasController> _logger;
    private readonly AlmacenR2 _r2;

    public CanchasController(AppDbContext db, IWebHostEnvironment env, ILogger<CanchasController> logger, AlmacenR2 r2)
    {
        _db = db;
        _env = env;
        _logger = logger;
        _r2 = r2;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool? activas = null, [FromQuery] bool? propias = null)
    {
        var query = _db.Canchas.AsNoTracking()
            .Include(c => c.Complejo!).ThenInclude(c => c.Dueno)
            .AsQueryable();

        if (activas.HasValue)
            query = query.Where(c => c.Activa == activas.Value);

        if (propias == true)
        {
            // Gestión: sus canchas (de sus complejos + legacy sin
            // complejo) o todo si plataforma (TECNICO).
            if (User.Identity?.IsAuthenticated != true)
                return Unauthorized(new { error = "No autenticado" });
            if (!ComplejoAccess.EsPlataforma(User))
            {
                var ids = await ComplejoAccess.IdsAsync(_db, User) ?? new List<string>();
                query = query.Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!));
            }
        }

        var canchas = await query
            .OrderBy(c => c.Nombre)
            .ToListAsync();
        return Ok(new { canchas = canchas.Select(CanchaDto.From) });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var cancha = await _db.Canchas.AsNoTracking()
            .Include(c => c.Complejo!).ThenInclude(c => c.Dueno)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });
        return Ok(new { cancha = CanchaDto.From(cancha) });
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Create([FromBody] CanchaRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            request.Tipo is null ||
            request.PrecioPorHora is null ||
            request.Capacidad is null)
            return BadRequest(new { error = "Faltan campos requeridos" });
        if (request.PrecioPorHora <= 0 || request.Capacidad <= 0)
            return BadRequest(new { error = "El precio y la capacidad deben ser mayores que cero" });

        var complejoId = string.IsNullOrWhiteSpace(request.ComplejoId) ? null : request.ComplejoId.Trim();
        // Sin complejo la cancha no aparece en filtros de lugar/dueño: los
        // dueños deben asignar siempre uno de sus complejos. Solo la
        // plataforma (TECNICO) puede publicar canchas globales legacy.
        if (complejoId is null && !ComplejoAccess.EsPlataforma(User))
            return BadRequest(new { error = "Asignar un complejo es obligatorio: sin complejo tu cancha no aparece en búsquedas por lugar ni dueño." });
        if (complejoId is not null)
        {
            var existe = await _db.Complejos.AsNoTracking().AnyAsync(c => c.Id == complejoId);
            if (!existe)
                return BadRequest(new { error = "Complejo no encontrado" });
            if (!await ComplejoAccess.EsDuenoAsync(_db, User, complejoId))
                return StatusCode(403, new { error = "Sin permisos" });
        }
        if (complejoId is not null)
        {
            if (!await ConvenioPrueba.Habilitados(_db).AnyAsync(id => id == complejoId))
                return StatusCode(403, new { error = "Suscríbete para reactivar tu cancha." });
            if (!await ConvenioPrueba.ActivaAsync(_db, complejoId) && await _db.Canchas.AnyAsync(c => c.ComplejoId == complejoId))
                return Conflict(new { error = "La prueba gratis permite máximo una cancha. Solicita una suscripción para añadir otra." });
        }
        string? imagen = null;
        if (!string.IsNullOrWhiteSpace(request.Imagen))
        {
            imagen = ValidarImagen(request.Imagen, MediaPublica.PrefijoPropio("cancha", User));
            if (imagen is null)
                return BadRequest(new { error = "Imagen inválida (URL http(s) o ruta / de hasta 500 caracteres)" });
        }

        var cancha = new Models.Cancha
        {
            Id = JwtService.NewId(),
            Nombre = request.Nombre.Trim(),
            Tipo = request.Tipo.Value,
            Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
            PrecioPorHora = request.PrecioPorHora.Value,
            Capacidad = request.Capacidad.Value,
            Techada = request.Techada ?? false,
            Superficie = string.IsNullOrWhiteSpace(request.Superficie) ? null : request.Superficie.Trim(),
            Activa = request.Activa ?? true,
            Imagen = imagen,
            ComplejoId = complejoId,
            CreadoEn = DateTime.UtcNow
        };

        _db.Canchas.Add(cancha);
        try
        {
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "40001" })
        {
            return Conflict(new { error = "Otra solicitud cambió las canchas. Revisa la lista antes de reintentar." });
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "40001")
        {
            return Conflict(new { error = "Otra solicitud cambió las canchas. Revisa la lista antes de reintentar." });
        }

        return StatusCode(201, new { ok = true, cancha = CanchaDto.From(cancha) });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Update(string id, [FromBody] CanchaRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var cancha = await _db.Canchas.FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });
        if (!await PuedoGestionarCanchaAsync(cancha))
            return StatusCode(403, new { error = "Sin permisos" });

        var imagenAnterior = cancha.Imagen;

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            cancha.Nombre = request.Nombre.Trim();
        if (request.Tipo is not null)
            cancha.Tipo = request.Tipo.Value;
        if (request.Descripcion is not null)
            cancha.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        if (request.PrecioPorHora is not null)
        {
            if (request.PrecioPorHora <= 0)
                return BadRequest(new { error = "El precio debe ser mayor que cero" });
            cancha.PrecioPorHora = request.PrecioPorHora.Value;
        }
        if (request.Capacidad is not null)
        {
            if (request.Capacidad <= 0)
                return BadRequest(new { error = "La capacidad debe ser mayor que cero" });
            cancha.Capacidad = request.Capacidad.Value;
        }
        if (request.Activa is not null)
            cancha.Activa = request.Activa.Value;
        if (request.Techada is not null)
            cancha.Techada = request.Techada.Value;
        if (request.Superficie is not null)
            cancha.Superficie = string.IsNullOrWhiteSpace(request.Superficie) ? null : request.Superficie.Trim();
        if (request.Imagen is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Imagen))
            {
                cancha.Imagen = null;
            }
            else
            {
                // Solo una imagen nueva se exige de la carpeta propia; editar otros
                // campos reenviando la actual sigue funcionando.
                var imagen = ValidarImagen(request.Imagen,
                    request.Imagen.Trim() == cancha.Imagen ? null : MediaPublica.PrefijoPropio("cancha", User));
                if (imagen is null)
                    return BadRequest(new { error = "Imagen inválida (URL http(s) o ruta / de hasta 500 caracteres)" });
                if (cancha.Imagen != imagen)
                    cancha.Imagen = imagen;
            }
        }
        if (request.ComplejoId is not null)
        {
            var nuevo = string.IsNullOrWhiteSpace(request.ComplejoId) ? null : request.ComplejoId.Trim();
            if (nuevo != cancha.ComplejoId)
            {
                // Desasignar deja la cancha fuera de los filtros: solo TECNICO.
                if (nuevo is null && !ComplejoAccess.EsPlataforma(User))
                    return BadRequest(new { error = "No puedes quitar la cancha de su complejo: contacta al administrador." });
                // Mover/desasignar exige permiso sobre el destino (origen ya validado arriba).
                if (nuevo is not null)
                {
                    var existe = await _db.Complejos.AsNoTracking().AnyAsync(c => c.Id == nuevo);
                    if (!existe)
                        return BadRequest(new { error = "Complejo no encontrado" });
                    if (!await ComplejoAccess.EsDuenoAsync(_db, User, nuevo))
                        return StatusCode(403, new { error = "Sin permisos" });
                    if (!await ConvenioPrueba.Habilitados(_db).AnyAsync(c => c == nuevo))
                        return StatusCode(403, new { error = "Suscríbete para reactivar la cancha del complejo de destino." });
                    if (!await ConvenioPrueba.ActivaAsync(_db, nuevo) && await _db.Canchas.AnyAsync(c => c.ComplejoId == nuevo && c.Id != id))
                        return Conflict(new { error = "El complejo de destino está en prueba y permite máximo una cancha." });
                }
                cancha.ComplejoId = nuevo;
            }
        }

        try
        {
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "40001" })
        {
            return Conflict(new { error = "Otra solicitud cambió las canchas. Revisa la lista antes de reintentar." });
        }
        catch (PostgresException ex) when (ex.SqlState == "40001")
        {
            return Conflict(new { error = "Otra solicitud cambió las canchas. Revisa la lista antes de reintentar." });
        }

        if (imagenAnterior != cancha.Imagen) await BorrarImagenAsync(imagenAnterior);
        return Ok(new { ok = true, cancha = CanchaDto.From(cancha) });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Delete(string id)
    {
        var cancha = await _db.Canchas.FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return Ok(new { ok = true });

        if (!await PuedoGestionarCanchaAsync(cancha))
            return StatusCode(403, new { error = "Sin permisos" });

        _db.Canchas.Remove(cancha);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23503" or "23001" })
        {
            return Conflict(new
            {
                error = "No se puede eliminar: la cancha tiene reservas asociadas. Desactívala en su lugar."
            });
        }

        await BorrarImagenAsync(cancha.Imagen);
        return Ok(new { ok = true });
    }

    // Borra la imagen reemplazada: archivo local /uploads/... o objeto R2. Mejor esfuerzo.
    private async Task BorrarImagenAsync(string? imagen)
    {
        await _r2.BorrarAsync(imagen, "cancha");
        BorrarImagenLocal(imagen);
    }

    private void BorrarImagenLocal(string? imagen)
    {
        if (string.IsNullOrWhiteSpace(imagen) || !imagen.StartsWith("/uploads/"))
            return;
        try
        {
            var raiz = Path.GetFullPath(_env.WebRootPath);
            var ruta = Path.GetFullPath(Path.Combine(raiz, imagen.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
            if (ruta.StartsWith(raiz, StringComparison.OrdinalIgnoreCase) && System.IO.File.Exists(ruta))
                System.IO.File.Delete(ruta);
        }
        catch { /* mejor esfuerzo */ }
    }

    // Vitrina del jugador: sin filtros devuelve las 10 primeras visibles;
    // con filtros, todas las que coincidan. Solo canchas activas visibles
    // (complejo publicado + suscripción vigente) o legacy sin complejo.
    // Con fecha+horas agrega disponibilidad y estimado.
    [HttpGet("disponibles")]
    [AllowAnonymous]
    public async Task<IActionResult> Disponibles(
        [FromQuery] string? q, [FromQuery] string? distrito, [FromQuery] string? ciudad,
        [FromQuery] string? duenoId, [FromQuery] string? complejoId,
        [FromQuery] string? tipo, [FromQuery] string? fecha,
        [FromQuery] int? horaInicio, [FromQuery] int? horaFin)
    {
        q = string.IsNullOrWhiteSpace(q) ? null : q.Trim();
        distrito = string.IsNullOrWhiteSpace(distrito) ? null : distrito.Trim();
        ciudad = string.IsNullOrWhiteSpace(ciudad) ? null : ciudad.Trim();
        duenoId = string.IsNullOrWhiteSpace(duenoId) ? null : duenoId.Trim();
        complejoId = string.IsNullOrWhiteSpace(complejoId) ? null : complejoId.Trim();
        var sinFiltros = q is null && distrito is null && ciudad is null && duenoId is null &&
            complejoId is null && string.IsNullOrWhiteSpace(tipo);

        var (slot, slotError) = ValidarSlot(fecha, horaInicio, horaFin);
        if (slotError is not null)
            return BadRequest(new { error = slotError });

        TipoCancha? tipoCancha = null;
        if (!string.IsNullOrWhiteSpace(tipo))
        {
            if (!Enum.TryParse<TipoCancha>(tipo, ignoreCase: true, out var tc))
                return BadRequest(new { error = "Tipo inválido" });
            tipoCancha = tc;
        }

        var visiblesQuery = ComplejoAccess.IdsVisiblesQuery(_db);
        var query = _db.Canchas.AsNoTracking()
            .Include(c => c.Complejo!).ThenInclude(c => c.Dueno)
            .Where(c => c.Activa && (c.ComplejoId == null || visiblesQuery.Contains(c.ComplejoId!)))
            .AsQueryable();

        if (q is not null)
        {
            var patron = $"%{q.Replace("%", "").Replace("_", "")}%";
            query = query.Where(c =>
                EF.Functions.ILike(c.Nombre, patron) ||
                (c.Descripcion != null && EF.Functions.ILike(c.Descripcion, patron)) ||
                (c.Complejo != null && EF.Functions.ILike(c.Complejo.Nombre, patron)));
        }
        if (distrito is not null)
        {
            var patron = $"%{distrito.Replace("%", "").Replace("_", "")}%";
            query = query.Where(c => c.Complejo != null && EF.Functions.ILike(c.Complejo.Distrito, patron));
        }
        if (ciudad is not null)
        {
            // Todo opera en Arequipa: las legacy sin complejo también cuentan.
            var patron = $"%{ciudad.Replace("%", "").Replace("_", "")}%";
            query = query.Where(c => c.Complejo == null || EF.Functions.ILike(c.Complejo.Ciudad, patron));
        }
        if (duenoId is not null)
            query = query.Where(c => c.Complejo != null && c.Complejo.DuenoId == duenoId);
        if (complejoId is not null)
            query = query.Where(c => c.ComplejoId == complejoId);
        if (tipoCancha.HasValue)
            query = query.Where(c => c.Tipo == tipoCancha.Value);

        var canchasQuery = query.OrderBy(c => c.Nombre);
        var canchas = await canchasQuery.ToListAsync();
        var total = canchas.Count;
        var limiteAplicado = false;
        if (sinFiltros && slot is null && total > 10)
        {
            // Portada del buscador: 10 primeras para no marear.
            limiteAplicado = true;
            canchas = canchas.Take(10).ToList();
        }

        var ocupadas = new HashSet<string>();
        List<Promocion> promos = new();
        var conSlot = slot is not null;
        var fechaSlot = slot?.Fecha ?? DateTime.MinValue;
        var inicioSlot = slot?.Inicio ?? 0;
        var finSlot = slot?.Fin ?? 0;
        if (conSlot)
        {
            var ids = canchas.Select(c => c.Id).ToList();
            ocupadas = await _db.Reservas.AsNoTracking()
                .Where(r => ids.Contains(r.CanchaId) && r.Fecha == fechaSlot &&
                    r.Estado == EstadoReserva.CONFIRMADA &&
                    r.HoraInicio < finSlot && r.HoraFin > inicioSlot)
                .Select(r => r.CanchaId)
                .ToHashSetAsync();
            promos = await PrecioCancha.PromosAplicablesAsync(
                _db, ids, canchas.Select(c => c.ComplejoId));
        }

        return Ok(new
        {
            ok = true,
            total,
            limiteAplicado,
            canchas = canchas.Select(c =>
            {
                var disponible = !conSlot || !ocupadas.Contains(c.Id);
                Cotizacion? cot = null;
                if (conSlot)
                {
                    var propias = promos
                        .Where(p => p.CanchaId == c.Id || p.ComplejoId == c.ComplejoId ||
                            (p.CanchaId == null && p.ComplejoId == null))
                        .ToList();
                    cot = PrecioCancha.Cotizar(c.PrecioPorHora, propias,
                        fechaSlot, inicioSlot, finSlot);
                }
                return new
                {
                    cancha = CanchaDto.From(c),
                    disponible,
                    motivo = !disponible ? "Ocupada en ese horario" : (string?)null,
                    totalEstimado = cot is null ? null : DtoFormat.Money(cot.Total),
                    reglaPrecio = cot?.Regla
                };
            })
        });
    }

    // Opciones para armar los filtros del buscador (solo vitrina visible).
    // Distritos y ciudad fijos de Arequipa (aunque aún no haya locales);
    // dueños, locales y sugerencias salen de lo publicado.
    [HttpGet("opciones")]
    [AllowAnonymous]
    public async Task<IActionResult> Opciones()
    {
        var visiblesQuery = ComplejoAccess.IdsVisiblesQuery(_db);
        var complejos = await _db.Complejos.AsNoTracking()
            .Include(c => c.Dueno)
            .Where(c => c.Publicado && visiblesQuery.Contains(c.Id))
            .OrderBy(c => c.Nombre)
            .ToListAsync();
        var nombresCanchas = await _db.Canchas.AsNoTracking()
            .Where(c => c.Activa && (c.ComplejoId == null || visiblesQuery.Contains(c.ComplejoId!)))
            .OrderBy(c => c.Nombre)
            .Select(c => c.Nombre)
            .ToListAsync();

        return Ok(new
        {
            ok = true,
            distritos = ComplejosController.DistritosArequipa,
            ciudades = new[] { ComplejosController.CiudadUnica },
            duenos = complejos.Select(c => c.Dueno).Where(u => u != null)
                .DistinctBy(u => u!.Id).OrderBy(u => u!.Nombre)
                .Select(u => new { u!.Id, u!.Nombre }),
            complejos = complejos.Select(c => new { c.Id, c.Nombre, c.Distrito, c.Ciudad }),
            sugerencias = complejos.Select(c => c.Nombre)
                .Concat(nombresCanchas).Distinct().OrderBy(n => n)
        });
    }

    // Cotización puntual con franjas aplicadas (misma lógica que al reservar).
    [HttpGet("{id}/cotizar")]
    [AllowAnonymous]
    public async Task<IActionResult> Cotizar(string id,
        [FromQuery] string? fecha, [FromQuery] int? horaInicio, [FromQuery] int? horaFin)
    {
        var cancha = await _db.Canchas.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });
        if (!cancha.Activa)
            return BadRequest(new { error = "Cancha no disponible" });

        var (slot, slotError) = ValidarSlot(fecha, horaInicio, horaFin, exigir: true);
        if (slotError is not null || slot is null)
            return BadRequest(new { error = slotError ?? "Fecha y horario requeridos" });

        var promos = await PrecioCancha.PromosAplicablesAsync(
            _db, new[] { cancha.Id }, new[] { cancha.ComplejoId });
        var cot = PrecioCancha.Cotizar(cancha.PrecioPorHora, promos,
            slot.Fecha, slot.Inicio, slot.Fin);
        return Ok(new
        {
            ok = true,
            total = DtoFormat.Money(cot.Total),
            moneda = "PEN",
            regla = cot.Regla
        });
    }

    // Subida de imagen desde archivo (no por link). Misma regla que perfiles:
    // ver Services/ImagenArchivo (bytes mágicos, tope 3 MB, versionado).
    [HttpPost("{id}/imagen")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    [RequestSizeLimit(3_500_000)]
    public async Task<IActionResult> SubirImagen(string id, IFormFile archivo)
    {
        Response.Headers["Deprecation"] = "true";
        _logger.LogWarning("LegacyUploadUsed {Endpoint} {UserId}", "POST /api/canchas/{id}/imagen", User.IdOrEmpty());
        var cancha = await _db.Canchas.FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });
        if (!await PuedoGestionarCanchaAsync(cancha))
            return StatusCode(403, new { error = "Sin permisos" });
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { error = "Archivo requerido" });
        if (archivo.Length > ImagenArchivo.TopeBytes)
            return BadRequest(new { error = "La imagen no puede superar 3 MB" });

        var ext = await ImagenArchivo.DetectarExtensionAsync(archivo);
        if (ext is null)
            return BadRequest(new { error = "Solo se aceptan imágenes JPG, PNG, WEBP o GIF" });

        try
        {
            var anterior = cancha.Imagen;
            cancha.Imagen = await ImagenArchivo.GuardarVersionadaAsync(_env, "canchas", cancha.Id, archivo, ext);
            await _db.SaveChangesAsync();
            await _r2.BorrarAsync(anterior, "cancha");
            return Ok(new { ok = true, cancha = CanchaDto.From(cancha) });
        }
        catch (Exception ex)
        {
            // En hosting efímero (Render free) el FS puede fallar: el panel
            // muestra este mensaje en vez de un 500 opaco.
            _logger.LogError(ex, "No se pudo guardar imagen de cancha {CanchaId}", id);
            return StatusCode(500, new { error = $"No se pudo guardar la imagen en el servidor ({ex.GetType().Name})" });
        }
    }

    // Imagen ya subida por el navegador a R2 (ver /api/upload en la web): solo
    // se guarda la URL pública. Mismos permisos que SubirImagen.
    [HttpPut("{id}/imagen")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> GuardarImagenUrl(string id, [FromBody] MediaPublica.UrlRequest request)
    {
        if (!MediaPublica.Configurada)
            return StatusCode(503, new { error = "La subida de imágenes no está configurada" });
        var cancha = await _db.Canchas.FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });
        if (!await PuedoGestionarCanchaAsync(cancha))
            return StatusCode(403, new { error = "Sin permisos" });
        var url = request.Url?.Trim() == cancha.Imagen
            ? MediaPublica.Validar(request.Url)
            : MediaPublica.Validar(request.Url, MediaPublica.PrefijoPropio("cancha", User));
        if (url is null)
            return BadRequest(new { error = "URL de imagen inválida" });

        var anterior = cancha.Imagen;
        cancha.Imagen = url;
        await _db.SaveChangesAsync();
        if (anterior != url) await BorrarImagenAsync(anterior);
        return Ok(new { ok = true, cancha = CanchaDto.From(cancha) });
    }

    // Gestión: plataforma todo; resto sus canchas (de sus complejos +
    // legacy sin complejo, que es compartido). Legacy global sin dueño asignado.
    private async Task<bool> PuedoGestionarCanchaAsync(Models.Cancha cancha)
    {
        if (ComplejoAccess.EsPlataforma(User))
            return true;
        if (cancha.ComplejoId is null)
            return false;
        return await ComplejoAccess.EsDuenoAsync(_db, User, cancha.ComplejoId);
    }

    // prefijoR2: si la imagen es un objeto de nuestro bucket (borrable al
    // reemplazarla), su clave debe empezar por él. Enlaces externos y /uploads no cambian.
    internal static string? ValidarImagen(string? value, string? prefijoR2 = null)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var v = value.Trim();
        if (v.Length > 500 || v.Contains(' ') || v.Contains('"') || v.Contains('<'))
            return null;
        if (v.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            v.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            v.StartsWith("/"))
        {
            if (prefijoR2 is not null && MediaPublica.Clave(v) is not null && MediaPublica.Validar(v, prefijoR2) is null)
                return null;
            return v;
        }
        return null;
    }

    private sealed record Slot(DateTime Fecha, int Inicio, int Fin);

    // Valida el trío fecha+horas: todo o nada (exigir=true lo hace obligatorio).
    private static (Slot? slot, string? error) ValidarSlot(
        string? fecha, int? horaInicio, int? horaFin, bool exigir = false)
    {
        if (fecha is null && horaInicio is null && horaFin is null)
            return exigir ? (null, "Fecha y horario requeridos") : ((Slot?)null, null);
        if (fecha is null || horaInicio is null || horaFin is null)
            return (null, "Fecha, hora de inicio y hora de fin van juntas");
        var dia = DtoFormat.ParseFechaDia(fecha);
        if (dia is null)
            return (null, "Fecha inválida");
        var inicio = horaInicio.Value;
        var fin = horaFin.Value;
        if (inicio < 0 || inicio >= 1440 || fin < 1 || fin > 1440 || fin <= inicio)
            return (null, "Horario inválido: la hora de fin debe ser posterior a la de inicio");
        return (new Slot(dia.Value, inicio, fin), null);
    }
}