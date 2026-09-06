using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
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
[Route("api/complejos")]
[Authorize]
public class ComplejosController : ControllerBase
{
    private readonly AppDbContext _db;

    public ComplejosController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class ComplejoRequest
    {
        public string? Nombre { get; set; }
        public string? Direccion { get; set; }
        public string? Distrito { get; set; }
        public string? Ciudad { get; set; }
        public string? Telefono { get; set; }
        public string? Descripcion { get; set; }
        public string? Email { get; set; }
        public bool? Publicado { get; set; }
    }

    private sealed record Stats(int Canchas, int Proximas, double Ocupacion);

    // MVP single-city: todo opera en Arequipa. El distrito debe ser uno de la
    // provincia y la ciudad siempre se guarda como "Arequipa".
    public const string CiudadUnica = "Arequipa";

    public static readonly string[] DistritosArequipa = new[]
    {
        "Alto Selva Alegre", "Arequipa", "Cayma", "Cerro Colorado", "Characato",
        "Chiguata", "Jacobo Hunter", "José Luis Bustamante y Rivero", "La Joya",
        "Mariano Melgar", "Miraflores", "Mollebaya", "Paucarpata", "Pocsi",
        "Polobaya", "Quequeña", "Sabandía", "Sachaca", "San Juan de Siguas",
        "San Juan de Tarucani", "Santa Isabel de Siguas", "Santa Rita de Siguas",
        "Socabaya", "Tiabaya", "Uchumayo", "Vitor", "Yanahuara", "Yarabamba", "Yura"
    };

    public static string? NormalizarDistrito(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var limpio = value.Trim();
        return DistritosArequipa.FirstOrDefault(d =>
            string.Equals(d, limpio, StringComparison.OrdinalIgnoreCase));
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        // Cada dueño/equipo ve sus complejos; plataforma (TECNICO) ve todo.
        var alcance = await ComplejoAccess.IdsAsync(_db, User);

        var query = _db.Complejos.AsNoTracking().AsQueryable();
        if (alcance is not null)
            query = query.Where(c => alcance.Contains(c.Id));

        var complejos = await query.OrderBy(c => c.Nombre).ToListAsync();
        var ids = complejos.Select(c => c.Id).ToList();
        var stats = await OcupacionPorComplejoAsync(ids);
        var subs = await SuscripcionesVigentesAsync(ids);

        return Ok(new
        {
            ok = true,
            complejos = complejos.Select(c =>
            {
                stats.TryGetValue(c.Id, out var s);
                s ??= new Stats(0, 0, 0.0);
                subs.TryGetValue(c.Id, out var sub);
                return ComplejoShape(c, s.Canchas, s.Proximas, s.Ocupacion, sub);
            })
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var complejo = await _db.Complejos.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
        if (complejo is null)
            return NotFound(new { error = "No encontrado" });
        if (!await PuedoVerAsync(id))
            return StatusCode(403, new { error = "Sin permisos" });

        var canchas = await _db.Canchas.AsNoTracking()
            .Where(c => c.ComplejoId == id)
            .OrderBy(c => c.Nombre)
            .ToListAsync();
        var stats = await OcupacionPorComplejoAsync(new List<string> { id });
        stats.TryGetValue(id, out var s);
        s ??= new Stats(canchas.Count, 0, 0.0);
        var subs = await SuscripcionesVigentesAsync(new List<string> { id });
        subs.TryGetValue(id, out var sub);

        return Ok(new
        {
            ok = true,
            complejo = ComplejoShape(complejo, canchas.Count, s.Proximas, s.Ocupacion, sub),
            canchas = canchas.Select(CanchaDto.From)
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ComplejoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            string.IsNullOrWhiteSpace(request.Direccion) ||
            string.IsNullOrWhiteSpace(request.Distrito))
            return BadRequest(new { error = "Nombre, dirección y distrito son requeridos" });
        var distrito = NormalizarDistrito(request.Distrito);
        if (distrito is null)
            return BadRequest(new { error = "Distrito inválido: debe ser un distrito de Arequipa" });

        var slug = await UniqueSlugAsync(Slugify(request.Nombre));

        var complejo = new Complejo
        {
            Id = JwtService.NewId(),
            Nombre = request.Nombre.Trim(),
            Direccion = request.Direccion.Trim(),
            Distrito = distrito,
            Ciudad = CiudadUnica,
            Telefono = string.IsNullOrWhiteSpace(request.Telefono) ? null : request.Telefono.Trim(),
            Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Slug = slug,
            Publicado = request.Publicado ?? false,
            DuenoId = User.IdOrEmpty(),
            CreadoEn = DateTime.UtcNow,
            ActualizadoEn = DateTime.UtcNow
        };

        _db.Complejos.Add(complejo);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "Ya existe un complejo con ese nombre" });
        }

        return StatusCode(201, new { ok = true, complejo = ComplejoShape(complejo, 0, 0, 0.0) });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] ComplejoRequest request)
    {
        var complejo = await _db.Complejos.FirstOrDefaultAsync(c => c.Id == id);
        if (complejo is null)
            return NotFound(new { error = "No encontrado" });
        if (!EsMio(complejo))
            return StatusCode(403, new { error = "Sin permisos" });

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            complejo.Nombre = request.Nombre.Trim();
        if (!string.IsNullOrWhiteSpace(request.Direccion))
            complejo.Direccion = request.Direccion.Trim();
        if (!string.IsNullOrWhiteSpace(request.Distrito))
        {
            var distrito = NormalizarDistrito(request.Distrito);
            if (distrito is null)
                return BadRequest(new { error = "Distrito inválido: debe ser un distrito de Arequipa" });
            complejo.Distrito = distrito;
        }
        complejo.Ciudad = CiudadUnica;
        if (request.Telefono is not null)
            complejo.Telefono = string.IsNullOrWhiteSpace(request.Telefono) ? null : request.Telefono.Trim();
        if (request.Descripcion is not null)
            complejo.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        if (request.Email is not null)
            complejo.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        if (request.Publicado is not null)
            complejo.Publicado = request.Publicado.Value;
        complejo.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, complejo = ComplejoShape(complejo, await ContarCanchasAsync(id), 0, 0.0) });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var complejo = await _db.Complejos.FirstOrDefaultAsync(c => c.Id == id);
        if (complejo is null)
            return Ok(new { ok = true });

        var rol = User.RolOr();
        if (!ComplejoAccess.EsPlataforma(User) && complejo.DuenoId != User.IdOrEmpty())
            return StatusCode(403, new { error = "Sin permisos" });

        var canchaIds = await _db.Canchas.AsNoTracking()
            .Where(c => c.ComplejoId == id)
            .Select(c => c.Id)
            .ToListAsync();
        var tieneReservas = await _db.Reservas.AsNoTracking()
            .AnyAsync(r => r.ComplejoId == id || canchaIds.Contains(r.CanchaId));
        if (tieneReservas)
            return Conflict(new { error = "No se puede eliminar: el complejo tiene reservas asociadas" });

        _db.Complejos.Remove(complejo);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23503" or "23001" })
        {
            return Conflict(new { error = "No se puede eliminar: el complejo tiene registros asociados" });
        }

        return Ok(new { ok = true });
    }

    private bool EsMio(Complejo c) =>
        ComplejoAccess.EsPlataforma(User) || c.DuenoId == User.IdOrEmpty();

    // Lectura: dueño, SUPERADMIN o miembro activo. Escritura: EsMio.
    private Task<bool> PuedoVerAsync(string complejoId) =>
        ComplejoAccess.TieneAccesoAsync(_db, User, complejoId);

    private Task<int> ContarCanchasAsync(string complejoId) =>
        _db.Canchas.AsNoTracking().CountAsync(c => c.ComplejoId == complejoId);

    // Ocupación simple: reservas no canceladas de los próximos 7 días.
    // ocupacion % = horas vendidas / (canchas * 12h * 7 días).
    private async Task<Dictionary<string, Stats>> OcupacionPorComplejoAsync(List<string> ids)
    {
        var result = ids.ToDictionary(id => id, _ => new Stats(0, 0, 0.0));
        if (ids.Count == 0)
            return result;

        var canchas = await _db.Canchas.AsNoTracking()
            .Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!))
            .Select(c => new { c.Id, ComplejoId = c.ComplejoId! })
            .ToListAsync();
        var canchaAComplejo = canchas.ToDictionary(c => c.Id, c => c.ComplejoId);
        foreach (var g in canchas.GroupBy(c => c.ComplejoId))
        {
            result.TryGetValue(g.Key, out var prev);
            result[g.Key] = new Stats(g.Count(), prev?.Proximas ?? 0, 0.0);
        }

        var hoy = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Unspecified);
        var limite = hoy.AddDays(7);
        var reservas = await _db.Reservas.AsNoTracking()
            .Where(r => r.Fecha >= hoy && r.Fecha < limite &&
                r.Estado != EstadoReserva.CANCELADA &&
                (r.ComplejoId != null && ids.Contains(r.ComplejoId!)))
            .Select(r => new { r.ComplejoId, r.CanchaId, r.HoraInicio, r.HoraFin })
            .ToListAsync();

        var horasPorComplejo = new Dictionary<string, double>();
        var countPorComplejo = new Dictionary<string, int>();
        foreach (var r in reservas)
        {
            string? cid = r.ComplejoId;
            if (cid is null && !canchaAComplejo.TryGetValue(r.CanchaId, out cid))
                continue;
            if (cid is null || !result.ContainsKey(cid))
                continue;
            countPorComplejo[cid] = countPorComplejo.GetValueOrDefault(cid) + 1;
            horasPorComplejo[cid] = horasPorComplejo.GetValueOrDefault(cid) + (r.HoraFin - r.HoraInicio) / 60.0;
        }

        // Reservas próximas sin complejoId directo pero con cancha del complejo.
        var canchaIds = canchaAComplejo.Keys.ToList();
        if (canchaIds.Count > 0)
        {
            var sinComplejo = await _db.Reservas.AsNoTracking()
                .Where(r => r.ComplejoId == null && r.Fecha >= hoy && r.Fecha < limite &&
                    r.Estado != EstadoReserva.CANCELADA && canchaIds.Contains(r.CanchaId))
                .Select(r => new { r.CanchaId, r.HoraInicio, r.HoraFin })
                .ToListAsync();
            foreach (var r in sinComplejo)
            {
                var cid = canchaAComplejo[r.CanchaId];
                countPorComplejo[cid] = countPorComplejo.GetValueOrDefault(cid) + 1;
                horasPorComplejo[cid] = horasPorComplejo.GetValueOrDefault(cid) + (r.HoraFin - r.HoraInicio) / 60.0;
            }
        }

        foreach (var id in ids)
        {
            result.TryGetValue(id, out var prev);
            var canchasCount = prev?.Canchas ?? 0;
            var denom = canchasCount * 12.0 * 7.0;
            var ocup = denom > 0 ? Math.Round(horasPorComplejo.GetValueOrDefault(id) / denom * 100.0, 1) : 0.0;
            result[id] = new Stats(canchasCount, countPorComplejo.GetValueOrDefault(id), ocup);
        }
        return result;
    }

    private static object ComplejoShape(
        Complejo c, int totalCanchas, int reservasProximas, double ocupacion, object? suscripcion = null) => new
    {
        c.Id,
        c.Nombre,
        c.Slug,
        c.Direccion,
        c.Distrito,
        c.Ciudad,
        c.Telefono,
        c.Email,
        c.Descripcion,
        c.Publicado,
        c.DuenoId,
        TotalCanchas = totalCanchas,
        ReservasProximas = reservasProximas,
        Ocupacion = ocupacion,
        Suscripcion = suscripcion,
        CreadoEn = DtoFormat.Utc(c.CreadoEn)
    };

    // Última suscripción ACTIVA por complejo (para la tarjeta de publicación).
    private async Task<Dictionary<string, object>> SuscripcionesVigentesAsync(List<string> ids)
    {
        var result = new Dictionary<string, object>();
        if (ids.Count == 0)
            return result;
        var rows = await _db.Suscripciones.AsNoTracking()
            .Include(s => s.Complejo)
            .Where(s => ids.Contains(s.ComplejoId) && s.Estado == EstadoSuscripcion.ACTIVA)
            .OrderByDescending(s => s.FechaFin)
            .ToListAsync();
        foreach (var g in rows.GroupBy(s => s.ComplejoId))
        {
            var s = g.First();
            result[g.Key] = SuscripcionesController.SuscripcionShape(s);
        }
        return result;
    }

    private static string Slugify(string nombre)
    {
        var lower = (nombre ?? "").Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in lower)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                continue;
            sb.Append(ch);
        }
        var clean = Regex.Replace(sb.ToString(), @"[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrEmpty(clean) ? "complejo" : clean;
    }

    private async Task<string> UniqueSlugAsync(string baseSlug)
    {
        var slug = baseSlug;
        var i = 2;
        while (await _db.Complejos.AsNoTracking().AnyAsync(c => c.Slug == slug))
            slug = $"{baseSlug}-{i++}";
        return slug;
    }
}
