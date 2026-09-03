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
            Rol.ADMIN => Ok(new { dashboard = await DashboardAdminAsync() }),
            _ => Ok(new { dashboard = await DashboardSuperadminAsync() })
        };
    }

    [HttpGet("global")]
    [Authorize(Roles = "SUPERADMIN")]
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

    private async Task<DashboardAdminDto> DashboardAdminAsync()
    {
        var total = await _db.Reservas.AsNoTracking().CountAsync();
        var pendientes = await _db.Reservas.AsNoTracking()
            .CountAsync(r => r.Estado == EstadoReserva.PENDIENTE);
        var canchasActivas = await _db.Canchas.AsNoTracking()
            .CountAsync(c => c.Activa);
        var ingresos = await _db.Reservas.AsNoTracking()
            .Where(r => r.Estado == EstadoReserva.CONFIRMADA)
            .SumAsync(r => (decimal?)r.Total) ?? 0m;
        var ultimas = await _db.Reservas.AsNoTracking()
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
            DtoFormat.Money(ingresos),
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