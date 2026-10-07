using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Npgsql;
using Npgsql.NameTranslation;
using ReservaFacil.Api.Controllers;
using ReservaFacil.Api.Data;
using ReservaFacil.Api.Models;
using ReservaFacil.Api.Security;
using ReservaFacil.Api.Services;
namespace LegacyAuthFixtures;
public static class FixtureHost {
 public static void Main(string[] args) {
  if(args.SequenceEqual(new[]{"--security-convention-check"})){
   var model=new Microsoft.AspNetCore.Mvc.ApplicationModels.ApplicationModel();
   foreach(var type in typeof(AuthController).Assembly.GetTypes().Where(t=>t.IsClass&&!t.IsAbstract&&typeof(Microsoft.AspNetCore.Mvc.ControllerBase).IsAssignableFrom(t))){
    var controller=new Microsoft.AspNetCore.Mvc.ApplicationModels.ControllerModel(type.GetTypeInfo(),type.GetCustomAttributes(true).ToArray());model.Controllers.Add(controller);
    foreach(var method in type.GetMethods(BindingFlags.Public|BindingFlags.Instance|BindingFlags.DeclaredOnly)){
     if(method.IsDefined(typeof(Microsoft.AspNetCore.Mvc.NonActionAttribute),true))continue;
     var action=new Microsoft.AspNetCore.Mvc.ApplicationModels.ActionModel(method,method.GetCustomAttributes(true).ToArray()){Controller=controller};controller.Actions.Add(action);
    }
   }
   new ValidSessionConvention().Apply(model);var protectedActions=0;var anonymousActions=0;var roleActions=0;
   foreach(var controller in model.Controllers)foreach(var action in controller.Actions){
    var attrs=controller.Attributes.Concat(action.Attributes).ToArray();var anonymous=attrs.OfType<IAllowAnonymous>().Any();var authorized=attrs.OfType<IAuthorizeData>().Any();
    var filters=action.Filters.OfType<Microsoft.AspNetCore.Mvc.Authorization.AuthorizeFilter>().ToArray();
    if(anonymous||!authorized){if(filters.Length!=0)throw new Exception("Public action received a session filter");anonymousActions++;continue;}
    if(filters.Length!=1||!filters[0].Policy!.Requirements.OfType<ValidSessionRequirement>().Any()||!filters[0].Policy!.Requirements.OfType<Microsoft.AspNetCore.Authorization.Infrastructure.DenyAnonymousAuthorizationRequirement>().Any())throw new Exception("Missing mandatory session policy");
    protectedActions++;if(attrs.OfType<IAuthorizeData>().Any(a=>!string.IsNullOrEmpty(a.Roles)))roleActions++;
   }
   if(roleActions==0||anonymousActions==0)throw new Exception("Insufficient security regression coverage");
   Console.WriteLine($"Security convention PASS: {protectedActions} protected actions, {roleActions} role actions, {anonymousActions} public/anonymous actions");return;
  }
  if(args.SequenceEqual(new[]{"--email-template"})){
   Console.WriteLine(JsonSerializer.Serialize(PasswordResetEmail.Build("José <&\"'> Œ 😀","fixture@example.test","https://example.test/restablecer?x=1&y=\"dos\"#t=ficticio"),new JsonSerializerOptions(JsonSerializerDefaults.Web)));
   return;
  }
  if(Environment.GetEnvironmentVariable("F3_QA_FIXTURE")!="true")throw new Exception("Fixture host only; explicit QA flag required");
  AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior",true);
  var b=WebApplication.CreateBuilder(args);
  b.Logging.ClearProviders();
  var url=new Uri(Environment.GetEnvironmentVariable("DATABASE_URL")!);var parts=url.UserInfo.Split(':',2);
  var cs=new NpgsqlConnectionStringBuilder {Host=url.Host,Port=url.Port>0?url.Port:5432,Database=url.AbsolutePath.TrimStart('/'),Username=Uri.UnescapeDataString(parts[0]),Password=Uri.UnescapeDataString(parts[1]),SslMode=SslMode.Require};
  if(!cs.Database.StartsWith("f3_fixture_",StringComparison.Ordinal) && !(Environment.GetEnvironmentVariable("F4_QA_FIXTURE")=="true" && cs.Database.StartsWith("f4_fixture_",StringComparison.Ordinal)) && !(Environment.GetEnvironmentVariable("F5_QA_FIXTURE")=="true" && cs.Database.StartsWith("f5_fixture_",StringComparison.Ordinal)) && !(Environment.GetEnvironmentVariable("F6_QA_FIXTURE")=="true" && cs.Database.StartsWith("f6_fixture_",StringComparison.Ordinal)) && !(Environment.GetEnvironmentVariable("F7_QA_FIXTURE")=="true" && cs.Database.StartsWith("f7_fixture_",StringComparison.Ordinal)))throw new Exception("Only disposable F3 fixture databases allowed");
  var source=new NpgsqlDataSourceBuilder(cs.ConnectionString);
  source.MapEnum<Rol>("Rol",new NpgsqlNullNameTranslator());
  source.MapEnum<EstadoReserva>("EstadoReserva",new NpgsqlNullNameTranslator());
  source.MapEnum<EstadoPago>("EstadoPago",new NpgsqlNullNameTranslator());
  source.MapEnum<MetodoPago>("MetodoPago",new NpgsqlNullNameTranslator());
  source.MapEnum<TipoCancha>("TipoCancha",new NpgsqlNullNameTranslator());
  source.MapEnum<TipoMovimiento>("TipoMovimiento",new NpgsqlNullNameTranslator());
  source.MapEnum<EstadoCaja>("EstadoCaja",new NpgsqlNullNameTranslator());
  source.MapEnum<EstadoTorneo>("EstadoTorneo",new NpgsqlNullNameTranslator());
  source.MapEnum<TipoDescuento>("TipoDescuento",new NpgsqlNullNameTranslator());
  source.MapEnum<TipoMeta>("TipoMeta",new NpgsqlNullNameTranslator());
  source.MapEnum<TipoPlan>("TipoPlan",new NpgsqlNullNameTranslator());
  source.MapEnum<EstadoSuscripcion>("EstadoSuscripcion",new NpgsqlNullNameTranslator());
  source.MapEnum<NivelSancion>("NivelSancion",new NpgsqlNullNameTranslator());
  var ds=source.Build();
  b.Services.AddDbContext<AppDbContext>(options=>{options.UseNpgsql(ds,p=>{
   p.MapEnum<Rol>("Rol","public",new NpgsqlNullNameTranslator());
   p.MapEnum<EstadoReserva>("EstadoReserva","public",new NpgsqlNullNameTranslator());
   p.MapEnum<EstadoPago>("EstadoPago","public",new NpgsqlNullNameTranslator());
   p.MapEnum<MetodoPago>("MetodoPago","public",new NpgsqlNullNameTranslator());
   p.MapEnum<TipoCancha>("TipoCancha","public",new NpgsqlNullNameTranslator());
   p.MapEnum<TipoMovimiento>("TipoMovimiento","public",new NpgsqlNullNameTranslator());
   p.MapEnum<EstadoCaja>("EstadoCaja","public",new NpgsqlNullNameTranslator());
   p.MapEnum<EstadoTorneo>("EstadoTorneo","public",new NpgsqlNullNameTranslator());
   p.MapEnum<TipoDescuento>("TipoDescuento","public",new NpgsqlNullNameTranslator());
   p.MapEnum<TipoMeta>("TipoMeta","public",new NpgsqlNullNameTranslator());
   p.MapEnum<TipoPlan>("TipoPlan","public",new NpgsqlNullNameTranslator());
   p.MapEnum<EstadoSuscripcion>("EstadoSuscripcion","public",new NpgsqlNullNameTranslator());
   p.MapEnum<NivelSancion>("NivelSancion","public",new NpgsqlNullNameTranslator());
  });options.EnableServiceProviderCaching(false);});
  var secret=Environment.GetEnvironmentVariable("JWT_SECRET")!;
  b.Services.AddControllers(o => o.Conventions.Add(new ValidSessionConvention())).AddApplicationPart(typeof(AuthController).Assembly).AddJsonOptions(o=>{o.JsonSerializerOptions.PropertyNamingPolicy=JsonNamingPolicy.CamelCase;o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());o.JsonSerializerOptions.Converters.Add(new FlexibleDecimalConverter());});
  b.Services.AddSingleton<AlmacenR2>();
  b.Services.AddSingleton(new JwtService(secret));
  b.Services.AddSingleton<IRateLimiter,MemoryRateLimiter>();
  b.Services.AddMemoryCache();
  b.Services.AddSingleton(new PasswordResetTokens(secret));
  b.Services.AddSingleton(new PasswordResetOptions(Environment.GetEnvironmentVariable("PASSWORD_RESET_URL")));
  b.Services.AddSingleton<EmailQueue>();b.Services.AddSingleton<CapturedMail>();b.Services.AddSingleton<IEmailSender>(sp=>sp.GetRequiredService<CapturedMail>());b.Services.AddHostedService<EmailQueueWorker>();
  var google=new FixtureGoogle();b.Services.AddSingleton(google);
  b.Services.AddScoped<GoogleOAuth>(sp=>{
   if(!google.Enabled)return null!;
   var factory=new FixtureHttpFactory(google);
   var provider=new GoogleOAuth("fixture-client","fixture-secret","http://localhost:3100/api/auth/google/callback",factory,sp.GetRequiredService<ILogger<GoogleOAuth>>());
   var config=new ConfigurationManager<OpenIdConnectConfiguration>("http://fixture.invalid/openid",new OpenIdConnectConfigurationRetriever(),new HttpDocumentRetriever(factory.CreateClient("")){RequireHttps=false});
   typeof(GoogleOAuth).GetField("_configManager",BindingFlags.Instance|BindingFlags.NonPublic)!.SetValue(provider,config);
   return provider;
  });
  b.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o=>{
   o.MapInboundClaims=false;o.TokenValidationParameters=new(){ValidateIssuer=false,ValidateAudience=false,ValidateIssuerSigningKey=true,IssuerSigningKey=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),ValidateLifetime=true,ClockSkew=TimeSpan.FromSeconds(10),ValidAlgorithms=new[]{"HS256"},NameClaimType="email",RoleClaimType="rol"};
   o.Events=new(){OnMessageReceived=c=>{c.Token=c.Request.Cookies["token"];return Task.CompletedTask;},OnChallenge=c=>{c.HandleResponse();c.Response.StatusCode=401;c.Response.ContentType="application/json";return c.Response.WriteAsync("{\"error\":\"No autenticado\"}");},OnForbidden=c=>{c.Response.StatusCode=403;c.Response.ContentType="application/json";return c.Response.WriteAsync("{\"error\":\"Sin permisos\"}");}};
  });
  b.Services.AddAuthorization(o=>o.DefaultPolicy=new AuthorizationPolicyBuilder().RequireAuthenticatedUser().AddRequirements(new ValidSessionRequirement()).Build());b.Services.AddScoped<IAuthorizationHandler,ValidSessionHandler>();
  Directory.CreateDirectory(Path.Combine(b.Environment.ContentRootPath,"wwwroot"));
  b.Environment.WebRootPath=Path.Combine(b.Environment.ContentRootPath,"wwwroot");
  var app=b.Build();app.UseAuthentication();app.UseAuthorization();
  // Execute the original scope queries via reflection because legacy helpers are internal.
  app.Use(async(context,next)=>{
   var role=context.User.FindFirst("rol")?.Value??"USUARIO";var path=context.Request.Path.Value??"";
   if(context.User.Identity?.IsAuthenticated==true && role!="USUARIO" && role!="TECNICO" && path.StartsWith("/api/",StringComparison.OrdinalIgnoreCase) && !path.StartsWith("/api/auth/",StringComparison.OrdinalIgnoreCase) && !path.StartsWith("/api/suscripciones",StringComparison.OrdinalIgnoreCase) && context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is null){
    var db=context.RequestServices.GetRequiredService<AppDbContext>();var assembly=typeof(AuthController).Assembly;
    var access=assembly.GetType("ReservaFacil.Api.Security.ComplejoAccess")!;
    var ids=await (Task<List<string>?>)access.GetMethod("IdsAsync")!.Invoke(null,new object[]{db,context.User,true})!;
    var enabled=(IQueryable<string>)assembly.GetType("ReservaFacil.Api.Security.ConvenioPrueba")!.GetMethod("Habilitados")!.Invoke(null,new object[]{db})!;
    if(ids?.Count>0 && !await enabled.AnyAsync(x=>ids.Contains(x))){context.Response.StatusCode=403;await context.Response.WriteAsJsonAsync(new{error="Suscríbete para reactivar tu cancha."});return;}
   }
   await next(context);
  });
  app.MapControllers();
  var deleted=new System.Collections.Concurrent.ConcurrentQueue<string>();
  app.MapDelete("/_s3/{bucket}/{**key}",(string bucket,string key)=>{deleted.Enqueue(key);return Results.NoContent();});
  app.MapGet("/_test/deleted",()=>deleted.ToArray());
  app.MapGet("/_test/health",()=>new{ok=true});
  app.MapGet("/_test/emails",(CapturedMail mail)=>mail.Messages.ToArray());
  app.MapPost("/_test/google-enabled",(bool enabled)=>{google.Enabled=enabled;return new{ok=true};});
  app.MapGet("/_test/jwks",()=>google.Jwks());
  app.MapGet("/_test/google-token",(string code)=>new {id_token=google.Token(code)});
  app.Run();
 }
}
public class CapturedMail:IEmailSender {
 public readonly System.Collections.Concurrent.ConcurrentQueue<EmailMessage> Messages=new();
 public Task SendAsync(EmailMessage message,CancellationToken cancellationToken=default){Messages.Enqueue(message);return Task.CompletedTask;}
}
public class FixtureGoogle {
 public bool Enabled=true;
 private readonly RSA rsa=RSA.Create(2048);
 public object Jwks(){var p=rsa.ExportParameters(false);return new{keys=new[]{new{kty="RSA",kid="fixture-key",use="sig",alg="RS256",n=Base64UrlEncoder.Encode(p.Modulus!),e=Base64UrlEncoder.Encode(p.Exponent!)}}};}
 public string Token(string code){
  var profile=code=="existing"?("fixture-existing","jugador-a@example.test","Jugador A"):("fixture-new","google-new@example.test","Google Nuevo");
  var claims=new[]{new System.Security.Claims.Claim("sub",profile.Item1),new System.Security.Claims.Claim("email",profile.Item2),new System.Security.Claims.Claim("name",profile.Item3),new System.Security.Claims.Claim("email_verified",code=="unverified"?"false":"true"),new System.Security.Claims.Claim("picture","https://example.invalid/avatar.png")};
  var key=new RsaSecurityKey(rsa){KeyId="fixture-key"};
  return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken("https://accounts.google.com","fixture-client",claims,DateTime.UtcNow.AddSeconds(-1),DateTime.UtcNow.AddHours(1),new SigningCredentials(key,"RS256")));
 }
}
public class FixtureHttpFactory(FixtureGoogle google):IHttpClientFactory {
 public HttpClient CreateClient(string name)=>new(new FixtureHttpHandler(google));
}
public class FixtureHttpHandler(FixtureGoogle google):HttpMessageHandler {
 protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellationToken){
  object content;
  if(request.RequestUri!.AbsolutePath=="/openid")content=new {issuer="https://accounts.google.com",jwks_uri="http://fixture.invalid/jwks",authorization_endpoint="https://accounts.google.com/o/oauth2/v2/auth",token_endpoint="https://oauth2.googleapis.com/token"};
  else if(request.RequestUri.AbsolutePath=="/jwks")content=google.Jwks();
  else if(request.RequestUri.Host=="oauth2.googleapis.com") {var text=await request.Content!.ReadAsStringAsync(cancellationToken);var values=text.Split('&').Select(s=>s.Split('=',2)).ToDictionary(x=>x[0],x=>Uri.UnescapeDataString(x[1]));content=new{access_token="fixture-only",id_token=google.Token(values["code"]),expires_in=3600};}
  else throw new Exception("External provider calls forbidden in fixture host");
  return new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent(JsonSerializer.Serialize(content),Encoding.UTF8,"application/json")};
 }
}
