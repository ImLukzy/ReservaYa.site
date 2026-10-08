import { API, APP } from "../entorno";
import { APERTURA, ULTIMA, diasProximos, etiquetaHora, franjasProximas, nombreDia, resolverFecha } from "../horario";
import { avisoTablero, precioDe, urlReservar, type ItemDisponible, type Valoracion } from "./filas";
import { tarjetaCancha, tarjetaComplejo, tarjetaPromo, tarjetasEsqueleto } from "./tarjetas";
import { agruparPorComplejo, intercalarPromos, ordenarGrupos, textoConteo, type Celda } from "../tarjetas";
import { createScriptScope } from "../runtime";
export function iniciarCanchas() {
const scope = createScriptScope(); const listen = scope.listen; const fetch = scope.request;
// /canchas: cuadrícula de canchas libres (spec 60) con filtros en la URL (?q&distrito&tipo&fecha&hora&orden&vista).



interface Resena {
    puntuacion: number;
    comentario?: string | null;
    respuestaDueno?: string | null;
    autor?: string;
}
interface RespuestaResenas extends Valoracion {
    resenas: Resena[];
}
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const form = $<HTMLFormElement>("filtros");
const lista = $<HTMLUListElement>("resultados");
const resumen = $("resumen");
const conteo = $("conteo");
const botonesVista = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-vista]"));
type Vista = "canchas" | "complejos";
let vista: Vista = "canchas";
const q = $<HTMLInputElement>("f-q");
const selects = {
    distrito: $<HTMLSelectElement>("f-distrito"),
    tipo: $<HTMLSelectElement>("f-tipo"),
    fecha: $<HTMLSelectElement>("f-fecha"),
    hora: $<HTMLSelectElement>("f-hora"),
    orden: $<HTMLSelectElement>("f-orden"),
};
const resenas = new Map<string, Promise<RespuestaResenas | null>>();
let pedido = 0;
function iniciarFiltros() {
    const url = new URLSearchParams(location.search);
    const proximas = franjasProximas();
    const { fecha, hora } = selects;
    if (fecha) {
        const pedida = resolverFecha(url.get("fecha") ?? proximas.dia);
        fecha.replaceChildren(...diasProximos().map((d) => new Option(d.etiqueta, d.valor, false, resolverFecha(d.valor) === pedida)));
    }
    const h = Number(url.get("hora"));
    if (hora)
        hora.value = String(h >= APERTURA && h <= ULTIMA ? h : proximas.horas[0]);
    if (q)
        q.value = url.get("q") ?? "";
    marcarVista(url.get("vista") === "complejos" ? "complejos" : "canchas");
    for (const campo of ["distrito", "tipo", "orden"] as const) {
        const sel = selects[campo];
        const v = url.get(campo);
        if (sel && v && Array.from(sel.options).some((o) => o.value === v))
            sel.value = v;
    }
}
function filtros() {
    return {
        q: q?.value.trim() ?? "",
        distrito: selects.distrito?.value ?? "",
        tipo: selects.tipo?.value ?? "",
        dia: selects.fecha?.value ?? "hoy",
        hora: Number(selects.hora?.value ?? APERTURA),
        orden: selects.orden?.value ?? "precio",
    };
}
function guardarEnUrl() {
    const f = filtros();
    const url = new URLSearchParams();
    if (f.q)
        url.set("q", f.q);
    if (f.distrito)
        url.set("distrito", f.distrito);
    if (f.tipo)
        url.set("tipo", f.tipo);
    url.set("fecha", f.dia);
    url.set("hora", String(f.hora));
    if (f.orden !== "precio")
        url.set("orden", f.orden);
    if (vista !== "canchas")
        url.set("vista", vista);
    history.replaceState(null, "", `${location.pathname}?${url.toString()}`);
}
function valoracion(complejoId: string): Promise<RespuestaResenas | null> {
    let p = resenas.get(complejoId);
    if (!p) {
        p = fetch(`${API}/api/resenas/publicas?complejoId=${encodeURIComponent(complejoId)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((b: RespuestaResenas | null) => (b ? { promedio: Number(b.promedio) || 0, total: Number(b.total) || 0, resenas: b.resenas ?? [] } : null))
            .catch(() => null);
        resenas.set(complejoId, p);
    }
    return p;
}
async function cargar() {
    const f = filtros();
    const fecha = resolverFecha(f.dia);
    const mio = ++pedido;
    guardarEnUrl();
    lista?.setAttribute("aria-busy", "true");
    lista?.replaceChildren(...tarjetasEsqueleto(6));
    if (conteo)
        conteo.textContent = "Buscando…";
    const params = new URLSearchParams({ fecha, horaInicio: String(f.hora * 60), horaFin: String((f.hora + 1) * 60) });
    if (f.q)
        params.set("q", f.q);
    if (f.distrito)
        params.set("distrito", f.distrito);
    if (f.tipo)
        params.set("tipo", f.tipo);
    const cuando = `${nombreDia(fecha)} a las ${etiquetaHora(f.hora)}${f.distrito ? ` en ${f.distrito}` : ""}`;
    try {
        const res = await fetch(`${API}/api/canchas/disponibles?${params.toString()}`);
        if (!res.ok)
            throw new Error(String(res.status));
        const body: {
            canchas?: ItemDisponible[];
        } = await res.json();
        const libres = (body.canchas ?? []).filter((x) => x.disponible);
        const ids = [...new Set(libres.map((x) => x.cancha.complejoId).filter((x): x is string => Boolean(x)))];
        const notas = new Map<string, Valoracion>();
        await Promise.all(ids.map(async (id) => { const v = await valoracion(id); if (v)
            notas.set(id, v); }));
        if (mio !== pedido)
            return;
        const nota = (it: ItemDisponible) => (it.cancha.complejoId ? notas.get(it.cancha.complejoId) : undefined);
        libres.sort((a, b) => f.orden === "precio-desc" ? precioDe(b) - precioDe(a) : f.orden === "valoracion" ? (nota(b)?.promedio ?? 0) - (nota(a)?.promedio ?? 0) : precioDe(a) - precioDe(b));
        const grupos = agruparPorComplejo(libres, precioDe);
        if (conteo)
            conteo.textContent = textoConteo(grupos.length, libres.length);
        if (resumen)
            resumen.textContent = libres.length ? `${libres.length} ${libres.length === 1 ? "cancha libre" : "canchas libres"} ${cuando}` : `Sin canchas libres ${cuando}`;
        if (libres.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "col-span-full card-tactil";
            vacio.append(avisoTablero(`No hay canchas libres ${cuando}`, "Prueba otra hora u otro día, o quita algún filtro.", { etiqueta: "Quitar filtros", alPulsar: quitarFiltros }));
            lista?.replaceChildren(vacio);
            return;
        }
        const pintar = <T,>(celdas: Celda<T>[], tarjeta: (x: T) => HTMLLIElement) => celdas.map((c) => (c.tipo === "promo" ? tarjetaPromo(c.indice) : tarjeta(c.item)));
        if (vista === "complejos") {
            const ordenados = ordenarGrupos(grupos, f.orden, (g) => nota(g.items[0])?.promedio ?? 0);
            lista?.replaceChildren(...pintar(intercalarPromos(ordenados), (g) => tarjetaComplejo(g, {
                valoracion: nota(g.items[0]),
                onValoracion: () => abrirOpiniones(g.items[0]),
                verHref: urlVerComplejo(g.nombre),
                onVer: () => verComplejo(g.nombre),
            })));
            return;
        }
        lista?.replaceChildren(...pintar(intercalarPromos(libres), (it) => tarjetaCancha(it, {
            hora: f.hora,
            reservarHref: urlReservar(APP, it.cancha, fecha, f.hora),
            valoracion: nota(it),
            onValoracion: () => abrirOpiniones(it),
        })));
    }
    catch {
        if (mio !== pedido)
            return;
        if (resumen)
            resumen.textContent = "No pudimos cargar las canchas";
        if (conteo)
            conteo.textContent = "";
        const error = document.createElement("li");
        error.className = "col-span-full card-tactil";
        error.append(avisoTablero("No pudimos cargar las canchas", "Revisa tu conexión e inténtalo otra vez.", { etiqueta: "Reintentar", alPulsar: cargar }));
        lista?.replaceChildren(error);
    }
    finally {
        if (mio === pedido)
            lista?.setAttribute("aria-busy", "false");
    }
}
function marcarVista(v: Vista) {
    vista = v;
    botonesVista.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === v)));
}
function urlVerComplejo(nombre: string) {
    const url = new URLSearchParams(location.search);
    url.set("q", nombre);
    url.delete("vista");
    return `${location.pathname}?${url.toString()}`;
}
function verComplejo(nombre: string) {
    if (q)
        q.value = nombre;
    marcarVista("canchas");
    cargar();
    lista?.closest("section")?.scrollIntoView({ block: "start" });
}
function quitarFiltros() {
    if (q)
        q.value = "";
    if (selects.distrito)
        selects.distrito.value = "";
    if (selects.tipo)
        selects.tipo.value = "";
    cargar();
}
let disparadorOpiniones: HTMLElement | null = null;
async function abrirOpiniones(it: ItemDisponible) {
    const dialogo = $<HTMLDialogElement>("opiniones");
    const titulo = $("opiniones-titulo");
    const caja = $<HTMLUListElement>("opiniones-lista");
    const id = it.cancha.complejoId;
    if (!dialogo || !caja || !id)
        return;
    disparadorOpiniones = document.activeElement as HTMLElement | null;
    if (titulo)
        titulo.textContent = `Opiniones de ${it.cancha.complejo?.nombre ?? it.cancha.nombre}`;
    caja.replaceChildren();
    dialogo?.showModal();
    dialogo.querySelector<HTMLButtonElement>("[data-cerrar]")?.focus();
    const datos = await valoracion(id);
    const items = datos?.resenas ?? [];
    if (items.length === 0) {
        const li = document.createElement("li");
        li.className = "py-6 text-pizarra";
        li.textContent = datos ? "Aún no hay opiniones." : "No se pudieron cargar las opiniones.";
        caja.replaceChildren(li);
        return;
    }
    caja.replaceChildren(...items.map((r) => {
        const li = document.createElement("li");
        li.className = "border-b border-cal py-4 last:border-b-0";
        const cabeza = document.createElement("p");
        cabeza.className = "flex justify-between gap-3 font-semibold";
        const quien = document.createElement("span");
        quien.textContent = r.autor || "Jugador";
        const puntos = document.createElement("span");
        puntos.className = "shrink-0 font-display tabular-nums";
        puntos.textContent = `${r.puntuacion} de 5`;
        cabeza.append(quien, puntos);
        li.append(cabeza);
        if (r.comentario) {
            const c = document.createElement("p");
            c.className = "mt-1 text-pizarra";
            c.textContent = r.comentario;
            li.append(c);
        }
        if (r.respuestaDueno) {
            const d = document.createElement("p");
            d.className = "mt-2 rounded-control bg-sillar px-3 py-2 text-sm";
            d.textContent = `Respuesta del complejo: ${r.respuestaDueno}`;
            li.append(d);
        }
        return li;
    }));
}
const dialogo = $<HTMLDialogElement>("opiniones");
listen(dialogo?.querySelector("[data-cerrar]"), "click", () => dialogo?.close());
listen(dialogo, "click", (e) => {
    if (e.target === dialogo)
        dialogo?.close();
});
listen(dialogo, "close", () => {
    disparadorOpiniones?.focus();
});
listen(dialogo, "keydown", (e) => {
    if (e.key === "Escape") {
        dialogo?.close();
    }
});
let espera: number | undefined;
listen(form, "submit", (e) => {
    e.preventDefault();
    cargar();
});
listen(q, "input", () => {
    window.clearTimeout(espera);
    espera = window.setTimeout(cargar, 400);
});
Object.values(selects).forEach((s) => listen(s, "change", cargar));
botonesVista.forEach((b) => listen(b, "click", () => {
    const v: Vista = b.dataset.vista === "complejos" ? "complejos" : "canchas";
    if (v === vista)
        return;
    marcarVista(v);
    cargar();
}));
iniciarFiltros();
cargar();

return scope.dispose;
}
