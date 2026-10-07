import { apiRequest } from './http'
import { invitacionesDeRespuesta, type Invitacion } from './invitaciones'

// Bandeja de invitaciones de equipo (Client Components). Ver docs/api.md.
export async function getMisInvitaciones(signal?: AbortSignal): Promise<Invitacion[]> {
  return invitacionesDeRespuesta(await apiRequest<unknown>('/api/invitaciones/mias', { cache: 'no-store', signal }))
}

export const aceptarInvitacion = (id: string) =>
  apiRequest<{ ok: boolean; complejo: { id: string; nombre: string } }>(
    `/api/invitaciones/${encodeURIComponent(id)}/aceptar`, { method: 'POST' })

export const rechazarInvitacion = (id: string) =>
  apiRequest<{ ok: boolean }>(`/api/invitaciones/${encodeURIComponent(id)}/rechazar`, { method: 'POST' })

export const invitarAlEquipo = (complejoId: string, email: string) =>
  apiRequest<{ ok: boolean; existente: boolean; correoEnviado?: boolean }>('/api/equipo', {
    method: 'POST',
    body: JSON.stringify({ complejoId, email }),
  })

export const quitarDelEquipo = (miembroId: string) =>
  apiRequest<{ ok: boolean }>(`/api/equipo/${encodeURIComponent(miembroId)}`, { method: 'DELETE' })
