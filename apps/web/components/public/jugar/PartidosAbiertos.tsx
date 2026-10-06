"use client";
import { useEffect } from "react";
import Image from "next/image";
import { createScriptScope } from "@/lib/public/runtime";
import { Button } from "@/components/ui/Button";
import { Input as Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import Icon from "@/components/public/ui/Icon";
import SeccionTitulo from "@/components/public/inicio/SeccionTitulo";
import { API, APP } from "@/lib/public/entorno";
import { AVISO, BOTON, ETIQUETA, INSIGNIA, INSIGNIA_BASE } from "@/lib/public/estilos";
const apiUrl = API;
const niveles = ["Todos los niveles", "Principiante", "Intermedio", "Avanzado"];
const formatos = ["Fútbol 5", "Fútbol 6", "Fútbol 7", "Fútbol 8", "Fútbol 9", "Fútbol 11"];
const superficies = ["Grass sintético", "Losa", "Grass natural"].map((s) => ({ valor: s, etiqueta: s }));
const nivelesForm = ["Principiante", "Intermedio", "Avanzado"].map((n) => ({ valor: n, etiqueta: n }));
const chip = "chip-tactil cursor-pointer";
const clases = { ok: AVISO.ok, error: AVISO.error, chip, libre: `${INSIGNIA_BASE} ${INSIGNIA.libre}`, primario: BOTON.primario };
function elemento<T extends HTMLElement>(selector: string): T {
 const element = document.querySelector<T>(selector);
 if (!element) throw new Error("Falta un elemento de partidos");
 return element;
}
interface PartidoPublico {
 id: string; titulo?: string; cuando?: string; fechaCorta?: string; horaCorta?: string;
 fecha?: string; distrito?: string; nivel?: string; cancha?: string;
 cuposLibres?: string | number; anotado?: boolean;
}

export default function PartidosAbiertos() {
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        (function () {
            const base = String(apiUrl);
            const q = elemento<HTMLInputElement>("#q");
        if (!q) return scope.dispose;
            const nivBox = elemento<HTMLElement>("#nivs");
        if (!nivBox) return scope.dispose;
            const lista = elemento<HTMLUListElement>("#lista");
        if (!lista) return scope.dispose;
            const vacio = elemento<HTMLElement>("#vacio");
        if (!vacio) return scope.dispose;
            const countEl = elemento<HTMLElement>("#count");
        if (!countEl) return scope.dispose;
            const errEl = elemento<HTMLElement>("#lista-error");
        if (!errEl) return scope.dispose;
            const statCupos = elemento<HTMLElement>("#stat-cupos");
        if (!statCupos) return scope.dispose;
            if (!q || !lista || !vacio || !countEl)
                return;
            let partidos: PartidoPublico[] = [];
            let nivel = "Todos los niveles";
            let formato = "Fútbol 7";
            function showError(msg: string, ok = false) {
                if (!errEl)
                    return;
                errEl.textContent = msg || "";
                errEl.className = "mt-4 " + (ok ? clases.ok : clases.error);
                errEl.hidden = !msg;
            }
            function resumen(p: PartidoPublico) {
                const cuando = p.cuando || [p.fechaCorta, p.horaCorta].filter(Boolean).join(" ") || p.fecha || "";
                const lugar = [p.distrito, p.nivel].filter(Boolean).join(", ");
                return [cuando, lugar].filter(Boolean).join(", ");
            }
            function fila(p: PartidoPublico) {
                const li = document.createElement("li");
                li.className = "fila-entra flex flex-col gap-3 border-b border-cal/15 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between";
                const left = document.createElement("div");
                const title = document.createElement("p");
                title.className = "font-semibold";
                title.textContent = p.titulo || "Partido abierto";
                const sub = document.createElement("p");
                sub.className = "text-sm text-pizarra";
                sub.textContent = resumen(p);
                left.append(title, sub);
                const right = document.createElement("div");
                right.className = "flex items-center gap-3";
                const pill = document.createElement("span");
                pill.className = clases.libre;
                pill.textContent = (p.cuposLibres != null ? p.cuposLibres : "–") + " cupos";
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = clases.primario;
                const lleno = (Number(p.cuposLibres) || 0) <= 0 && !p.anotado;
                if (p.anotado) {
                    btn.textContent = "Anotado";
                    btn.disabled = true;
                }
                else if (lleno) {
                    btn.textContent = "Lleno";
                    btn.disabled = true;
                }
                else {
                    btn.textContent = "Anotarme";
                    listen(btn, "click", function () { anotarse(p, btn); });
                }
                right.append(pill, btn);
                li.append(left, right);
                return li;
            }
            function pintar() {
                const t = q.value.toLowerCase().trim();
                const visibles = partidos.filter(function (p) {
                    const okN = nivel === "Todos los niveles" || p.nivel === nivel;
                    const txt = ((p.titulo || "") + " " + (p.distrito || "") + " " + (p.cancha || "")).toLowerCase();
                    return okN && (!t || txt.indexOf(t) !== -1);
                });
                lista.replaceChildren(...visibles.map(fila));
                countEl.textContent = String(visibles.length);
                vacio.hidden = !(visibles.length === 0 && partidos.length === 0);
                lista.hidden = visibles.length === 0 && partidos.length === 0;
                const cupos = partidos.reduce(function (acc, p) { return acc + (Number(p.cuposLibres) || 0); }, 0);
                if (statCupos)
                    statCupos.textContent = String(cupos);
            }
            function cargar() {
                fetch(base + "/api/partidos", { credentials: "include" })
                    .then(function (res) {
                    if (!res.ok)
                        throw new Error("http " + res.status);
                    return res.json().catch(function () { return null; });
                })
                    .then(function (body) {
                    const arr = body ? (body.partidos || body.data || body.items) : null;
                    partidos = Array.isArray(arr) ? arr : [];
                    pintar();
                })
                    .catch(function () {
                    partidos = [];
                    pintar();
                    showError("No pudimos cargar los partidos. Igual puedes publicar el tuyo.");
                });
            }
            const nivBtns = nivBox ? Array.from(nivBox.querySelectorAll<HTMLButtonElement>("button")) : [];
            nivBtns.forEach(function (b) {
                listen(b, "click", function () {
                    nivel = b.getAttribute("data-n") || nivel;
                    nivBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
                    pintar();
                });
            });
            listen(q, "input", pintar);
            const joinModal = elemento<HTMLDialogElement>("#join-modal");
        if (!joinModal) return scope.dispose;
            function openJoin(p: PartidoPublico) {
                if (!joinModal)
                    return;
                const sum = elemento<HTMLElement>("#join-summary");
        if (!sum) return scope.dispose;
                if (sum)
                    sum.textContent = (p.titulo || "Partido") + ", " + resumen(p) + ".";
                const share = elemento<HTMLAnchorElement>("#join-share");
        if (!share) return scope.dispose;
                if (share)
                    share.href = "https://wa.me/?text=" + encodeURIComponent("Me anoté en \"" + (p.titulo || "un partido") + "\" (" + resumen(p) + ") por ReservaYa. ¡Súmate!");
                joinModal.showModal();
            }
            document.querySelectorAll<HTMLButtonElement>("[data-join-close]").forEach(function (el) {
                listen(el, "click", function () {
                    if (joinModal)
                        joinModal.close();
                });
            });
            function anotarse(p: PartidoPublico, btn: HTMLButtonElement) {
                btn.disabled = true;
                const orig = btn.textContent;
                btn.textContent = "Anotando...";
                fetch(base + "/api/partidos/" + encodeURIComponent(p.id) + "/anotarse", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                })
                    .then(function (res) {
                    if (res.status === 401) {
                        window.location.href = "/login?returnUrl=" + encodeURIComponent("/jugar#partidos");
                        return null;
                    }
                    if (!res.ok)
                        throw new Error("No se pudo completar tu anotación");
                    return res.json().catch(function () { return {}; });
                })
                    .then(function (body) {
                    if (!body)
                        return;
                    p.anotado = true;
                    if (typeof p.cuposLibres === "number" && p.cuposLibres > 0)
                        p.cuposLibres -= 1;
                    pintar();
                    openJoin(p);
                })
                    .catch(function (e) {
                    btn.disabled = false;
                    btn.textContent = orig;
                    showError(e && e.message ? e.message : "No se pudo completar tu anotación");
                });
            }
            const pubModal = elemento<HTMLDialogElement>("#publish-modal");
        if (!pubModal) return scope.dispose;
            function openPublish() {
                if (!pubModal)
                    return;
                pubModal.showModal();
                const f = elemento<HTMLInputElement>("#p-fecha");
        if (!f) return scope.dispose;
                if (f && !f.value) {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    f.value = d.toISOString().slice(0, 10);
                }
            }
            function closePublish() {
                if (pubModal)
                    pubModal.close();
            }
            document.querySelectorAll<HTMLButtonElement>("[data-open-publish]").forEach(function (el) { listen(el, "click", openPublish); });
            document.querySelectorAll<HTMLButtonElement>("[data-publish-close]").forEach(function (el) { listen(el, "click", closePublish); });
            const fmtBox = elemento<HTMLElement>("#p-formatos");
        if (!fmtBox) return scope.dispose;
            if (fmtBox) {
                const fmtBtns = Array.from(fmtBox.querySelectorAll<HTMLButtonElement>("button"));
                fmtBtns.forEach(function (b) {
                    listen(b, "click", function () {
                        formato = b.getAttribute("data-f") || formato;
                        fmtBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
                    });
                });
            }
            const fotoInput = elemento<HTMLInputElement>("#p-foto");
        if (!fotoInput) return scope.dispose;
            if (fotoInput) {
                listen(fotoInput, "change", function () {
                    const f = fotoInput.files && fotoInput.files[0];
                    const img = elemento<HTMLImageElement>("#p-foto-preview");
        if (!img) return scope.dispose;
                    const empty = elemento<HTMLElement>("#p-foto-empty");
        if (!empty) return scope.dispose;
                    if (f && img) {
                        img.src = URL.createObjectURL(f);
                        img.hidden = false;
                        if (empty)
                            empty.hidden = true;
                    }
                });
            }
            const form = elemento<HTMLFormElement>("#publish-form");
        if (!form) return scope.dispose;
            const pubStatus = elemento<HTMLElement>("#publish-status");
        if (!pubStatus) return scope.dispose;
            function pubMsg(msg: string) {
                if (!pubStatus)
                    return;
                pubStatus.textContent = msg || "";
                pubStatus.className = clases.error;
                pubStatus.hidden = !msg;
            }
            if (form) {
                listen(form, "submit", function (e) {
                    e.preventDefault();
                    pubMsg("");
                    const titulo = elemento<HTMLInputElement>("#p-titulo").value.trim();
        if (!titulo) return scope.dispose;
                    const fecha = elemento<HTMLInputElement>("#p-fecha").value;
                    const desde = elemento<HTMLInputElement>("#p-desde").value;
                    const hasta = elemento<HTMLInputElement>("#p-hasta").value;
                    const distrito = elemento<HTMLInputElement>("#p-distrito").value.trim();
        if (!distrito) return scope.dispose;
                    const cancha = elemento<HTMLInputElement>("#p-cancha").value.trim();
        if (!cancha) return scope.dispose;
                    if (!titulo || !fecha || !desde || !hasta || !distrito || !cancha) {
                        pubMsg("Completa título, fecha, horario, distrito y cancha.");
                        return;
                    }
                    const submit = elemento<HTMLButtonElement>("#publish-submit");
        if (!submit) return scope.dispose;
                    if (submit) {
                        submit.disabled = true;
                        submit.textContent = "Publicando...";
                    }
                    const fd = new FormData();
                    fd.append("titulo", titulo);
                    fd.append("formato", formato);
                    fd.append("nivel", elemento<HTMLSelectElement>("#p-nivel").value);
                    fd.append("cuposTotales", elemento<HTMLInputElement>("#p-cupos").value);
                    fd.append("fecha", fecha);
                    fd.append("desde", desde);
                    fd.append("hasta", hasta);
                    fd.append("distrito", distrito);
                    fd.append("cancha", cancha);
                    fd.append("superficie", elemento<HTMLSelectElement>("#p-superficie").value);
                    fd.append("precio", elemento<HTMLInputElement>("#p-precio").value || "0");
                    fd.append("descripcion", elemento<HTMLTextAreaElement>("#p-desc").value.trim());
                    if (fotoInput && fotoInput.files && fotoInput.files[0])
                        fd.append("foto", fotoInput.files[0]);
                    fetch(base + "/api/partidos", { method: "POST", credentials: "include", body: fd })
                        .then(function (res) {
                        if (res.status === 401) {
                            window.location.href = "/login?returnUrl=" + encodeURIComponent("/jugar#partidos");
                            return null;
                        }
                        if (!res.ok)
                            throw new Error("No se pudo publicar tu partido");
                        return res.json().catch(function () { return {}; });
                    })
                        .then(function (body) {
                        if (!body)
                            return;
                        closePublish();
                        form.reset();
                        const img = elemento<HTMLImageElement>("#p-foto-preview");
        if (!img) return scope.dispose;
                        const empty = elemento<HTMLElement>("#p-foto-empty");
        if (!empty) return scope.dispose;
                        if (img) {
                            img.removeAttribute("src");
                            img.hidden = true;
                        }
                        if (empty)
                            empty.hidden = false;
                        cargar();
                        showError("Partido publicado. Ya aparece en la lista.", true);
                    })
                        .catch(function (err) { pubMsg(err && err.message ? err.message : "No se pudo publicar tu partido"); })
                        .finally(function () {
                        if (submit) {
                            submit.disabled = false;
                            submit.textContent = "Publicar partido";
                        }
                    });
                });
            }
            cargar();
            if (new URLSearchParams(window.location.search).get("publicar") === "1")
                openPublish();
        })();
        return scope.dispose;
    }, []);
    return (<div className="pantallas pantallas-completar-cuadro">


    <>
  <div className="pantalla fondo-verde">
  <section id="partidos" className="mx-auto max-w-page px-4 pb-16 pt-8 md:px-6 lg:pt-12">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <SeccionTitulo id="cuadro-titulo" nivel={2} gigante alinear="izquierda" antetitulo="Completa el cuadro" titulo="Partidos abiertos" bajada="Te anotas en un partido abierto, el organizador te confirma por WhatsApp y a la cancha. Si te faltan, publica tu pichanga y encuentra con quién jugar."/>
      <div className="flex gap-3">
        <Button apariencia="publica" data-open-publish className="shadow-suave-sm"><Icon nombre="mas" className="h-4 w-4"/>Publicar partido</Button>
        <Button apariencia="publica" href={`${APP}/dashboard/partidos`} variante="secundario">Mis partidos</Button>
      </div>
    </div>

    <div className="card-tactil mt-8 grid gap-4 bg-tiza p-5 shadow-suave-lg md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <Field apariencia="publica" id="q" etiqueta="Buscar" placeholder="Distrito, cancha o título" autoComplete="off" type="search"/>
      <div id="nivs" className="flex flex-wrap gap-2" role="group" aria-label="Nivel">
        {niveles.map((n, i) => <button type="button" data-n={n} aria-pressed={i === 0 ? "true" : "false"} className={`${chip} ${i === 0 ? "active" : ""}`} key={i}>{n}</button>)}
      </div>
    </div>
  </section>
  <section aria-labelledby="count-line" className="mx-auto max-w-page px-4 py-8 md:px-6">
    <p id="count-line" className="mt-4 text-pizarra"><strong id="count" className="font-display text-lg font-extrabold tabular-nums text-basalto">–</strong> partidos abiertos con <strong id="stat-cupos" className="font-display text-lg font-extrabold tabular-nums text-basalto">–</strong> cupos libres</p>

    <div className="card-tactil mt-4 overflow-hidden bg-tiza p-0 shadow-suave">
      <ul id="lista" aria-live="polite">
        <li className="h-24 border-b border-cal px-5 py-5" aria-hidden="true"><span className="esqueleto block h-5 w-1/2"></span><span className="esqueleto mt-3 block h-4 w-1/3"></span></li>
        <li className="h-24 px-5 py-5" aria-hidden="true"><span className="esqueleto block h-5 w-2/5"></span><span className="esqueleto mt-3 block h-4 w-1/4"></span></li>
      </ul>
      <div id="vacio" hidden className="card-dashed mx-4 my-6 p-8 text-center">
        <p className="font-display text-xl font-bold">Todavía no hay partidos abiertos</p>
        <p className="mx-auto mt-2 max-w-sm text-pizarra">Publica el tuyo y encuentra con quién jugar.</p>
        <Button apariencia="publica" data-open-publish className="mt-5"><Icon nombre="mas" className="h-4 w-4"/>Publicar partido</Button>
      </div>
    </div>
    <p id="lista-error" hidden className={`mt-4 ${AVISO.error}`} role="alert"></p>
  </section>
  </div>

  <dialog id="publish-modal" aria-labelledby="publish-title" className="card-tactil m-auto max-h-[calc(100vh-2rem)] w-[min(48rem,calc(100%-2rem))] overflow-y-auto bg-tiza p-0 text-basalto shadow-suave-lg backdrop:bg-velo">
    <div className="flex items-center justify-between border-b border-cal/15 px-5 py-3">
      <h2 id="publish-title" className="font-display text-2xl font-black">Publicar un partido</h2>
      <button type="button" data-publish-close aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-piedra"><Icon nombre="cerrar"/></button>
    </div>
    <form id="publish-form" className="grid gap-5 p-5 md:grid-cols-[14rem_minmax(0,1fr)]" noValidate>
      <div>
        <p className={ETIQUETA}>Foto (opcional)</p>
        <label htmlFor="p-foto" className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-control border border-dashed border-borde bg-sillar text-pizarra hover:bg-piedra">
          <Image id="p-foto-preview" src="/og-default.png" width={640} height={400} unoptimized alt="" hidden className="h-full w-full object-cover"/>
          <span id="p-foto-empty" className="font-medium">Subir foto</span>
        </label>
        <input id="p-foto" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"/>
        <Field apariencia="publica" id="p-desc" etiqueta="Descripción" multilinea filas={4} placeholder="Faltan 4, se pide puntualidad." className="mt-4"/>
      </div>
      <div className="space-y-3">
        <Field apariencia="publica" id="p-titulo" etiqueta="Título" required maxLength={80} placeholder="Pichanga de los viernes"/>
        <fieldset>
          <legend className={ETIQUETA}>Formato</legend>
          <div id="p-formatos" className="grid grid-cols-3 gap-2">
            {formatos.map((f, i) => <button type="button" data-f={f} aria-pressed={i === 2 ? "true" : "false"} className={chip} key={i}>{f}</button>)}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select apariencia="publica" id="p-nivel" etiqueta="Nivel" opciones={nivelesForm} valor="Intermedio"/>
          <Field apariencia="publica" id="p-cupos" type="number" etiqueta="Cupos totales" min="2" max="30" value="14"/>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field apariencia="publica" id="p-fecha" type="date" etiqueta="Fecha" required/>
          <Field apariencia="publica" id="p-desde" type="time" etiqueta="Desde" required/>
          <Field apariencia="publica" id="p-hasta" type="time" etiqueta="Hasta" required/>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field apariencia="publica" id="p-distrito" etiqueta="Distrito" required maxLength={60} placeholder="Yanahuara" autoComplete="off"/>
          <Field apariencia="publica" id="p-cancha" etiqueta="Cancha" required maxLength={80} placeholder="Nombre del complejo" autoComplete="off"/>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select apariencia="publica" id="p-superficie" etiqueta="Superficie" opciones={superficies}/>
          <Field apariencia="publica" id="p-precio" type="number" etiqueta="Precio por persona (S/)" min="0" step="1" placeholder="0"/>
        </div>
        <p id="publish-status" hidden role="alert"></p>
        <div className="flex justify-end gap-3 pt-2">
          <Button apariencia="publica" data-publish-close variante="secundario">Cancelar</Button>
          <Button apariencia="publica" type="submit" id="publish-submit">Publicar partido</Button>
        </div>
      </div>
    </form>
  </dialog>

  <dialog id="join-modal" aria-labelledby="join-title" className="card-tactil m-auto w-[min(28rem,calc(100%-2rem))] bg-tiza p-6 text-basalto shadow-suave-lg backdrop:bg-velo">
    <h2 id="join-title" className="flex items-center gap-2 font-display text-2xl font-black"><Icon nombre="ok" className="h-6 w-6 text-cesped-hondo"/>Te anotaste</h2>
    <p id="join-summary" className="mt-2 text-pizarra"></p>
    <div className="mt-5 grid gap-2">
      <a id="join-share" href="https://wa.me/" target="_blank" rel="noopener" className={BOTON.primario}>Avisar por WhatsApp</a>
      <Button apariencia="publica" data-join-close variante="secundario">Seguir viendo partidos</Button>
    </div>
  </dialog>
    </>



    </div>);}
