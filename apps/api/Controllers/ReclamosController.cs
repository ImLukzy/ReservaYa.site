using System.ComponentModel.DataAnnotations;
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;

namespace ReservaFacil.Api.Controllers;

public sealed class CrearReclamoDto
{
    [Required, StringLength(200, MinimumLength = 3)] public string Nombre { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string Email { get; set; } = "";
    [Required, RegularExpression("^(DNI|CE)$")] public string DocumentoTipo { get; set; } = "";
    [Required, StringLength(20, MinimumLength = 6)] public string Documento { get; set; } = "";
    [Required, StringLength(500)] public string Domicilio { get; set; } = "";
    [Required, StringLength(30, MinimumLength = 6)] public string Telefono { get; set; } = "";
    public bool Menor { get; set; }
    [StringLength(200)] public string? Apoderado { get; set; }
    [StringLength(20, MinimumLength = 6)] public string? ApoderadoDocumento { get; set; }
    [StringLength(500)] public string? ApoderadoDomicilio { get; set; }
    [StringLength(30, MinimumLength = 6)] public string? ApoderadoTelefono { get; set; }
    [Required, RegularExpression("^(Servicio|Producto)$")] public string BienTipo { get; set; } = "";
    [Required, StringLength(2000)] public string BienDescripcion { get; set; } = "";
    [Range(typeof(decimal), "0", "9999999999.99")] public decimal? Monto { get; set; }
    [Required, RegularExpression("^(RECLAMO|QUEJA)$")] public string Tipo { get; set; } = "";
    [Required, StringLength(10000, MinimumLength = 10)] public string Detalle { get; set; } = "";
    [Required, StringLength(10000, MinimumLength = 5)] public string Pedido { get; set; } = "";
    [Required, RegularExpression("^(Correo electrónico|Carta al domicilio)$")] public string MedioRespuesta { get; set; } = "";
}

[ApiController]
[Route("api/reclamos")]
[AllowAnonymous]
public sealed class ReclamosController(AppDbContext db, IRateLimiter rateLimiter) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Crear(CrearReclamoDto dto, CancellationToken ct)
    {
        var forwarded = Request.Headers["X-Forwarded-For"].ToString();
        var ip = !string.IsNullOrWhiteSpace(forwarded) ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (rateLimiter.IsLimited($"reclamos:{ip}", 10, TimeSpan.FromHours(1)))
            return StatusCode(429, new { error = "Demasiados envíos. Inténtalo dentro de una hora." });
        if (dto.Nombre.Trim().Length < 3 || dto.Detalle.Trim().Length < 10 || dto.Pedido.Trim().Length < 5)
            return BadRequest(new { error = "Revisa nombre, detalle y pedido." });
        if (dto.Menor && (string.IsNullOrWhiteSpace(dto.Apoderado) ||
            string.IsNullOrWhiteSpace(dto.ApoderadoDocumento) || string.IsNullOrWhiteSpace(dto.ApoderadoDomicilio) ||
            string.IsNullOrWhiteSpace(dto.ApoderadoTelefono)))
            return BadRequest(new { error = "Completa los datos del representante del menor." });
        if (dto.Monto.HasValue && decimal.Round(dto.Monto.Value, 2) != dto.Monto.Value)
            return BadRequest(new { error = "El monto admite hasta dos decimales." });

        // MAX + 1 solo se confirma junto con la fila. Un rollback no consume números.
        // PostgreSQL puede responder 40001 o 23505 al competir por el primer número del año.
        for (var intento = 0; intento < 5; intento++)
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            try
            {
                var ahora = DateTime.UtcNow;
                var fecha = new DateTime(ahora.Ticks - ahora.Ticks % TimeSpan.TicksPerMillisecond, DateTimeKind.Utc);
                var correlativo = (await db.Reclamos.Where(r => r.Anio == fecha.Year)
                    .MaxAsync(r => (int?)r.Correlativo, ct) ?? 0) + 1;
                var reclamo = new Reclamo
                {
                    Id = Guid.NewGuid().ToString(), Anio = fecha.Year, Correlativo = correlativo,
                    Numero = $"{fecha.Year}-{correlativo:D6}", CreadoEn = fecha, Estado = "RECIBIDO",
                    Tipo = dto.Tipo, Nombre = dto.Nombre.Trim(), Email = dto.Email.Trim(),
                    DocumentoTipo = dto.DocumentoTipo, Documento = dto.Documento.Trim(),
                    Domicilio = dto.Domicilio.Trim(), Telefono = dto.Telefono.Trim(), Menor = dto.Menor,
                    Apoderado = dto.Menor ? dto.Apoderado?.Trim() : null,
                    ApoderadoDocumento = dto.Menor ? dto.ApoderadoDocumento?.Trim() : null,
                    ApoderadoDomicilio = dto.Menor ? dto.ApoderadoDomicilio?.Trim() : null,
                    ApoderadoTelefono = dto.Menor ? dto.ApoderadoTelefono?.Trim() : null,
                    BienTipo = dto.BienTipo, BienDescripcion = dto.BienDescripcion.Trim(), Monto = dto.Monto,
                    Detalle = dto.Detalle.Trim(), Pedido = dto.Pedido.Trim(), MedioRespuesta = dto.MedioRespuesta,
                };
                db.Reclamos.Add(reclamo);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                return StatusCode(201, new { ok = true, numero = reclamo.Numero,
                    fecha = reclamo.CreadoEn.ToString("O"), plazoRespuestaDiasHabiles = 15 });
            }
            catch (Exception ex) when (EsConflictoReintentable(ex))
            {
                // Dispose revierte una transacción abierta y también acepta un COMMIT
                // que PostgreSQL ya abortó; Rollback explícito fallaría si quedó completada.
                await transaction.DisposeAsync();
                db.ChangeTracker.Clear();
                if (intento < 4) await Task.Delay(TimeSpan.FromMilliseconds(25 * (intento + 1)), ct);
            }
        }
        return StatusCode(503, new { error = "No se pudo confirmar el registro. Inténtalo nuevamente." });
    }

    private static bool EsConflictoReintentable(Exception ex)
    {
        var postgres = ex as PostgresException ?? ex.InnerException as PostgresException;
        return postgres?.SqlState == "40001" || (postgres?.SqlState == "23505" &&
            postgres.ConstraintName is "Reclamo_numero_key" or "Reclamo_anio_correlativo_key");
    }
}
