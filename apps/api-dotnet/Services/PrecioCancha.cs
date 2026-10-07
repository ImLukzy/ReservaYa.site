using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Services;

// Precio por hora con franjas día/tarde/noche (panel Precios especiales).
// Fuente única de verdad: la usan cotizar, disponibles y crear reserva.
// Reglas:
// - Solo promos PRECIO_ESPECIAL activas, propias de la cancha, de su complejo
//   o globales (sin cancha ni complejo).
// - Prioridad por hora: cancha > complejo > global; desempate: más reciente.
// - Fecha: rango [fechaInicio, fechaFin] (extremos nulos = abierto). Con
//   repetirAnual se compara solo mes/día. diasSemana vacío = todos los días
//   (0 = domingo, como DayOfWeek).
// - Franja: hora < inicioTarde (def. 17:00) = día; < inicioNoche (def. 20:00)
//   = tarde; resto = noche. Si la franja no tiene precio en la regla, no aplica.
// - Sin franjas: modelo legacy (Valor dentro de [horaDesde, horaHasta)).
public sealed record Cotizacion(decimal Total, string? Regla);

public static class PrecioCancha
{
    public static async Task<List<Promocion>> PromosAplicablesAsync(
        AppDbContext db, IEnumerable<string> canchaIds, IEnumerable<string?> complejoIds)
    {
        var canchas = canchaIds.Distinct().ToList();
        var complejos = complejoIds.Where(c => c != null).Distinct().ToList();
        return await db.Promociones.AsNoTracking()
            .Where(p => p.Activa && p.Tipo == TipoDescuento.PRECIO_ESPECIAL &&
                (canchas.Contains(p.CanchaId!) ||
                 (p.ComplejoId != null && complejos.Contains(p.ComplejoId)) ||
                 (p.CanchaId == null && p.ComplejoId == null)))
            .OrderByDescending(p => p.CanchaId != null)
            .ThenByDescending(p => p.ComplejoId != null)
            .ThenByDescending(p => p.CreadoEn)
            .ToListAsync();
    }

    public static Cotizacion Cotizar(
        decimal baseXHora, List<Promocion> promos, DateTime fecha, int inicio, int fin)
    {
        decimal total = 0m;
        string? regla = null;
        for (var h = inicio; h < fin; h += 60)
        {
            var precioH = baseXHora;
            foreach (var p in promos)
            {
                if (!AplicaFecha(p, fecha))
                    continue;
                var ph = PrecioHora(p, h);
                if (ph is null)
                    continue;
                precioH = ph.Value;
                regla ??= p.Nombre;
                break;
            }
            total += precioH;
        }
        return new Cotizacion(Math.Round(total, 2, MidpointRounding.AwayFromZero), regla);
    }

    public static bool AplicaFecha(Promocion p, DateTime fecha)
    {
        if (p.DiasSemana is { Count: > 0 } && !p.DiasSemana.Contains((int)fecha.DayOfWeek))
            return false;
        if (p.RepetirAnual && (p.FechaInicio.HasValue || p.FechaFin.HasValue))
        {
            var f = (fecha.Month, fecha.Day);
            var d = p.FechaInicio.HasValue
                ? (p.FechaInicio.Value.Month, p.FechaInicio.Value.Day) : ((int, int)?)null;
            var h = p.FechaFin.HasValue
                ? (p.FechaFin.Value.Month, p.FechaFin.Value.Day) : ((int, int)?)null;
            if (d.HasValue && h.HasValue)
            {
                if (d.Value.CompareTo(h.Value) <= 0)
                {
                    if (f.CompareTo(d.Value) < 0 || f.CompareTo(h.Value) > 0)
                        return false;
                }
                else if (f.CompareTo(d.Value) < 0 && f.CompareTo(h.Value) > 0)
                    return false;
            }
            else if (d.HasValue && f.CompareTo(d.Value) < 0)
                return false;
            else if (h.HasValue && f.CompareTo(h.Value) > 0)
                return false;
            return true;
        }
        if (p.FechaInicio.HasValue && fecha.Date < p.FechaInicio.Value.Date)
            return false;
        if (p.FechaFin.HasValue && fecha.Date > p.FechaFin.Value.Date)
            return false;
        return true;
    }

    public static decimal? PrecioHora(Promocion p, int horaMin)
    {
        if (p.PrecioDia.HasValue || p.PrecioTarde.HasValue || p.PrecioNoche.HasValue)
        {
            var tardeDesde = p.InicioTarde ?? 17 * 60;
            var nocheDesde = p.InicioNoche ?? 20 * 60;
            if (horaMin < tardeDesde)
                return p.PrecioDia;
            if (horaMin < nocheDesde)
                return p.PrecioTarde;
            return p.PrecioNoche;
        }
        if (p.Valor > 0 &&
            (!p.HoraDesde.HasValue || horaMin >= p.HoraDesde.Value) &&
            (!p.HoraHasta.HasValue || horaMin < p.HoraHasta.Value))
            return p.Valor;
        return null;
    }
}
