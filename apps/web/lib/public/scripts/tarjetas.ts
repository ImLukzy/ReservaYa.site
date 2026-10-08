// Tarjetas de /canchas (spec 60): cancha, complejo, promo propia y esqueleto.
// Solo DOM API: los datos de la API nunca pasan por innerHTML.
import { BOTON } from "../estilos";
import { etiquetaTipo } from "../arequipa";
import { etiquetaHora, soles } from "../horario";
import { esImagenPropia } from "../../media";
import { fotoDeGrupo, type GrupoComplejo } from "../tarjetas";
import { precioDe, type ItemDisponible, type Valoracion } from "./filas";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase: string, texto?: string): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(tag);
  nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

const SVG = "http://www.w3.org/2000/svg";
const TRAZO_ESTRELLA = "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";
const TRAZO_CALENDARIO = "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z";
const TRAZO_FLECHA = "M5 12h14M12 5l7 7-7 7";

function icono(trazo: string, clase: string, relleno = false): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", clase);
  svg.setAttribute("aria-hidden", "true");
  if (!relleno) {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", trazo);
  svg.append(path);
  return svg;
}

const CLASE_TARJETA = "card-tactil fila-entra flex min-w-0 flex-col overflow-hidden p-0";
const CLASE_FOTO = "relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-cesped-suave";
const CLASE_INSIGNIA = "absolute top-3 z-10 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold leading-none";

/** Croquis de cancha a tamaño de foto cuando no hay imagen propia o no carga. */
function croquis(): HTMLSpanElement {
  const caja = el("span", "absolute inset-0 block");
  caja.setAttribute("aria-hidden", "true");
  caja.append(
    el("span", "absolute inset-4 rounded-control border-2 border-cesped/40"),
    el("span", "absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 bg-cesped/40"),
    el("span", "absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cesped/40"),
  );
  return caja;
}

function foto(url: string | null): HTMLDivElement {
  const caja = el("div", CLASE_FOTO);
  if (!esImagenPropia(url)) {
    caja.append(croquis());
    return caja;
  }
  const img = document.createElement("img");
  img.src = url; // relativa (/uploads/, mismo origen) o absoluta R2
  img.alt = ""; // el nombre ya está en la tarjeta
  img.width = 480;
  img.height = 300;
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "absolute inset-0 h-full w-full object-cover";
  img.addEventListener("error", () => img.replaceWith(croquis()), { once: true });
  caja.append(img);
  return caja;
}

function estrellas(promedio: number): HTMLSpanElement {
  const fila = el("span", "inline-flex items-center gap-px");
  fila.setAttribute("aria-hidden", "true");
  const llenas = Math.round(promedio);
  for (let i = 1; i <= 5; i++) fila.append(icono(TRAZO_ESTRELLA, `h-3.5 w-3.5 ${i <= llenas ? "fill-sol" : "fill-cal"}`, true));
  return fila;
}

const coma = (n: number) => n.toFixed(1).replace(".", ",");

/** Estrellas + promedio + (N reseñas); botón de 44 px que abre #opiniones si hay complejo. */
function bloqueValoracion(nombre: string, v: Valoracion | undefined, alPulsar?: () => void): HTMLElement {
  const promedio = v?.promedio ?? 0;
  const total = v?.total ?? 0;
  const contenido = [estrellas(promedio), el("span", "font-semibold tabular-nums text-basalto", coma(promedio)), el("span", "text-pizarra", `(${total} ${total === 1 ? "reseña" : "reseñas"})`)];
  if (!alPulsar) {
    const p = el("p", "flex min-h-11 items-center gap-1.5 text-xs");
    p.append(...contenido);
    return p;
  }
  const b = el("button", "-mx-1 flex min-h-11 items-center gap-1.5 self-start rounded-control px-1 text-xs underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped");
  b.type = "button";
  b.setAttribute("aria-label", `${coma(promedio)} de 5, ${total} ${total === 1 ? "reseña" : "reseñas"} de ${nombre}. Ver opiniones`);
  b.append(...contenido);
  b.addEventListener("click", alPulsar);
  return b;
}

function distrito(texto: string): HTMLParagraphElement {
  const p = el("p", "flex min-w-0 items-center gap-1.5 text-sm text-pizarra");
  const punto = el("span", "h-2 w-2 shrink-0 rounded-full bg-cesped");
  punto.setAttribute("aria-hidden", "true");
  p.append(punto, el("span", "truncate", texto));
  return p;
}

function chip(texto: string): HTMLLIElement {
  return el("li", "inline-flex items-center rounded-full border border-cesped/40 bg-cesped-suave px-2.5 py-0.5 text-xs font-semibold text-cesped-hondo", texto);
}

function pie(precio: string, unidad: string, accion: HTMLAnchorElement): HTMLDivElement {
  const caja = el("div", "mt-auto flex items-center justify-between gap-3 border-t border-cal pt-3");
  const cifra = el("p", "flex min-w-0 items-baseline gap-1");
  cifra.append(el("span", "font-display text-2xl font-bold tabular-nums text-basalto", precio), el("span", "text-xs text-pizarra", unidad));
  caja.append(cifra, accion);
  return caja;
}

interface OpcionesTarjeta {
  hora: number;
  reservarHref: string;
  valoracion?: Valoracion;
  onValoracion?: () => void;
}

export function tarjetaCancha(item: ItemDisponible, op: OpcionesTarjeta): HTMLLIElement {
  const { cancha } = item;
  const lugar = cancha.complejo?.nombre ?? cancha.nombre;
  const hora = etiquetaHora(op.hora);
  const li = el("li", CLASE_TARJETA);
  li.dataset.deporte = cancha.tipo;

  const cabeza = foto(cancha.imagen);
  cabeza.append(el("span", `${CLASE_INSIGNIA} left-3 bg-cesped text-tiza`, etiquetaTipo(cancha.tipo)));
  if (cancha.techada) cabeza.append(el("span", `${CLASE_INSIGNIA} right-3 border border-cal bg-tiza text-basalto`, "Techada"));
  li.append(cabeza);

  const cuerpo = el("div", "flex flex-1 flex-col gap-1 p-4");
  cuerpo.append(el("h3", "truncate font-bold leading-tight text-basalto", lugar));
  if (cancha.complejo) cuerpo.append(el("p", "truncate text-sm text-pizarra", cancha.nombre));
  cuerpo.append(distrito(cancha.complejo?.distrito ?? "Arequipa"));
  cuerpo.append(bloqueValoracion(lugar, op.valoracion, cancha.complejoId ? op.onValoracion : undefined));
  if (cancha.superficie) {
    const chips = el("ul", "mb-3 flex flex-wrap gap-1.5");
    chips.setAttribute("aria-label", "Superficie");
    chips.append(chip(cancha.superficie));
    cuerpo.append(chips);
  }

  const reservar = el("a", `${BOTON.primario} shrink-0 px-4`);
  reservar.href = op.reservarHref;
  reservar.setAttribute("aria-label", `Reservar ${cancha.nombre} en ${lugar} a las ${hora}`);
  reservar.append(icono(TRAZO_CALENDARIO, "h-4 w-4"), "Reservar");
  cuerpo.append(pie(soles(precioDe(item)), "/60 min", reservar));
  li.append(cuerpo);
  return li;
}

interface OpcionesComplejo {
  valoracion?: Valoracion;
  onValoracion?: () => void;
  verHref: string;
  onVer: () => void;
}

export function tarjetaComplejo(grupo: GrupoComplejo<ItemDisponible>, op: OpcionesComplejo): HTMLLIElement {
  const li = el("li", CLASE_TARJETA);
  const n = grupo.items.length;
  const cabeza = foto(fotoDeGrupo(grupo, esImagenPropia));
  cabeza.append(el("span", `${CLASE_INSIGNIA} left-3 bg-cesped text-tiza`, `${n} ${n === 1 ? "cancha libre" : "canchas libres"}`));
  li.append(cabeza);

  const cuerpo = el("div", "flex flex-1 flex-col gap-1 p-4");
  cuerpo.append(el("h3", "truncate font-bold leading-tight text-basalto", grupo.nombre));
  cuerpo.append(distrito(grupo.distrito));
  cuerpo.append(bloqueValoracion(grupo.nombre, op.valoracion, grupo.complejoId ? op.onValoracion : undefined));
  const chips = el("ul", "mb-3 flex flex-wrap gap-1.5");
  chips.setAttribute("aria-label", "Deportes");
  chips.append(...grupo.tipos.map((t) => chip(etiquetaTipo(t))));
  cuerpo.append(chips);

  const ver = el("a", `${BOTON.primario} shrink-0 px-4`);
  ver.href = op.verHref;
  ver.setAttribute("aria-label", `Ver canchas de ${grupo.nombre}`);
  ver.append("Ver canchas", icono(TRAZO_FLECHA, "h-4 w-4"));
  ver.addEventListener("click", (e) => {
    e.preventDefault();
    op.onVer();
  });
  const caja = pie(soles(grupo.desde), "/60 min", ver);
  caja.firstElementChild?.prepend(el("span", "text-xs text-pizarra", "desde"));
  cuerpo.append(caja);
  li.append(cuerpo);
  return li;
}

/** Promos propias de ReservaYa (spec 60 §4): enlazan a páginas existentes y no cuentan como resultado. */
const PROMOS = [
  { foto: "futsal-luz", insignia: "Comunidad", titulo: "¿Te faltan jugadores?", texto: "Súmate a un partido abierto con cupos libres.", href: "/jugar#partidos", accion: "Ver partidos" },
  { foto: "atardecer-ribera", insignia: "Para dueños", titulo: "¿Tienes una cancha?", texto: "Publica tu complejo y recibe reservas en línea.", href: "/duenos", accion: "Conocer más" },
] as const;

export function tarjetaPromo(indice: number): HTMLLIElement {
  const p = PROMOS[indice % PROMOS.length];
  const li = el("li", "card-tactil fila-entra relative min-h-80 min-w-0 overflow-hidden p-0");
  li.dataset.promo = "";
  const img = document.createElement("img");
  img.src = `/img/hero/${p.foto}.webp`;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "absolute inset-0 h-full w-full object-cover";
  const velo = el("span", "absolute inset-0 bg-gradient-to-t from-cancha-noche from-35% via-cancha-noche/85 to-cancha-noche/70");
  velo.setAttribute("aria-hidden", "true");
  const enlace = el("a", "relative z-10 flex h-full min-h-80 flex-col justify-between gap-4 p-5 text-blanco focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-reflector");
  enlace.href = p.href;
  enlace.append(el("span", "self-start rounded-full border border-blanco/60 px-2.5 py-1 text-xs font-bold leading-none", p.insignia));
  const texto = el("span", "flex flex-col gap-2");
  texto.append(
    el("span", "font-display text-3xl font-bold leading-tight", p.titulo),
    el("span", "text-sm text-blanco/90", p.texto),
  );
  const accion = el("span", "btn-tactil mt-2 inline-flex min-h-11 self-start bg-reflector px-5 text-sm text-cancha-noche");
  accion.append(p.accion, icono(TRAZO_FLECHA, "h-4 w-4"));
  texto.append(accion);
  enlace.append(texto);
  li.append(img, velo, enlace);
  return li;
}

/** Esqueleto con la misma forma que la tarjeta para no mover la página al cargar (spec 47). */
export function tarjetasEsqueleto(n: number): HTMLLIElement[] {
  return Array.from({ length: n }, () => {
    const li = el("li", "card-tactil flex min-w-0 flex-col overflow-hidden p-0");
    li.setAttribute("aria-hidden", "true");
    const cuerpo = el("div", "flex flex-1 flex-col gap-2 p-4");
    const base = el("div", "mt-auto flex items-center justify-between border-t border-cal pt-3");
    base.append(el("span", "esqueleto h-7 w-20"), el("span", "esqueleto h-11 w-28 rounded-full"));
    cuerpo.append(el("span", "esqueleto h-5 w-3/4"), el("span", "esqueleto h-4 w-1/2"), el("span", "esqueleto h-4 w-1/3"), el("span", "esqueleto my-3.5 h-4 w-2/5"), base);
    li.append(el("div", `${CLASE_FOTO} esqueleto rounded-none`), cuerpo);
    return li;
  });
}
