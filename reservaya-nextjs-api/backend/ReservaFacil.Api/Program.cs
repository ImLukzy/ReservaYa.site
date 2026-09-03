using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Npgsql.NameTranslation;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

var envPath = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "..", ".env"));
var databaseUrlFromEnvironment = Environment.GetEnvironmentVariable("DATABASE_URL");
var unpooledUrlFromEnvironment = Environment.GetEnvironmentVariable("DATABASE_URL_UNPOOLED");
EnvLoader.Load(envPath);

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET no está definida en .env");
if (jwtSecret.Length < 32)
    throw new InvalidOperationException("JWT_SECRET debe tener al menos 32 caracteres");

var rawConnectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL_UNPOOLED")
    ?? throw new InvalidOperationException("DATABASE_URL no está definida en .env");

var connectionString = NormalizeConnectionString(rawConnectionString);
var connectionSource = databaseUrlFromEnvironment is not null
    ? "process environment: DATABASE_URL"
    : unpooledUrlFromEnvironment is not null
        ? "process environment: DATABASE_URL_UNPOOLED"
        : $"{envPath}: " + (Environment.GetEnvironmentVariable("DATABASE_URL") is not null
            ? "DATABASE_URL"
            : "DATABASE_URL_UNPOOLED");
var parsedConnection = new NpgsqlConnectionStringBuilder(connectionString);
Console.WriteLine($"[DEBUG] .env path: {envPath} (exists: {File.Exists(envPath)})");
Console.WriteLine($"[DEBUG] Database connection source: {connectionSource}");
Console.WriteLine(
    "[DEBUG] Database connection: " +
    $"host={parsedConnection.Host}, port={parsedConnection.Port}, database={parsedConnection.Database}, " +
    $"username={parsedConnection.Username}, sslmode={parsedConnection.SslMode}, " +
    $"passwordExists={!string.IsNullOrEmpty(parsedConnection.Password)}");

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new FlexibleDecimalConverter());
    });

var dataSource = new NpgsqlDataSourceBuilder(connectionString)
    .MapEnum<Rol>("Rol", new NpgsqlNullNameTranslator())
    .MapEnum<EstadoReserva>("EstadoReserva", new NpgsqlNullNameTranslator())
    .MapEnum<TipoCancha>("TipoCancha", new NpgsqlNullNameTranslator())
    .Build();

// Mapear los enums a nivel de EF Core es necesario para leer/escribir
// (Rol, EstadoReserva, TipoCancha). El data source ya los mapea a nivel de
// Npgsql. EF Core combina ambas configuraciones en un proveedor de servicios
// interno; con un data source externo más This lambda, el caché de EF
// considera "inestables" las opciones, acumula un proveedor por DbContext y,
// tras 20, lanza ManyServiceProvidersCreatedWarning (excepción). Con
// EnableServiceProviderCaching(false) se evita esa acumulación/excepción
// conservando el mapeo de enums.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(dataSource, npgsqlOptions =>
    {
        npgsqlOptions.MapEnum<Rol>("Rol", "public", new NpgsqlNullNameTranslator());
        npgsqlOptions.MapEnum<EstadoReserva>("EstadoReserva", "public", new NpgsqlNullNameTranslator());
        npgsqlOptions.MapEnum<TipoCancha>("TipoCancha", "public", new NpgsqlNullNameTranslator());
    });
    // Con un data source externo más MapEnum, el caché de EF Core acumula un
    // proveedor de servicios interno por DbContext y, tras 20, lanza
    // ManyServiceProvidersCreatedWarning (excepción). Al desactivar el caché
    // se evita esa acumulación/excepción conservando el mapeo de enums.
    options.EnableServiceProviderCaching(false);
});

builder.Services.AddSingleton(new JwtService(jwtSecret));
builder.Services.AddSingleton<IRateLimiter, MemoryRateLimiter>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(10),
            ValidAlgorithms = new[] { "HS256" },
            NameClaimType = "email",
            RoleClaimType = "rol"
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies[JwtService.CookieName];
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync("{\"error\":\"No autenticado\"}");
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync("{\"error\":\"Sin permisos\"}");
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .AddRequirements(new ValidSessionRequirement())
        .Build();
});
builder.Services.AddScoped<IAuthorizationHandler, ValidSessionHandler>();

builder.Services.AddCors(options =>
{
    var frontendOrigins = (Environment.GetEnvironmentVariable("FRONTEND_ORIGIN")
        ?? "http://localhost:3000,http://localhost:4321")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(frontendOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    Console.WriteLine("[DEBUG] ApplicationStarted event fired");
    var addresses = app.Urls;
    Console.WriteLine($"[DEBUG] Configured URLs: {string.Join(", ", addresses)}");
    var serverAddresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()?.Addresses;
    if (serverAddresses != null)
    {
        Console.WriteLine($"[DEBUG] Actual server addresses: {string.Join(", ", serverAddresses)}");
    }
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    Console.WriteLine("[DEBUG] ApplicationStopping event fired");
});

app.Run();

public partial class Program
{
    static string NormalizeConnectionString(string value)
    {
        if (value.IndexOf("://", StringComparison.Ordinal) < 0)
            return value;

        var uri = new Uri(value);
        var user = "";
        var password = "";
        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var userInfo = uri.UserInfo.Split(':', 2);
            user = Uri.UnescapeDataString(userInfo[0]);
            if (userInfo.Length > 1)
                password = Uri.UnescapeDataString(userInfo[1]);
        }

        var connectionBuilder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = user,
            Password = password
        };

        foreach (var parameter in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = parameter.Split('=', 2);
            if (pair.Length != 2)
                continue;

            var queryKey = pair[0].ToLowerInvariant();
            var queryValue = Uri.UnescapeDataString(pair[1]);
            switch (queryKey)
            {
                case "sslmode":
                    connectionBuilder["Ssl Mode"] = queryValue;
                    break;
                case "sslrootcert":
                    connectionBuilder["Root Certificate"] = queryValue;
                    break;
                case "application_name":
                    connectionBuilder["Application Name"] = queryValue;
                    break;
                case "channel_binding":
                    connectionBuilder["Channel Binding"] = queryValue;
                    break;
            }
        }

        if (!string.Equals(connectionBuilder.Password, password, StringComparison.Ordinal))
            throw new InvalidOperationException("La contraseña cambió durante la normalización de DATABASE_URL.");

        return connectionBuilder.ConnectionString;
    }
}
