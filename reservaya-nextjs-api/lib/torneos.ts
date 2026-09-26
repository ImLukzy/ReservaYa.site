// Contrato de TorneosController (.NET): lista con _count, detalle con inscripciones y partidos.
// Funciones puras para que el panel y los tests lean exactamente las mismas formas.

export interface Inscripcion {
  id: string;
  equipo: string;
  telefono: string | null;
}

export interface Partido {
  id: string;
  equipoA: string;
  equipoB: string;
  fecha: string | null;
  golesA: number | null;
  golesB: number | null;
}

export interface Torneo {
  id: string;
  nombre: string;
  estado: string;
  inscritos: number;
  cupoMax: number;
  premio: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface Detalle extends Torneo {
  inscripciones: Inscripcion[];
  partidos: Partido[];
}

export const ESTADOS_TORNEO = ['BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'] as const;

export const ETIQUETA_ESTADO_TORNEO: Record<string, string> = {
  BORRADOR: 'Borrador',
  INSCRIPCIONES_ABIERTAS: 'Inscripciones abiertas',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

function str(v: unknown, fb = ''): string {
  return v === null || v === undefined ? fb : String(v);
}

function num(v: unknown, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function numONull(v: unknown): number | null {
  return v === null || v === undefined ? null : num(v);
}

export function lista(body: unknown, clave: string): Record<string, unknown>[] {
  const v = body && typeof body === 'object' ? (body as Record<string, unknown>)[clave] : null;
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function parseTorneo(x: Record<string, unknown>, inscritos: number): Torneo {
  return {
    id: str(x.id),
    nombre: str(x.nombre, 'Torneo sin nombre'),
    estado: str(x.estado, 'BORRADOR').toUpperCase(),
    inscritos,
    cupoMax: num(x.cupoMax),
    premio: str(x.premio, '—'),
    fechaInicio: str(x.fechaInicio),
    fechaFin: str(x.fechaFin),
  };
}

// GET /api/torneos → { torneos: [{ ..., _count: { inscripciones, partidos } }] }
export function parseTorneos(body: unknown): Torneo[] {
  return lista(body, 'torneos').map((t) => {
    const count = (t._count ?? {}) as Record<string, unknown>;
    return parseTorneo(t, num(count.inscripciones));
  });
}

// GET /api/torneos/{id} → { torneo, inscripciones, partidos }
export function parseDetalle(body: unknown): Detalle | null {
  const t = body && typeof body === 'object' ? (body as Record<string, unknown>).torneo : null;
  if (!t || typeof t !== 'object') return null;
  const inscripciones = lista(body, 'inscripciones').map((i) => ({
    id: str(i.id),
    equipo: str(i.equipo, 'Equipo'),
    telefono: i.telefono ? str(i.telefono) : null,
  }));
  return {
    ...parseTorneo(t as Record<string, unknown>, inscripciones.length),
    inscripciones,
    partidos: lista(body, 'partidos').map((p) => ({
      id: str(p.id),
      equipoA: str(p.equipoA, 'Equipo A'),
      equipoB: str(p.equipoB, 'Equipo B'),
      fecha: p.fecha ? str(p.fecha) : null,
      golesA: numONull(p.golesA),
      golesB: numONull(p.golesB),
    })),
  };
}

// Cuerpos de escritura con los nombres de TorneoRequest / InscripcionRequest / PartidoRequest.
export function cuerpoResultado(golesA: string, golesB: string) {
  return { golesA: Number(golesA), golesB: Number(golesB) };
}

export function rutaResultado(partidoId: string) {
  return `/api/torneos/partidos/${encodeURIComponent(partidoId)}`;
}
