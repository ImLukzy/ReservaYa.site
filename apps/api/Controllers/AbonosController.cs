using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

// NOTA CUENTA BANCARIA:
// La tabla Complejo (EF + Prisma) no tiene columna cuentaBancaria y no se
// pueden correr migrations (la DB ya existe y se comparte con Prisma), así
// que no hay dónde persistir el número de cuenta en Postgres. Por eso
// GET/POST api/abonos/cuenta responden { ok: false, error } de forma honesta
// y el frontend debe persistir la cuenta en localStorage hasta que se agregue
// la columna (p. ej. cuentaBanco, cuentaNumero, cuentaTitular en Complejo).
// Este controller sí implementa: resumen + movimientos ABONO + POST abonar.
[ApiController]
[Route("api/abonos")]
[Authorize]
public class AbonosController : ControllerBase
{
    private readonly AppDbContext _db;

    public AbonosController(AppDbContext db)
    {
        _db = db;
    }

    public sealed class AbonarRequest
    {
        public string? ComplejoId { get; set; }
        public decimal? Monto { get; set; }
        public string? Descripcion { get; set; }
        public string? MetodoPago { get; set; }
    }

    [HttpGet]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Resumen([FromQuery] string? complejoId)
    {
        var ids = await AlcanceComplejosAsync(complejoId);
        if (ids is null)
            return NotFound(new { error = "Complejo no encontrado o sin acceso" });

        var totalAbonado = ids.Count == 0
            ? 0m
            : await _db.MovimientosCaja.AsNoTracking()
                .Where(m => ids.Contains(m.ComplejoId) && m.Tipo == TipoMovimiento.ABONO)
                .SumAsync(m => (decimal?)m.Monto) ?? 0m;

        var porAbonar = ids.Count == 0
            ? 0m
            : (await _db.Reservas.AsNoTracking()
                .Where(r => r.Estado != EstadoReserva.CANCELADA &&
                    (ids.Contains(r.ComplejoId!) ||
                        (r.ComplejoId == null && r.Cancha != null &&
                         r.Cancha.ComplejoId != null && ids.Contains(r.Cancha.ComplejoId!))))
                .Select(r => new { r.Total, r.MontoPagado })
                .ToListAsync())
                .Where(r => r.Total - r.MontoPagado > 0)
                .Sum(r => r.Total - r.MontoPagado);

        var movimientos = ids.Count == 0
            ? new List<MovimientoCaja>()
            : await _db.MovimientosCaja.AsNoTracking()
                .Where(m => ids.Contains(m.ComplejoId) && m.Tipo == TipoMovimiento.ABONO)
                .OrderByDescending(m => m.CreadoEn)
                .Take(100)
                .ToListAsync();

        return Ok(new
        {
            ok = true,
            resumen = new
            {
                PorAbonar = DtoFormat.Money(porAbonar),
                TotalAbonado = DtoFormat.Money(totalAbonado)
            },
            movimientos = movimientos.Select(m => new
            {
                m.Id,
                m.ComplejoId,
                m.CajaId,
                m.MetodoPago,
                Monto = DtoFormat.Money(m.Monto),
                m.Descripcion,
                m.CreadoPorId,
                CreadoEn = DtoFormat.Utc(m.CreadoEn)
            })
        });
    }

    [HttpPost("abonar")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Abonar([FromBody] AbonarRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ComplejoId))
            return BadRequest(new { error = "complejoId es requerido" });
        if (request.Monto is null || request.Monto <= 0)
            return BadRequest(new { error = "Monto inválido" });

        var ids = await AlcanceComplejosAsync(request.ComplejoId);
        if (ids is null || ids.Count == 0)
            return NotFound(new { error = "Complejo no encontrado o sin acceso" });

        var metodo = MetodoPago.EFECTIVO;
        if (!string.IsNullOrWhiteSpace(request.MetodoPago) &&
            !Enum.TryParse<MetodoPago>(request.MetodoPago, ignoreCase: true, out metodo))
            return BadRequest(new { error = "Método de pago inválido" });

        var caja = await _db.CajaSesiones.FirstOrDefaultAsync(
            c => c.ComplejoId == request.ComplejoId && c.Estado == EstadoCaja.ABIERTA);
        if (caja is null)
        {
            caja = new CajaSesion
            {
                Id = JwtService.NewId(),
                ComplejoId = request.ComplejoId,
                AbiertaPorId = User.IdOrEmpty(),
                MontoInicial = 0m,
                Estado = EstadoCaja.ABIERTA,
                AbiertaEn = DateTime.UtcNow
            };
            _db.CajaSesiones.Add(caja);
            await _db.SaveChangesAsync();
        }

        var mov = new MovimientoCaja
        {
            Id = JwtService.NewId(),
            ComplejoId = request.ComplejoId,
            CajaId = caja.Id,
            Tipo = TipoMovimiento.ABONO,
            MetodoPago = metodo,
            Monto = request.Monto.Value,
            Descripcion = string.IsNullOrWhiteSpace(request.Descripcion)
                ? "Abono registrado"
                : request.Descripcion.Trim(),
            CreadoPorId = User.IdOrEmpty(),
            CreadoEn = DateTime.UtcNow
        };
        _db.MovimientosCaja.Add(mov);
        await _db.SaveChangesAsync();

        return StatusCode(201, new
        {
            ok = true,
            movimiento = new
            {
                mov.Id,
                mov.ComplejoId,
                mov.CajaId,
                Monto = DtoFormat.Money(mov.Monto),
                mov.Descripcion,
                CreadoEn = DtoFormat.Utc(mov.CreadoEn)
            }
        });
    }

    [HttpGet("cuenta")]
    public IActionResult GetCuenta([FromQuery] string? complejoId) =>
        StatusCode(501, new
        {
            ok = false,
            error = "Cuentas bancarias no disponibles: la tabla Complejo no tiene columna cuentaBancaria y no se puede migrar. Persiste la cuenta en localStorage del frontend."
        });

    [HttpPost("cuenta")]
    public IActionResult SetCuenta([FromBody] Dictionary<string, object?>? body) =>
        StatusCode(501, new
        {
            ok = false,
            error = "Cuentas bancarias no disponibles: la tabla Complejo no tiene columna cuentaBancaria y no se puede migrar. Persiste la cuenta en localStorage del frontend."
        });

    // Resuelve el alcance: un complejoId concreto (con acceso) o todos los
    // complejos del dueño/miembro. Null = sin acceso o inexistente.
    private async Task<List<string>?> AlcanceComplejosAsync(string? complejoId)
    {
        if (!string.IsNullOrWhiteSpace(complejoId))
            return await TieneAccesoAsync(complejoId) ? new List<string> { complejoId } : null;

        if (ComplejoAccess.EsPlataforma(User))
            return await _db.Complejos.AsNoTracking().Select(c => c.Id).ToListAsync();

        var mine = User.IdOrEmpty();
        var propios = await _db.Complejos.AsNoTracking()
            .Where(c => c.DuenoId == mine)
            .Select(c => c.Id)
            .ToListAsync();
        var miembro = await _db.ComplejoMiembros.AsNoTracking()
            .Where(m => m.UsuarioId == mine && m.Activo)
            .Select(m => m.ComplejoId)
            .ToListAsync();
        return propios.Union(miembro).Distinct().ToList();
    }

    private async Task<bool> TieneAccesoAsync(string complejoId)
    {
        if (ComplejoAccess.EsPlataforma(User))
            return await _db.Complejos.AsNoTracking().AnyAsync(c => c.Id == complejoId);
        var mine = User.IdOrEmpty();
        if (await _db.Complejos.AsNoTracking()
                .AnyAsync(c => c.Id == complejoId && c.DuenoId == mine))
            return true;
        return await _db.ComplejoMiembros.AsNoTracking()
            .AnyAsync(m => m.ComplejoId == complejoId && m.UsuarioId == mine && m.Activo);
    }
}
