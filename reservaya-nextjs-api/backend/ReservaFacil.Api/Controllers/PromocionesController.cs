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
[Route("api/promociones")]
[Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
public class PromocionesController : ControllerBase
{
    private readonly AppDbContext _db;

    public PromocionesController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class PromocionRequest
    {
        public string? ComplejoId { get; set; }
        public string? CanchaId { get; set; }
        public string? Nombre { get; set; }
        public string? Codigo { get; set; }
        public string? Tipo { get; set; }
        public decimal? Valor { get; set; }
        public int? HoraDesde { get; set; }
        public int? HoraHasta { get; set; }
        public int? UsosMax { get; set; }
        public string? FechaInicio { get; set; }
        public string? FechaFin { get; set; }
        public string? Descripcion { get; set; }
        public bool? Activa { get; set; }
        // Franjas día/tarde/noche (panel Precios especiales).
        public decimal? PrecioDia { get; set; }
        public decimal? PrecioTarde { get; set; }
        public decimal? PrecioNoche { get; set; }
        public string? InicioTarde { get; set; }
        public string? InicioNoche { get; set; }
        public bool? RepetirAnual { get; set; }
        // Compatibilidad: el panel viejo mandaba desde/hasta.
        public string? Desde { get; set; }
        public string? Hasta { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? complejoId, [FromQuery] string? tipo)
    {
        var query = _db.Promociones.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(complejoId))
        {
            if (!await ComplejoAccess.TieneAccesoAsync(_db, User, complejoId))
                return StatusCode(403, new { error = "Sin permisos" });
            query = query.Where(p => p.ComplejoId == complejoId);
        }
        else
        {
            // Sin filtro: solo el alcance propio (los códigos son sensibles).
            var ids = await ComplejoAccess.IdsAsync(_db, User);
            if (ids is not null)
            {
                if (ids.Count == 0)
                    return Ok(new { ok = true, promociones = Array.Empty<object>() });
                query = query.Where(p => p.ComplejoId != null && ids.Contains(p.ComplejoId!));
            }
        }

        // tipo=descuento -> con codigo no nulo; tipo=precio_especial -> PRECIO_ESPECIAL.
        if (!string.IsNullOrWhiteSpace(tipo))
        {
            var t = tipo.Trim().ToLowerInvariant();
            if (t is "descuento" or "descuentos")
                query = query.Where(p => p.Codigo != null);
            else if (t is "precio" or "precio_especial" or "precios_especiales" or "precios")
                query = query.Where(p => p.Tipo == TipoDescuento.PRECIO_ESPECIAL);
            else if (Enum.TryParse<TipoDescuento>(tipo, ignoreCase: true, out var td))
                query = query.Where(p => p.Tipo == td);
            else
                return BadRequest(new { error = "Tipo inválido" });
        }

        var promos = await query.OrderByDescending(p => p.CreadoEn).ToListAsync();
        return Ok(new { ok = true, promociones = promos.Select(PromocionShape) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PromocionRequest request)
    {
        if (!Enum.TryParse<TipoDescuento>(request.Tipo, ignoreCase: true, out var tipo))
            return BadRequest(new { error = "Tipo inválido (PORCENTAJE, MONTO_FIJO, PRECIO_ESPECIAL)" });
        var tieneFranjas = (request.PrecioDia ?? 0) > 0 || (request.PrecioTarde ?? 0) > 0 || (request.PrecioNoche ?? 0) > 0;
        if (!tieneFranjas && (request.Valor is null || request.Valor <= 0))
            return BadRequest(new { error = "Valor inválido" });
        if (request.Valor is not null && tipo == TipoDescuento.PORCENTAJE && request.Valor > 100)
            return BadRequest(new { error = "El porcentaje no puede superar 100" });
        if ((request.PrecioDia ?? 0) < 0 || (request.PrecioTarde ?? 0) < 0 || (request.PrecioNoche ?? 0) < 0)
            return BadRequest(new { error = "Precios de franja inválidos" });

        var inicioTarde = ParseHora(request.InicioTarde);
        var inicioNoche = ParseHora(request.InicioNoche);
        if (request.InicioTarde is not null && inicioTarde is null)
            return BadRequest(new { error = "inicioTarde inválido (HH:MM)" });
        if (request.InicioNoche is not null && inicioNoche is null)
            return BadRequest(new { error = "inicioNoche inválido (HH:MM)" });
        if (inicioTarde.HasValue && inicioNoche.HasValue && inicioNoche <= inicioTarde)
            return BadRequest(new { error = "inicioNoche debe ser posterior a inicioTarde" });

        var desdeRaw = string.IsNullOrWhiteSpace(request.FechaInicio) ? request.Desde : request.FechaInicio;
        var hastaRaw = string.IsNullOrWhiteSpace(request.FechaFin) ? request.Hasta : request.FechaFin;
        var desde = DtoFormat.ParseFechaDia(desdeRaw);
        var hasta = DtoFormat.ParseFechaDia(hastaRaw);
        if ((desdeRaw is not null && desde is null) || (hastaRaw is not null && hasta is null))
            return BadRequest(new { error = "Fechas inválidas (yyyy-MM-dd)" });
        if (desde.HasValue && hasta.HasValue && hasta < desde)
            return BadRequest(new { error = "La fecha Hasta no puede ser anterior a Desde" });

        var nombre = string.IsNullOrWhiteSpace(request.Nombre) ? null : request.Nombre.Trim();
        var codigo = string.IsNullOrWhiteSpace(request.Codigo) ? null : request.Codigo.Trim().ToUpperInvariant();
        if (nombre is null && codigo is null)
            return BadRequest(new { error = "Nombre o código requerido" });
        nombre ??= codigo!;

        if (!string.IsNullOrWhiteSpace(request.ComplejoId))
        {
            var existe = await _db.Complejos.AsNoTracking()
                .AnyAsync(c => c.Id == request.ComplejoId);
            if (!existe)
                return BadRequest(new { error = "Complejo no encontrado" });
            if (!await ComplejoAccess.EsDuenoAsync(_db, User, request.ComplejoId))
                return StatusCode(403, new { error = "Sin permisos" });
        }
        if (!string.IsNullOrWhiteSpace(request.CanchaId))
        {
            var cancha = await _db.Canchas.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.CanchaId);
            if (cancha is null)
                return BadRequest(new { error = "Cancha no encontrada" });
            if (cancha.ComplejoId is not null &&
                !await ComplejoAccess.EsDuenoAsync(_db, User, cancha.ComplejoId))
                return StatusCode(403, new { error = "Sin permisos" });
        }
        if (request.HoraDesde.HasValue && (request.HoraDesde < 0 || request.HoraDesde >= 1440))
            return BadRequest(new { error = "horaDesde inválida" });
        if (request.HoraHasta.HasValue && (request.HoraHasta < 1 || request.HoraHasta > 1440))
            return BadRequest(new { error = "horaHasta inválida" });
        if (request.HoraDesde.HasValue && request.HoraHasta.HasValue &&
            request.HoraHasta <= request.HoraDesde)
            return BadRequest(new { error = "horaHasta debe ser posterior a horaDesde" });

        if (codigo is not null)
        {
            var duplicado = await _db.Promociones.AsNoTracking()
                .AnyAsync(p => p.Codigo == codigo);
            if (duplicado)
                return Conflict(new { error = "El código ya está en uso" });
        }

        var promo = new Promocion
        {
            Id = JwtService.NewId(),
            ComplejoId = string.IsNullOrWhiteSpace(request.ComplejoId) ? null : request.ComplejoId,
            CanchaId = string.IsNullOrWhiteSpace(request.CanchaId) ? null : request.CanchaId,
            Nombre = nombre,
            Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
            Tipo = tipo,
            Valor = request.Valor ?? 0m,
            HoraDesde = request.HoraDesde,
            HoraHasta = request.HoraHasta,
            DiasSemana = new List<int>(),
            FechaInicio = desde,
            FechaFin = hasta,
            PrecioDia = request.PrecioDia,
            PrecioTarde = request.PrecioTarde,
            PrecioNoche = request.PrecioNoche,
            InicioTarde = inicioTarde,
            InicioNoche = inicioNoche,
            RepetirAnual = request.RepetirAnual ?? false,
            Codigo = codigo,
            UsosMax = request.UsosMax,
            UsosActuales = 0,
            Activa = request.Activa ?? true,
            CreadoEn = DateTime.UtcNow
        };

        _db.Promociones.Add(promo);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { error = "El código ya está en uso" });
        }

        return StatusCode(201, new { ok = true, promocion = PromocionShape(promo) });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] PromocionRequest request)
    {
        var promo = await _db.Promociones.FirstOrDefaultAsync(p => p.Id == id);
        if (promo is null)
            return NotFound(new { error = "No encontrada" });
        if (!await PuedoGestionarAsync(promo))
            return StatusCode(403, new { error = "Sin permisos" });

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            promo.Nombre = request.Nombre.Trim();
        if (request.Descripcion is not null)
            promo.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        if (request.Valor is not null)
        {
            if (request.Valor <= 0)
                return BadRequest(new { error = "Valor inválido" });
            if (promo.Tipo == TipoDescuento.PORCENTAJE && request.Valor > 100)
                return BadRequest(new { error = "El porcentaje no puede superar 100" });
            promo.Valor = request.Valor.Value;
        }
        if (request.UsosMax is not null)
            promo.UsosMax = request.UsosMax;
        if (request.Activa is not null)
            promo.Activa = request.Activa.Value;
        if (request.HoraDesde is not null)
            promo.HoraDesde = request.HoraDesde;
        if (request.HoraHasta is not null)
            promo.HoraHasta = request.HoraHasta;
        if (request.PrecioDia is not null)
        {
            if (request.PrecioDia < 0)
                return BadRequest(new { error = "Precios de franja inválidos" });
            promo.PrecioDia = request.PrecioDia;
        }
        if (request.PrecioTarde is not null)
        {
            if (request.PrecioTarde < 0)
                return BadRequest(new { error = "Precios de franja inválidos" });
            promo.PrecioTarde = request.PrecioTarde;
        }
        if (request.PrecioNoche is not null)
        {
            if (request.PrecioNoche < 0)
                return BadRequest(new { error = "Precios de franja inválidos" });
            promo.PrecioNoche = request.PrecioNoche;
        }
        if (request.InicioTarde is not null)
        {
            var v = ParseHora(request.InicioTarde);
            if (v is null)
                return BadRequest(new { error = "inicioTarde inválido (HH:MM)" });
            promo.InicioTarde = v;
        }
        if (request.InicioNoche is not null)
        {
            var v = ParseHora(request.InicioNoche);
            if (v is null)
                return BadRequest(new { error = "inicioNoche inválido (HH:MM)" });
            promo.InicioNoche = v;
        }
        if (promo.InicioTarde.HasValue && promo.InicioNoche.HasValue &&
            promo.InicioNoche <= promo.InicioTarde)
            return BadRequest(new { error = "inicioNoche debe ser posterior a inicioTarde" });
        if (request.RepetirAnual is not null)
            promo.RepetirAnual = request.RepetirAnual.Value;
        var nuevaDesde = string.IsNullOrWhiteSpace(request.FechaInicio) ? request.Desde : request.FechaInicio;
        var nuevaHasta = string.IsNullOrWhiteSpace(request.FechaFin) ? request.Hasta : request.FechaFin;
        if (nuevaDesde is not null)
        {
            var d = DtoFormat.ParseFechaDia(nuevaDesde);
            if (d is null)
                return BadRequest(new { error = "Fechas inválidas (yyyy-MM-dd)" });
            promo.FechaInicio = d;
        }
        if (nuevaHasta is not null)
        {
            var h = DtoFormat.ParseFechaDia(nuevaHasta);
            if (h is null)
                return BadRequest(new { error = "Fechas inválidas (yyyy-MM-dd)" });
            promo.FechaFin = h;
        }
        if (promo.FechaInicio.HasValue && promo.FechaFin.HasValue && promo.FechaFin < promo.FechaInicio)
            return BadRequest(new { error = "La fecha Hasta no puede ser anterior a Desde" });

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, promocion = PromocionShape(promo) });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var promo = await _db.Promociones.FirstOrDefaultAsync(p => p.Id == id);
        if (promo is null)
            return Ok(new { ok = true });
        if (!await PuedoGestionarAsync(promo))
            return StatusCode(403, new { error = "Sin permisos" });

        _db.Promociones.Remove(promo);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23503" or "23001" })
        {
            return Conflict(new { error = "No se puede eliminar: la promoción tiene reservas asociadas" });
        }

        return Ok(new { ok = true });
    }

    // Mutaciones: dueño del complejo (directo o vía cancha) o plataforma.
    // Las promos globales (sin complejo ni cancha) las gestiona cualquier ADMIN.
    private async Task<bool> PuedoGestionarAsync(Promocion promo)
    {
        if (ComplejoAccess.EsPlataforma(User))
            return true;
        if (!string.IsNullOrWhiteSpace(promo.ComplejoId))
            return await ComplejoAccess.EsDuenoAsync(_db, User, promo.ComplejoId);
        if (!string.IsNullOrWhiteSpace(promo.CanchaId))
        {
            var cancha = await _db.Canchas.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == promo.CanchaId);
            if (cancha is null || cancha.ComplejoId is null)
                return true;
            return await ComplejoAccess.EsDuenoAsync(_db, User, cancha.ComplejoId);
        }
        return true;
    }

    private static object PromocionShape(Promocion p) => new
    {
        p.Id,
        p.ComplejoId,
        p.CanchaId,
        p.Nombre,
        p.Codigo,
        p.Tipo,
        Valor = DtoFormat.Money(p.Valor),
        p.UsosMax,
        p.UsosActuales,
        p.Activa,
        p.HoraDesde,
        p.HoraHasta,
        Desde = p.FechaInicio.HasValue ? p.FechaInicio.Value.ToString("yyyy-MM-dd") : null,
        Hasta = p.FechaFin.HasValue ? p.FechaFin.Value.ToString("yyyy-MM-dd") : null,
        p.PrecioDia,
        p.PrecioTarde,
        p.PrecioNoche,
        InicioTarde = p.InicioTarde.HasValue ? $"{p.InicioTarde.Value / 60:D2}:{p.InicioTarde.Value % 60:D2}" : null,
        InicioNoche = p.InicioNoche.HasValue ? $"{p.InicioNoche.Value / 60:D2}:{p.InicioNoche.Value % 60:D2}" : null,
        p.RepetirAnual,
        p.Descripcion,
        CreadoEn = DtoFormat.Utc(p.CreadoEn)
    };

    private static int? ParseHora(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var partes = value.Trim().Split(':');
        if (partes.Length != 2 ||
            !int.TryParse(partes[0], out var h) || !int.TryParse(partes[1], out var m) ||
            h < 0 || h > 24 || m < 0 || m > 59 || (h == 24 && m != 0))
            return null;
        return h * 60 + m;
    }
}
