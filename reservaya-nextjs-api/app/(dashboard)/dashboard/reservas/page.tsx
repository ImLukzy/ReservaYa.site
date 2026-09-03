import * as api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { formatFecha, formatHora } from '@/lib/utils'
import { CancelarReservaBtn } from '@/components/features/CancelarReservaBtn'
export const dynamic = 'force-dynamic'
const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  CONFIRMADA: 'green', PENDIENTE: 'yellow', CANCELADA: 'red', COMPLETADA: 'blue',
}

export default async function MisReservasPage() {
  const reservas = await api.getReservas()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Reservas</h1>
        <p className="text-gray-500 mt-1">Historial completo de tus reservas</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {reservas.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="font-medium">No tienes reservas aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cancha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Horario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservas.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.cancha.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatFecha(r.fecha)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatHora(r.horaInicio)} - {formatHora(r.horaFin)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">S/ {Number(r.total)}</td>
                  <td className="px-6 py-4"><Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge></td>
                  <td className="px-6 py-4">
                    {r.estado === 'PENDIENTE' && <CancelarReservaBtn id={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}