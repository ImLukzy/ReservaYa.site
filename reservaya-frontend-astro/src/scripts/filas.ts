// Filas del tablero (home y /canchas). Solo DOM API: los datos de la API
// nunca pasan por innerHTML.
import { BOTON } from "../lib/estilos";
import { etiquetaTipo } from "../lib/arequipa";
import { etiquetaHora, soles } from "../lib/horario";

export interface CanchaApi {
  id: string;
  nombre: string;
  tipo: string;
  precioPorHora: string;
  complejoId: string | null;
  complejo: { id: string; nombre: string; distrito: string; ciudad: string } | null;
}

export interface ItemDisponible {
  cancha: CanchaApi;
  disponible: boolean;
  totalEstimado: string | null;
}

export interface Valoracion {
  promedio: number;
  total: number;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase: string, texto?: string): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(tag);
  nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

export function precioDe(item: ItemDisponible): number {
  return Number(item.totalEstimado ?? item.cancha.precioPorHora) || 0;
}

interface OpcionesFila {
  hora: number;
  reservarHref: string;
  valoracion?: Valoracion;
  onValoracion?: () => void;
}

export function filaCancha(item: ItemDisponible, op: OpcionesFila): HTMLLIElement {
  const { cancha } = item;
  const lugar = cancha.complejo?.nombre ?? cancha.nombre;
  const distrito = cancha.complejo?.distrito ?? "Arequipa";
  const tipo = etiquetaTipo(cancha.tipo);
  const hora = etiquetaHora(op.hora);

  const li = el(
    "li",
    "fila-entra grid h-24 grid-cols-[3.5rem_minmax(0,1fr)_auto] grid-rows-2 items-center gap-x-3 border-b border-cal px-4 sm:h-16 sm:grid-cols-[4rem_minmax(0,1.2fr)_minmax(0,1fr)_4.5rem_6.5rem] sm:grid-rows-1 sm:gap-x-4 sm:px-6",
  );
  li.append(el("span", "col-start-1 row-span-2 row-start-1 self-start pt-1 font-display text-xl font-semibold tabular-nums sm:row-span-1 sm:self-center sm:pt-0", hora));

  const nombre = el("div", "col-start-2 row-start-1 min-w-0 self-end sm:self-center");
  const titulo = el("p", "flex items-center gap-2 font-semibold");
  titulo.append(el("span", "truncate", lugar));
  if (op.valoracion && op.valoracion.total > 0) {
    const b = el("button", "inline-flex shrink-0 items-center gap-1 rounded-control text-sm font-medium text-pizarra underline-offset-2 hover:underline");
    b.type = "button";
    b.setAttribute("aria-label", `${op.valoracion.promedio.toFixed(1).replace(".", ",")} de 5, ${op.valoracion.total} opiniones de ${lugar}`);
    const estrella = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    estrella.setAttribute("viewBox", "0 0 24 24");
    estrella.setAttribute("class", "h-3.5 w-3.5 fill-sol");
    estrella.setAttribute("aria-hidden", "true");
    const trazo = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trazo.setAttribute("d", "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z");
    estrella.append(trazo);
    b.append(estrella, `${op.valoracion.promedio.toFixed(1).replace(".", ",")} (${op.valoracion.total})`);
    if (op.onValoracion) b.addEventListener("click", op.onValoracion);
    titulo.append(b);
  }
  nombre.append(titulo, el("p", "hidden truncate text-sm text-pizarra sm:block", cancha.nombre));
  li.append(nombre);

  li.append(el("p", "col-start-2 row-start-2 line-clamp-2 self-start text-sm leading-tight text-pizarra sm:hidden", `${cancha.nombre}, ${tipo.toLowerCase()} en ${distrito}`));
  const detalle = el("div", "hidden min-w-0 text-sm sm:col-start-3 sm:row-start-1 sm:block");
  const dist = el("p", "truncate text-pizarra", distrito);
  dist.title = distrito;
  detalle.append(el("p", "truncate", tipo), dist);
  li.append(detalle);
  li.append(el("span", "col-start-3 row-start-1 self-end text-right font-display text-lg font-semibold tabular-nums sm:col-start-4 sm:self-center", soles(precioDe(item))));

  const reservar = el("a", `${BOTON.primario} col-start-3 row-start-2 self-start px-4 sm:col-start-5 sm:row-start-1 sm:self-center sm:justify-self-end`, "Reservar");
  reservar.href = op.reservarHref;
  reservar.setAttribute("aria-label", `Reservar ${cancha.nombre} en ${lugar} a las ${hora}`);
  li.append(reservar);
  return li;
}

export function filasEsqueleto(n: number): HTMLLIElement[] {
  return Array.from({ length: n }, () => {
    const li = el("li", "grid h-24 grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 border-b border-cal px-4 sm:h-16 sm:px-6");
    li.setAttribute("aria-hidden", "true");
    li.append(el("span", "esqueleto h-6 w-12"), el("span", "esqueleto h-5 w-3/4"), el("span", "esqueleto h-9 w-20 justify-self-end"));
    return li;
  });
}

/** Mensaje dentro del tablero (vacío o error) con una acción opcional. */
export function avisoTablero(titulo: string, texto: string, accion?: { etiqueta: string; alPulsar: () => void }): HTMLElement {
  const caja = el("div", "flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center");
  caja.append(el("p", "font-display text-xl font-semibold", titulo), el("p", "text-pizarra", texto));
  if (accion) {
    const b = el("button", `${BOTON.secundario} mt-2`, accion.etiqueta);
    b.type = "button";
    b.addEventListener("click", accion.alPulsar);
    caja.append(b);
  }
  return caja;
}

export function urlReservar(app: string, cancha: CanchaApi, fecha: string, hora: number): string {
  const q = new URLSearchParams({ fecha, horaInicio: String(hora * 60), horaFin: String((hora + 1) * 60) });
  if (cancha.complejoId) q.set("complejoId", cancha.complejoId);
  return `${app}/dashboard/canchas?${q.toString()}`;
}
