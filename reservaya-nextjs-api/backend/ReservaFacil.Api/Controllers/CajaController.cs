using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// Caja diaria del complejo: productos, movimientos, apertura y cierre.
// Todo el panel /admin/caja consume estos endpoints (sin mocks).
[ApiController]
[Route("api/caja")]
[Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
public class CajaController : ControllerBase
{
    private readonly AppDbContext _db;

    public CajaController(AppDbContext db)
    {
        _db = db;
    }

    private static readonly TipoMovimiento[] Ingresos =
        new[] { TipoMovimiento.RESERVA, TipoMovimiento.SNACK, TipoMovimiento.ALQUILER, TipoMovimiento.ABONO };

    private static readonly string[] CategoriasProducto = new[] { "SNACK", "ALQUILER", "SERVICIO" };

    // Lima no usa horario de verano: UTC-5 todo el año.
    private static DateTime InicioHoyPeruUtc() => DateTime.UtcNow.AddHours(-5).Date.AddHours(5);

    private Task<string?> ComplejoDelUsuarioAsync() =>
        ComplejoAccess.PrimeroAsync(_db, User);

    private async Task<CajaSesion> CajaAbiertaAsync(string complejoId)
    {
        var caja = await _db.CajaSesiones
            .FirstOrDefaultAsync(c => c.ComplejoId == complejoId && c.Estado == EstadoCaja.ABIERTA);
        if (caja is not null) return caja;

        caja = new CajaSesion
        {
            Id = JwtService.NewId(),
            ComplejoId = complejoId,
            AbiertaPorId = User.IdOrEmpty(),
            MontoInicial = 0,
            Estado = EstadoCaja.ABIERTA,
            AbiertaEn = DateTime.UtcNow
        };
        _db.CajaSesiones.Add(caja);
        await _db.SaveChangesAsync();
        return caja;
    }

    private static object MovimientoJson(MovimientoCaja m) => new
    {
        id = m.Id,
        descripcion = m.Descripcion,
        monto = DtoFormat.Money(m.Monto),
        metodoPago = m.MetodoPago.ToString(),
        tipo = m.Tipo.ToString(),
        creadoEn = DtoFormat.Utc(m.CreadoEn)
    };

    private static object CajaJson(CajaSesion c) => new
    {
        id = c.Id,
        estado = c.Estado.ToString(),
        montoInicial = DtoFormat.Money(c.MontoInicial),
        montoFinal = c.MontoFinal.HasValue ? DtoFormat.Money(c.MontoFinal.Value) : null,
        abiertaEn = DtoFormat.Utc(c.AbiertaEn),
        cerradaEn = c.CerradaEn.HasValue ? (DateTime?)DtoFormat.Utc(c.CerradaEn.Value) : null
    };

    private static object ProductoJson(Producto p) => new
    {
        id = p.Id,
        nombre = p.Nombre,
        categoria = p.Categoria,
        precio = DtoFormat.Money(p.Precio),
        stock = p.Stock,
        activo = p.Activo
    };

    // GET /api/caja/hoy — movimientos de hoy (hora Perú) + total vendido + caja abierta.
    [HttpGet("hoy")]
    public async Task<IActionResult> Hoy()
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return Ok(new { total = DtoFormat.Money(0), movimientos = Array.Empty<object>(), caja = (object?)null });

        var desde = InicioHoyPeruUtc();
        var movs = await _db.MovimientosCaja.AsNoTracking()
            .Where(m => m.ComplejoId == complejoId && m.CreadoEn >= desde)
            .OrderByDescending(m => m.CreadoEn)
            .ToListAsync();

        var total = movs.Where(m => Ingresos.Contains(m.Tipo)).Sum(m => m.Monto);
        var caja = await _db.CajaSesiones.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ComplejoId == complejoId && c.Estado == EstadoCaja.ABIERTA);

        return Ok(new
        {
            total = DtoFormat.Money(total),
            movimientos = movs.Select(MovimientoJson),
            caja = caja is null ? null : CajaJson(caja)
        });
    }

    // GET /api/caja/sesion — caja abierta + resumen para la pestaña Efectivo.
    [HttpGet("sesion")]
    public async Task<IActionResult> Sesion()
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return Ok(new { caja = (object?)null, resumen = ResumenVacio() });

        var caja = await _db.CajaSesiones.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ComplejoId == complejoId && c.Estado == EstadoCaja.ABIERTA);
        if (caja is null)
            return Ok(new { caja = (object?)null, resumen = ResumenVacio() });

        var movs = await _db.MovimientosCaja.AsNoTracking()
            .Where(m => m.CajaId == caja.Id)
            .ToListAsync();

        return Ok(new { caja = CajaJson(caja), resumen = Resumen(caja, movs) });
    }

    private static object ResumenVacio() => new
    {
        montoInicial = DtoFormat.Money(0),
        ingresos = DtoFormat.Money(0),
        egresos = DtoFormat.Money(0),
        esperado = DtoFormat.Money(0),
        movimientos = 0
    };

    private static object Resumen(CajaSesion caja, List<MovimientoCaja> movs)
    {
        var ingresos = movs.Where(m => Ingresos.Contains(m.Tipo)).Sum(m => m.Monto);
        var egresos = movs.Where(m => !Ingresos.Contains(m.Tipo)).Sum(m => m.Monto);
        return new
        {
            montoInicial = DtoFormat.Money(caja.MontoInicial),
            ingresos = DtoFormat.Money(ingresos),
            egresos = DtoFormat.Money(egresos),
            esperado = DtoFormat.Money(caja.MontoInicial + ingresos - egresos),
            movimientos = movs.Count
        };
    }

    public class AperturaRequest
    {
        public decimal? MontoInicial { get; set; }
    }

    // POST /api/caja/apertura — { montoInicial }.
    [HttpPost("apertura")]
    public async Task<IActionResult> Apertura([FromBody] AperturaRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return BadRequest(new { error = "Primero crea tu complejo para operar la caja" });

        var abierta = await _db.CajaSesiones.AsNoTracking()
            .AnyAsync(c => c.ComplejoId == complejoId && c.Estado == EstadoCaja.ABIERTA);
        if (abierta)
            return Conflict(new { error = "Ya hay una caja abierta" });
        if (request.MontoInicial is null || request.MontoInicial < 0)
            return BadRequest(new { error = "El monto inicial debe ser mayor o igual a cero" });

        var caja = new CajaSesion
        {
            Id = JwtService.NewId(),
            ComplejoId = complejoId,
            AbiertaPorId = User.IdOrEmpty(),
            MontoInicial = Math.Round(request.MontoInicial.Value, 2, MidpointRounding.AwayFromZero),
            Estado = EstadoCaja.ABIERTA,
            AbiertaEn = DateTime.UtcNow
        };
        _db.CajaSesiones.Add(caja);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, caja = CajaJson(caja) });
    }

    public class CierreRequest
    {
        public decimal? MontoFinal { get; set; }
    }

    // POST /api/caja/cierre — { montoFinal }.
    [HttpPost("cierre")]
    public async Task<IActionResult> Cierre([FromBody] CierreRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return BadRequest(new { error = "Primero crea tu complejo para operar la caja" });
        if (request.MontoFinal is null || request.MontoFinal < 0)
            return BadRequest(new { error = "El monto final debe ser mayor o igual a cero" });

        var caja = await _db.CajaSesiones
            .FirstOrDefaultAsync(c => c.ComplejoId == complejoId && c.Estado == EstadoCaja.ABIERTA);
        if (caja is null)
            return BadRequest(new { error = "No hay una caja abierta" });

        var movs = await _db.MovimientosCaja.AsNoTracking()
            .Where(m => m.CajaId == caja.Id)
            .ToListAsync();

        caja.MontoFinal = Math.Round(request.MontoFinal.Value, 2, MidpointRounding.AwayFromZero);
        caja.Estado = EstadoCaja.CERRADA;
        caja.CerradaPorId = User.IdOrEmpty();
        caja.CerradaEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var resumen = Resumen(caja, movs);
        var esperado = caja.MontoInicial + movs.Where(m => Ingresos.Contains(m.Tipo)).Sum(m => m.Monto)
            - movs.Where(m => !Ingresos.Contains(m.Tipo)).Sum(m => m.Monto);

        return Ok(new
        {
            ok = true,
            caja = CajaJson(caja),
            resumen,
            diferencia = DtoFormat.Money(caja.MontoFinal.Value - esperado)
        });
    }

    public class ItemVenta
    {
        public string? ProductoId { get; set; }
        public string? Nombre { get; set; }
        public decimal? Precio { get; set; }
        public int? Cantidad { get; set; }
        public int? Qty { get; set; }
    }

    public class MovimientoRequest
    {
        public List<ItemVenta>? Items { get; set; }
        public string? Descripcion { get; set; }
        public decimal? Monto { get; set; }
        public string? Tipo { get; set; }
        public string? MetodoPago { get; set; }
    }

    // POST /api/caja/movimientos — cobra el ticket o registra un movimiento simple.
    [HttpPost("movimientos")]
    public async Task<IActionResult> Registrar([FromBody] MovimientoRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return BadRequest(new { error = "Primero crea tu complejo para operar la caja" });

        if (!Enum.TryParse<MetodoPago>(request.MetodoPago ?? "EFECTIVO", ignoreCase: true, out var metodo))
            return BadRequest(new { error = "Método de pago inválido" });

        var caja = await CajaAbiertaAsync(complejoId);
        var creados = new List<MovimientoCaja>();

        if (request.Items is { Count: > 0 })
        {
            foreach (var item in request.Items)
            {
                var qty = item.Cantidad ?? item.Qty ?? 1;
                if (qty <= 0)
                    return BadRequest(new { error = "La cantidad debe ser mayor que cero" });

                if (!string.IsNullOrWhiteSpace(item.ProductoId))
                {
                    var producto = await _db.Productos
                        .FirstOrDefaultAsync(p => p.Id == item.ProductoId && p.ComplejoId == complejoId && p.Activo);
                    if (producto is null)
                        return BadRequest(new { error = "Producto no disponible" });
                    if (producto.Stock.HasValue && producto.Stock < qty)
                        return BadRequest(new { error = $"Stock insuficiente de {producto.Nombre}" });

                    creados.Add(new MovimientoCaja
                    {
                        Id = JwtService.NewId(),
                        ComplejoId = complejoId,
                        CajaId = caja.Id,
                        Tipo = producto.Categoria == "ALQUILER" ? TipoMovimiento.ALQUILER : TipoMovimiento.SNACK,
                        MetodoPago = metodo,
                        Monto = Math.Round(producto.Precio * qty, 2, MidpointRounding.AwayFromZero),
                        Descripcion = $"Venta: {producto.Nombre} x{qty}",
                        CreadoPorId = User.IdOrEmpty(),
                        ProductoId = producto.Id,
                        CreadoEn = DateTime.UtcNow
                    });

                    if (producto.Stock.HasValue) producto.Stock -= qty;
                }
                else
                {
                    // Venta directa (p. ej. alquiler de cancha): nombre + precio libres.
                    if (string.IsNullOrWhiteSpace(item.Nombre) || item.Precio is null || item.Precio <= 0)
                        return BadRequest(new { error = "Cada ítem necesita producto o nombre y precio" });

                    creados.Add(new MovimientoCaja
                    {
                        Id = JwtService.NewId(),
                        ComplejoId = complejoId,
                        CajaId = caja.Id,
                        Tipo = TipoMovimiento.ALQUILER,
                        MetodoPago = metodo,
                        Monto = Math.Round(item.Precio.Value * qty, 2, MidpointRounding.AwayFromZero),
                        Descripcion = $"Venta: {item.Nombre.Trim()} x{qty}",
                        CreadoPorId = User.IdOrEmpty(),
                        CreadoEn = DateTime.UtcNow
                    });
                }
            }
        }
        else
        {
            // Movimiento simple: ventas, compras (EGRESO) o salidas (AJUSTE).
            if (string.IsNullOrWhiteSpace(request.Descripcion) || request.Monto is null || request.Monto <= 0)
                return BadRequest(new { error = "Indica la descripción y un monto mayor que cero" });
            if (!Enum.TryParse<TipoMovimiento>(request.Tipo ?? "SNACK", ignoreCase: true, out var tipo))
                return BadRequest(new { error = "Tipo de movimiento inválido" });

            creados.Add(new MovimientoCaja
            {
                Id = JwtService.NewId(),
                ComplejoId = complejoId,
                CajaId = caja.Id,
                Tipo = tipo,
                MetodoPago = metodo,
                Monto = Math.Round(request.Monto.Value, 2, MidpointRounding.AwayFromZero),
                Descripcion = request.Descripcion.Trim(),
                CreadoPorId = User.IdOrEmpty(),
                CreadoEn = DateTime.UtcNow
            });
        }

        _db.MovimientosCaja.AddRange(creados);
        await _db.SaveChangesAsync();

        var total = creados.Sum(m => m.Monto);
        return StatusCode(201, new
        {
            ok = true,
            total = DtoFormat.Money(total),
            movimientos = creados.Select(MovimientoJson)
        });
    }

    // GET /api/caja/productos — catálogo del complejo.
    [HttpGet("productos")]
    public async Task<IActionResult> Productos()
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return Ok(new { productos = Array.Empty<object>() });

        var productos = await _db.Productos.AsNoTracking()
            .Where(p => p.ComplejoId == complejoId && p.Activo)
            .OrderBy(p => p.Nombre)
            .ToListAsync();

        return Ok(new { productos = productos.Select(ProductoJson) });
    }

    public class ProductoRequest
    {
        public string? Nombre { get; set; }
        public string? Categoria { get; set; }
        public decimal? Precio { get; set; }
        public int? Stock { get; set; }
    }

    // POST /api/caja/productos — { nombre, categoria SNACK/ALQUILER/SERVICIO, precio, stock? }.
    [HttpPost("productos")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> CrearProducto([FromBody] ProductoRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        if (complejoId is null)
            return BadRequest(new { error = "Primero crea tu complejo para agregar productos" });
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { error = "El nombre es obligatorio" });
        if (request.Categoria is null || !CategoriasProducto.Contains(request.Categoria.ToUpperInvariant()))
            return BadRequest(new { error = "Categoría inválida: usa SNACK, ALQUILER o SERVICIO" });
        if (request.Precio is null || request.Precio <= 0)
            return BadRequest(new { error = "El precio debe ser mayor que cero" });
        if (request.Stock.HasValue && request.Stock < 0)
            return BadRequest(new { error = "El stock no puede ser negativo" });

        var producto = new Producto
        {
            Id = JwtService.NewId(),
            ComplejoId = complejoId,
            Nombre = request.Nombre.Trim(),
            Categoria = request.Categoria.ToUpperInvariant(),
            Precio = Math.Round(request.Precio.Value, 2, MidpointRounding.AwayFromZero),
            Stock = request.Stock,
            Activo = true
        };
        _db.Productos.Add(producto);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, producto = ProductoJson(producto) });
    }

    // PUT /api/caja/productos/{id}.
    [HttpPut("productos/{id}")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> ActualizarProducto(string id, [FromBody] ProductoRequest request)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        var producto = await _db.Productos
            .FirstOrDefaultAsync(p => p.Id == id && (complejoId == null || p.ComplejoId == complejoId));
        if (producto is null)
            return NotFound(new { error = "Producto no encontrado" });

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            producto.Nombre = request.Nombre.Trim();
        if (request.Categoria is not null)
        {
            if (!CategoriasProducto.Contains(request.Categoria.ToUpperInvariant()))
                return BadRequest(new { error = "Categoría inválida: usa SNACK, ALQUILER o SERVICIO" });
            producto.Categoria = request.Categoria.ToUpperInvariant();
        }
        if (request.Precio is not null)
        {
            if (request.Precio <= 0)
                return BadRequest(new { error = "El precio debe ser mayor que cero" });
            producto.Precio = Math.Round(request.Precio.Value, 2, MidpointRounding.AwayFromZero);
        }
        if (request.Stock.HasValue)
        {
            if (request.Stock < 0)
                return BadRequest(new { error = "El stock no puede ser negativo" });
            producto.Stock = request.Stock;
        }

        await _db.SaveChangesAsync();
        return Ok(new { ok = true, producto = ProductoJson(producto) });
    }

    // DELETE /api/caja/productos/{id} — baja lógica para no romper el historial.
    [HttpDelete("productos/{id}")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> EliminarProducto(string id)
    {
        var complejoId = await ComplejoDelUsuarioAsync();
        var producto = await _db.Productos
            .FirstOrDefaultAsync(p => p.Id == id && (complejoId == null || p.ComplejoId == complejoId));
        if (producto is null)
            return Ok(new { ok = true });

        producto.Activo = false;
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
