import Link from 'next/link'
import * as api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { formatFecha, formatHora } from '@/lib/utils'
import { CancelarReservaBtn } from '@/components/features/CancelarReservaBtn'
import { CalificarBtn } from '@/components/features/CalificarBtn'
import { EmptyState } from '@/components/ui/EmptyState'
import { CalendarX } from 'lucide-react'
import { estadoLabel } from '@/components/features/etiquetasJugador'
import { proximaDe } from '@/components/features/proximaReserva'

export const dynamic = 'force-dynamic'

const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
}

export default async function MisReservasPage() {
  const reservas = await api.getReservas()
  const totalPagado = reservas
    .filter((r) => r.estado === 'CONFIRMADA' || r.estado === 'COMPLETADA')
    .reduce((acc, r) => acc + Number(r.total), 0)
  const proxima = proximaDe(reservas)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 border-b border-cal pb-4">
        <p className="font-display text-xs font-bold text-cesped-hondo">Mis reservas</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-basalto">Historial de reservas</h1>
        <p className="mt-1 text-sm text-pizarra">Historial completo de tus partidos, estado de confirmación y opciones de gestión.</p>
      </div>

      {reservas.length > 0 && (
        <div className="mb-6 grid grid-cols-2 rounded-xl border border-cal bg-tiza sm:grid-cols-3 sm:divide-x sm:divide-cal">
          <div className="p-4">
            <p className="text-xs text-pizarra">Reservas totales</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-basalto">{reservas.length}</p>
          </div>
          <div className="border-l border-cal p-4 sm:border-l-0">
            <p className="text-xs text-pizarra">Total pagado</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-basalto">S/ {totalPagado.toFixed(2)}</p>
          </div>
          <div className="col-span-2 border-t border-cal p-4 sm:col-span-1 sm:border-t-0">
            <p className="text-xs text-pizarra">Próxima reserva</p>
            <p className="mt-1 font-display text-lg font-bold tabular-nums text-basalto">
              {proxima ? `${formatFecha(proxima.fecha)} · ${formatHora(proxima.horaInicio)}` : 'Sin próxima'}
            </p>
          </div>
        </div>
      )}

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
        <>
          {/* <640px: filas de 2 líneas. Desde sm: tabla completa. */}
          <div className="divide-y divide-cal rounded-xl border border-cal bg-tiza sm:hidden">
            {reservas.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-basalto">{r.cancha.nombre}</p>
                    {r.cancha.complejo?.nombre && (
                      <p className="truncate text-xs text-pizarra">{r.cancha.complejo.nombre}</p>
                    )}
                  </div>
                  <Badge variant={estadoBadge[r.estado] ?? 'gray'}>{estadoLabel[r.estado] ?? r.estado}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="font-display text-xs tabular-nums text-pizarra">
                    {formatFecha(r.fecha)} · {formatHora(r.horaInicio)}–{formatHora(r.horaFin)}
                  </p>
                  <p className="font-display text-sm font-bold tabular-nums text-basalto">S/ {Number(r.total).toFixed(2)}</p>
                </div>
                {((r.estado === 'PENDIENTE') || (r.estado === 'COMPLETADA' && r.cancha.complejoId)) && (
                  <div className="mt-2 flex justify-end">
                    {r.estado === 'PENDIENTE' && <CancelarReservaBtn id={r.id} />}
                    {r.estado === 'COMPLETADA' && r.cancha.complejoId && (
                      <CalificarBtn
                        complejoId={r.cancha.complejoId}
                        complejoNombre={r.cancha.complejo?.nombre ?? r.cancha.nombre}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-cal bg-tiza sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cal bg-piedra text-left font-display text-xs font-semibold text-pizarra">
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
                      <Badge variant={estadoBadge[r.estado] ?? 'gray'}>{estadoLabel[r.estado] ?? r.estado}</Badge>
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
        </>
      )}
    </div>
  )
}