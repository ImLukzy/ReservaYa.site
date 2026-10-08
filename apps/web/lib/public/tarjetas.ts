// Lógica pura de la cuadrícula de /canchas (spec 60): agrupar por complejo e intercalar promos.
// Sin DOM ni imports para que los tests la carguen directo con node --test.

export interface CanchaAgrupable {
  cancha: {
    id: string;
    nombre: string;
    tipo: string;
    imagen: string | null;
    complejoId: string | null;
    complejo: { id: string; nombre: string; distrito: string; fotos?: string[] } | null;
  };
}

export interface GrupoComplejo<T extends CanchaAgrupable> {
  clave: string;
  complejoId: string | null;
  nombre: string;
  distrito: string;
  items: T[];
  /** Precio más bajo entre sus canchas libres. */
  desde: number;
  /** Deportes distintos en el orden en que aparecen. */
  tipos: string[];
}

/** Menor distancia del grupo (spec 68); null si ningún item la trae. */
export function distanciaDeGrupo<T extends { distanciaKm?: number | null }>(grupo: { items: T[] }): number | null {
  let min: number | null = null;
  for (const it of grupo.items) {
    if (it.distanciaKm != null && Number.isFinite(it.distanciaKm) && (min === null || it.distanciaKm < min)) min = it.distanciaKm;
  }
  return min;
}

/** "a 1,2 km"; null si no hay distancia (la tarjeta muestra "distancia no disponible"). */
export function textoDistancia(d: number | null | undefined): string | null {
  if (d == null || !Number.isFinite(d) || d < 0) return null;
  return `a ${d.toFixed(1).replace(".", ",")} km`;
}

/** Agrupa las canchas por complejo conservando el orden de llegada; una cancha sin complejo es su propio grupo. */
export function agruparPorComplejo<T extends CanchaAgrupable>(items: T[], precio: (it: T) => number): GrupoComplejo<T>[] {
  const grupos = new Map<string, GrupoComplejo<T>>();
  for (const it of items) {
    const { cancha } = it;
    const clave = cancha.complejoId ? `complejo:${cancha.complejoId}` : `cancha:${cancha.id}`;
    let g = grupos.get(clave);
    if (!g) {
      g = {
        clave,
        complejoId: cancha.complejoId,
        nombre: cancha.complejo?.nombre ?? cancha.nombre,
        distrito: cancha.complejo?.distrito ?? "Arequipa",
        items: [],
        desde: Number.POSITIVE_INFINITY,
        tipos: [],
      };
      grupos.set(clave, g);
    }
    g.items.push(it);
    g.desde = Math.min(g.desde, precio(it));
    if (!g.tipos.includes(cancha.tipo)) g.tipos.push(cancha.tipo);
  }
  return [...grupos.values()];
}

/** Ordena grupos con el mismo criterio que las canchas: precio desde, o valoración del complejo. */
export function ordenarGrupos<T extends CanchaAgrupable>(grupos: GrupoComplejo<T>[], orden: string, promedio: (g: GrupoComplejo<T>) => number): GrupoComplejo<T>[] {
  const copia = [...grupos];
  if (orden === "precio-desc") copia.sort((a, b) => b.desde - a.desde);
  else if (orden === "valoracion") copia.sort((a, b) => promedio(b) - promedio(a));
  else copia.sort((a, b) => a.desde - b.desde);
  return copia;
}

/** Primera foto disponible entre las canchas del grupo, según el criterio de imagen propia. */
export function fotoDeGrupo<T extends CanchaAgrupable>(grupo: GrupoComplejo<T>, valida: (url: string | null) => boolean): string | null {
  const portada = grupo.items[0]?.cancha.complejo?.fotos?.[0] ?? null;
  if (valida(portada)) return portada;
  return grupo.items.find((it) => valida(it.cancha.imagen))?.cancha.imagen ?? null;
}

export type Celda<T> = { tipo: "item"; item: T } | { tipo: "promo"; indice: number };

/** Intercala una promo tras cada `cada` tarjetas, hasta `max`. Las promos no cuentan como resultados. */
export function intercalarPromos<T>(items: T[], cada = 5, max = 2): Celda<T>[] {
  const celdas: Celda<T>[] = [];
  let promos = 0;
  items.forEach((item, i) => {
    celdas.push({ tipo: "item", item });
    if ((i + 1) % cada === 0 && promos < max) celdas.push({ tipo: "promo", indice: promos++ });
  });
  return celdas;
}

/** "N complejos · M canchas" con singular y plural. */
export function textoConteo(complejos: number, canchas: number): string {
  return `${complejos} ${complejos === 1 ? "complejo" : "complejos"} · ${canchas} ${canchas === 1 ? "cancha" : "canchas"}`;
}
