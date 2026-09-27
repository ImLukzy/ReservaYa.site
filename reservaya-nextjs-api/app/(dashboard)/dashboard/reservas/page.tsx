import Link from 'next/link'
import * as api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { formatFecha, formatHora } from '@/lib/utils'
import { CancelarReservaBtn } from '@/components/features/CancelarReservaBtn'
import { CalificarBtn } from '@/components/features/CalificarBtn'
import { EmptyState } from '@/components/ui/EmptyState'
import { CalendarX } from 'lucide-react'

export const dynamic = 'force-dynamic'

const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
}

export default async function MisReservasPage() {
  const reservas = await api.getReservas()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 border-b border-cal pb-4">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-cesped-hondo">Mis Reservas</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-basalto">Historial de reservas</h1>
        <p className="mt-1 text-sm text-pizarra">Historial completo de tus partidos, estado de confirmación y opciones de gestión.</p>
      </div>

      {reservas.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No tienes reservas registradas"
          description="Busca una cancha disponible en los complejos de Arequipa y asegura tu horario de juego."
          action={
            <Link
              href="/dashboard/canchas"
              className="inline-flex items-center justify-center rounded-md bg-cesped px-4 py-2 font-display text-sm font-semibold text-grafito transition hover:bg-cesped-hover"
            >
              Buscar canchas
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cal bg-tiza">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-cal bg-piedra text-left font-display text-xs font-semibold uppercase tracking-wider text-pizarra">
                <th className="px-6 py-3.5">Cancha</th>
                <th className="px-6 py-3.5">Fecha</th>
                <th className="px-6 py-3.5">Horario</th>
                <th className="px-6 py-3.5">Total</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal">
              {reservas.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-piedra/40">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-basalto">{r.cancha.nombre}</p>
                    {r.cancha.complejo?.nombre && (
                      <p className="text-xs text-pizarra">{r.cancha.complejo.nombre}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-display tabular-nums text-sm text-pizarra">
                    {formatFecha(r.fecha)}
                  </td>
                  <td className="px-6 py-4 font-display tabular-nums text-sm text-pizarra">
                    {formatHora(r.horaInicio)} – {formatHora(r.horaFin)}
                  </td>
                  <td className="px-6 py-4 font-display tabular-nums text-sm font-bold text-basalto">
                    S/ {Number(r.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={estadoBadge[r.estado] ?? 'gray'}>{r.estado}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.estado === 'PENDIENTE' && <CancelarReservaBtn id={r.id} />}
                    {r.estado === 'COMPLETADA' && r.cancha.complejoId && (
                      <CalificarBtn
                        complejoId={r.cancha.complejoId}
                        complejoNombre={r.cancha.complejo?.nombre ?? r.cancha.nombre}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}