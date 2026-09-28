import { ApiError, type Cancha, type CanchaInput, type EstadoReserva, type Rol, type UsuarioSesion } from './api-types'
import { apiRequest as request } from './http'

export const login = (email: string, password: string) =>
  request<{ usuario: UsuarioSesion }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
export const register = (nombre: string, email: string, password: string, fechaNacimiento?: string, username?: string) =>
  request<{ usuario: UsuarioSesion }>('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ nombre, email, password, fechaNacimiento, username }),
  })
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
export const crearResena = (complejoId: string, puntuacion: number, comentario?: string) =>
  request('/api/resenas', { method: 'POST', body: JSON.stringify({ complejoId, puntuacion, comentario }) })
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

export async function subirFotoPerfil(file: File): Promise<{ ok: boolean; fotoUrl: string }> {
  const fd = new FormData()
  fd.append('archivo', file)
  const res = await fetch('/api/usuarios/me/foto', {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'No se pudo subir la foto')
  return body
}

