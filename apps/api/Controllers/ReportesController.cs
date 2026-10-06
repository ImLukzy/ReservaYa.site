using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;

namespace ReservaFacil.Api.Controllers;

[ApiController]
[Route("api/reportes")]
public class ReportesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public ReportesController(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    [HttpGet("dashboard")]
    [Authorize]
    public async Task<IActionResult> Dashboard()
    {
        var rol = User.RolOr();

        return rol switch
        {
            Rol.USUARIO => Ok(new { dashboard = await DashboardUsuarioAsync() }),
            Rol.ADMIN => Ok(new { dashboard = await DashboardAdminAsync(mostrarIngresos: true) }),
            _ => Ok(new { dashboard = await DashboardSuperadminAsync() })
        };    }

    [HttpGet("global")]
    [Authorize(Roles = "ADMIN,SUPERADMIN,TECNICO")]
    public async Task<IActionResult> Global()
    {
        var alcance = await AlcanceReporteAsync();
        var totalUsuarios = await alcance.Usuarios.CountAsync();
        var totalReservas = await alcance.Reservas.CountAsync();

        var porEstado = (await alcance.Reservas
            .GroupBy(r => r.Estado)
            .Select(g => new { Estado = g.Key, Cantidad = g.Count() })
            .OrderBy(d => d.Estado)
            .ToListAsync())
            .Select(d => new ReservasPorEstadoDto(d.Estado, d.Cantidad))
            .ToList();

        var canchasData = await alcance.Canchas
            .OrderBy(c => c.Nombre)
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                c.Tipo,
                c.Activa,
                c.PrecioPorHora,
                Reservas = c.Reservas.Count(),
                Ingresos = c.Reservas
                    .Where(r => r.Estado == EstadoReserva.CONFIRMADA)
                    .Sum(r => (decimal?)r.Total) ?? 0m
            })
            .ToListAsync();

        var canchas = canchasData
            .Select(c => new CanchaReporteDto(
                c.Id,
                c.Nombre,
                c.Tipo,
                c.Activa,
                DtoFormat.Money(c.PrecioPorHora),
                c.Reservas,
                DtoFormat.Money(c.Ingresos)))
            .ToList();

        var topCanchas = canchasData
            .OrderByDescending(c => c.Reservas)
            .ThenByDescending(c => c.Ingresos)
            .Take(5)
            .Select(c => new TopCanchaDto(
                c.Id,
                c.Nombre,
                c.Tipo,
                c.Reservas,
                DtoFormat.Money(c.Ingresos)))
            .ToList();

        var confirmadas = await alcance.Reservas
            .CountAsync(r => r.Estado == EstadoReserva.CONFIRMADA);
        var ingresosTotales = await alcance.Reservas
            .Where(r => r.Estado == EstadoReserva.CONFIRMADA)
            .SumAsync(r => (decimal?)r.Total) ?? 0m;
        var promedio = confirmadas > 0
            ? Math.Round(ingresosTotales / confirmadas, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var ultimas = await alcance.Reservas
            .Include(r => r.Cancha)
            .Include(r => r.Usuario)
            .OrderByDescending(r => r.CreadoEn)
            .ThenByDescending(r => r.Fecha)
            .Take(10)
            .ToListAsync();

        var report = new GlobalReportDto(
            totalUsuarios,
            totalReservas,
            porEstado,
            topCanchas,
            canchas,
            DtoFormat.Money(ingresosTotales),
            DtoFormat.Money(promedio),
            ultimas.Select(r => ReservaDto.From(r, true)).ToList());

        return Ok(new { report });
    }

    private async Task<(IQueryable<Reserva> Reservas, IQueryable<Cancha> Canchas, IQueryable<Usuario> Usuarios)> AlcanceReporteAsync()
    {
        var reservas = _db.Reservas.AsNoTracking().AsQueryable();
        var canchas = _db.Canchas.AsNoTracking().AsQueryable();
        var usuarios = _db.Usuarios.AsNoTracking().AsQueryable();
        var ids = await ComplejoAccess.IdsAsync(_db, User);
        if (ids is not null)
        {
            canchas = canchas.Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId));
            var canchaIds = canchas.Select(c => c.Id);
            reservas = reservas.Where(r => (r.ComplejoId != null && ids.Contains(r.ComplejoId)) ||
                (r.ComplejoId == null && canchaIds.Contains(r.CanchaId)));
            var clientes = reservas.Select(r => r.UsuarioId);
            var miembros = _db.ComplejoMiembros.Where(m => m.Activo && ids.Contains(m.ComplejoId)).Select(m => m.UsuarioId);
            var propio = User.IdOrEmpty();
            usuarios = usuarios.Where(u => u.Id == propio || clientes.Contains(u.Id) || miembros.Contains(u.Id));
        }
        return (reservas, canchas, usuarios);
    }

    private async Task<int> GetCanchasActivasCachedAsync()
    {
        const string cacheKey = "reportes:canchas_activas_count";
        if (!_cache.TryGetValue(cacheKey, out int count))
        {
            count = await _db.Canchas.AsNoTracking().CountAsync(c => c.Activa);
            _cache.Set(cacheKey, count, TimeSpan.FromSeconds(60));
        }
        return count;
    }

    private async Task<DashboardUsuarioDto> DashboardUsuarioAsync()
    {
        var userId = User.IdOrEmpty();

        var stats = await _db.Reservas.AsNoTracking()
            .Where(r => r.UsuarioId == userId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Confirmadas = g.Count(r => r.Estado == EstadoReserva.CONFIRMADA)
            })
            .FirstOrDefaultAsync();

        var reservas = stats?.Total ?? 0;
        var confirmadas = stats?.Confirmadas ?? 0;
        var canchasActivas = await GetCanchasActivasCachedAsync();
        var ultimas = await _db.Reservas.AsNoTracking()
            .Include(r => r.Cancha)
            .Where(r => r.UsuarioId == userId)
            .OrderByDescending(r => r.CreadoEn)
            .ThenByDescending(r => r.Fecha)
            .Take(5)
            .ToListAsync();

        return new DashboardUsuarioDto(
            reservas,
            confirmadas,
            canchasActivas,
            ultimas.Select(r => ReservaDto.From(r, false)).ToList());
    }

    private async Task<DashboardAdminDto> DashboardAdminAsync(bool mostrarIngresos)
    {
        var ids = await ComplejoAccess.IdsAsync(_db, User);
        if (ids is not null && ids.Count == 0)
            return new DashboardAdminDto(0, 0, 0, DtoFormat.Money(0m), new List<ReservaDto>());

        var reservasQ = _db.Reservas.AsNoTracking().AsQueryable();
        if (ids is not null)
        {
            var canchaIdsQuery = _db.Canchas.AsNoTracking()
                .Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!))
                .Select(c => c.Id);
            reservasQ = reservasQ.Where(r =>
                (r.ComplejoId != null && ids.Contains(r.ComplejoId!)) ||
                (r.ComplejoId == null && canchaIdsQuery.Contains(r.CanchaId)));
        }

        var stats = await reservasQ
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Pendientes = g.Count(r => r.Estado == EstadoReserva.PENDIENTE),
                Ingresos = g.Sum(r => r.Estado == EstadoReserva.CONFIRMADA ? r.Total : 0m)
            })
            .FirstOrDefaultAsync();

        var total = stats?.Total ?? 0;
        var pendientes = stats?.Pendientes ?? 0;
        var ingresos = stats?.Ingresos ?? 0m;

        var canchasActivas = ids is null
            ? await GetCanchasActivasCachedAsync()
            : await _db.Canchas.AsNoTracking()
                .CountAsync(c => c.Activa && c.ComplejoId != null && ids.Contains(c.ComplejoId!));

        var ultimas = await reservasQ
            .Include(r => r.Cancha)
            .Include(r => r.Usuario)
            .OrderByDescending(r => r.CreadoEn)
            .ThenByDescending(r => r.Fecha)
            .Take(8)
            .ToListAsync();

        return new DashboardAdminDto(
            total,
            pendientes,
            canchasActivas,
            DtoFormat.Money(mostrarIngresos ? ingresos : 0m),
            ultimas.Select(r => ReservaDto.From(r, true)).ToList());
    }

    private async Task<DashboardSuperadminDto> DashboardSuperadminAsync()
    {
        var alcance = await AlcanceReporteAsync();
        var usuarios = await alcance.Usuarios.CountAsync();
        var administradores = await alcance.Usuarios
            .CountAsync(u => u.Rol == Rol.ADMIN);
        var reservas = await alcance.Reservas.CountAsync();
        var canchas = await alcance.Canchas.CountAsync();
        var ingresos = await alcance.Reservas
            .Where(r => r.Estado == EstadoReserva.CONFIRMADA)
            .SumAsync(r => (decimal?)r.Total) ?? 0m;

        return new DashboardSuperadminDto(
            usuarios,
            administradores,
            reservas,
            canchas,
            DtoFormat.Money(ingresos));
    }
}