import 'server-only'
import { getJson, serverFetch } from './server-fetch'
import { solicitudDeRespuesta } from './solicitudes'

import type {
  BusquedaCanchas,
  Cancha,
  CanchaDisponible,
  ClienteResumen,
  Cotizacion,
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
  MisPartidos,
  Solicitud,
} from './api-types'
export type {
  Rol,
  EstadoReserva,
  TipoCancha,
  NivelSancion,
  Cancha,
  CanchaInput,
  CanchaDisponible,
  Suscripcion,
  ClienteResumen,
  UsuarioReserva,
  Reserva,
  UsuarioSesion,
  DashboardUsuario,
  DashboardAdmin,
  ReporteGlobal,
} from './api-types'
export { ApiError } from './api-types'

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
  const data = await getJson<OpcionesBusqueda>('/api/canchas/opciones', {
    next: { revalidate: 60 },
  })
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

export async function getMisPartidos(): Promise<MisPartidos> {
  const data = await getJson<MisPartidos>('/api/partidos/mios')
  return { organizo: data.organizo ?? [], meAnote: data.meAnote ?? [] }
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

// Spec 55 — solicitud del jugador (null = nunca envió o fue rechazada; el motivo va por email).
export async function getMiSolicitud(): Promise<Solicitud | null> {
  return solicitudDeRespuesta(await getJson<unknown>('/api/solicitudes/mias'))
}

// Spec 55 — cola del técnico: solo pendientes de jugadores (§8.1).
export async function getSolicitudesPendientes(): Promise<Solicitud[]> {
  const data = await getJson<{ solicitudes?: Solicitud[] }>('/api/solicitudes')
  return data.solicitudes ?? []
}
