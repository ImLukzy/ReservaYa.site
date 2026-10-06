"use client";
import { useEffect, useRef } from "react";
import { createScriptScope } from "@/lib/public/runtime";
import AuthCard from "@/components/public/AuthCard";
import { Input as Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/public/ui/Icon";
import { API } from "@/lib/public/entorno";
import { AVISO, BOTON } from "@/lib/public/estilos";
const apiUrl = API;
export default function PublicContent() {
    const tokenRef = useRef<string | null>(null);
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        // El token llega en el fragmento (#t=…): no viaja a ningún servidor. Se lee y se
        // borra de la URL al instante para que no quede en el historial ni en capturas.
        tokenRef.current ??= new URLSearchParams(location.hash.slice(1)).get("t") || "";
        const token = tokenRef.current;
        if (location.hash)
            history.replaceState(null, "", location.pathname + location.search);
        // Abrir otro enlace estando ya en esta página solo cambia el fragmento: recargar para leerlo.
        listen(window, "hashchange", () => location.reload());
        const form = document.querySelector<HTMLFormElement>("#rp-form");
        if (!form) return scope.dispose;
        const done = document.querySelector<HTMLElement>("#rp-done");
        if (!done) return scope.dispose;
        const invalid = document.querySelector<HTMLElement>("#rp-invalid");
        if (!invalid) return scope.dispose;
        const invalidTitle = document.querySelector("#rp-invalid-title span");
        const status = document.querySelector<HTMLElement>("#rp-status");
        if (!status) return scope.dispose;
        const submit = document.querySelector<HTMLButtonElement>("#rp-submit");
        if (!submit) return scope.dispose;
        const pass = document.querySelector<HTMLInputElement>("#rp-pass");
        if (!pass) return scope.dispose;
        const pass2 = document.querySelector<HTMLInputElement>("#rp-pass2");
        if (!pass2) return scope.dispose;
        const mostrarError = (texto: string) => {
            if (!status)
                return;
            status.textContent = texto;
            status.hidden = false;
        };
        const mostrarInvalido = (titulo: string) => {
            if (form)
                form.hidden = true;
            if (invalidTitle)
                invalidTitle.textContent = titulo;
            if (invalid)
                invalid.hidden = false;
        };
        if (!token)
            mostrarInvalido("Enlace incompleto");
        else if (form)
            form.hidden = false;
        listen(form, "submit", async (event) => {
            event.preventDefault();
            if (!(submit instanceof HTMLButtonElement) || !(pass instanceof HTMLInputElement) || !(pass2 instanceof HTMLInputElement))
                return;
            if (pass.value.length < 6) {
                mostrarError("La contraseña debe tener al menos 6 caracteres.");
                pass.focus();
                return;
            }
            if (pass.value !== pass2.value) {
                mostrarError("Las contraseñas no coinciden.");
                pass2.focus();
                return;
            }
            submit.disabled = true;
            submit.textContent = "Guardando...";
            if (status)
                status.hidden = true;
            let res = null;
            let body = null;
            try {
                res = await fetch(`${apiUrl}/api/auth/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, password: pass.value }),
                });
                body = await res.json().catch(() => null);
            }
            catch {
                res = null;
            }
            if (res && res.ok) {
                form.hidden = true;
                if (done)
                    done.hidden = false;
                return;
            }
            submit.disabled = false;
            submit.textContent = "Guardar contraseña";
            const error = body && typeof body.error === "string" ? body.error : "";
            if (res && res.status === 400 && /enlace/i.test(error))
                mostrarInvalido("Enlace inválido o vencido");
            else if (res && res.status === 400 && error)
                mostrarError(error);
            else if (res && res.status === 429)
                mostrarError("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
            else
                mostrarError("No pudimos guardar la contraseña ahora. Inténtalo más tarde.");
        });
        return scope.dispose;
    }, []);
    return (<>


    <>
  <AuthCard titulo="Crea una nueva contraseña" texto="El enlace vence 30 minutos después de pedirlo y sirve una sola vez." arriba={<p className="mb-2 font-display text-xs font-bold text-cesped-hondo">NUEVA CONTRASEÑA</p>} pie={<a href="/login" className={BOTON.texto}>Volver a entrar</a>}>
    
    <form id="rp-form" className="space-y-4" hidden noValidate>
      <Field apariencia="publica" id="rp-pass" name="password" type="password" etiqueta="Nueva contraseña" required minLength="6" autoComplete="new-password" nota="Mínimo 6 caracteres."/>
      <Field apariencia="publica" id="rp-pass2" name="password2" type="password" etiqueta="Repite la contraseña" required minLength="6" autoComplete="new-password"/>
      <p id="rp-status" hidden role="alert" className={AVISO.error}></p>
      <Button apariencia="publica" type="submit" id="rp-submit" className="w-full">Guardar contraseña</Button>
    </form>

    <div id="rp-done" hidden role="status" className="card-tactil mt-4 border border-cal bg-cesped-suave p-4 text-basalto shadow-suave-sm">
      <p className="flex items-center gap-2 font-display text-xl font-bold text-cesped-hondo"><Icon nombre="ok" className="h-6 w-6 text-cesped-hondo"/>Contraseña actualizada</p>
      <p className="mt-2 text-sm text-pizarra">Por seguridad cerramos todas tus sesiones. Entra con tu nueva contraseña.</p>
      <Button apariencia="publica" href="/login" className="mt-5 w-full">Entrar</Button>
    </div>

    <div id="rp-invalid" hidden role="alert" className="card-tactil mt-4 border border-cal bg-error-suave p-4 text-basalto shadow-suave-sm">
      <p id="rp-invalid-title" className="flex items-center gap-2 font-display text-xl font-bold text-error"><Icon nombre="alerta" className="h-6 w-6 text-error"/><span>Enlace inválido o vencido</span></p>
      <p className="mt-2 text-sm text-pizarra">Pide un enlace nuevo: vence a los 30 minutos y solo sirve una vez.</p>
      <Button apariencia="publica" href="/forgot-password" className="mt-5 w-full">Pedir un enlace nuevo</Button>
    </div>

    
  </AuthCard>
    </>



    </>);
}
