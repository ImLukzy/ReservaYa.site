import { fechaFinReservaEnMs } from '@/lib/utils'
import type { Reserva } from '@/lib/api'

// Una sola regla de "próxima reserva" para todo el lado jugador (dashboard, reservas, mi-partido):
// CONFIRMADA o PENDIENTE, que aún no haya terminado, la más cercana primero.
// Date.now() vive aquí, en una función de módulo (no un componente/hook), para no
// disparar la regla react-hooks/purity si se llama desde un Server Component.
export function proximaDe(reservas: Reserva[]): Reserva | undefined {
  const ahora = Date.now()
  return reservas
    .filter((r) => (r.estado === 'CONFIRMADA' || r.estado === 'PENDIENTE') && fechaFinReservaEnMs(r.fecha, r.horaFin) > ahora)
    .sort((a, b) => fechaFinReservaEnMs(a.fecha, a.horaInicio) - fechaFinReservaEnMs(b.fecha, b.horaInicio))[0]
}
