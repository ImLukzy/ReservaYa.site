using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.Authorization;

namespace ReservaFacil.Api.Security;

// Role-specific authorization does not inherit DefaultPolicy. Add session
// validation independently while retaining each endpoint's existing policies.
public sealed class ValidSessionConvention : IApplicationModelConvention
{
    private static readonly AuthorizationPolicy SessionPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .AddRequirements(new ValidSessionRequirement())
        .Build();

    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            if (controller.Attributes.OfType<IAllowAnonymous>().Any())
                continue;
            var controllerProtected = controller.Attributes.OfType<IAuthorizeData>().Any();
            foreach (var action in controller.Actions)
            {
                if (action.Attributes.OfType<IAllowAnonymous>().Any())
                    continue;
                if (controllerProtected || action.Attributes.OfType<IAuthorizeData>().Any())
                    action.Filters.Add(new AuthorizeFilter(SessionPolicy));
            }
        }
    }
}
