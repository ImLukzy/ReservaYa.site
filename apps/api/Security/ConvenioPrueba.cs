using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;
namespace ReservaFacil.Api.Security;

// Prueba derivada, sin fila de suscripción ni cambios de esquema.
internal static class ConvenioPrueba
{
    public static IQueryable<string> Habilitados(AppDbContext db)
    {
        var ahora = DateTime.UtcNow;
        var hoy = DateTime.SpecifyKind(ahora.Date, DateTimeKind.Unspecified);
        return db.Complejos.Where(c => (c.Dueno != null && c.Dueno.Rol != Rol.USUARIO && c.CreadoEn.AddDays(30) > ahora) ||
            db.Suscripciones.Any(s => s.ComplejoId == c.Id && s.Estado == EstadoSuscripcion.ACTIVA &&
                s.FechaInicio <= hoy && s.FechaFin >= hoy)).Select(c => c.Id);
    }
    public static async Task<bool> ActivaAsync(AppDbContext db, string id)
    {
        var hoy = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Unspecified);
        return await db.Suscripciones.AnyAsync(s => s.ComplejoId == id &&
            s.Estado == EstadoSuscripcion.ACTIVA && s.FechaInicio <= hoy && s.FechaFin >= hoy);
    }
}
