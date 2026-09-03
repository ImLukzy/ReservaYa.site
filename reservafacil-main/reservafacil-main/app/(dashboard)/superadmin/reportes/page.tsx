import * as api from '@/lib/api'
import type { ReporteGlobal } from '@/lib/api'
import { StatCard } from '@/components/ui/Card'
import { formatFecha } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
export const dynamic = 'force-dynamic'
export default async function ReportesPage() {
  const report: ReporteGlobal = await api.getReporteGlobal()

  const {
    totalUsuarios,
    totalReservas,
    reservasPorEstado,
    topCanchas,
    ingresosTotales,
    promedio,
    ultimasReservas,
  } = report

  const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue'> = {
    CONFIRMADA: 'green', PENDIENTE: 'yellow', CANCELADA: 'red', COMPLETADA: 'blue',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reportes del Sistema</h1>
        <p className="text-gray-500 mt-1">Métricas y estadísticas globales</p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Usuarios" value={totalUsuarios} icon="👥" color="blue" />
        <StatCard label="Total Reservas" value={totalReservas} icon="📅" color="green" />
        <StatCard label="Ingresos (S/)" value={Number(ingresosTotales).toFixed(2)} icon="💰" color="yellow" />
        <StatCard label="Promedio/Reserva" value={`S/ ${Number(promedio).toFixed(0)}`} icon="📈" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Reservas por estado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Reservas por Estado</h2>
          <div className="space-y-3">
            {reservasPorEstado.map((r) => (
              <div key={r.estado} className="flex items-center justify-between">
                <Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: totalReservas > 0 ? `${(r.cantidad / totalReservas) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-6 text-right">
                    {r.cantidad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top canchas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Canchas más Reservadas</h2>
          <div className="space-y-3">
            {topCanchas.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                  <p className="text-xs text-gray-500">{c.reservas} reservas · S/ {Number(c.ingresos)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Últimas reservas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Últimas 10 Reservas</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cancha</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ultimasReservas.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{r.usuario?.nombre ?? '—'}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{r.cancha.nombre}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {formatFecha(r.fecha)}
                </td>
                <td className="px-6 py-3 text-sm font-semibold">S/ {Number(r.total)}</td>
                <td className="px-6 py-3">
                  <Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
