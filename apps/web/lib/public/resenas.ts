// Lógica pura de las reseñas del perfil público (spec 64).
// Sin DOM ni imports para que los tests la carguen directo con node --test.

export type OrdenResenas = "recientes" | "mejor" | "peor";
export type Distribucion = Record<"1" | "2" | "3" | "4" | "5", number>;

export interface ResenaPublica {
  id: string;
  puntuacion: number;
  comentario: string | null;
  respuestaDueno: string | null;
  creadoEn: string;
  autor: string;
}

export interface PaginaResenas {
  promedio: number;
  total: number;
  distribucion: Distribucion;
  orden: OrdenResenas;
  resenas: ResenaPublica[];
  siguiente: string | null;
}

export interface MiResena {
  complejoId: string;
  puedeCalificar: boolean;
  motivo: string | null;
  resena: (ResenaPublica & { complejoId: string }) | null;
}

export type EstadoCalificar =
  | { tipo: "cargando" }
  | { tipo: "sin-sesion" }
  | { tipo: "no-jugo" }
  | { tipo: "puede"; complejoId: string }
  | { tipo: "ya-califico"; complejoId: string; resena: ResenaPublica }
  | { tipo: "error" };

export const ORDENES: { valor: OrdenResenas; etiqueta: string }[] = [
  { valor: "recientes", etiqueta: "Recientes" },
  { valor: "mejor", etiqueta: "Mejor valoradas" },
  { valor: "peor", etiqueta: "Peor valoradas" },
];

export const MAX_TEXTO = 500;
export const POR_PAGINA = 5;

/** Traduce la respuesta de GET /api/resenas/mia (o su estado HTTP de error) al estado de la UI. */
export function estadoCalificar(r: { status: number; body?: MiResena | null }): EstadoCalificar {
  if (r.status === 401) return { tipo: "sin-sesion" };
  if (r.status !== 200 || !r.body) return { tipo: "error" };
  if (r.body.resena) return { tipo: "ya-califico", complejoId: r.body.complejoId, resena: r.body.resena };
  return r.body.puedeCalificar ? { tipo: "puede", complejoId: r.body.complejoId } : { tipo: "no-jugo" };
}

/** URL de la página pública de reseñas; el cursor es el id de la última recibida. */
export function urlResenas(slug: string, orden: OrdenResenas, cursor?: string | null, limite = POR_PAGINA): string {
  const q = new URLSearchParams({ slug, orden, limite: String(limite) });
  if (cursor) q.set("cursor", cursor);
  return `/api/resenas/publicas?${q}`;
}

/** Añade una página al final sin duplicar reseñas ya mostradas y conserva el resumen más reciente. */
export function unirPaginas(actual: PaginaResenas, nueva: PaginaResenas): PaginaResenas {
  const vistos = new Set(actual.resenas.map((r) => r.id));
  return { ...nueva, resenas: [...actual.resenas, ...nueva.resenas.filter((r) => !vistos.has(r.id))] };
}

export function loginHref(slug: string): string {
  return `/login?returnUrl=${encodeURIComponent(`/c/${slug}`)}`;
}

export function inicial(nombre: string): string {
  return (nombre.trim().charAt(0) || "J").toLocaleUpperCase("es-PE");
}

/** Color estable por nombre (índice en la paleta de círculos). */
export function indiceColor(nombre: string, paleta: number): number {
  let h = 0;
  for (const c of nombre) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return h % paleta;
}

export function porcentaje(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

/** Fecha en hora de Perú, p. ej. "8 de octubre de 2026". */
export function fechaPeru(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" });
}

export function textoTotal(total: number): string {
  return total === 1 ? "1 reseña" : `${total} reseñas`;
}
