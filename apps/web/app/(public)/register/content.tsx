"use client";
import { useEffect } from "react";
import { edadValida, fechaMaximaRegistro, MENSAJE_EDAD } from "@/lib/public/edad";
import { returnUrlSeguro } from "@/lib/redirect";
import { fallbackPorRol } from "@/lib/permissions";
import { createScriptScope } from "@/lib/public/runtime";
import AuthCard from "@/components/public/AuthCard";
import BotonGoogle from "@/components/public/ui/BotonGoogle";
import { Input as Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { API, APP } from "@/lib/public/entorno";
import { BOTON } from "@/lib/public/estilos";
const apiUrl = API;
const appUrl = APP;
export default function PublicContent() {
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        const steps = [...document.querySelectorAll<HTMLElement>(".reg-step")];
        const pasoLabel = document.querySelector<HTMLElement>("#rg-paso");
        if (!pasoLabel) return scope.dispose;
        const nombre = document.querySelector<HTMLInputElement>("#rg-nombre");
        if (!nombre) return scope.dispose;
        const fecha = document.querySelector<HTMLInputElement>("#rg-fecha");
        if (!fecha) return scope.dispose;
        fecha.max = fechaMaximaRegistro();
        const user = document.querySelector<HTMLInputElement>("#rg-user");
        if (!user) return scope.dispose;
        const email = document.querySelector<HTMLInputElement>("#rg-email");
        if (!email) return scope.dispose;
        const pass = document.querySelector<HTMLInputElement>("#rg-pass");
        if (!pass) return scope.dispose;
        const pass2 = document.querySelector<HTMLInputElement>("#rg-pass2");
        if (!pass2) return scope.dispose;
        const submit = document.querySelector<HTMLButtonElement>("#rg-submit");
        if (!submit) return scope.dispose;
        const googleBtn = document.querySelector<HTMLButtonElement>("#rg-google");
        if (!googleBtn) return scope.dispose;
        function getSafeReturnUrl(rawUrl: string | null, fallbackUrl: string) { return returnUrlSeguro(rawUrl, window.location.origin) ?? fallbackUrl; }
        listen(googleBtn, "click", (e) => {
            e.preventDefault();
            const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
            const safeUrl = returnUrl ? getSafeReturnUrl(returnUrl, "") : "";
            window.location.href = `${apiUrl}/api/auth/google${safeUrl ? `?returnUrl=${encodeURIComponent(safeUrl)}` : ""}`;
        });
        function goStep(n: number) {
            steps.forEach((s) => { s.hidden = s.dataset.step !== String(n); });
            if (pasoLabel)
                pasoLabel.textContent = `Paso ${n} de 2`;
            const primero = document.querySelector<HTMLInputElement>(`.reg-step[data-step="${n}"] input`);
            if (primero)
                primero.focus();
        }
        function err(step: number, msg: string) {
            const p = document.querySelector<HTMLElement>(`.reg-step[data-step="${step}"] [data-err]`);
            if (!p)
                return;
            p.textContent = msg || "";
            p.hidden = !msg;
        }
        // Sugerir @usuario desde el nombre
        listen(nombre, "input", () => {
            if (document.activeElement === user)
                return;
            const base = nombre.value.trim().toLowerCase()
                .normalize("NFD").replace(/[̀-ͯ]/g, "")
                .replace(/[^a-z0-9]+/g, "");
            if (base.length >= 3 && !user.dataset.touched) {
                user.value = base.slice(0, 14) + Math.floor(10 + Math.random() * 90);
            }
        });
        listen(user, "input", () => { user.dataset.touched = "1"; });
        listen(document.querySelector<HTMLButtonElement>("#to-step2"), "click", () => {
            if (nombre.value.trim().length < 3)
                return err(1, "Escribe tu nombre completo.");
            if (!fecha.value)
                return err(1, "Elige tu fecha de nacimiento.");
            if (!edadValida(fecha.value))
                return err(1, MENSAJE_EDAD);
            if (!/^[a-zA-Z0-9_.]{3,20}$/.test(user.value.trim()))
                return err(1, "Tu usuario: de 3 a 20 caracteres (letras, números, _ o .).");
            err(1, "");
            goStep(2);
        });
        listen(document.querySelector<HTMLButtonElement>("#back-step1"), "click", () => goStep(1));
        listen(submit, "click", async () => {
            if (!edadValida(fecha.value)) {
                goStep(1);
                return err(1, MENSAJE_EDAD);
            }
            const mail = email.value.trim();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail))
                return err(2, "Escribe un correo válido.");
            if (pass.value.length < 6)
                return err(2, "La contraseña debe tener al menos 6 caracteres.");
            if (pass.value !== pass2.value)
                return err(2, "Las contraseñas no coinciden.");
            err(2, "");
            submit.disabled = true;
            submit.textContent = "Creando cuenta...";
            try {
                const response = await fetch(`${apiUrl}/api/auth/register`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre: nombre.value.trim(),
                        email: mail,
                        password: pass.value,
                        fechaNacimiento: fecha.value,
                        username: user.value.trim().toLowerCase(),
                    }),
                });
                const body = await response.json().catch(() => null);
                if (!response.ok)
                    throw new Error(body?.error || "No se pudo crear la cuenta");
                window.location.href = getSafeReturnUrl(new URLSearchParams(window.location.search).get("returnUrl"), appUrl + fallbackPorRol(body?.usuario?.rol));
            }
            catch (error) {
                err(2, error instanceof TypeError
                    ? "No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos."
                    : error instanceof Error ? error.message : "No se pudo crear la cuenta");
                submit.disabled = false;
                submit.textContent = "Crear mi cuenta";
            }
        });
        return scope.dispose;
    }, []);
    return (<>


    <>
  <AuthCard titulo="Crea tu cuenta" texto="Te pedimos lo justo para reservar y para que te agreguen a los partidos." arriba={<p id="rg-paso" className="mb-2 text-sm font-medium text-pizarra">Paso 1 de 2</p>} pie={<p className="text-pizarra">¿Ya tienes cuenta? <a href="/login" className={BOTON.texto}>Entrar</a></p>}>
    

    <div className="reg-step space-y-4" data-step="1">
      <Field apariencia="publica" id="rg-nombre" type="text" etiqueta="Nombre completo" autoComplete="name" placeholder="Nombre y apellido"/>
      <Field apariencia="publica" id="rg-fecha" type="date" etiqueta="Fecha de nacimiento" nota="Debes tener al menos 14 años. No se puede cambiar después."/>
      <Field apariencia="publica" id="rg-user" type="text" etiqueta="Tu usuario" autoComplete="username" placeholder="tucrack10" nota="Con él te agregan a sorteos y partidos. Lo sugerimos desde tu nombre."/>
      <p hidden className="text-sm font-medium text-error" data-err role="alert"></p>
      <Button apariencia="publica" id="to-step2" className="w-full">Continuar</Button>
      <div className="relative my-6 flex items-center">
        <div className="flex-grow border-t border-cal"></div>
        <span className="mx-4 text-sm text-pizarra">o</span>
        <div className="flex-grow border-t border-cal"></div>
      </div>
      <BotonGoogle id="rg-google"/>
    </div>

    <div className="reg-step space-y-4" data-step="2" hidden>
      <Field apariencia="publica" id="rg-email" type="email" etiqueta="Correo" autoComplete="email" placeholder="tu@correo.com"/>
      <Field apariencia="publica" id="rg-pass" type="password" etiqueta="Contraseña" autoComplete="new-password" nota="Mínimo 6 caracteres."/>
      <Field apariencia="publica" id="rg-pass2" type="password" etiqueta="Repite la contraseña" autoComplete="new-password"/>
      <p hidden className="text-sm font-medium text-error" data-err role="alert"></p>
      <div className="flex gap-3">
        <Button apariencia="publica" id="back-step1" variante="secundario">Atrás</Button>
        <Button apariencia="publica" id="rg-submit" className="flex-1">Crear mi cuenta</Button>
      </div>
    </div>

    
  </AuthCard>
    </>



    </>);
}
