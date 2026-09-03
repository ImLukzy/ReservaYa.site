using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Dtos;

public record DashboardUsuarioDto(
    int Reservas,
    int ReservasConfirmadas,
    int CanchasActivas,
    List<ReservaDto> UltimasReservas);

public record DashboardAdminDto(
    int TotalReservas,
    int ReservasPendientes,
    int CanchasActivas,
    string Ingresos,
    List<ReservaDto> UltimasReservas);

public record DashboardSuperadminDto(
    int Usuarios,
    int Administradores,
    int Reservas,
    int Canchas,
    string Ingresos);

public record ReservasPorEstadoDto(EstadoReserva Estado, int Cantidad);

public record CanchaReporteDto(
    string Id,
    string Nombre,
    TipoCancha Tipo,
    bool Activa,
    string PrecioPorHora,
    int Reservas,
    string Ingresos);

public record TopCanchaDto(
    string Id,
    string Nombre,
    TipoCancha Tipo,
    int Reservas,
    string Ingresos);

public record GlobalReportDto(
    int TotalUsuarios,
    int TotalReservas,
    List<ReservasPorEstadoDto> ReservasPorEstado,
    List<TopCanchaDto> TopCanchas,
    List<CanchaReporteDto> Canchas,
    string IngresosTotales,
    string Promedio,
    List<ReservaDto> UltimasReservas);