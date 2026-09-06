import { getSession } from '@/lib/session'
import * as api from '@/lib/api'
import type { DashboardUsuario } from '@/lib/api'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatFecha, formatHora } from '@/lib/utils'
import Link from 'next/link'
import { DismissibleNotice } from '@/components/features/DismissibleNotice'
export const dynamic = 'force-dynamic'
const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
}

export default async function DashboardPage() {
  const session = await getSession()
  const [dashboard, todasLasReservas] = await Promise.all([
    api.getDashboard() as Promise<DashboardUsuario>,
    api.getReservas(),
  ])
  const reservas = dashboard.ultimasReservas
  const totalReservas = dashboard.reservas
  const confirmadas = dashboard.reservasConfirmadas
  const canchas = dashboard.canchasActivas
  const ultimaConfirmada = reservas.find((r) => r.estado === 'CONFIRMADA')
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Hola, {session!.nombre}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Aquí está el resumen de tus reservas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Reservas" value={totalReservas} icon="📅" color="blue" />
        <StatCard label="Confirmadas" value={confirmadas} icon="✅" color="green" />
        <StatCard label="Canchas disponibles" value={canchas} icon="🏟️" color="yellow" />
      </div>

      {ultimaConfirmada && (
        <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] px-5 py-4 text-[#14532D]">
          <p className="font-semibold">🎉 ¡Reserva asegurada!</p>
          <p className="mt-1 text-sm text-[#15803D]">
            Tu cancha está confirmada. Llega 10 minutos antes y disfruta tu partido.
          </p>
        </div>
      )}
      {ultimaNoDisponible && (
        <DismissibleNotice />
      )}

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/canchas"
          className="bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl p-6 transition flex items-center gap-4 shadow-lg shadow-green-900/20"
        >
          <span className="text-4xl">🏟️</span>
          <div>
            <p className="font-semibold text-lg">Ver Canchas</p>
            <p className="text-[#DCFCE7] text-sm">Explora y reserva canchas disponibles</p>
          </div>
        </Link>
        <Link
          href="/dashboard/reservas"
          className="bg-[#060A08] hover:bg-[#0A1A11] text-white rounded-xl p-6 transition flex items-center gap-4 shadow-lg shadow-slate-950/20"
        >
          <span className="text-4xl">📋</span>
          <div>
            <p className="font-semibold text-lg">Mis Reservas</p>
            <p className="text-slate-200 text-sm">Administra todas tus reservas</p>
          </div>
        </Link>
      </div>

      {/* Últimas reservas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Últimas reservas</h2>
        </div>
        {reservas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">Aún no tienes reservas</p>
              <Link href="/dashboard/canchas" className="text-[#15803D] hover:text-[#16A34A] text-sm hover:underline mt-1 block">
              Reserva tu primera cancha →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reservas.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-xl">
                    🏟️
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{r.cancha.nombre}</p>
                    <p className="text-gray-500 text-xs">
                      {formatFecha(r.fecha)} • {formatHora(r.horaInicio)} - {formatHora(r.horaFin)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">S/ {Number(r.total)}</span>
                  <Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}