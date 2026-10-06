"use client";
import Link from "next/link";
import { ACTUALIZACION_LEGAL } from "@/lib/public/empresa";
import { useEffect } from "react";
import { createScriptScope } from "@/lib/public/runtime";
// Sugerencias: se envían a la bandeja (PUBLIC_INBOXMEJIKAI_ENDPOINT). Sin bandeja o si
// falla, se ofrece el correo con el texto listo; nunca se da por enviada una idea que no salió.
import { Input as Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EMAIL } from "@/lib/public/contacto";
import { AVISO } from "@/lib/public/estilos";
import { API } from "@/lib/public/entorno";
export default function PublicContent() {
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        const userEl = document.querySelector<HTMLElement>("#idea-user");
        if (!userEl) return scope.dispose;
        const area = document.querySelector<HTMLTextAreaElement>("#idea-text");
        if (!area) return scope.dispose;
        const count = document.querySelector<HTMLElement>("#idea-count");
        if (!count) return scope.dispose;
        const submit = document.querySelector<HTMLButtonElement>("#idea-submit");
        if (!submit) return scope.dispose;
        const form = document.querySelector<HTMLFormElement>("#idea-form");
        if (!form) return scope.dispose;
        const status = document.querySelector<HTMLElement>("#idea-status");
        if (!status) return scope.dispose;
        const mail = document.querySelector<HTMLAnchorElement>("#idea-mail");
        if (!mail) return scope.dispose;
        const exito = document.querySelector<HTMLElement>("#success-card");
        if (!exito) return scope.dispose;
        fetch(`${API}/api/auth/me`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((b) => {
            if (userEl && b?.usuario?.nombre)
                userEl.textContent = b.usuario.nombre.trim();
        })
            .catch(() => { });
        const validar = () => {
            if (count)
                count.textContent = String(area?.value.length ?? 0);
            if (submit)
                submit.disabled = (area?.value.trim().length ?? 0) < 10;
        };
        listen(area, "input", validar);
        validar();
        listen(document.querySelector<HTMLButtonElement>("#otra-idea"), "click", () => {
            form?.reset();
            validar();
            if (exito)
                exito.hidden = true;
            if (form)
                form.hidden = false;
            area?.focus();
        });
        listen(form, "submit", async (e) => {
            e.preventDefault();
            if (!area || area.value.trim().length < 10)
                return;
            const distrito = document.querySelector<HTMLInputElement>("#idea-distrito")?.value.trim() ?? "";
            const payload = { nombre: userEl?.textContent ?? "invitado", distrito, idea: area.value.trim(), page: location.pathname, fecha: new Date().toISOString() };
            const endpoint = document.querySelector<HTMLElement>(".public-site")?.dataset.inboxEndpoint ?? "";
            if (submit)
                submit.disabled = true;
            if (status)
                status.hidden = true;
            if (mail) mail.hidden = true;
            let enviada = false;
            if (endpoint) {
                try {
                    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                    enviada = res.ok;
                }
                catch {
                    enviada = false;
                }
            }
            if (submit)
                submit.disabled = false;
            if (enviada) {
                if (form)
                    form.hidden = true;
                if (exito)
                    exito.hidden = false;
                return;
            }
            if (status) {
                status.textContent = `No pudimos enviarla desde aquí. Mándala a ${EMAIL} con el botón de abajo.`;
                status.hidden = false;
            }
            if (mail) {
                const cuerpo = `${payload.idea}${distrito ? `\n\nDistrito: ${distrito}` : ""}`;
                mail.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Sugerencia para ReservaYa")}&body=${encodeURIComponent(cuerpo)}`;
                mail.hidden = false;
            }
        });
        return scope.dispose;
    }, []);
    return (<>


    <>
  <section className="mx-auto max-w-texto px-4 pb-16 pt-8 md:px-6 lg:pt-12">
    <div className="flex items-center gap-2">
      <span className="font-display text-xs font-bold uppercase tracking-wider text-cesped-hondo">Ideas de la comunidad</span>
      <span className="text-xs text-pizarra">·</span>
      <span className="font-display text-xs font-bold uppercase tracking-wider text-pizarra">Mejoremos juntos</span>
    </div>
    <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-basalto sm:text-5xl">Envía una sugerencia</h1>
    <p className="mt-3 text-base text-pizarra sm:text-lg">Comparte una propuesta para mejorar ReservaYa. Para quejas o reclamos utiliza el Libro de reclamaciones.</p>

    <p className="mt-3 text-sm text-pizarra">Este canal recibe sugerencias; no sustituye el <Link href="/libro-reclamaciones" className="underline">Libro de reclamaciones</Link>. Evita incluir datos sensibles o de terceros; consulta la <Link href="/legal/privacy" className="underline">Política de privacidad</Link>.</p>
    <p className="mt-2 text-xs text-pizarra">Última actualización: {ACTUALIZACION_LEGAL}.</p>
    <form id="idea-form" className="card-tactil mt-8 space-y-4 bg-tiza p-5 shadow-suave sm:p-7" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cal pb-3">
        <p className="font-display text-xl font-black text-basalto">Describe tu propuesta</p>
        <p className="text-sm text-pizarra">Envías como <strong id="idea-user" className="font-semibold text-basalto">invitado</strong>.</p>
      </div>
      <Field apariencia="publica" id="idea-distrito" name="distrito" etiqueta="Distrito (opcional)" maxLength="80" placeholder="Cayma"/>
      <Field apariencia="publica" id="idea-text" name="idea" etiqueta="Tu idea" multilinea filas={6} maxLength="1000" placeholder="Cuéntanos qué te gustaría ver en ReservaYa." nota="Mínimo 10 caracteres."/>
      <p className="text-right text-sm text-pizarra"><span id="idea-count" className="tabular-nums">0</span> de 1000</p>
      <p id="idea-status" hidden role="alert" className={AVISO.error}></p>
      <a id="idea-mail" hidden className="inline-flex min-h-11 items-center font-semibold text-cesped-hondo underline" href={`mailto:${EMAIL}`}>Enviarla por correo</a>
      <Button apariencia="publica" type="submit" id="idea-submit" disabled className="w-full shadow-suave-sm">Enviar sugerencia</Button>
    </form>

    <div id="success-card" hidden role="status" className="card-tactil mt-8 bg-cesped-suave p-6 text-center shadow-suave">
      <p className="font-display text-2xl font-black text-basalto">Recibimos tu idea</p>
      <p className="mx-auto mt-2 max-w-sm text-pizarra">Gracias por ayudarnos a mejorar ReservaYa.</p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Button apariencia="publica" id="otra-idea" variante="secundario">Enviar otra idea</Button>
        <Button apariencia="publica" href="/canchas">Buscar canchas</Button>
      </div>
    </div>
  </section>
    </>



    </>);
}
