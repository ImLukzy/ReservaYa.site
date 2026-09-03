import * as api from '@/lib/api'
import type { DashboardAdmin } from '@/lib/api'
import { StatCard } from '@/components/ui/Card'
import { codigoReserva, formatFecha, formatFechaHoraSolicitud, formatHora } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
export const dynamic = 'force-dynamic'
const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue'> = {
  CONFIRMADA: 'green', PENDIENTE: 'yellow', CANCELADA: 'red', COMPLETADA: 'blue',
}

export default async function AdminPage() {
  const dashboard = (await api.getDashboard()) as DashboardAdmin
  const totalReservas = dashboard.totalReservas
  const pendientes = dashboard.reservasPendientes
  const canchas = dashboard.canchasActivas
  const ingresos = dashboard.ingresos
  const reservasRecientes = dashboard.ultimasReservas

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">Gestiona reservas y canchas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Reservas" value={totalReservas} icon="📅" color="blue" />
        <StatCard label="Pendientes" value={pendientes} icon="⏳" color="yellow" />
        <StatCard label="Canchas Activas" value={canchas} icon="🏟️" color="green" />
        <StatCard label="Ingresos (S/)" value={Number(ingresos)} icon="💰" color="green" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Reservas recientes</h2>
          <a href="/admin/reservas" className="text-indigo-300 hover:text-indigo-200 text-sm hover:underline">Ver todas →</a>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Solicitud</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cancha</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reserva solicitada</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reservasRecientes.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  <p>{r.usuario?.nombre ?? '—'}</p>
                  <p className="text-xs text-gray-400">{r.usuario?.email}</p>
                  <p className="text-xs text-indigo-300 mt-1">Recibida: {formatFechaHoraSolicitud(r.creadoEn)}</p>
                </td>
                <td className="px-6 py-4 text-sm font-bold tracking-wider text-indigo-300">
                  {r.estado === 'CONFIRMADA' ? codigoReserva(r.id) : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.cancha.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatFecha(r.fecha)}<br />
                  <span className="text-xs">{formatHora(r.horaInicio)} - {formatHora(r.horaFin)}</span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold">S/ {Number(r.total)}</td>
                <td className="px-6 py-4"><Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}