export type Rol = 'USUARIO' | 'ADMIN' | 'SUPERADMIN' | 'TECNICO'
export type NivelSancion = 'ADVERTENCIA' | 'BLOQUEO'
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA'
export type TipoCancha = 'FUTBOL' | 'FUTBOL5' | 'FUTBOL7' | 'PADEL' | 'TENIS' | 'BASQUET' | 'VOLLEYBALL' | 'LOZA'
export type TipoPlan = 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'
export type EstadoSuscripcion = 'PENDIENTE' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA' | 'RECHAZADA'

export interface CanchaComplejo {
  id: string
  nombre: string
  distrito: string
  ciudad: string
}

export interface CanchaDueno {
  id: string
  nombre: string
}

export interface Cancha {
  id: string
  nombre: string
  tipo: TipoCancha
  descripcion: string | null
  precioPorHora: string
  capacidad: number
  techada: boolean
  superficie: string | null
  activa: boolean
  imagen: string | null
  complejoId: string | null
  creadoEn: string
  complejo: CanchaComplejo | null
  dueno: CanchaDueno | null
}

export interface CanchaInput {
  nombre: string
  tipo: TipoCancha
  descripcion?: string
  precioPorHora: number
  capacidad: number
  activa?: boolean
  complejoId?: string | null
  techada?: boolean
  superficie?: string | null
  imagen?: string | null
}

export interface CanchaDisponible {
  cancha: Cancha
  disponible: boolean
  motivo: string | null
  totalEstimado: string | null
  reglaPrecio: string | null
}

export interface OpcionesBusqueda {
  distritos: string[]
  ciudades: string[]
  duenos: { id: string; nombre: string }[]
  complejos: { id: string; nombre: string; distrito: string; ciudad: string }[]
  sugerencias: string[]
}

export interface Cotizacion {
  total: string
  moneda: string
  regla: string | null
}

export interface Suscripcion {
  id: string
  complejoId: string
  complejoNombre: string
  plan: TipoPlan
  estado: EstadoSuscripcion
  fechaInicio: string
  fechaFin: string
  diasRestantes: number
  vigente: boolean
  creadoEn: string
}

export interface Sancion {
  id: string
  complejoId: string
  complejo: string
  usuarioId: string
  usuario: { id: string; nombre: string; email: string } | null
  nivel: NivelSancion
  motivo: string
  activa: boolean
  creadoEn: string
}

export interface ClienteResumen {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creadoEn: string
  reservas: number
  confirmadas: number
  ultimaReserva: string | null
  sancionesActivas: number
}

export interface BusquedaCanchas {
  q?: string
  distrito?: string
  ciudad?: string
  duenoId?: string
  complejoId?: string
  tipo?: string
  fecha?: string
  horaInicio?: number
  horaFin?: number
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
  // Código QR real (RF-XXXX) que envía el backend.
  codigo: string
  // El backend guarda ComplejoId en Modelos pero el DTO aún no lo envía.
  // Opcional para filtrar cuando llegue, sin romper tipos.
  complejoId?: string | null
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
  fechaNacimiento?: string | null
  username?: string | null
  telefono?: string | null
  fotoUrl?: string | null
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