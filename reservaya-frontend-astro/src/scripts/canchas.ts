// /canchas: tablero de canchas libres con filtros en la URL (?q&distrito&tipo&fecha&hora&orden).
import { API, APP } from "../lib/entorno";
import { APERTURA, ULTIMA, diasProximos, etiquetaHora, franjasProximas, nombreDia, resolverFecha } from "../lib/horario";
import { avisoTablero, filaCancha, filasEsqueleto, precioDe, urlReservar, type ItemDisponible, type Valoracion } from "./filas";

interface Resena {
  puntuacion: number;
  comentario?: string | null;
  respuestaDueno?: string | null;
  usuario?: { nombre?: string } | null;
}
interface RespuestaResenas extends Valoracion {
  resenas: Resena[];
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const form = $<HTMLFormElement>("filtros");
const lista = $<HTMLUListElement>("resultados");
const resumen = $("resumen");
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
  if (hora) hora.value = String(h >= APERTURA && h <= ULTIMA ? h : proximas.horas[0]);
  if (q) q.value = url.get("q") ?? "";
  for (const campo of ["distrito", "tipo", "orden"] as const) {
    const sel = selects[campo];
    const v = url.get(campo);
    if (sel && v && Array.from(sel.options).some((o) => o.value === v)) sel.value = v;
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
  if (f.q) url.set("q", f.q);
  if (f.distrito) url.set("distrito", f.distrito);
  if (f.tipo) url.set("tipo", f.tipo);
  url.set("fecha", f.dia);
  url.set("hora", String(f.hora));
  if (f.orden !== "precio") url.set("orden", f.orden);
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
  lista?.replaceChildren(...filasEsqueleto(4));
  const params = new URLSearchParams({ fecha, horaInicio: String(f.hora * 60), horaFin: String((f.hora + 1) * 60) });
  if (f.q) params.set("q", f.q);
  if (f.distrito) params.set("distrito", f.distrito);
  if (f.tipo) params.set("tipo", f.tipo);
  const cuando = `${nombreDia(fecha)} a las ${etiquetaHora(f.hora)}${f.distrito ? ` en ${f.distrito}` : ""}`;
  try {
    const res = await fetch(`${API}/api/canchas/disponibles?${params.toString()}`);
    if (!res.ok) throw new Error(String(res.status));
    const body: { canchas?: ItemDisponible[] } = await res.json();
    const libres = (body.canchas ?? []).filter((x) => x.disponible);
    const ids = [...new Set(libres.map((x) => x.cancha.complejoId).filter((x): x is string => Boolean(x)))];
    const notas = new Map<string, Valoracion>();
    await Promise.all(ids.map(async (id) => { const v = await valoracion(id); if (v) notas.set(id, v); }));
    if (mio !== pedido) return;
    const nota = (it: ItemDisponible) => (it.cancha.complejoId ? notas.get(it.cancha.complejoId) : undefined);
    libres.sort((a, b) =>
      f.orden === "precio-desc" ? precioDe(b) - precioDe(a) : f.orden === "valoracion" ? (nota(b)?.promedio ?? 0) - (nota(a)?.promedio ?? 0) : precioDe(a) - precioDe(b),
    );
    if (resumen) resumen.textContent = libres.length ? `${libres.length} ${libres.length === 1 ? "cancha libre" : "canchas libres"} ${cuando}` : `Sin canchas libres ${cuando}`;
    if (libres.length === 0) {
      const vacio = document.createElement("li");
      vacio.append(avisoTablero(`No hay canchas libres ${cuando}`, "Prueba otra hora u otro día, o quita algún filtro.", { etiqueta: "Quitar filtros", alPulsar: quitarFiltros }));
      lista?.replaceChildren(vacio);
      return;
    }
    lista?.replaceChildren(
      ...libres.map((it) =>
        filaCancha(it, {
          hora: f.hora,
          reservarHref: urlReservar(APP, it.cancha, fecha, f.hora),
          valoracion: nota(it),
          onValoracion: () => abrirOpiniones(it),
        }),
      ),
    );
  } catch {
    if (mio !== pedido) return;
    if (resumen) resumen.textContent = "No pudimos cargar las canchas";
    const error = document.createElement("li");
    error.append(avisoTablero("No pudimos cargar las canchas", "Revisa tu conexión e inténtalo otra vez.", { etiqueta: "Reintentar", alPulsar: cargar }));
    lista?.replaceChildren(error);
  } finally {
    if (mio === pedido) lista?.setAttribute("aria-busy", "false");
  }
}

function quitarFiltros() {
  if (q) q.value = "";
  if (selects.distrito) selects.distrito.value = "";
  if (selects.tipo) selects.tipo.value = "";
  cargar();
}

async function abrirOpiniones(it: ItemDisponible) {
  const dialogo = $<HTMLDialogElement>("opiniones");
  const titulo = $("opiniones-titulo");
  const caja = $<HTMLUListElement>("opiniones-lista");
  const id = it.cancha.complejoId;
  if (!dialogo || !caja || !id) return;
  if (titulo) titulo.textContent = `Opiniones de ${it.cancha.complejo?.nombre ?? it.cancha.nombre}`;
  caja.replaceChildren();
  dialogo.showModal();
  const datos = await valoracion(id);
  const items = datos?.resenas ?? [];
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "py-6 text-pizarra";
    li.textContent = datos ? "Aún no hay opiniones." : "No se pudieron cargar las opiniones.";
    caja.replaceChildren(li);
    return;
  }
  caja.replaceChildren(
    ...items.map((r) => {
      const li = document.createElement("li");
      li.className = "border-b border-cal py-4 last:border-b-0";
      const cabeza = document.createElement("p");
      cabeza.className = "flex justify-between gap-3 font-semibold";
      const quien = document.createElement("span");
      quien.textContent = r.usuario?.nombre || "Jugador";
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
    }),
  );
}

const dialogo = $<HTMLDialogElement>("opiniones");
dialogo?.querySelector("[data-cerrar]")?.addEventListener("click", () => dialogo.close());
dialogo?.addEventListener("click", (e) => {
  if (e.target === dialogo) dialogo.close();
});

let espera: number | undefined;
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  cargar();
});
q?.addEventListener("input", () => {
  window.clearTimeout(espera);
  espera = window.setTimeout(cargar, 400);
});
Object.values(selects).forEach((s) => s?.addEventListener("change", cargar));

iniciarFiltros();
cargar();
