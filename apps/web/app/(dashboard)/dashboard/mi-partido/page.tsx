import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Countdown } from '@/components/features/Countdown'
import { formatFecha, formatHora, codigoMostrado, fechaFinReservaEnMs } from '@/lib/utils'
import { Clock, MapPin, Mail, FileCheck, ShieldCheck } from 'lucide-react'
import { estadoLabel } from '@/components/features/etiquetasJugador'
import { proximaDe } from '@/components/features/proximaReserva'

export const dynamic = 'force-dynamic'

const estadoBadge: Record<string, 'green' | 'yellow'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
}

export default async function MiPartidoPage() {
  const reservas = await api.getReservas()
  const reserva = proximaDe(reservas)

  if (!reserva) redirect('/dashboard')

  const fechaFin = new Date(fechaFinReservaEnMs(reserva.fecha, reserva.horaFin)).toISOString()

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="font-display text-xs font-bold text-cesped-hondo">
          Tu próxima reserva
        </p>
        <h1 className="font-display text-3xl font-extrabold text-basalto tracking-tight">
          Próxima reserva
        </h1>
        <p className="mt-1 text-sm text-pizarra">
          Detalles operativos y código de acceso para presentar al llegar al complejo deportivo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="card-tactil p-6">
          <div className="border-b border-cal pb-4">
            <Badge variant={estadoBadge[reserva.estado] ?? 'gray'}>
              Reserva {(estadoLabel[reserva.estado] ?? reserva.estado).toLowerCase()}
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-black text-basalto tracking-tight">
              {reserva.cancha.nombre}
            </h2>
            {reserva.cancha.complejo && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-pizarra">
                <MapPin className="h-3.5 w-3.5 text-pizarra" />
                {reserva.cancha.complejo.nombre} &bull; {reserva.cancha.complejo.distrito}
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-cal">
            <div className="pt-2 sm:pt-0">
              <p className="text-xs font-semibold uppercase text-pizarra">Fecha</p>
              <p className="mt-1 font-display font-bold text-basalto tabular-nums text-lg">
                {formatFecha(reserva.fecha)}
              </p>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-4">
              <p className="text-xs font-semibold uppercase text-pizarra">Horario</p>
              <p className="mt-1 font-display font-bold text-basalto tabular-nums text-lg">
                {formatHora(reserva.horaInicio)} - {formatHora(reserva.horaFin)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-cal bg-piedra p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cesped-hondo" />
              <p className="text-xs font-bold text-basalto">
                Tiempo restante de tu reserva
              </p>
            </div>
            <div className="mt-2 font-display text-2xl font-black text-cesped-hondo tabular-nums">
              <Countdown target={fechaFin} />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card-dashed p-6 text-center">
            <p className="text-xs font-bold text-pizarra">
              Código de reserva
            </p>
            <div className="my-4 rounded-xl border border-cal bg-cesped-suave/40 py-4 px-2">
              <p className="font-display text-3xl font-black tracking-widest text-cesped-hondo tabular-nums">
                {codigoMostrado(reserva)}
              </p>
            </div>
            <p className="text-xs text-pizarra flex items-center justify-center gap-1.5">
              Muéstralo al llegar al complejo
            </p>
          </div>

          <div className="card-tactil p-4 space-y-2">
            <a
              href={`mailto:?subject=Consulta reserva ${codigoMostrado(reserva)}&body=Consulta sobre mi reserva en ${reserva.cancha.nombre}`}
              className="btn-tactil w-full bg-piedra py-2.5 text-center text-xs font-bold text-basalto hover:bg-tiza"
            >
              <Mail className="h-4 w-4 text-pizarra" />
              Contactar al administrador
            </a>
            <Link
              href="/dashboard/reservas"
              className="btn-tactil w-full bg-cesped py-2.5 text-center text-xs font-bold text-tiza hover:bg-cesped-hover"
            >
              Ver todas mis reservas
            </Link>
          </div>
        </aside>
      </div>

      <section className="card-tactil p-6">
        <h2 className="font-display text-lg font-bold text-basalto tracking-tight">
          Antes de llegar
        </h2>
        <div className="mt-4 grid gap-4 text-sm text-pizarra sm:grid-cols-3">
          <div className="rounded-xl border border-cal bg-piedra/60 p-3.5">
            <p className="font-bold text-basalto flex items-center gap-2">
              <Clock className="h-4 w-4 text-cesped-hondo" />
              Puntualidad
            </p>
            <p className="mt-1 text-xs text-pizarra">
              Llega 10 minutos antes para registrarte.
            </p>
          </div>
          <div className="rounded-xl border border-cal bg-piedra/60 p-3.5">
            <p className="font-bold text-basalto flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-cesped-hondo" />
              Acceso
            </p>
            <p className="mt-1 text-xs text-pizarra">
              Ten tu código a la mano en recepción o portería.
            </p>
          </div>
          <div className="rounded-xl border border-cal bg-piedra/60 p-3.5">
            <p className="font-bold text-basalto flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cesped-hondo" />
              Soporte
            </p>
            <p className="mt-1 text-xs text-pizarra">
              Si tienes dudas o imprevistos, contacta al administrador.
            </p>
          </div>
        </div>

        <details className="mt-5 rounded-xl border border-cal bg-piedra/40 p-4 transition-all">
          <summary className="cursor-pointer font-display text-sm font-bold text-basalto select-none">
            Preguntas frecuentes
          </summary>
          <div className="mt-3 space-y-2 border-t border-cal pt-3 text-xs text-pizarra">
            <p><strong className="text-basalto">¿Cómo cambio el horario?</strong> Consúltalo con el administrador antes del partido. Ten a mano la fecha y las horas de tu reserva para indicar qué quieres cambiar.</p>
            <p><strong className="text-basalto">¿Y si llego tarde?</strong> La reserva termina a la hora prevista. Revisa la hora de fin en los detalles para organizar el tiempo de juego que te queda.</p>
            <p><strong className="text-basalto">¿Cómo cancelo?</strong> Ve a <Link href="/dashboard/reservas" className="underline font-bold text-cesped-hondo">Mis Reservas</Link> mientras siga pendiente. Comprueba el estado de la reserva antes de intentar cancelarla.</p>
            <p><strong className="text-basalto">¿Dónde veo mis otras reservas?</strong> Abre <Link href="/dashboard/reservas" className="underline font-bold text-cesped-hondo">Mis Reservas</Link> para consultar tus solicitudes. Mi partido muestra tu próxima reserva; las demás las revisas en ese listado.</p>
          </div>
        </details>
      </section>
    </div>
  )
}
