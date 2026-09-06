import { redirect } from 'next/navigation'
import * as api from '@/lib/api'
import { Countdown } from '@/components/features/Countdown'
import { formatFecha, formatHora } from '@/lib/utils'
import { codigoMostrado, fechaFinReservaEnMs } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function MiPartidoPage() {
  const reservas = await api.getReservas()
  const reserva = reservas.find((item) => item.estado === 'CONFIRMADA')

  if (!reserva) redirect('/dashboard')

  const fechaFin = new Date(fechaFinReservaEnMs(reserva.fecha, reserva.horaFin)).toISOString()

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#15803D]">Tu reserva confirmada</p>
        <h1 className="text-3xl font-bold text-gray-900">Mi partido</h1>
        <p className="mt-1 text-gray-500">Todo listo para que disfrutes tu cancha.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-3xl border border-[#22C55E]/30 bg-gradient-to-br from-[#0A3D22] to-[#060A08] p-6 text-white shadow-xl shadow-black/25">
          <p className="text-sm text-[#DCFCE7]">Reserva asegurada</p>
          <h2 className="mt-2 text-2xl font-bold">{reserva.cancha.nombre}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs uppercase text-white/60">Fecha</p><p className="mt-1 font-semibold">{formatFecha(reserva.fecha)}</p></div>
            <div><p className="text-xs uppercase text-white/60">Horario</p><p className="mt-1 font-semibold">{formatHora(reserva.horaInicio)} - {formatHora(reserva.horaFin)}</p></div>
          </div>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-sm text-[#DCFCE7]">Tiempo restante de tu reserva</p>
            <p className="mt-1 text-2xl font-bold"><Countdown target={fechaFin} /></p>
          </div>
        </section>

        <aside className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Código de reserva</p>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-[#22C55E]/50 bg-[#DCFCE7] p-5 text-center">
            <p className="text-3xl font-black tracking-[0.2em] text-[#15803D]">{codigoMostrado(reserva)}</p>
            <p className="mt-2 text-xs text-[#15803D]">Muéstralo al llegar</p>
          </div>
          <a
            href={`mailto:?subject=Consulta reserva ${codigoMostrado(reserva)}&body=Consulta sobre mi reserva en ${reserva.cancha.nombre}`}
            className="mt-5 block rounded-xl bg-[#060A08] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#0A1A11]"
          >
            Contactar al administrador
          </a>
        </aside>
      </div>

      <section className="mt-6 rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Antes de llegar</h2>
        <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
          <p>⏱️ Llega 10 minutos antes.</p>
          <p>📱 Ten tu código a la mano.</p>
          <p>💬 Si tienes dudas, contacta al administrador.</p>
        </div>
        <details className="mt-5 rounded-xl bg-gray-50 p-4">
          <summary className="cursor-pointer font-semibold text-gray-700">Preguntas frecuentes</summary>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p><strong>¿Puedo cambiar el horario?</strong> Solicítalo al administrador antes del partido.</p>
            <p><strong>¿Qué pasa si llego tarde?</strong> El horario termina a la hora reservada.</p>
            <p><strong>¿Cómo cancelo?</strong> Ve a Mis Reservas mientras siga pendiente.</p>
          </div>
        </details>
      </section>
    </div>
  )
}
