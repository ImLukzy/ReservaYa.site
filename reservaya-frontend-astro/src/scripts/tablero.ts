// Tablero de la home: canchas libres en las próximas horas (spec 20).
// GET /api/canchas/disponibles?fecha&horaInicio&horaFin[&distrito][&tipo]; horas en minutos.
import { API, APP } from "../lib/entorno";
import { etiquetaHora, franjasProximas } from "../lib/horario";
import { avisoTablero, filaCancha, filasEsqueleto, precioDe, urlReservar, type ItemDisponible } from "./filas";

const MAX_FILAS = 5;

export function iniciarTablero(raiz: HTMLElement) {
  const titulo = raiz.querySelector<HTMLElement>("[data-titulo]");
  const panel = raiz.querySelector<HTMLElement>("[data-panel]");
  const todas = raiz.querySelector<HTMLAnchorElement>("[data-todas]");
  const estado = raiz.querySelector<HTMLElement>("[data-estado]");
  const tabs = Array.from(raiz.querySelectorAll<HTMLButtonElement>("[data-hora]"));
  const selDistrito = document.getElementById("buscar-distrito");
  const selTipo = document.getElementById("buscar-tipo");
  const horaForm = document.getElementById("buscar-hora");
  if (!panel || !todas || tabs.length === 0) return;

  const franjas = franjasProximas();
  const cache = new Map<string, Promise<ItemDisponible[]>>();
  let hora = franjas.horas[0];
  let pedido = 0;

  if (titulo && franjas.dia === "manana") titulo.textContent = "Libres mañana";
  tabs.forEach((tab, i) => {
    const h = franjas.horas[i];
    if (h === undefined) {
      tab.hidden = true;
      return;
    }
    tab.dataset.hora = String(h);
    tab.textContent = etiquetaHora(h);
    tab.addEventListener("click", () => elegir(h, true));
    tab.addEventListener("keydown", (e) => {
      const visibles = tabs.filter((t) => !t.hidden);
      const pos = visibles.indexOf(tab);
      const destino = e.key === "ArrowRight" ? visibles[pos + 1] : e.key === "ArrowLeft" ? visibles[pos - 1] : undefined;
      if (!destino) return;
      e.preventDefault();
      destino.focus();
      destino.click();
    });
  });

  const valor = (nodo: HTMLElement | null) => (nodo instanceof HTMLSelectElement ? nodo.value : "");

  function consultar(h: number): Promise<ItemDisponible[]> {
    const q = new URLSearchParams({ fecha: franjas.fecha, horaInicio: String(h * 60), horaFin: String((h + 1) * 60) });
    if (valor(selDistrito)) q.set("distrito", valor(selDistrito));
    if (valor(selTipo)) q.set("tipo", valor(selTipo));
    const clave = q.toString();
    let promesa = cache.get(clave);
    if (!promesa) {
      const ctrl = new AbortController();
      const limite = window.setTimeout(() => ctrl.abort(), 10000);
      promesa = fetch(`${API}/api/canchas/disponibles?${clave}`, { signal: ctrl.signal })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .then((body: { canchas?: ItemDisponible[] }) =>
          (body.canchas ?? []).filter((x) => x.disponible).sort((a, b) => precioDe(a) - precioDe(b)),
        )
        .finally(() => window.clearTimeout(limite));
      promesa.catch(() => cache.delete(clave));
      cache.set(clave, promesa);
    }
    return promesa;
  }

  function enlaceTodas(n: number) {
    if (!todas) return;
    const q = new URLSearchParams({ fecha: franjas.dia, hora: String(hora) });
    if (valor(selDistrito)) q.set("distrito", valor(selDistrito));
    if (valor(selTipo)) q.set("tipo", valor(selTipo));
    todas.href = `/canchas?${q.toString()}`;
    todas.textContent = n > MAX_FILAS ? `Ver las ${n} canchas libres a las ${etiquetaHora(hora)}` : "Buscar otro día u hora";
  }

  async function elegir(h: number, porUsuario: boolean) {
    hora = h;
    if (horaForm instanceof HTMLInputElement) horaForm.value = String(h);
    tabs.forEach((t) => {
      const activa = t.dataset.hora === String(h);
      t.setAttribute("aria-selected", String(activa));
      t.tabIndex = activa ? 0 : -1;
    });
    const mio = ++pedido;
    panel!.setAttribute("aria-busy", "true");
    panel!.replaceChildren(listaDe(filasEsqueleto(3)));
    try {
      const items = await consultar(h);
      if (mio !== pedido) return;
      enlaceTodas(items.length);
      if (items.length === 0) {
        const donde = valor(selDistrito) ? ` en ${valor(selDistrito)}` : "";
        panel!.replaceChildren(avisoTablero(`No quedan canchas libres a las ${etiquetaHora(h)}${donde}`, "Prueba otra hora o cambia el distrito."));
      } else {
        const filas = items.slice(0, MAX_FILAS).map((it) => filaCancha(it, { hora: h, reservarHref: urlReservar(APP, it.cancha, franjas.fecha, h) }));
        if (items.length < MAX_FILAS) {
          const fin = document.createElement("li");
          fin.className = "px-4 py-4 text-sm text-pizarra sm:px-6";
          fin.textContent = `${items.length === 1 ? "Es la única cancha libre" : `Son las ${items.length} canchas libres`} a las ${etiquetaHora(h)}${valor(selDistrito) ? ` en ${valor(selDistrito)}` : ""}.`;
          filas.push(fin);
        }
        panel!.replaceChildren(listaDe(filas));
      }
    } catch {
      if (mio !== pedido) return;
      enlaceTodas(0);
      panel!.replaceChildren(avisoTablero("No pudimos cargar las canchas libres", "Revisa tu conexión e inténtalo otra vez.", { etiqueta: "Reintentar", alPulsar: () => elegir(hora, true) }));
    } finally {
      if (mio === pedido) panel!.removeAttribute("aria-busy");
    }
    if (porUsuario && estado && mio === pedido) {
      const n = panel!.querySelectorAll("li a").length;
      estado.textContent = n > 0 ? `${n} ${n === 1 ? "cancha libre" : "canchas libres"} a las ${etiquetaHora(h)}` : panel!.textContent ?? "";
    }
  }

  function listaDe(filas: HTMLLIElement[]): HTMLUListElement {
    const ul = document.createElement("ul");
    ul.append(...filas);
    return ul;
  }

  selDistrito?.addEventListener("change", () => elegir(hora, true));
  selTipo?.addEventListener("change", () => elegir(hora, true));
  elegir(hora, false);
}
