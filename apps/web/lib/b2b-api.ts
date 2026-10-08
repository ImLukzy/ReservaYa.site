import 'server-only';
import { getJson } from './server-fetch';

export interface ComplejoResumen {
  id: string;
  nombre: string;
  distrito: string;
  slug: string;
  totalCanchas: number;
  ocupacion: number;
  publicado: boolean;
}

interface HorarioFila {
  id: string;
  complejoId: string;
  canchaId: string | null;
  diaSemana: number;
  activo: boolean;
}

export interface EquipoMiembroResumen {
  id: string;
  complejoId: string;
  rolSede: string;
  /** false = invitación pendiente (aún no acepta). */
  activo: boolean;
  estado?: 'PENDIENTE' | 'ACTIVO';
  creadoEn?: string;
  usuario: { id: string; nombre: string; email: string; rol: string; activo: boolean } | null;
}

// Lanza ApiError si la API falla; las páginas lo muestran con crearCarga + <AvisoCarga />.
export async function getComplejos(): Promise<ComplejoResumen[]> {
  const data = await getJson<{ complejos: ComplejoResumen[] }>('/api/complejos');
  return data.complejos ?? [];
}

export async function getEquipo(complejoId: string): Promise<EquipoMiembroResumen[]> {
  const data = await getJson<{ equipo: EquipoMiembroResumen[] }>(
    `/api/equipo?complejoId=${encodeURIComponent(complejoId)}`
  );
  return data.equipo ?? [];
}

// Filas guardadas del complejo (y de sus canchas); vacío = rige el horario por defecto de la API.
export async function getHorarios(complejoId: string): Promise<HorarioFila[]> {
  const data = await getJson<{ horarios: HorarioFila[] }>(
    `/api/horarios?complejoId=${encodeURIComponent(complejoId)}`
  );
  return data.horarios ?? [];
}

interface MetaResumen {
  id: string;
  titulo: string;
  tipo: string;
  objetivo: string;
  actual: string;
  periodoInicio: string;
  periodoFin: string;
}

// Metas iniciales para el render del servidor; el panel las revalida en cliente.
export async function getMetas(): Promise<MetaResumen[]> {
  const data = await getJson<{ metas: MetaResumen[] }>('/api/metas');
  return data.metas ?? [];
}
