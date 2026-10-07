import { getSession } from '@/lib/session'
import * as api from '@/lib/api'
import type { DashboardUsuario } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatFecha, formatHora, codigoMostrado } from '@/lib/utils'
import Link from 'next/link'
import { CalendarX2 } from 'lucide-react'
import { DismissibleNotice } from '@/components/features/DismissibleNotice'
import { estadoLabel } from '@/components/features/etiquetasJugador'
import { proximaDe } from '@/components/features/proximaReserva'
import { crearCarga } from '@/lib/carga'
import { AvisoCarga } from '@/components/ui/AvisoCarga'
import { EntradaCentro } from '@/components/solicitudes/EntradaCentro'
import { miSolicitudSegura } from '@/lib/solicitudes-server'
import { TarjetaInvitaciones } from '@/components/invitaciones/TarjetaInvitaciones'
export const dynamic = 'force-dynamic'
const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
}

const dashboardVacio: DashboardUsuario = {
  reservas: 0,
  reservasConfirmadas: 0,
  canchasActivas: 0,
  ultimasReservas: [],
}

function fechaLarga(fechaIso: string): string {
  const d = new Date(`${fechaIso.slice(0, 10)}T12:00:00`)
  const s = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function DashboardPage() {
  const carga = crearCarga()
  const [session, dashboard, todasLasReservas, solicitud] = await Promise.all([
    getSession(),
    carga.de(api.getDashboard() as Promise<DashboardUsuario>, dashboardVacio, 'el resumen del panel'),
    carga.de(api.getReservas(), [], 'las reservas'),
    carga.de(miSolicitudSegura(), null, 'tu solicitud de centro'),
  ])
  const reservas = dashboard.ultimasReservas
  const totalReservas = dashboard.reservas
  const confirmadas = dashboard.reservasConfirmadas
  const pendientes = todasLasReservas.filter((r) => r.estado === 'PENDIENTE').length
  const ultimaNoDisponible = todasLasReservas.find((cancelada) =>
    cancelada.estado === 'CANCELADA' &&
    todasLasReservas.some((confirmada) =>
      confirmada.estado === 'CONFIRMADA' &&
      confirmada.canchaId === cancelada.canchaId &&
      confirmada.fecha.slice(0, 10) === cancelada.fecha.slice(0, 10) &&
      confirmada.horaInicio < cancelada.horaFin &&
      confirmada.horaFin > cancelada.horaInicio
    )
  )

  const proximaReserva = proximaDe(todasLasReservas)

  return (
    <div>
      <AvisoCarga errores={carga.errores} />
      <TarjetaInvitaciones />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-cal pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-basalto">Hola, {session!.nombre}</h1>
          <p className="mt-1 text-sm text-pizarra">Este es el resumen de tus reservas.</p>
        </div>
        <Link
          href="/dashboard/canchas"
          className="btn-tactil shrink-0 bg-cesped px-5 py-2.5 font-display text-sm font-bold text-tiza hover:bg-cesped-hover"
        >
          Reservar cancha
        </Link>
      </div>

      {ultimaNoDisponible && <DismissibleNotice />}

      <div className="mb-6">
        <EntradaCentro inicial={solicitud} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="space-y-6">
          {/* Próxima reserva */}
          {proximaReserva ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xs font-bold text-cesped-hondo">Tu próxima reserva</p>
                  <p className="mt-2 font-display text-5xl font-bold tabular-nums text-basalto">
                    {formatHora(proximaReserva.horaInicio)}
                  </p>
                  <p className="mt-1 text-sm text-pizarra">{fechaLarga(proximaReserva.fecha)}</p>
                </div>
                <Badge variant={estadoBadge[proximaReserva.estado]}>{estadoLabel[proximaReserva.estado] ?? proximaReserva.estado}</Badge>
              </div>
              <div className="mt-4 border-t border-cal pt-4">
                <p className="font-display text-lg font-semibold text-basalto">{proximaReserva.cancha.nombre}</p>
                {proximaReserva.cancha.complejo && (
                  <p className="mt-0.5 text-sm text-pizarra">
                    {proximaReserva.cancha.complejo.nombre}
                    {proximaReserva.cancha.complejo.distrito ? ` · ${proximaReserva.cancha.complejo.distrito}` : ''}
                  </p>
                )}
                <p className="mt-2 font-display text-sm font-semibold tracking-wide text-cesped-hondo">
                  {codigoMostrado(proximaReserva)}
                </p>
              </div>
              <Link
                href="/dashboard/mi-partido"
                className="btn-tactil mt-5 bg-tiza px-5 py-2 font-display text-sm font-bold text-basalto hover:bg-piedra"
              >
                Ver detalle
              </Link>
            </Card>
          ) : (
            <EmptyState
              icon={CalendarX2}
              title="No tienes una próxima reserva"
              description="Busca una cancha disponible y asegura tu horario de juego."
              action={
                <Link href="/dashboard/canchas" className="btn-tactil mt-3 bg-cesped px-5 py-2 text-sm font-bold text-tiza hover:bg-cesped-hover">
                  Buscar cancha
                </Link>
              }
            />
          )}

          {/* Últimas reservas */}
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-cal p-6">
              <h2 className="font-display font-semibold text-basalto">Últimas reservas</h2>
              <Link href="/dashboard/reservas" className="text-xs font-bold text-cesped-hondo hover:underline">
                Ver todas
              </Link>
            </div>
            {reservas.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="Aún no tienes reservas"
                description="Explora la vitrina de canchas y reserva tu primer partido."
              />
            ) : (
              <div className="divide-y divide-cal">
                {reservas.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 shrink-0">
                        <p className="font-display text-sm font-semibold tabular-nums text-basalto">{formatFecha(r.fecha)}</p>
                        <p className="font-display text-xs tabular-nums text-pizarra">
                          {formatHora(r.horaInicio)}-{formatHora(r.horaFin)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-basalto">{r.cancha.nombre}</p>
                        {r.cancha.complejo && <p className="truncate text-xs text-pizarra">{r.cancha.complejo.nombre}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-semibold tabular-nums text-basalto">S/ {Number(r.total)}</span>
                      <Badge variant={estadoBadge[r.estado]}>{estadoLabel[r.estado] ?? r.estado}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Métricas del jugador */}
        <div className="card-tactil flex divide-x-2 divide-cal overflow-hidden p-0 lg:flex-col lg:divide-x-0 lg:divide-y-2">
          <div className="flex-1 p-5 lg:flex-none">
            <p className="text-xs font-bold uppercase tracking-wider text-pizarra">Total reservas</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums tracking-tight text-basalto">{totalReservas}</p>
          </div>
          <div className="flex-1 p-5 lg:flex-none">
            <p className="text-xs font-bold uppercase tracking-wider text-pizarra">Confirmadas</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums tracking-tight text-cesped-hondo">{confirmadas}</p>
          </div>
          <div className="flex-1 p-5 lg:flex-none">
            <p className="text-xs font-bold uppercase tracking-wider text-pizarra">Pendientes</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums tracking-tight text-sol-hondo">{pendientes}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
