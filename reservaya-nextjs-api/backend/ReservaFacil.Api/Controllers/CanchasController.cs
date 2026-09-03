using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Dtos;
using ReservaFacil.Api.Services;

namespace ReservaFacil.Api.Controllers;

[ApiController]
[Route("api/canchas")]
public class CanchasController : ControllerBase
{
    private readonly AppDbContext _db;

    public CanchasController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool? activas = null)
    {
        var query = _db.Canchas.AsNoTracking();

        if (activas.HasValue)
            query = query.Where(c => c.Activa == activas.Value);

        var canchas = await query
            .OrderBy(c => c.Nombre)
            .ToListAsync();
        return Ok(new { canchas = canchas.Select(CanchaDto.From) });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var cancha = await _db.Canchas.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });
        return Ok(new { cancha = CanchaDto.From(cancha) });
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,SUPERADMIN")]
    public async Task<IActionResult> Create([FromBody] CanchaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) ||
            request.Tipo is null ||
            request.PrecioPorHora is null ||
            request.Capacidad is null)
            return BadRequest(new { error = "Faltan campos requeridos" });
        if (request.PrecioPorHora <= 0 || request.Capacidad <= 0)
            return BadRequest(new { error = "El precio y la capacidad deben ser mayores que cero" });

        var cancha = new Models.Cancha
        {
            Id = JwtService.NewId(),
            Nombre = request.Nombre.Trim(),
            Tipo = request.Tipo.Value,
            Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim(),
            PrecioPorHora = request.PrecioPorHora.Value,
            Capacidad = request.Capacidad.Value,
            Activa = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.Canchas.Add(cancha);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { ok = true, cancha = CanchaDto.From(cancha) });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN,SUPERADMIN")]
    public async Task<IActionResult> Update(string id, [FromBody] CanchaRequest request)
    {
        var cancha = await _db.Canchas.FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return NotFound(new { error = "No encontrada" });

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            cancha.Nombre = request.Nombre.Trim();
        if (request.Tipo is not null)
            cancha.Tipo = request.Tipo.Value;
        if (request.Descripcion is not null)
            cancha.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        if (request.PrecioPorHora is not null)
        {
            if (request.PrecioPorHora <= 0)
                return BadRequest(new { error = "El precio debe ser mayor que cero" });
            cancha.PrecioPorHora = request.PrecioPorHora.Value;
        }
        if (request.Capacidad is not null)
        {
            if (request.Capacidad <= 0)
                return BadRequest(new { error = "La capacidad debe ser mayor que cero" });
            cancha.Capacidad = request.Capacidad.Value;
        }
        if (request.Activa is not null)
            cancha.Activa = request.Activa.Value;

        await _db.SaveChangesAsync();

        return Ok(new { ok = true, cancha = CanchaDto.From(cancha) });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SUPERADMIN")]
    public async Task<IActionResult> Delete(string id)
    {
        var cancha = await _db.Canchas.FirstOrDefaultAsync(c => c.Id == id);
        if (cancha is null)
            return Ok(new { ok = true });

        _db.Canchas.Remove(cancha);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException { SqlState: "23503" })
        {
            return Conflict(new
            {
                error = "No se puede eliminar: la cancha tiene reservas asociadas. Desactívala en su lugar."
            });
        }

        return Ok(new { ok = true });
    }
}