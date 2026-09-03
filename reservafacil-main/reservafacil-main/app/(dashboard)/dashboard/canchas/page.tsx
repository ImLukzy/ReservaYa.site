import * as api from '@/lib/api'
import { CanchaCard } from '@/components/features/CanchaCard'
export const dynamic = 'force-dynamic'
export default async function CanchasPage() {
  const canchas = await api.getCanchas(true)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Canchas Disponibles</h1>
        <p className="text-gray-500 mt-1">Selecciona una cancha para hacer tu reserva</p>
      </div>

      {canchas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🏟️</p>
          <p className="font-medium">No hay canchas disponibles por ahora</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canchas.map((cancha) => (
            <CanchaCard key={cancha.id} cancha={cancha} />
          ))}
        </div>
      )}
    </div>
  )
}