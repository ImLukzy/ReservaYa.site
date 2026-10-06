"use client";
import { useEffect } from "react";
import { createScriptScope } from "@/lib/public/runtime";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/public/ui/Icon";
import { API } from "@/lib/public/entorno";
import SeccionTitulo from "@/components/public/inicio/SeccionTitulo";
import PreguntasTactiles from "@/components/public/inicio/PreguntasTactiles";
import { BOTON, CAMPO, ETIQUETA, NUMERO_PASO } from "@/lib/public/estilos";
import { PREGUNTAS_EQUIPOS } from "@/lib/public/preguntas";
const apiUrl = API;
function elemento<T extends HTMLElement>(selector: string): T {
 const element = document.querySelector<T>(selector);
 if (!element) throw new Error("Falta un elemento del sorteo");
 return element;
}

interface UsuarioBusqueda { nombre: string }

export default function ArmarEquipos() {
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;
        const claseTexto = BOTON.texto;
        (function () {
            const base = String(apiUrl);
            const jugadores: string[] = [];
            let nEquipos = 2;
            let encontrados: UsuarioBusqueda[] = [];
            let suggestTimer: ReturnType<typeof setTimeout> | null = null;
            let suggestCtrl: AbortController | null = null;
            let suggestSeq = 0;
            let activeIdx = -1;
            const addInput = elemento<HTMLInputElement>("#add-input");
        if (!addInput) return scope.dispose;
            const suggest = elemento<HTMLElement>("#suggest");
        if (!suggest) return scope.dispose;
            const draftRow = elemento<HTMLElement>("#draft-row");
        if (!draftRow) return scope.dispose;
            const draftInput = elemento<HTMLInputElement>("#draft-input");
        if (!draftInput) return scope.dispose;
            const chips = elemento<HTMLElement>("#chips");
        if (!chips) return scope.dispose;
            const jcount = elemento<HTMLElement>("#jcount");
        if (!jcount) return scope.dispose;
            const jempty = elemento<HTMLElement>("#jempty");
        if (!jempty) return scope.dispose;
            const out = elemento<HTMLElement>("#out");
        if (!out) return scope.dispose;
            const sortBtn = elemento<HTMLButtonElement>("#sortear");
        if (!sortBtn) return scope.dispose;
            const tnums = Array.from(document.querySelectorAll<HTMLButtonElement>(".tnum"));
            if (!addInput || !suggest || !draftRow || !draftInput || !chips || !jcount || !jempty || !out || !sortBtn)
                return;
            function nodo<K extends keyof HTMLElementTagNameMap>(tag: K, clase?: string, texto?: string): HTMLElementTagNameMap[K] {
                const n = document.createElement(tag);
                if (clase)
                    n.className = clase;
                if (texto !== undefined)
                    n.textContent = texto;
                return n;
            }
            function hideSuggest() {
                if (suggestCtrl)
                    suggestCtrl.abort();
                suggestCtrl = null;
                suggest.hidden = true;
                suggest.replaceChildren();
                encontrados = [];
                activeIdx = -1;
                addInput.setAttribute("aria-expanded", "false");
                addInput.removeAttribute("aria-activedescendant");
            }
            // Sin resultados o sin conexión: siempre una acción (agregar como invitado), nunca texto muerto.
            function showSuggestAction(hint: string, raw: string) {
                const query = String(raw || "").trim().replace(/^@/, "");
                suggest.replaceChildren(nodo("p", "px-4 pt-3 text-sm text-pizarra", hint));
                if (query) {
                    const btn = nodo("button", "m-2 flex min-h-11 w-[calc(100%-1rem)] items-center gap-2 rounded-control bg-cesped-suave px-3 text-left font-semibold text-cesped-hondo", 'Agregar "' + query + '" como invitado');
                    btn.type = "button";
                    btn.setAttribute("role", "option");
                    listen(btn, "mousedown", function (e) { e.preventDefault(); addMuchos(query); closeDraft(); hideSuggest(); });
                    suggest.append(btn);
                }
                suggest.hidden = false;
                addInput.setAttribute("aria-expanded", "true");
            }
            function pickUser(nombre: string) {
                const limpio = String(nombre || "").trim().replace(/^@/, "");
                if (limpio && jugadores.indexOf(limpio) === -1)
                    jugadores.push(limpio);
                render();
                hideSuggest();
                closeDraft();
            }
            function paintSuggest() {
                if (!encontrados.length) {
                    hideSuggest();
                    return;
                }
                suggest.replaceChildren();
                encontrados.forEach(function (u, idx) {
                    const b = nodo("button", "flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left hover:bg-sillar" + (idx === activeIdx ? " bg-sillar" : ""));
                    b.type = "button";
                    b.id = "suggest-opt-" + idx;
                    b.setAttribute("role", "option");
                    b.setAttribute("aria-selected", idx === activeIdx ? "true" : "false");
                    const av = nodo("span", "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cesped-hondo text-sm font-semibold text-tiza", ((u.nombre || "").charAt(0) || "?").toUpperCase());
                    av.setAttribute("aria-hidden", "true");
                    b.append(av, nodo("span", "font-semibold", u.nombre));
                    listen(b, "mousedown", function (e) { e.preventDefault(); pickUser(u.nombre); });
                    suggest.appendChild(b);
                });
                suggest.hidden = false;
                addInput.setAttribute("aria-expanded", "true");
            }
            function setActive(idx: number) {
                if (!encontrados.length)
                    return;
                activeIdx = (idx + encontrados.length) % encontrados.length;
                paintSuggest();
                addInput.setAttribute("aria-activedescendant", "suggest-opt-" + activeIdx);
            }
            async function buscarUsuarios(term: string) {
                const q = String(term || "").trim().replace(/^@/, "");
                if (q.length < 2) {
                    hideSuggest();
                    return;
                }
                const mySeq = ++suggestSeq;
                if (suggestCtrl)
                    suggestCtrl.abort();
                suggestCtrl = new AbortController();
                try {
                    const res = await fetch(base + "/api/usuarios/buscar?q=" + encodeURIComponent(q), { signal: suggestCtrl.signal });
                    if (mySeq !== suggestSeq)
                        return;
                    if (!res.ok) {
                        encontrados = [];
                        showSuggestAction(res.status === 429 ? "Demasiadas búsquedas; espera un momento." : "No pudimos buscar usuarios.", q);
                        return;
                    }
                    const body = await res.json().catch(function () { return null; });
                    const lista = body && Array.isArray(body.usuarios) ? body.usuarios : [];
                    encontrados = lista.filter(function (u: UsuarioBusqueda) { return u && typeof u.nombre === "string" && jugadores.indexOf(u.nombre) === -1; });
                    activeIdx = -1;
                    if (!encontrados.length) {
                        showSuggestAction("Sin resultados.", q);
                        return;
                    }
                    paintSuggest();
                }
                catch (err) {
                    if (err instanceof Error && err.name === "AbortError")
                        return;
                    if (mySeq !== suggestSeq)
                        return;
                    encontrados = [];
                    showSuggestAction("Sin conexión con el servidor.", String(term || "").trim());
                }
            }
            listen(document, "mousedown", function (e) {
                const wrap = elemento<HTMLElement>("#search-wrap");
        if (!wrap) return scope.dispose;
                if (wrap && e.target instanceof Node && !wrap.contains(e.target))
                    hideSuggest();
            }, true);
            function render() {
                chips.replaceChildren();
                jugadores.forEach(function (j, i) {
                    const s = nodo("span", "inline-flex min-h-9 items-center gap-2 rounded-full bg-sillar py-1 pl-3 pr-1 font-medium", j);
                    const rm = nodo("button", "flex h-8 w-8 items-center justify-center rounded-full text-pizarra hover:bg-piedra hover:text-basalto");
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("viewBox", "0 0 24 24");
                    svg.setAttribute("class", "h-4 w-4");
                    svg.setAttribute("fill", "none");
                    svg.setAttribute("stroke", "currentColor");
                    svg.setAttribute("stroke-width", "2");
                    svg.setAttribute("aria-hidden", "true");
                    const trazo = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    trazo.setAttribute("d", "M18 6 6 18M6 6l12 12");
                    svg.append(trazo);
                    rm.append(svg);
                    rm.type = "button";
                    rm.setAttribute("aria-label", "Quitar a " + j);
                    listen(rm, "click", function () { jugadores.splice(i, 1); render(); });
                    s.append(rm);
                    chips.appendChild(s);
                });
                jcount.textContent = "(" + jugadores.length + ")";
                jempty.hidden = jugadores.length > 0;
                sortBtn.disabled = jugadores.length < 2;
            }
            function addMuchos(raw: string) {
                String(raw || "").split(",").map(function (s) { return s.trim().replace(/^@/, ""); }).filter(Boolean).forEach(function (n) {
                    if (jugadores.indexOf(n) === -1)
                        jugadores.push(n);
                });
                encontrados = encontrados.filter(function (u) { return jugadores.indexOf(u.nombre) === -1; });
                paintSuggest();
                render();
            }
            function openDraft(seed: string, focus = true) {
                draftRow.hidden = false;
                if (document.activeElement !== draftInput)
                    draftInput.value = seed;
                if (focus !== false)
                    draftInput.focus();
            }
            function closeDraft() {
                draftRow.hidden = true;
                draftInput.value = "";
                addInput.value = "";
                addInput.focus();
            }
            listen(addInput, "input", function () {
                if (addInput.value.trim())
                    openDraft(addInput.value, false);
                else
                    draftRow.hidden = true;
                if (suggestTimer)
                    clearTimeout(suggestTimer);
                suggestTimer = setTimeout(function () { buscarUsuarios(addInput.value); }, 250);
            });
            listen(addInput, "keydown", function (e) {
                if (e.key === "Escape") {
                    hideSuggest();
                    return;
                }
                if (e.key === "ArrowDown" && encontrados.length) {
                    e.preventDefault();
                    setActive(activeIdx + 1);
                    return;
                }
                if (e.key === "ArrowUp" && encontrados.length) {
                    e.preventDefault();
                    setActive(activeIdx - 1);
                    return;
                }
                if (e.key === "Enter" && addInput.value.trim()) {
                    if (activeIdx >= 0 && encontrados[activeIdx])
                        pickUser(encontrados[activeIdx].nombre);
                    else if (encontrados.length && addInput.value.indexOf(",") === -1)
                        pickUser(encontrados[0].nombre);
                    else {
                        addMuchos(addInput.value);
                        closeDraft();
                        hideSuggest();
                    }
                }
            });
            listen(addInput, "blur", function () { setTimeout(hideSuggest, 150); });
            listen(draftInput, "keydown", function (e) {
                if (e.key === "Enter" && draftInput.value.trim()) {
                    addMuchos(draftInput.value);
                    closeDraft();
                }
            });
            listen(elemento<HTMLButtonElement>("#draft-add"), "click", function () {
                if (draftInput.value.trim()) {
                    addMuchos(draftInput.value);
                    closeDraft();
                }
            });
            listen(elemento<HTMLButtonElement>("#draft-close"), "click", closeDraft);
            listen(elemento<HTMLButtonElement>("#add-guest"), "click", function () { openDraft(""); });
            tnums.forEach(function (b) {
                listen(b, "click", function () {
                    nEquipos = parseInt(b.getAttribute("data-n") || "2", 10) || 2;
                    tnums.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
                });
            });
            listen(sortBtn, "click", function () {
                const sh = jugadores.slice();
                for (let k = sh.length - 1; k > 0; k--) {
                    const r = Math.floor(Math.random() * (k + 1));
                    const t = sh[k];
                    sh[k] = sh[r];
                    sh[r] = t;
                }
                out.replaceChildren();
                for (let i = 0; i < nEquipos; i++) {
                    (function (i: number) {
                        const ms = sh.filter(function (_, j) { return j % nEquipos === i; });
                        const d = nodo("div", "fila-entra card-tactil p-5 shadow-suave");
                        d.style.animationDelay = i * 60 + "ms";
                        const head = nodo("div", "flex items-center justify-between");
                        const copyBtn = nodo("button", claseTexto + " text-sm", "Copiar");
                        copyBtn.type = "button";
                        listen(copyBtn, "click", function () {
                            const txt = "Equipo " + (i + 1) + ": " + ms.join(", ");
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(txt).then(function () {
                                    copyBtn.textContent = "Copiado";
                                    setTimeout(function () { copyBtn.textContent = "Copiar"; }, 2000);
                                }, function () { copyBtn.textContent = "No se pudo copiar"; });
                            }
                            else {
                                copyBtn.textContent = "No se pudo copiar";
                            }
                        });
                        head.append(nodo("h3", "text-xl", "Equipo " + (i + 1)), copyBtn);
                        const ul = nodo("ul", "mt-2 border-t border-cal");
                        ms.forEach(function (m) { ul.append(nodo("li", "border-b border-cal py-2 font-medium last:border-b-0", m)); });
                        d.append(head, ul);
                        out.appendChild(d);
                    })(i);
                }
                out.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
            });
            render();
        })();
        return scope.dispose;
    }, []);
    return (<div className="pantallas pantallas-sortear">


    <>
  <section id="equipos" className="fondo-sillar">
  <div className="lado-a-lado mx-auto max-w-page px-4 pb-12 pt-8 md:px-6 lg:pt-12">
    <SeccionTitulo id="sortear-titulo" nivel={2} gigante alinear="izquierda" antetitulo="Sorteo rápido" titulo="Arma los equipos" bajada="Ingresa los nombres de los jugadores, elige 2, 3 o 4 equipos, y sortea parejos sin discusiones. No necesitas cuenta."/>

    <div className="equipos-col min-w-0">
    <div className="card-tactil mt-8 bg-tiza p-5 shadow-suave-lg sm:p-6">
      <p className="mb-4 flex items-center gap-3 font-display text-xl font-black text-basalto"><span className={NUMERO_PASO}>1</span>Agrega jugadores</p>
      <label htmlFor="add-input" className={ETIQUETA}>Agrega jugadores</label>
      <div id="search-wrap" className="relative">
        <Icon nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pizarra"/>
        <input id="add-input" placeholder="@usuario o nombre" autoComplete="off" role="combobox" aria-expanded="false" aria-controls="suggest" aria-autocomplete="list" className={`${CAMPO} h-11 pl-10`}/>
        <div id="suggest" role="listbox" aria-label="Usuarios encontrados" hidden className="absolute inset-x-0 z-20 mt-2 max-h-64 overflow-y-auto card-tactil bg-tiza p-2 shadow-suave"></div>
      </div>
      <div id="draft-row" hidden className="mt-3">
        <label htmlFor="draft-input" className={ETIQUETA}>Invitados sin cuenta</label>
        <div className="flex gap-2">
          <input id="draft-input" placeholder="Juan, Pedro, Luis" autoComplete="off" className={`${CAMPO} h-11 flex-1`}/>
          <Button apariencia="publica" id="draft-add" className="shrink-0">Agregar</Button>
          <button id="draft-close" type="button" aria-label="Descartar invitados" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-pizarra hover:bg-piedra"><Icon nombre="cerrar"/></button>
        </div>
        <p className="mt-1.5 text-sm text-pizarra">Separa varios con comas y se agregan todos.</p>
      </div>
      <Button apariencia="publica" id="add-guest" variante="secundario" className="mt-3 w-full"><Icon nombre="mas" className="h-4 w-4"/>Agregar invitado sin cuenta</Button>
    </div>

    <div className="equipos-pasos mt-4 grid gap-4">
    <div className="card-tactil bg-tiza p-5 shadow-suave-sm sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-xl font-black text-basalto"><span className={NUMERO_PASO}>2</span>Jugadores <span id="jcount" className="font-display font-extrabold tabular-nums text-pizarra">(0)</span></h2>
      <div id="chips" className="mt-3 flex flex-wrap gap-2"></div>
      <p id="jempty" className="py-6 text-center text-pizarra">Todavía no hay jugadores.</p>
    </div>

    <div className="card-tactil flex flex-col gap-4 bg-sillar/40 p-5 shadow-suave sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <fieldset>
        <legend className="mb-3 flex items-center gap-3 font-display text-xl font-black text-basalto"><span className={NUMERO_PASO}>3</span>¿Cuántos equipos?</legend>
        <div id="tnums" className="flex gap-2">
          {[2, 3, 4].map((n, index) => (<button type="button" data-n={n} aria-pressed={n === 2 ? "true" : "false"} className="tnum h-11 w-12 rounded-full border border-cal bg-tiza font-display text-lg font-extrabold tabular-nums aria-pressed:bg-cesped aria-pressed:text-tiza cursor-pointer" key={index}>{n}</button>))}
        </div>
      </fieldset>
      <Button apariencia="publica" id="sortear" disabled className="shadow-suave-sm sm:px-10">Sortear equipos</Button>
    </div>
    </div>

    <div id="out" className="mt-4 grid gap-4 sm:grid-cols-2" aria-live="polite"></div>
    </div>
  </div>
  </section>
  <section aria-labelledby="equipos-preguntas-titulo" className="fondo-cesped">
    <div className="revelar lado-a-lado mx-auto max-w-page px-4 py-8 md:px-6">
      <SeccionTitulo id="equipos-preguntas-titulo" gigante alinear="izquierda" antetitulo="Ayuda" titulo="Preguntas frecuentes" bajada="Cómo se reparten, invitados sin cuenta, cuántos hacen falta y cómo compartir el resultado."/>
      <PreguntasTactiles preguntas={PREGUNTAS_EQUIPOS} grupo="equipos-preguntas"/>
    </div>
  </section>
    </>



    </div>);}
