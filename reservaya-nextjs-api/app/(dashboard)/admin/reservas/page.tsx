import * as api from '@/lib/api'
import { AdminReservasTable } from '@/components/features/AdminReservasTable'
export const dynamic = 'force-dynamic'

export default async function AdminReservasPage() {
  const reservas = await api.getReservas()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Reservas</h1>
        <p className="text-gray-500 mt-1">Consulta y gestiona las reservas ordenadas por fecha y hora</p>
      </div>
      <AdminReservasTable reservas={reservas} />
    </div>
  )
}