import { cookies } from 'next/headers'
import { config } from './config'

import type {
  BusquedaCanchas,
  Cancha,
  CanchaDisponible,
  CanchaInput,
  ClienteResumen,
  Cotizacion,
  EstadoReserva,
  OpcionesBusqueda,
  Reserva,
  Rol,
  Sancion,
  Suscripcion,
  UsuarioResumen,
  UsuarioSesion,
  DashboardUsuario,
  DashboardAdmin,
  DashboardSuperadmin,
  ReporteGlobal,
} from './api-types'
import { ApiError } from './api-types'
export type {
  Rol,
  EstadoReserva,
  TipoCancha,
  TipoPlan,
  EstadoSuscripcion,
  NivelSancion,
  CanchaComplejo,
  CanchaDueno,
  Cancha,
  CanchaInput,
  CanchaDisponible,
  OpcionesBusqueda,
  Cotizacion,
  Suscripcion,
  Sancion,
  ClienteResumen,
  BusquedaCanchas,
  UsuarioReserva,
  Reserva,
  UsuarioResumen,
  UsuarioSesion,
  DashboardUsuario,
  DashboardAdmin,
  DashboardSuperadmin,
  ReservasPorEstado,
  CanchaReporte,
  TopCancha,
  ReporteGlobal,
} from './api-types'
export { ApiError } from './api-types'

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

export async function getCanchas(activas?: boolean, propias?: boolean): Promise<Cancha[]> {
  const params = new URLSearchParams()
  if (activas !== undefined) params.set('activas', String(activas))
  if (propias !== undefined) params.set('propias', String(propias))
  const qs = params.toString()
  const data = await getJson<{ canchas: Cancha[] }>(`/api/canchas${qs ? `?${qs}` : ''}`)
  return data.canchas
}

export interface ResultadoBusqueda {
  canchas: CanchaDisponible[]
  total: number
  limiteAplicado: boolean
}

export async function getDisponibles(f: BusquedaCanchas): Promise<ResultadoBusqueda> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  const data = await getJson<{ canchas: CanchaDisponible[]; total: number; limiteAplicado: boolean }>(
    `/api/canchas/disponibles${qs ? `?${qs}` : ''}`
  )
  return { canchas: data.canchas ?? [], total: data.total ?? 0, limiteAplicado: data.limiteAplicado ?? false }
}

export async function getOpcionesBusqueda(): Promise<OpcionesBusqueda> {
  const data = await getJson<OpcionesBusqueda>('/api/canchas/opciones')
  return {
    distritos: data.distritos ?? [],
    ciudades: data.ciudades ?? [],
    duenos: data.duenos ?? [],
    complejos: data.complejos ?? [],
    sugerencias: data.sugerencias ?? [],
  }
}

export async function cotizarCancha(
  id: string, fecha: string, horaInicio: number, horaFin: number
): Promise<Cotizacion> {
  const data = await getJson<Cotizacion>(
    `/api/canchas/${id}/cotizar?fecha=${fecha}&horaInicio=${horaInicio}&horaFin=${horaFin}`
  )
  return data
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

export async function getSuscripciones(complejoId?: string, estado?: string): Promise<Suscripcion[]> {
  const params = new URLSearchParams()
  if (complejoId) params.set('complejoId', complejoId)
  if (estado) params.set('estado', estado)
  const qs = params.toString()
  const data = await getJson<{ suscripciones: Suscripcion[] }>(`/api/suscripciones${qs ? `?${qs}` : ''}`)
  return data.suscripciones ?? []
}

export async function getClientes(): Promise<ClienteResumen[]> {
  const data = await getJson<{ clientes: ClienteResumen[] }>('/api/usuarios/clientes')
  return data.clientes ?? []
}

export async function getHistorial(id: string): Promise<{
  usuario: { id: string; nombre: string; email: string; rol: Rol; activo: boolean };
  stats: { reservas: number; confirmadas: number; canceladas: number; sancionesActivas: number };
  reservas: Reserva[];
  sanciones: Sancion[];
}> {
  const data = await getJson<{
    usuario: { id: string; nombre: string; email: string; rol: Rol; activo: boolean };
    stats: { reservas: number; confirmadas: number; canceladas: number; sancionesActivas: number };
    reservas: Reserva[];
    sanciones: Sancion[];
  }>(`/api/usuarios/${id}/historial`)
  return data
}

export async function getSanciones(complejoId?: string, soloActivas?: boolean): Promise<Sancion[]> {
  const params = new URLSearchParams()
  if (complejoId) params.set('complejoId', complejoId)
  if (soloActivas) params.set('soloActivas', 'true')
  const qs = params.toString()
  const data = await getJson<{ sanciones: Sancion[] }>(`/api/sanciones${qs ? `?${qs}` : ''}`)
  return data.sanciones ?? []
}
