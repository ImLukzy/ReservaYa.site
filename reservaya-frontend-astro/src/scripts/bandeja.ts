// Formularios con data-inbox="inboxMejikai": se envían a la bandeja si está configurada
// (PUBLIC_INBOXMEJIKAI_ENDPOINT). Sin bandeja, cada página ofrece su alternativa.
import { AVISO } from "../lib/estilos";

const endpoint = document.body.dataset.inboxEndpoint || "";

if (endpoint) {
  document.querySelectorAll<HTMLFormElement>("form[data-inbox='inboxMejikai']").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const boton = form.querySelector<HTMLButtonElement>("[data-submit]");
      const estado = form.querySelector<HTMLElement>("[data-status]");
      const avisar = (msg: string, ok: boolean) => {
        if (!estado) return;
        estado.textContent = msg;
        estado.className = `mt-4 ${ok ? AVISO.ok : AVISO.error}`;
        estado.hidden = false;
      };
      if (boton) boton.disabled = true;
      const datos: Record<string, string> = { page: location.pathname };
      new FormData(form).forEach((v, k) => (datos[k] = String(v)));
      try {
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
        if (!res.ok) throw new Error(String(res.status));
        avisar("Mensaje enviado. Te responderemos por correo.", true);
        form.reset();
      } catch {
        avisar("No se pudo enviar. Inténtalo de nuevo en unos minutos.", false);
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  });
}
