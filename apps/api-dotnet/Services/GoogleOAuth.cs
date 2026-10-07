using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace ReservaFacil.Api.Services;

public record GoogleTokenResponse(
    [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string AccessToken,
    [property: System.Text.Json.Serialization.JsonPropertyName("id_token")] string IdToken,
    [property: System.Text.Json.Serialization.JsonPropertyName("expires_in")] int ExpiresIn);

public record GoogleProfile(string Sub, string Email, string Name, string? Picture);

public class GoogleOAuth
{
    public string? ClientId { get; }
    public string RedirectUri => _redirectUri;
    private readonly string _clientSecret;
    private readonly string _redirectUri;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GoogleOAuth> _logger;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;
    // Sin mapeo de claims: "sub", "email" y "email_verified" se leen con su nombre original.
    private readonly JwtSecurityTokenHandler _tokenHandler = new() { MapInboundClaims = false };

    public GoogleOAuth(
        string clientId,
        string clientSecret,
        string redirectUri,
        IHttpClientFactory httpClientFactory,
        ILogger<GoogleOAuth> logger)
    {
        ClientId = clientId;
        _clientSecret = clientSecret;
        _redirectUri = redirectUri;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            "https://accounts.google.com/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever());
    }

    public string GenerateState()
    {
        var randomBytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        return Convert.ToBase64String(randomBytes);
    }

    public async Task<GoogleProfile?> ExchangeCodeForProfile(string code, string state, string? stateFromCookie)
    {
        // Comparar state en tiempo constante
        if (!ConstantTimeComparison(state, stateFromCookie ?? ""))
        {
            _logger.LogWarning("OAuth state mismatch (CSRF attack?)");
            return null;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var request = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", _redirectUri),
                new KeyValuePair<string, string>("client_id", ClientId ?? ""),
                new KeyValuePair<string, string>("client_secret", _clientSecret)
            });

            using var response = await client.PostAsync("https://oauth2.googleapis.com/token", request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Google token exchange failed: {Status} {Error}", response.StatusCode, error);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<GoogleTokenResponse>(content);
            if (tokenResponse?.IdToken is null)
            {
                _logger.LogError("No id_token in Google response");
                return null;
            }

            return await ValidateAndExtractProfile(tokenResponse.IdToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Google OAuth exchange");
            return null;
        }
    }

    private async Task<GoogleProfile?> ValidateAndExtractProfile(string idToken)
    {
        try
        {
            var config = await _configManager.GetConfigurationAsync(CancellationToken.None);
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuers = new[] { "https://accounts.google.com", "accounts.google.com" },
                ValidateAudience = true,
                ValidAudience = ClientId,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = config.SigningKeys,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(10)
            };

            var principal = _tokenHandler.ValidateToken(idToken, validationParameters, out var validatedToken);

            // Verificar email_verified
            var emailVerifiedClaim = principal.FindFirst("email_verified")?.Value;
            if (emailVerifiedClaim != "true" && emailVerifiedClaim != "True")
            {
                _logger.LogWarning("Google account email not verified");
                return null;
            }

            var sub = principal.FindFirst("sub")?.Value;
            var email = principal.FindFirst("email")?.Value;
            var name = principal.FindFirst("name")?.Value;
            var picture = principal.FindFirst("picture")?.Value;

            if (string.IsNullOrEmpty(sub) || string.IsNullOrEmpty(email))
            {
                _logger.LogError("Missing required claims in id_token");
                return null;
            }

            return new GoogleProfile(sub, email, name ?? "", picture);
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogError(ex, "Invalid id_token signature or validation failed");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating id_token");
            return null;
        }
    }

    private static bool ConstantTimeComparison(string a, string b)
    {
        if (a.Length != b.Length)
            return false;

        int result = 0;
        for (int i = 0; i < a.Length; i++)
            result |= a[i] ^ b[i];

        return result == 0;
    }
}
