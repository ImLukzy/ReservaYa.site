import { type Cancha, type CanchaInput, type ResenaPanel, type EstadoReserva, type Rol, type UsuarioSesion } from './api-types'
import { apiRequest as request } from './http'
import { uploadToR2 } from './upload-r2'
import type { MiResena, PaginaResenas, ResenaPublica } from './public/resenas'

export const logout = () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
export const createCancha = (input: CanchaInput) =>
  request<{ cancha: Cancha }>('/api/canchas', { method: 'POST', body: JSON.stringify(input) })
export const updateCancha = (id: string, input: Partial<CanchaInput>) =>
  request<{ cancha: Cancha }>(`/api/canchas/${id}`, { method: 'PUT', body: JSON.stringify(input) })
export const deleteCancha = (id: string) =>
  request<{ ok: boolean }>(`/api/canchas/${id}`, { method: 'DELETE' })
export const createReserva = (input: {
  canchaId: string; fecha: string; horaInicio: number; horaFin: number; notas: string
}) => request('/api/reservas', { method: 'POST', body: JSON.stringify(input) })
export const updateReserva = (id: string, estado: EstadoReserva) =>
  request(`/api/reservas/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) })
export const updateUsuario = (id: string, input: { activo?: boolean; rol?: Rol }) =>
  request(`/api/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
// Reseñas (spec 64): crear también edita la propia; la API valida reserva completada y propiedad.
export const crearResena = (complejoId: string, puntuacion: number, comentario?: string) =>
  request<{ ok: boolean; resena: ResenaPublica }>('/api/resenas', { method: 'POST', body: JSON.stringify({ complejoId, puntuacion, comentario }) })
export const borrarResena = (id: string) =>
  request<{ ok: boolean }>(`/api/resenas/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const responderResena = (id: string, respuesta: string, editar = false) =>
  request<{ ok: boolean; resena: ResenaPanel }>(`/api/resenas/${encodeURIComponent(id)}/responder`, { method: editar ? 'PUT' : 'POST', body: JSON.stringify({ respuesta }) })
export const resenasDelPanel = () => request<{ ok: boolean; resenas: ResenaPanel[] }>('/api/resenas', { cache: 'no-store' })
export const miResena = (slug: string) =>
  request<MiResena & { ok: boolean }>(`/api/resenas/mia?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
export const resenasPublicas = (url: string) => request<PaginaResenas>(url, { cache: 'no-store' })
// Partidos comunitarios (Spec 22b): la API valida organizador/anotación con la cookie de sesión.
export const cancelarPartido = (id: string) =>
  request<{ ok: boolean }>(`/api/partidos/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const salirseDePartido = (id: string) =>
  request<{ ok: boolean }>(`/api/partidos/${encodeURIComponent(id)}/anotarse`, { method: 'DELETE' })

export const updatePerfil = (input: {
  telefono?: string
  username?: string
  fechaNacimiento?: string
}) =>
  request<{ ok: boolean; usuario: UsuarioSesion }>('/api/usuarios/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

// Imágenes: el archivo va directo a R2 (uploadToR2) y la API solo guarda la URL pública.
export async function subirFotoPerfil(file: File): Promise<{ ok: boolean; fotoUrl: string }> {
  const url = await uploadToR2(file, 'perfil')
  return request<{ ok: boolean; fotoUrl: string }>('/api/usuarios/me/foto', {
    method: 'PUT',
    body: JSON.stringify({ url }),
  })
}
