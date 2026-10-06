"use client";
import { useEffect } from "react";
import { returnUrlSeguro } from "@/lib/redirect";
import { fallbackPorRol } from "@/lib/permissions";
import { createScriptScope } from "@/lib/public/runtime";
import AuthCard from "@/components/public/AuthCard";
import BotonGoogle from "@/components/public/ui/BotonGoogle";
import { Input as Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/public/ui/Icon";
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
        const form = document.querySelector<HTMLFormElement>("#login-page-form");
        const status = document.getElementById("lp-status");
        const submit = document.querySelector<HTMLButtonElement>("#lp-submit");
        const pass = document.querySelector<HTMLInputElement>("#lp-pass");
        const googleBtn = document.getElementById("lp-google");
        if (!pass) return scope.dispose;
        function getSafeReturnUrl(rawUrl: string | null, fallbackUrl: string) {
            return returnUrlSeguro(rawUrl, window.location.origin) ?? fallbackUrl;
        }
        // Espejo de fallbackPorRol (apps/web/lib/permissions.ts).
        const query = new URLSearchParams(window.location.search);
        // Sesión vieja rechazada (p. ej. el rol cambió al aprobar tu centro): aviso, no error.
        if (query.get("sesion") === "cambio" && status) {
            status.textContent = "Tu sesión terminó o tu cuenta cambió (por ejemplo, aprobamos tu centro). Entra de nuevo para continuar.";
            status.hidden = false;
        }
        if (query.get("error") === "google" && status) {
            status.textContent = "No pudimos entrar con Google. Inténtalo de nuevo o usa tu correo y contraseña.";
            status.hidden = false;
        }
        // La API vuelve aquí con ?google=ok tras crear la sesión; se lleva a cada rol a su inicio.
        if (query.get("google") === "ok") {
            fetch(`${apiUrl}/api/auth/me`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : null))
                .then((body) => {
                const role = body?.usuario?.rol ?? body?.rol;
                if (!role)
                    return;
                window.location.href = getSafeReturnUrl(query.get("returnUrl"), appUrl + fallbackPorRol(role));
            })
                .catch(() => {
                if (status) { status.textContent = "No pudimos completar el inicio con Google. Inténtalo de nuevo."; status.hidden = false; }
            });
        }
        listen(googleBtn, "click", (e) => {
            e.preventDefault();
            const returnUrl = query.get("returnUrl");
            const safeUrl = returnUrl ? getSafeReturnUrl(returnUrl, "") : "";
            window.location.href = `${apiUrl}/api/auth/google${safeUrl ? `?returnUrl=${encodeURIComponent(safeUrl)}` : ""}`;
        });
        listen(document.getElementById("lp-eye"), "click", (e) => {
            const btn = e.currentTarget;
            if (!(btn instanceof HTMLElement)) return;
            const show = pass.type === "password";
            pass.type = show ? "text" : "password";
            btn.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
            btn.setAttribute("aria-pressed", String(show));
        });
        listen(form, "submit", async (event) => {
            event.preventDefault();
            if (!(form instanceof HTMLFormElement) || !(submit instanceof HTMLButtonElement) || !status)
                return;
            submit.disabled = true;
            submit.textContent = "Entrando...";
            status.hidden = true;
            const data = new FormData(form);
            try {
                const response = await fetch(`${apiUrl}/api/auth/login`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
                });
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error("Demasiados intentos. Espera 15 minutos antes de reintentar.");
                    }
                    throw new Error(body?.error || "No se pudo entrar. Revisa tu correo y contraseña.");
                }
                const role = body?.usuario?.rol;
                const params = new URLSearchParams(window.location.search);
                // Espejo de fallbackPorRol (apps/web/lib/permissions.ts).
                const defaultUrl = appUrl + fallbackPorRol(role);
                window.location.href = getSafeReturnUrl(params.get("returnUrl"), defaultUrl);
            }
            catch (error) {
                status.textContent = error instanceof TypeError
                    ? "No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos."
                    : error instanceof Error ? error.message : "No se pudo entrar";
                status.hidden = false;
                submit.disabled = false;
                submit.textContent = "Entrar";
            }
        });
        return scope.dispose;
    }, []);
    return (<>


    <>
  <AuthCard titulo="Entrar a tu cuenta" texto="Con tu cuenta reservas canchas y ves tus partidos." pie={<p className="text-pizarra">¿No tienes cuenta? <a href="/register" className={BOTON.texto}>Crear una cuenta</a></p>}>
    <form id="login-page-form" className="space-y-4" noValidate>
      <Field apariencia="publica" id="lp-email" name="email" type="email" etiqueta="Correo" required autoComplete="email" placeholder="tu@correo.com"/>
      <Field apariencia="publica" id="lp-pass" name="password" type="password" etiqueta="Contraseña" required autoComplete="current-password" claseCampo="pr-12">
        <button id="lp-eye" type="button" aria-label="Mostrar contraseña" aria-pressed="false" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-control text-pizarra hover:text-basalto">
          <Icon nombre="ojo"/>
        </button>
      </Field>
      <a href="/forgot-password" className={`${BOTON.texto} text-sm`}>¿Olvidaste tu contraseña?</a>
      <p id="lp-status" hidden role="alert" className={claseError}></p>
      <Button apariencia="publica" type="submit" id="lp-submit" className="w-full">Entrar</Button>
      <div className="relative my-6 flex items-center">
        <div className="flex-grow border-t border-cal"></div>
        <span className="mx-4 text-sm text-pizarra">o</span>
        <div className="flex-grow border-t border-cal"></div>
      </div>
      <BotonGoogle id="lp-google"/>
    </form>
    
  </AuthCard>
    </>



    </>);
}
