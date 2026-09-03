import { cookies } from 'next/headers'
import { config } from './config'

export type Rol = 'USUARIO' | 'ADMIN' | 'SUPERADMIN'
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA'
export type TipoCancha = 'FUTBOL' | 'TENIS' | 'BASQUET' | 'VOLLEYBALL'

export interface Cancha {
  id: string
  nombre: string
  tipo: TipoCancha
  descripcion: string | null
  precioPorHora: string
  capacidad: number
  activa: boolean
  imagen: string | null
  creadoEn: string
}

export interface CanchaInput {
  nombre: string
  tipo: TipoCancha
  descripcion?: string
  precioPorHora: number
  capacidad: number
  activa?: boolean
}

export interface UsuarioReserva {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creadoEn: string
}

export interface Reserva {
  id: string
  usuarioId: string
  canchaId: string
  fecha: string
  horaInicio: number
  horaFin: number
  estado: EstadoReserva
  total: string
  notas: string | null
  creadoEn: string
  cancha: Cancha
  usuario: UsuarioReserva | null
}

export interface UsuarioResumen {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creadoEn: string
  _count: { reservas: number }
}

export interface UsuarioSesion {
  id: string
  email: string
  nombre: string
  rol: Rol
  tv: number
}

export interface DashboardUsuario {
  reservas: number
  reservasConfirmadas: number
  canchasActivas: number
  ultimasReservas: Reserva[]
}

export interface DashboardAdmin {
  totalReservas: number
  reservasPendientes: number
  canchasActivas: number
  ingresos: string
  ultimasReservas: Reserva[]
}

export interface DashboardSuperadmin {
  usuarios: number
  administradores: number
  reservas: number
  canchas: number
  ingresos: string
}

export interface ReservasPorEstado {
  estado: EstadoReserva
  cantidad: number
}

export interface CanchaReporte {
  id: string
  nombre: string
  tipo: TipoCancha
  activa: boolean
  precioPorHora: string
  reservas: number
  ingresos: string
}

export interface TopCancha {
  id: string
  nombre: string
  tipo: TipoCancha
  reservas: number
  ingresos: string
}

export interface ReporteGlobal {
  totalUsuarios: number
  totalReservas: number
  reservasPorEstado: ReservasPorEstado[]
  topCanchas: TopCancha[]
  canchas: CanchaReporte[]
  ingresosTotales: string
  promedio: string
  ultimasReservas: Reserva[]
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function clientRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      credentials: 'include',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(res.status, body?.error ?? `Error ${res.status}`)
    return body as T
}

export function login(email: string, password: string) {
    return clientRequest<{ usuario: UsuarioSesion }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
}

export function register(nombre: string, email: string, password: string) {
    return clientRequest<{ usuario: UsuarioSesion }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password }),
    })
}

export function logout() {
    return clientRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

export function createCancha(input: CanchaInput) {
    return clientRequest<{ cancha: Cancha }>('/api/canchas', {
      method: 'POST',
      body: JSON.stringify(input),
    })
}

export function updateCancha(id: string, input: Partial<CanchaInput>) {
    return clientRequest<{ cancha: Cancha }>(`/api/canchas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
}

export function deleteCancha(id: string) {
    return clientRequest<{ ok: boolean }>(`/api/canchas/${id}`, { method: 'DELETE' })
}

export function createReserva(input: {
    canchaId: string
    fecha: string
    horaInicio: number
    horaFin: number
    notas: string
  }) {
    return clientRequest('/api/reservas', { method: 'POST', body: JSON.stringify(input) })
}

export function updateReserva(id: string, estado: EstadoReserva) {
    return clientRequest(`/api/reservas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    })
}

export function updateUsuario(id: string, input: { activo?: boolean; rol?: Rol }) {
    return clientRequest(`/api/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
}

// Fetch del lado del servidor que reenvía la cookie de sesión al backend.
// Next reenvía /api/* a la API ASP.NET Core vía next.config.ts rewrites.
async function serverFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(config.jwtCookieName)?.value
  const headers = new Headers(init?.headers)
  if (token) headers.set('Cookie', `${config.jwtCookieName}=${token}`)

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5000'
  return fetch(`${backendUrl}${path}`, { ...init, headers, cache: 'no-store' })
}

async function getJson<T>(path: string): Promise<T> {
  const res = await serverFetch(path)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`)
  }
  return (await res.json()) as T
}

// Sesión: valida contra el backend (activo + tokenVersion) vía /api/auth/me.
// Devuelve null si la sesión no es válida.
export async function getSession(): Promise<UsuarioSesion | null> {
  const res = await serverFetch('/api/auth/me')
  if (!res.ok) return null
  const data = await res.json()
  return data.usuario ?? null
}

export async function getCanchas(activas?: boolean): Promise<Cancha[]> {
  const query = activas === undefined ? '' : `?activas=${activas}`
  const data = await getJson<{ canchas: Cancha[] }>(`/api/canchas${query}`)
  return data.canchas
}

export async function getReservas(): Promise<Reserva[]> {
  const data = await getJson<{ reservas: Reserva[] }>('/api/reservas')
  return data.reservas
}

export async function getUsuarios(): Promise<UsuarioResumen[]> {
  const data = await getJson<{ usuarios: UsuarioResumen[] }>('/api/usuarios')
  return data.usuarios
}

export async function getDashboard(): Promise<
  DashboardUsuario | DashboardAdmin | DashboardSuperadmin
> {
  const data = await getJson<{
    dashboard: DashboardUsuario | DashboardAdmin | DashboardSuperadmin
  }>('/api/reportes/dashboard')
  return data.dashboard
}

export async function getReporteGlobal(): Promise<ReporteGlobal> {
  const data = await getJson<{ report: ReporteGlobal }>('/api/reportes/global')
  return data.report
}
