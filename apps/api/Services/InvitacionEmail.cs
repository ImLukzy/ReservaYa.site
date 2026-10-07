using System.Net;

namespace ReservaFacil.Api.Services;

// Correos de invitaciones de equipo: aviso a quien ya tiene cuenta e
// invitación a registrarse a quien aún no la tiene. Texto plano + HTML
// codificado (los nombres vienen de usuarios).
public static class InvitacionEmail
{
    // Origen público de la web: el de PASSWORD_RESET_URL (apunta a la landing).
    public static string UrlPublica(PasswordResetOptions opciones) =>
        Uri.TryCreate(opciones.ResetUrl, UriKind.Absolute, out var uri)
            ? uri.GetLeftPart(UriPartial.Authority)
            : "https://reservaya.site";

    public static EmailMessage Aviso(string email, string nombre, string invitador, string complejo, string baseUrl)
    {
        var link = $"{baseUrl}/login";
        var text =
            $"Hola {nombre},\n\n" +
            $"{invitador} te invitó a su equipo en {complejo} (ReservaYa).\n" +
            $"Entra con tu cuenta y acepta o rechaza la invitación desde la bandeja (icono de campana):\n{link}\n\n" +
            "Si no esperabas esta invitación, puedes rechazarla o ignorar este correo.";
        var html = Envolver(
            $"<p>Hola {Enc(nombre)},</p>" +
            $"<p><strong>{Enc(invitador)}</strong> te invitó a su equipo en <strong>{Enc(complejo)}</strong>.</p>" +
            "<p>Entra con tu cuenta y acepta o rechaza la invitación desde la bandeja (icono de campana).</p>" +
            Boton(link, "Ver invitación") +
            "<p style=\"font-size:13px;color:#5B6660\">Si no esperabas esta invitación, puedes rechazarla o ignorar este correo.</p>");
        return new EmailMessage(email, $"{invitador} te invitó a su equipo en {complejo}", text, html);
    }

    public static EmailMessage Registro(string email, string invitador, string complejo, string baseUrl)
    {
        var link = $"{baseUrl}/register";
        var text =
            "Hola,\n\n" +
            $"{invitador} quiere sumarte a su equipo en {complejo} (ReservaYa), pero aún no tienes cuenta.\n" +
            $"Crea tu cuenta gratis con este mismo correo:\n{link}\n\n" +
            "Cuando te registres, avísale para que vuelva a invitarte. Si no esperabas este correo, ignóralo.";
        var html = Envolver(
            "<p>Hola,</p>" +
            $"<p><strong>{Enc(invitador)}</strong> quiere sumarte a su equipo en <strong>{Enc(complejo)}</strong>, pero aún no tienes cuenta en ReservaYa.</p>" +
            "<p>Crea tu cuenta gratis con este mismo correo.</p>" +
            Boton(link, "Crear mi cuenta") +
            "<p style=\"font-size:13px;color:#5B6660\">Cuando te registres, avísale para que vuelva a invitarte. Si no esperabas este correo, ignóralo.</p>");
        return new EmailMessage(email, $"{invitador} quiere sumarte a su equipo en ReservaYa", text, html);
    }

    private static string Enc(string s) => WebUtility.HtmlEncode(s);

    private static string Boton(string link, string texto) =>
        $"<p><a href=\"{Enc(link)}\" style=\"display:inline-block;background:#22C55E;color:#060C08;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none\">{Enc(texto)}</a></p>";

    private static string Envolver(string cuerpo) =>
        $"<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101613\">{cuerpo}</div>";
}
