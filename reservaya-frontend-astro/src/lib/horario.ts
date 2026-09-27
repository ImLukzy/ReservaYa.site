// Franjas del tablero y fechas en hora de Arequipa (America/Lima, UTC−5).
// Funciones puras: las usan la home y /canchas (spec 20).

/** Primera y última hora de inicio que ofrece la reserva del panel (08:00–21:00). */
export const APERTURA = 8;
export const ULTIMA = 21;
const ZONA = "America/Lima";

export function fechaEnLima(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function horaEnLima(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" }).format(d));
}

export function sumarDias(fecha: string, dias: number): string {
  const t = Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export interface Franjas {
  fecha: string;
  dia: "hoy" | "manana";
  horas: number[];
}

/** Las 3 próximas horas de inicio de hoy; pasada la última, las primeras de mañana. */
export function franjasProximas(d: Date = new Date()): Franjas {
  const fecha = fechaEnLima(d);
  const inicio = Math.max(horaEnLima(d) + 1, APERTURA);
  if (inicio > ULTIMA) return { fecha: sumarDias(fecha, 1), dia: "manana", horas: [APERTURA, APERTURA + 1, APERTURA + 2] };
  const horas: number[] = [];
  for (let h = inicio; h <= Math.min(inicio + 2, ULTIMA); h++) horas.push(h);
  return { fecha, dia: "hoy", horas };
}

export function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}

/** Acepta «hoy», «manana» o AAAA-MM-DD; cualquier otra cosa es hoy. */
export function resolverFecha(valor: string | null | undefined, d: Date = new Date()): string {
  const hoy = fechaEnLima(d);
  if (valor === "manana") return sumarDias(hoy, 1);
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) && valor >= hoy) return valor;
  return hoy;
}

/** «hoy», «mañana» o «el lunes 28». */
export function nombreDia(fecha: string, d: Date = new Date()): string {
  const hoy = fechaEnLima(d);
  if (fecha === hoy) return "hoy";
  if (fecha === sumarDias(hoy, 1)) return "mañana";
  const txt = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", weekday: "long", day: "numeric" }).format(new Date(`${fecha}T00:00:00Z`));
  return `el ${txt}`;
}

/** Opciones de día para los filtros: hoy, mañana y los 5 siguientes. */
export function diasProximos(d: Date = new Date()): { valor: string; etiqueta: string }[] {
  const hoy = fechaEnLima(d);
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(hoy, i);
    const valor = i === 0 ? "hoy" : i === 1 ? "manana" : fecha;
    const nombre = nombreDia(fecha, d).replace(/^el /, "");
    return { valor, etiqueta: nombre.charAt(0).toUpperCase() + nombre.slice(1) };
  });
}

/** «S/ 40» o «S/ 42.50». */
export function soles(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return `S/ ${Number.isInteger(n) ? n : n.toFixed(2)}`;
}
