// Filas del tablero (home y /canchas). Solo DOM API: los datos de la API
// nunca pasan por innerHTML.
import { BOTON } from "../lib/estilos";
import { API } from "../lib/entorno";
import { etiquetaTipo } from "../lib/arequipa";
import { etiquetaHora, soles } from "../lib/horario";

export interface CanchaApi {
  id: string;
  nombre: string;
  tipo: string;
  precioPorHora: string;
  imagen: string | null;
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

const CLASE_MINIATURA = "relative h-9 w-16 shrink-0 overflow-hidden rounded-control border border-cal";

/** Croquis de cancha (perímetro, línea media, círculo central) sin SVG ni imagen: firma visual compartida cuando no hay foto o la foto no carga. */
function croquisCancha(claseUbicacion = ""): HTMLDivElement {
  const caja = el("div", `${CLASE_MINIATURA} bg-cesped-suave ${claseUbicacion}`.trim());
  caja.setAttribute("aria-hidden", "true");
  caja.append(
    el("span", "absolute inset-1 rounded-sm border border-cesped/40"),
    el("span", "absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-cesped/40"),
    el("span", "absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cesped/40"),
  );
  return caja;
}

/** Miniatura 16:9 de tamaño reservado: foto real solo si viene de /uploads/, si no el croquis.
 *  claseUbicacion se reaplica en el croquis de reemplazo para que el error de carga no pierda
 *  la posición de grid que le dio filaCancha. */
function miniaturaCancha(cancha: CanchaApi, claseUbicacion = ""): HTMLElement {
  if (!cancha.imagen?.startsWith("/uploads/")) return croquisCancha(claseUbicacion);
  const caja = el("div", `${CLASE_MINIATURA} bg-piedra ${claseUbicacion}`.trim());
  const img = document.createElement("img");
  img.src = new URL(cancha.imagen, API).toString();
  img.alt = ""; // el nombre ya está en la fila
  img.width = 64;
  img.height = 36;
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "h-full w-full object-cover";
  img.addEventListener("error", () => caja.replaceWith(croquisCancha(claseUbicacion)), { once: true });
  caja.append(img);
  return caja;
}

function miniaturaEsqueleto(): HTMLDivElement {
  return el("div", `esqueleto ${CLASE_MINIATURA} border-transparent hidden sm:block`);
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
    "group fila-entra relative grid h-24 grid-cols-[3.5rem_minmax(0,1fr)_auto] grid-rows-2 items-center gap-x-3 overflow-hidden border-b border-cal px-4 sm:h-16 sm:grid-cols-[3.5rem_3.5rem_minmax(0,1.3fr)_minmax(0,1fr)_4rem_6rem] sm:grid-rows-1 sm:gap-x-3 sm:px-5",
  );
  li.dataset.deporte = cancha.tipo;
  const numero = el("span", "pointer-events-none absolute -right-1 -top-3 z-0 font-display text-6xl font-black tabular-nums opacity-10 [counter-increment:cancha] before:content-[counter(cancha,decimal-leading-zero)] group-data-[deporte=FUTBOL]:text-cesped group-data-[deporte=FUTBOL5]:text-cesped group-data-[deporte=FUTBOL7]:text-cesped group-data-[deporte=VOLLEYBALL]:text-mar group-data-[deporte=BASQUET]:text-miel group-data-[deporte=PADEL]:text-lima group-data-[deporte=TENIS]:text-arcilla group-data-[deporte=LOZA]:text-losa");
  numero.setAttribute("aria-hidden", "true");
  li.append(numero);
  li.append(miniaturaCancha(cancha, "hidden sm:col-start-1 sm:row-start-1 sm:block sm:self-center"));
  li.append(el("span", "col-start-1 row-span-2 row-start-1 self-start pt-1 font-display text-lg font-bold tabular-nums text-basalto sm:col-start-2 sm:row-span-1 sm:self-center sm:pt-0", hora));

  const nombre = el("div", "col-start-2 row-start-1 min-w-0 self-end sm:col-start-3 sm:self-center");
  const titulo = el("p", "flex min-w-0 items-center gap-1.5 font-bold text-sm leading-tight text-basalto");
  titulo.append(el("span", "truncate", lugar));
  if (op.valoracion && op.valoracion.total > 0) {
    const b = el("button", "inline-flex shrink-0 items-center gap-0.5 rounded-control text-xs font-semibold text-pizarra underline-offset-2 hover:underline");
    b.type = "button";
    b.setAttribute("aria-label", `${op.valoracion.promedio.toFixed(1).replace(".", ",")} de 5, ${op.valoracion.total} opiniones de ${lugar}`);
    const estrella = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    estrella.setAttribute("viewBox", "0 0 24 24");
    estrella.setAttribute("class", "h-3 w-3 fill-sol");
    estrella.setAttribute("aria-hidden", "true");
    const trazo = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trazo.setAttribute("d", "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z");
    estrella.append(trazo);
    b.append(estrella, `${op.valoracion.promedio.toFixed(1).replace(".", ",")}`);
    if (op.onValoracion) b.addEventListener("click", op.onValoracion);
    titulo.append(b);
  }
  nombre.append(titulo, el("p", "hidden truncate text-xs leading-tight text-pizarra sm:block", cancha.nombre));
  li.append(nombre);

  li.append(el("p", "col-start-2 row-start-2 line-clamp-2 self-start text-sm leading-tight text-pizarra sm:hidden", `${cancha.nombre}, ${tipo.toLowerCase()} en ${distrito}`));
  const detalle = el("div", "relative z-10 hidden min-w-0 sm:col-start-4 sm:row-start-1 sm:block");
  const dist = el("p", "truncate text-xs leading-tight text-pizarra", distrito);
  dist.title = distrito;
  detalle.append(el("p", "inline-flex truncate rounded-full border border-basalto px-2 py-0.5 text-xs font-bold leading-tight text-basalto group-data-[deporte=FUTBOL]:bg-cesped-suave group-data-[deporte=FUTBOL5]:bg-cesped-suave group-data-[deporte=FUTBOL7]:bg-cesped-suave group-data-[deporte=VOLLEYBALL]:bg-mar-suave group-data-[deporte=BASQUET]:bg-miel-suave group-data-[deporte=PADEL]:bg-lima-suave group-data-[deporte=TENIS]:bg-arcilla-suave group-data-[deporte=LOZA]:bg-losa-suave", tipo), dist);
  li.append(detalle);
  li.append(el("span", "col-start-3 row-start-1 self-end text-right font-display text-base font-bold tabular-nums text-basalto sm:col-start-5 sm:self-center", soles(precioDe(item))));

  const reservar = el("a", `${BOTON.primario} col-start-3 row-start-2 self-start px-3 py-1.5 text-xs sm:col-start-6 sm:row-start-1 sm:self-center sm:justify-self-end`, "Reservar");
  reservar.href = op.reservarHref;
  reservar.setAttribute("aria-label", `Reservar ${cancha.nombre} en ${lugar} a las ${hora}`);
  li.append(reservar);
  return li;
}

export function filasEsqueleto(n: number): HTMLLIElement[] {
  return Array.from({ length: n }, () => {
    const li = el("li", "grid h-24 grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 border-b border-cal px-4 sm:h-16 sm:grid-cols-[3.5rem_3.5rem_minmax(0,1.3fr)_minmax(0,1fr)_4rem_6rem] sm:gap-x-3 sm:px-5");
    li.setAttribute("aria-hidden", "true");
    li.append(miniaturaEsqueleto(), el("span", "esqueleto h-5 w-10"), el("span", "esqueleto h-5 w-3/4"), el("span", "esqueleto h-4 w-16 hidden sm:block"), el("span", "esqueleto h-5 w-10 text-right"), el("span", "esqueleto h-8 w-16 justify-self-end"));
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
