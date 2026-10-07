using System.Data;
using System.Net;
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
[Route("api/solicitudes")]
[Authorize]
public class SolicitudesController(AppDbContext db, IEmailSender emailSender, ILogger<SolicitudesController> logger) : ControllerBase
{
    public sealed class SolicitudRequest
    {
        public ComplejosController.ComplejoRequest? Complejo { get; set; }
        public CanchaRequest? Cancha { get; set; }
        public bool AceptaConvenio { get; set; }
    }
    public sealed class RechazoRequest { public string? Motivo { get; set; } }

    private IQueryable<Complejo> Pendientes() => db.Complejos.Where(c => !c.Publicado && c.Dueno != null && c.Dueno.Rol == Rol.USUARIO);

    [HttpGet]
    [Authorize(Roles = "TECNICO")]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var rows = await Pendientes().AsNoTracking().Include(c => c.Canchas).Include(c => c.Dueno)
            .OrderBy(c => c.CreadoEn).ToListAsync(ct);
        return Ok(new { ok = true, solicitudes = rows.Select(c => Shape(c, incluirSolicitante: true)) });
    }

    [HttpGet("mias")]
    [Authorize(Roles = "USUARIO,SUPERADMIN")]
    public async Task<IActionResult> Mias(CancellationToken ct)
    {
        var mine = User.IdOrEmpty();
        var rows = await db.Complejos.AsNoTracking().Where(c => c.DuenoId == mine)
            .Include(c => c.Canchas).Include(c => c.Dueno).OrderByDescending(c => c.CreadoEn).ToListAsync(ct);
        return Ok(new { ok = true, solicitud = rows.Count == 0 ? null : Shape(rows[0]) });
    }

    [HttpPost]
    [Authorize(Roles = "USUARIO")]
    public async Task<IActionResult> Crear(SolicitudRequest request, CancellationToken ct)
    {
        var centro = request.Complejo;
        var cancha = request.Cancha;
        if (!request.AceptaConvenio) return BadRequest(new { error = "Debes aceptar el convenio de prueba y los Términos." });
        if (centro is null || cancha is null || string.IsNullOrWhiteSpace(centro.Nombre) ||
            string.IsNullOrWhiteSpace(centro.Direccion) || string.IsNullOrWhiteSpace(cancha.Nombre) ||
            cancha.Tipo is null || !Enum.IsDefined(cancha.Tipo.Value) || cancha.Capacidad is null or <= 0 || cancha.PrecioPorHora is null or <= 0)
            return BadRequest(new { error = "Completa los datos del centro y de una cancha con precio y capacidad mayores que cero." });
        var distrito = ComplejosController.NormalizarDistrito(centro.Distrito);
        if (distrito is null) return BadRequest(new { error = "Distrito inválido: debe ser un distrito de Arequipa." });
        var imagen = string.IsNullOrWhiteSpace(cancha.Imagen) ? null : CanchasController.ValidarImagen(cancha.Imagen, MediaPublica.PrefijoPropio("cancha", User));
        if (!string.IsNullOrWhiteSpace(cancha.Imagen) && imagen is null) return BadRequest(new { error = "Imagen inválida." });

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        try
        {
            var mine = User.IdOrEmpty();
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == mine, ct);
            if (usuario is null || usuario.Rol != Rol.USUARIO) return StatusCode(403, new { error = "Solo jugadores pueden solicitar un centro." });
            if (await db.Complejos.AnyAsync(c => c.DuenoId == mine, ct))
                return Conflict(new { error = "Ya tienes un centro pendiente o aprobado." });
            var ahora = DateTime.UtcNow;
            var complejo = new Complejo { Id = JwtService.NewId(), DuenoId = mine, Dueno = usuario, Nombre = centro.Nombre.Trim(),
                Direccion = centro.Direccion.Trim(), Distrito = distrito, Ciudad = ComplejosController.CiudadUnica,
                Telefono = centro.Telefono?.Trim(), Email = centro.Email?.Trim(), Descripcion = centro.Descripcion?.Trim(),
                Publicado = false, CreadoEn = ahora, ActualizadoEn = ahora };
            // ID aleatorio: slug único sin reservar nombres ni revelar otros centros.
            complejo.Slug = $"centro-{complejo.Id}";
            complejo.Canchas.Add(new Cancha { Id = JwtService.NewId(), ComplejoId = complejo.Id,
                Nombre = cancha.Nombre.Trim(), Tipo = cancha.Tipo.Value, PrecioPorHora = cancha.PrecioPorHora.Value,
                Capacidad = cancha.Capacidad.Value, Descripcion = cancha.Descripcion?.Trim(), Techada = cancha.Techada ?? false,
                Superficie = cancha.Superficie?.Trim(), Imagen = imagen, Activa = false, CreadoEn = ahora });
            db.Complejos.Add(complejo);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return StatusCode(201, new { ok = true, solicitud = Shape(complejo) });
        }
        catch (Exception ex) when (EsConflicto(ex)) { return Conflict(new { error = "Otra solicitud cambió tus centros. Revisa el estado antes de reintentar." }); }
    }

    [HttpPatch("{id}/aprobar")]
    [Authorize(Roles = "TECNICO")]
    public async Task<IActionResult> Aprobar(string id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        try
        {
            var complejo = await db.Complejos.Include(c => c.Dueno).Include(c => c.Canchas).FirstOrDefaultAsync(c => c.Id == id, ct);
            if (complejo is null) return NotFound(new { error = "Solicitud no encontrada." });
            if (complejo.Publicado || complejo.Dueno?.Rol != Rol.USUARIO)
                return Conflict(new { error = "Solo se aprueban solicitudes pendientes de jugadores." });
            if (complejo.Canchas.Count != 1 || complejo.Canchas.Any(c => c.Activa))
                return Conflict(new { error = "La solicitud debe contener exactamente una cancha inactiva." });
            if (await db.Complejos.AnyAsync(c => c.DuenoId == complejo.DuenoId && c.Id != id, ct))
                return Conflict(new { error = "El solicitante ya tiene otro centro." });
            complejo.Publicado = true;
            complejo.CreadoEn = complejo.ActualizadoEn = DateTime.UtcNow;
            complejo.Canchas[0].Activa = true;
            complejo.Dueno.Rol = Rol.SUPERADMIN;
            // Promoción únicamente: JWT anterior conserva privilegios USUARIO.
            // Refrescar lee el nuevo rol de BD; no se altera la revocación de otras operaciones.
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Ok(new { ok = true, solicitud = Shape(complejo), requiereRefrescarSesion = true });
        }
        catch (Exception ex) when (EsConflicto(ex)) { return Conflict(new { error = "La solicitud cambió durante la revisión. Recarga antes de reintentar." }); }
    }

    [HttpPatch("{id}/rechazar")]
    [Authorize(Roles = "TECNICO")]
    public async Task<IActionResult> Rechazar(string id, RechazoRequest request, CancellationToken ct)
    {
        var motivo = request.Motivo?.Trim();
        if (string.IsNullOrWhiteSpace(motivo) || motivo.Length > 2000) return BadRequest(new { error = "Indica un motivo de hasta 2000 caracteres." });
        string destinatario;
        await using (var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct))
        {
            try
            {
                var complejo = await db.Complejos.Include(c => c.Dueno).Include(c => c.Canchas).FirstOrDefaultAsync(c => c.Id == id, ct);
                if (complejo is null) return NotFound(new { error = "Solicitud no encontrada." });
                if (complejo.Publicado || complejo.Dueno?.Rol != Rol.USUARIO)
                    return Conflict(new { error = "Solo se rechazan solicitudes pendientes de jugadores." });
                if (complejo.Canchas.Any(c => c.Activa)) return Conflict(new { error = "La solicitud tiene canchas activas; no se puede borrar." });
                destinatario = complejo.Dueno.Email;
                db.Canchas.RemoveRange(complejo.Canchas);
                db.Complejos.Remove(complejo);
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (Exception ex) when (EsConflicto(ex)) { return Conflict(new { error = "La solicitud cambió o tiene datos asociados. No se rechazó; recarga antes de reintentar." }); }
        }
        var emailEnviado = false;
        if (emailSender is not DisabledEmailSender && emailSender is not LogEmailSender)
        {
            try
            {
                await emailSender.SendAsync(new EmailMessage(destinatario, "Solicitud de centro revisada — ReservaYa",
                    $"Tu solicitud fue rechazada. Motivo: {motivo}\nPuedes enviar una nueva solicitud desde tu panel.",
                    $"<p>Tu solicitud fue rechazada.</p><p>Motivo: {WebUtility.HtmlEncode(motivo)}</p><p>Puedes enviar una nueva solicitud desde tu panel.</p>"), ct);
                emailEnviado = true;
            }
            catch (Exception) { logger.LogWarning("Solicitud rechazada; no se pudo enviar el aviso por correo."); }
        }
        return Ok(new { ok = true, estado = "RECHAZADA", emailEnviado });
    }

    private static bool EsConflicto(Exception ex) => (ex as PostgresException ?? ex.InnerException as PostgresException)?.SqlState is "40001" or "23505" or "23503";
    private static object Shape(Complejo c, bool incluirSolicitante = false)
    {
        var cancha = c.Canchas.FirstOrDefault();
        var shape = new Dictionary<string, object?>
        {
            ["id"] = c.Id, ["estado"] = !c.Publicado && c.Dueno?.Rol == Rol.USUARIO ? "PENDIENTE" : "APROBADA",
            ["creadoEn"] = DtoFormat.Utc(c.CreadoEn),
            ["complejo"] = new { c.Id, c.Nombre, c.Direccion, c.Distrito, c.Ciudad, c.Telefono, c.Email, c.Descripcion, c.Publicado },
            ["cancha"] = cancha is null ? null : CanchaDto.From(cancha),
        };
        if (incluirSolicitante) shape["solicitante"] = c.Dueno is null ? null : new { c.Dueno.Id, c.Dueno.Nombre, c.Dueno.Email };
        return shape;
    }
}
