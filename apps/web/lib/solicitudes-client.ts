import { apiRequest } from './http'
import type { Solicitud, SolicitudInput, UsuarioSesion } from './api-types'
import { solicitudDeRespuesta } from './solicitudes'

// Spec 55 §4/§8 — solicitudes jugador→dueño (Client Components).
export const enviarSolicitud = (input: SolicitudInput) =>
  apiRequest<{ solicitud: Solicitud }>('/api/solicitudes', { method: 'POST', body: JSON.stringify(input) })

export async function getMiSolicitud(signal?: AbortSignal): Promise<Solicitud | null> {
  return solicitudDeRespuesta(await apiRequest<unknown>('/api/solicitudes/mias', { cache: 'no-store', signal }))
}

export const aprobarSolicitud = (id: string) =>
  apiRequest<{ ok: boolean }>(`/api/solicitudes/${encodeURIComponent(id)}/aprobar`, { method: 'PATCH' })

export const rechazarSolicitud = (id: string, motivo: string) =>
  apiRequest<{ ok: boolean; emailEnviado?: boolean }>(`/api/solicitudes/${encodeURIComponent(id)}/rechazar`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  })

/** Reemite la cookie con el rol actual (tras la aprobación pasa a SUPERADMIN). */
export const refrescarSesion = () =>
  apiRequest<{ usuario: UsuarioSesion }>('/api/auth/refrescar', { method: 'POST' })
