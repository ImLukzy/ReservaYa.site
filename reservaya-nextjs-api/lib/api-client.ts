import type { Cancha, CanchaInput, EstadoReserva, Rol, UsuarioSesion } from './api-types'
import { ApiError } from './api-types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, body?.error ?? `Error ${response.status}`)
  return body as T
}

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
