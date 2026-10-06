using System.Net;
using System.Net.Http.Json;
using System.Threading.Channels;

namespace ReservaFacil.Api.Services;

public record EmailMessage(string To, string Subject, string Text, string Html);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

// Resend por API HTTP (spec 15): no depende de puertos SMTP salientes.
public class ResendEmailSender : IEmailSender
{
    public const string ClientName = "resend";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _from;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(IHttpClientFactory httpClientFactory, string from, ILogger<ResendEmailSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _from = from;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var client = _httpClientFactory.CreateClient(ClientName);
        using var response = await client.PostAsJsonAsync("emails", new
        {
            from = _from,
            to = new[] { message.To },
            subject = message.Subject,
            text = message.Text,
            html = message.Html
        }, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Resend respondió {(int)response.StatusCode}: {body[..Math.Min(body.Length, 300)]}");
        }

        var sent = await response.Content.ReadFromJsonAsync<ResendResponse>(cancellationToken);
        _logger.LogInformation("Email «{Subject}» enviado por Resend (id {Id})", message.Subject, sent?.Id);
    }

    private sealed record ResendResponse(string? Id);
}

// Solo desarrollo: escribe el correo (con el enlace) en el log en lugar de enviarlo.
public class LogEmailSender : IEmailSender
{
    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[EMAIL_PROVIDER=log] Para: {To} · {Subject}\n{Text}", message.To, message.Subject, message.Text);
        return Task.CompletedTask;
    }
}

// Sin proveedor configurado: los endpoints responden igual y el fallo queda en el log (sin enlace).
public class DisabledEmailSender : IEmailSender
{
    private readonly ILogger<DisabledEmailSender> _logger;

    public DisabledEmailSender(ILogger<DisabledEmailSender> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogError("Email no enviado: no hay proveedor configurado (EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM, PASSWORD_RESET_URL)");
        return Task.CompletedTask;
    }
}

// Cola en memoria: la respuesta HTTP no espera al proveedor, así el tiempo de
// respuesta no revela si la cuenta existe.
public class EmailQueue
{
    private readonly Channel<EmailMessage> _channel =
        Channel.CreateBounded<EmailMessage>(new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.DropWrite });

    public bool Enqueue(EmailMessage message) => _channel.Writer.TryWrite(message);

    public IAsyncEnumerable<EmailMessage> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

public class EmailQueueWorker : BackgroundService
{
    private readonly EmailQueue _queue;
    private readonly IEmailSender _sender;
    private readonly ILogger<EmailQueueWorker> _logger;

    public EmailQueueWorker(EmailQueue queue, IEmailSender sender, ILogger<EmailQueueWorker> logger)
    {
        _queue = queue;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await _sender.SendAsync(message, stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogError(exception, "No se pudo enviar el email «{Subject}»", message.Subject);
            }
        }
    }
}

public record PasswordResetOptions(string? ResetUrl);

public static class PasswordResetEmail
{
    public static EmailMessage Build(string nombre, string email, string link)
    {
        var minutos = (int)PasswordResetTokens.Ttl.TotalMinutes;
        var nombreHtml = WebUtility.HtmlEncode(nombre);
        var linkHtml = WebUtility.HtmlEncode(link);
        var text =
            $"Hola {nombre},\n\n" +
            "Recibimos una solicitud para restablecer la contraseña de tu cuenta de ReservaYa.\n" +
            $"Crea una nueva aquí (el enlace vence en {minutos} minutos y sirve una sola vez):\n{link}\n\n" +
            "Si no fuiste tú, ignora este correo: tu contraseña no cambia.";
        var html =
            "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101613\">" +
            $"<p>Hola {nombreHtml},</p>" +
            "<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de ReservaYa.</p>" +
            $"<p><a href=\"{linkHtml}\" style=\"display:inline-block;background:#22C55E;color:#060C08;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none\">Crear nueva contraseña</a></p>" +
            $"<p style=\"font-size:13px;color:#5B6660\">El enlace vence en {minutos} minutos y sirve una sola vez. Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>" +
            "</div>";
        return new EmailMessage(email, "Restablece tu contraseña de ReservaYa", text, html);
    }
}
