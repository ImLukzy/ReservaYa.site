using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public ReportesController(AppDbContext db)
    {
        _db = db;
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
        var totalUsuarios = await _db.Usuarios.AsNoTracking().CountAsync();
        var totalReservas = await _db.Reservas.AsNoTracking().CountAsync();

        var porEstado = (await _db.Reservas.AsNoTracking()
            .GroupBy(r => r.Estado)
            .Select(g => new { Estado = g.Key, Cantidad = g.Count() })
            .OrderBy(d => d.Estado)
            .ToListAsync())
            .Select(d => new ReservasPorEstadoDto(d.Estado, d.Cantidad))
            .ToList();

        var canchasData = await _db.Canchas.AsNoTracking()
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

        var confirmadas = await _db.Reservas.AsNoTracking()
            .CountAsync(r => r.Estado == EstadoReserva.CONFIRMADA);
        var ingresosTotales = await _db.Reservas.AsNoTracking()
            .Where(r => r.Estado == EstadoReserva.CONFIRMADA)
            .SumAsync(r => (decimal?)r.Total) ?? 0m;
        var promedio = confirmadas > 0
            ? Math.Round(ingresosTotales / confirmadas, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var ultimas = await _db.Reservas.AsNoTracking()
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

    private async Task<DashboardUsuarioDto> DashboardUsuarioAsync()
    {
        var userId = User.IdOrEmpty();

        var reservas = await _db.Reservas.AsNoTracking()
            .CountAsync(r => r.UsuarioId == userId);
        var confirmadas = await _db.Reservas.AsNoTracking()
            .CountAsync(r => r.UsuarioId == userId && r.Estado == EstadoReserva.CONFIRMADA);
        var canchasActivas = await _db.Canchas.AsNoTracking()
            .CountAsync(c => c.Activa);
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
            var canchaIds = await _db.Canchas.AsNoTracking()
                .Where(c => c.ComplejoId != null && ids.Contains(c.ComplejoId!))
                .Select(c => c.Id).ToListAsync();
            reservasQ = reservasQ.Where(r =>
                (r.ComplejoId != null && ids.Contains(r.ComplejoId!)) ||
                (r.ComplejoId == null && canchaIds.Contains(r.CanchaId)));
        }

        var total = await reservasQ.CountAsync();
        var pendientes = await reservasQ
            .CountAsync(r => r.Estado == EstadoReserva.PENDIENTE);
        var canchasActivas = ids is null
            ? await _db.Canchas.AsNoTracking().CountAsync(c => c.Activa)
            : await _db.Canchas.AsNoTracking()
                .CountAsync(c => c.Activa && c.ComplejoId != null && ids.Contains(c.ComplejoId!));
        var ingresos = await reservasQ
            .Where(r => r.Estado == EstadoReserva.CONFIRMADA)
            .SumAsync(r => (decimal?)r.Total) ?? 0m;
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
        var usuarios = await _db.Usuarios.AsNoTracking().CountAsync();
        var administradores = await _db.Usuarios.AsNoTracking()
            .CountAsync(u => u.Rol == Rol.ADMIN);
        var reservas = await _db.Reservas.AsNoTracking().CountAsync();
        var canchas = await _db.Canchas.AsNoTracking().CountAsync();
        var ingresos = await _db.Reservas.AsNoTracking()
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