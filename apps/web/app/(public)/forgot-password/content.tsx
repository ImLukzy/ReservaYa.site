"use client";
import { useEffect } from "react";
import { createScriptScope } from "@/lib/public/runtime";
import AuthCard from "@/components/public/AuthCard";
import { Input as Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/public/ui/Icon";
import { API } from "@/lib/public/entorno";
import { AVISO, BOTON } from "@/lib/public/estilos";
import { EMAIL } from "@/lib/public/contacto";
const apiUrl = API;
const correo = EMAIL;
export default function PublicContent() {
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        const form = document.querySelector<HTMLFormElement>("#forgot-form");
        if (!form) return scope.dispose;
        const done = document.querySelector<HTMLElement>("#fp-done");
        if (!done) return scope.dispose;
        const status = document.querySelector<HTMLElement>("#fp-status");
        if (!status) return scope.dispose;
        const submit = document.querySelector<HTMLButtonElement>("#fp-submit");
        if (!submit) return scope.dispose;
        const input = document.querySelector<HTMLInputElement>("#fp-email");
        if (!input) return scope.dispose;
        const mostrarError = (texto: string) => {
            if (!status)
                return;
            status.textContent = texto;
            status.hidden = false;
        };
        listen(form, "submit", async (event) => {
            event.preventDefault();
            if (!(form instanceof HTMLFormElement) || !(submit instanceof HTMLButtonElement) || !status || !(input instanceof HTMLInputElement))
                return;
            const mail = input.value.trim();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
                mostrarError("Escribe un correo válido.");
                return;
            }
            submit.disabled = true;
            submit.textContent = "Enviando...";
            status.hidden = true;
            let res = null;
            try {
                res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: mail }),
                });
            }
            catch {
                res = null;
            }
            if (res && res.ok) {
                // La API responde igual exista o no la cuenta: no se revela nada aquí.
                form.hidden = true;
                if (done)
                    done.hidden = false;
                return;
            }
            submit.disabled = false;
            submit.textContent = "Enviarme el enlace";
            if (res && res.status === 429)
                mostrarError("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
            else if (res && res.status === 400)
                mostrarError("Escribe un correo válido.");
            else
                mostrarError(`No pudimos enviar el enlace ahora. Inténtalo más tarde o escríbenos a ${correo}.`);
        });
        return scope.dispose;
    }, []);
    return (<>


    <>
  <AuthCard titulo="Recupera tu contraseña" texto="Escribe tu correo y te enviamos un enlace para crear una nueva." arriba={<p className="mb-2 font-display text-xs font-bold text-cesped-hondo">RECUPERACIÓN</p>} pie={<a href="/login" className={BOTON.texto}>Volver a entrar</a>}>
    
    <form id="forgot-form" className="space-y-4" noValidate>
      <Field apariencia="publica" id="fp-email" name="email" type="email" etiqueta="Correo" required autoComplete="email" placeholder="tu@correo.com"/>
      <p id="fp-status" hidden role="alert" className={AVISO.error}></p>
      <Button apariencia="publica" type="submit" id="fp-submit" className="w-full">Enviarme el enlace</Button>
    </form>

    <div id="fp-done" hidden role="status" className="card-tactil mt-4 border border-cal bg-cesped-suave p-4 text-basalto shadow-suave-sm">
      <p className="flex items-center gap-2 font-display text-xl font-bold text-cesped-hondo"><Icon nombre="ok" className="h-6 w-6 text-cesped-hondo"/>Revisa tu correo</p>
      <p className="mt-2 text-sm text-pizarra">Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Vence a los 30 minutos.</p>
    </div>

    
  </AuthCard>
    </>



    </>);
}
