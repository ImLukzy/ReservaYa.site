using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Security;

// Alcance multitenancy estricto: cada dueño (SUPERADMIN) y su equipo solo
// operan sus propios complejos (DuenoId) + membresías activas.
// Solo TECNICO (plataforma) ve y gestiona todo.
// SUPERADMIN -> propios + membresías (como los demás; lista vacía = sin acceso).
// Demás roles -> propios (DuenoId) + membresías activas (ComplejoMiembro).
// Lista vacía = sin acceso (ver vacío, nunca todo).
internal static class ComplejoAccess
{
    public static bool EsPlataforma(ClaimsPrincipal user)
    {
        return user.RolOr() == Rol.TECNICO;
    }

    public static async Task<List<string>?> IdsAsync(AppDbContext db, ClaimsPrincipal user)
    {
        if (EsPlataforma(user))
            return null;
        var mine = user.IdOrEmpty();
        var propios = await db.Complejos.AsNoTracking()
            .Where(c => c.DuenoId == mine).Select(c => c.Id).ToListAsync();
        var miembro = await db.ComplejoMiembros.AsNoTracking()
            .Where(m => m.UsuarioId == mine && m.Activo).Select(m => m.ComplejoId).ToListAsync();
        return propios.Concat(miembro).Distinct().ToList();
    }

    public static async Task<bool> TieneAccesoAsync(AppDbContext db, ClaimsPrincipal user, string complejoId)
    {
        if (string.IsNullOrWhiteSpace(complejoId))
            return false;
        if (EsPlataforma(user))
            return await db.Complejos.AsNoTracking().AnyAsync(c => c.Id == complejoId);
        var mine = user.IdOrEmpty();
        if (await db.Complejos.AsNoTracking().AnyAsync(c => c.Id == complejoId && c.DuenoId == mine))
            return true;
        return await db.ComplejoMiembros.AsNoTracking()
            .AnyAsync(m => m.ComplejoId == complejoId && m.UsuarioId == mine && m.Activo);
    }

    // Solo dueño o plataforma (mutaciones: equipo, promos, config).
    public static async Task<bool> EsDuenoAsync(AppDbContext db, ClaimsPrincipal user, string complejoId)
    {
        if (string.IsNullOrWhiteSpace(complejoId))
            return false;
        if (EsPlataforma(user))
            return await db.Complejos.AsNoTracking().AnyAsync(c => c.Id == complejoId);
        return await db.Complejos.AsNoTracking()
            .AnyAsync(c => c.Id == complejoId && c.DuenoId == user.IdOrEmpty());
    }

    // Alcance estricto (nunca null): propios + membresías activas, para
    // todos los roles incluida plataforma. Para vistas de dueño (clientes, historial).
    public static async Task<List<string>> IdsPropiosAsync(AppDbContext db, ClaimsPrincipal user)
    {
        var mine = user.IdOrEmpty();
        var propios = await db.Complejos.AsNoTracking()
            .Where(c => c.DuenoId == mine).Select(c => c.Id).ToListAsync();
        var miembro = await db.ComplejoMiembros.AsNoTracking()
            .Where(m => m.UsuarioId == mine && m.Activo).Select(m => m.ComplejoId).ToListAsync();
        return propios.Concat(miembro).Distinct().ToList();
    }

    // Primer complejo operable: propio más antiguo, luego membresía más
    // antigua, luego el primero global solo para plataforma. Null = sin acceso.
    public static async Task<string?> PrimeroAsync(AppDbContext db, ClaimsPrincipal user)
    {
        var mine = user.IdOrEmpty();
        var propio = await db.Complejos.AsNoTracking()
            .Where(c => c.DuenoId == mine)
            .OrderBy(c => c.CreadoEn)
            .Select(c => c.Id)
            .FirstOrDefaultAsync();
        if (propio is not null) return propio;

        var miembro = await db.ComplejoMiembros.AsNoTracking()
            .Where(m => m.UsuarioId == mine && m.Activo)
            .OrderBy(m => m.CreadoEn)
            .Select(m => m.ComplejoId)
            .FirstOrDefaultAsync();
        if (miembro is not null) return miembro;

        if (EsPlataforma(user))
            return await db.Complejos.AsNoTracking()
                .OrderBy(c => c.CreadoEn)
                .Select(c => c.Id)
                .FirstOrDefaultAsync();
        return null;
    }

    // Vitrina pública: complejos publicados CON suscripción activa vigente.
    public static async Task<HashSet<string>> IdsVisiblesAsync(AppDbContext db)
    {
        var hoy = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Unspecified);
        return await db.Suscripciones.AsNoTracking()
            .Where(s => s.Estado == EstadoSuscripcion.ACTIVA && s.FechaFin >= hoy)
            .Join(db.Complejos.AsNoTracking().Where(c => c.Publicado),
                s => s.ComplejoId, c => c.Id, (s, c) => s.ComplejoId)
            .ToHashSetAsync();
    }
}
