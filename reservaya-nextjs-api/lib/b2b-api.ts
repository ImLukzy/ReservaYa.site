import { cookies } from 'next/headers';
import { config } from './config';
import { ApiError } from './api-types';

export interface ComplejoResumen {
  id: string;
  nombre: string;
  distrito: string;
  slug: string;
  canchas: number;
  ocupacion: number;
  publicado: boolean;
}

export interface MovimientoResumen {
  id: string;
  descripcion: string;
  monto: string;
  metodoPago: string;
  tipo: string;
  creadoEn: string;
}

async function serverFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(config.jwtCookieName)?.value;
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Cookie', `${config.jwtCookieName}=${token}`);
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5000';
  return fetch(`${backendUrl}${path}`, { ...init, headers, cache: 'no-store' });
}

async function getJson<T>(path: string): Promise<T> {
  const res = await serverFetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`);
  }
  return (await res.json()) as T;
}

// Neutral ante backend aún sin estos endpoints: devuelve [] y la UI muestra
// estado vacío con CTA en lugar de romper (los mocks antiguos ocultaban esto).
export async function getComplejos(): Promise<ComplejoResumen[]> {
  const data = await getJson<{ complejos: ComplejoResumen[] }>('/api/complejos');
  return data.complejos ?? [];
}

export async function getCajaDelDia(): Promise<{ total: number; movimientos: MovimientoResumen[] }> {
  const data = await getJson<{ total: number; movimientos: MovimientoResumen[] }>(
    '/api/caja/hoy'
  );
  return { total: data.total ?? 0, movimientos: data.movimientos ?? [] };
}

export interface MetaResumen {
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

export async function validarCodigo(
  codigo: string
): Promise<{ ok: boolean; reserva?: unknown; error?: string }> {
  const res = await serverFetch('/api/reservas/validar', {
    method: 'POST',
    body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, error: body?.error ?? `Error ${res.status}` };
  return { ok: true, reserva: body?.reserva };
}
