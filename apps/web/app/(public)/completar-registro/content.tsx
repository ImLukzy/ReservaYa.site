"use client";
import { useEffect } from "react";
import { edadValida, fechaMaximaRegistro, MENSAJE_EDAD } from "@/lib/public/edad";
import { fallbackPorRol } from "@/lib/permissions";
import { createScriptScope } from "@/lib/public/runtime";
import AuthCard from "@/components/public/AuthCard";
import { Input as Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { API, APP } from "@/lib/public/entorno";
import { AVISO, BOTON } from "@/lib/public/estilos";
const apiUrl = API;
const appUrl = APP;
const claseError = AVISO.error;
export default function PublicContent() {
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        const form = document.querySelector<HTMLFormElement>("#cr-form");
        if (!form) return scope.dispose;
        const status = document.querySelector<HTMLElement>("#cr-status");
        if (!status) return scope.dispose;
        const submit = document.querySelector<HTMLButtonElement>("#cr-submit");
        if (!submit) return scope.dispose;
        const tokenInput = document.querySelector<HTMLInputElement>("#cr-token");
        if (!tokenInput) return scope.dispose;
        const fecha = document.querySelector<HTMLInputElement>("#cr-fecha");
        if (!fecha) return scope.dispose;
        fecha.max = fechaMaximaRegistro();
        const user = document.querySelector<HTMLInputElement>("#cr-user");
        if (!user) return scope.dispose;
        const params = new URLSearchParams(window.location.search);
        const token = params.get("t");
        if (!token) {
            if (status) {
                status.textContent = "No hay solicitud de registro válida. Ve a /register.";
                status.hidden = false;
            }
            if (submit)
                submit.disabled = true;
        }
        else {
            if (tokenInput)
                tokenInput.value = token;
        }
        listen(form, "submit", async (event) => {
            event.preventDefault();
            if (!(form instanceof HTMLFormElement) || !(submit instanceof HTMLButtonElement) || !status)
                return;
            if (!fecha.value) {
                status.textContent = "Elige tu fecha de nacimiento.";
                status.hidden = false;
                return;
            }
            if (!edadValida(fecha.value)) {
                status.textContent = MENSAJE_EDAD;
                status.hidden = false;
                return;
            }
            if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(user.value.trim())) {
                status.textContent = "Tu usuario: de 3 a 20 caracteres (letras, números, _ . o -).";
                status.hidden = false;
                return;
            }
            submit.disabled = true;
            submit.textContent = "Creando cuenta...";
            status.hidden = true;
            try {
                const response = await fetch(`${apiUrl}/api/auth/google/completar`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        t: token,
                        fechaNacimiento: fecha.value,
                        username: user.value.trim().toLowerCase(),
                    }),
                });
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(body?.error || "No se pudo crear la cuenta");
                }
                const role = body?.usuario?.rol;
                
                const defaultUrl = appUrl + fallbackPorRol(role);
                window.location.href = defaultUrl;
            }
            catch (error) {
                status.textContent = error instanceof TypeError
                    ? "No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos."
                    : error instanceof Error ? error.message : "No se pudo crear la cuenta";
                status.hidden = false;
                submit.disabled = false;
                submit.textContent = "Crear mi cuenta";
            }
        });
        return scope.dispose;
    }, []);
    return (<>


    <>
  <AuthCard titulo="Completa tu registro" texto="Solo nos falta tu fecha de nacimiento y tu usuario." pie={<p className="text-pizarra">¿Ya tienes cuenta? <a href="/login" className={BOTON.texto}>Entrar</a></p>}>
    <form id="cr-form" className="space-y-4" noValidate>
      <input type="hidden" id="cr-token" name="t"/>
      <Field apariencia="publica" id="cr-fecha" name="fechaNacimiento" type="date" etiqueta="Fecha de nacimiento" nota="Debes tener al menos 14 años. No se puede cambiar después." required/>
      <Field apariencia="publica" id="cr-user" name="username" type="text" etiqueta="Tu usuario" autoComplete="username" placeholder="tucrack10" nota="Con él te agregan a sorteos y partidos." required/>
      <p id="cr-status" hidden role="alert" className={claseError}></p>
      <Button apariencia="publica" type="submit" id="cr-submit" className="w-full">Crear mi cuenta</Button>
    </form>
    
  </AuthCard>
    </>



    </>);
}
