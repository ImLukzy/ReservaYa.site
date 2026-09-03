using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;

namespace ReservaFacil.Api.Security;

public class ValidSessionRequirement : IAuthorizationRequirement
{
}

public class ValidSessionHandler : AuthorizationHandler<ValidSessionRequirement>
{
    private readonly AppDbContext _db;

    public ValidSessionHandler(AppDbContext db)
    {
        _db = db;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ValidSessionRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Fail();
            return;
        }

        if (!int.TryParse(context.User.FindFirstValue("tv"), out var tv))
        {
            context.Fail();
            return;
        }

        var id = context.User.FindFirstValue("id");
        if (string.IsNullOrEmpty(id))
        {
            context.Fail();
            return;
        }

        var valida = await _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == id && u.Activo && u.TokenVersion == tv);

        if (valida)
            context.Succeed(requirement);
        else
            context.Fail();
    }
}

public static class PrincipalExtensions
{
    public static string IdOrEmpty(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("id") ?? "";

    public static Rol RolOr(this ClaimsPrincipal principal)
    {
        if (Enum.TryParse<Rol>(principal.FindFirstValue("rol"), out var rol)) return rol;
        return Rol.USUARIO;
    }
}