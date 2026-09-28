import Link from 'next/link'
import { getSession } from '@/lib/session'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { PerfilForm } from '@/components/features/PerfilForm'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const session = await getSession()
  if (!session) return null

  const reservas = await api.getReservas()
  const confirmadas = reservas.filter((reserva) => reserva.estado === 'CONFIRMADA').length
  const completadas = reservas.filter((reserva) => reserva.estado === 'COMPLETADA').length
  const iniciales = session.nombre
    .split(/\s+/)
    .map((parte) => parte[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 border-b border-cal pb-4">
        <p className="font-display text-xs font-bold text-cesped-hondo">Mi perfil</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-basalto">Tu perfil. Tu juego.</h1>
        <p className="mt-1 text-sm text-pizarra">Consulta tu carné digital, edita tus datos y revisa tu historial deportivo en ReservaYa.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Columna Izquierda: Carné digital e historial */}
        <div className="space-y-6">
          <Card className="overflow-hidden p-0 border-cal bg-tiza">
            {/* Cabecera del carné en superficie sobria */}
            <div className="bg-basalto p-6 text-tiza">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-niebla">Carné de jugador</span>
                <span className="font-display text-xs font-bold tabular-nums text-cesped">
                  #{session.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cal/30 bg-piedra">
                  {session.fotoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={session.fotoUrl}
                      alt="Foto de perfil"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-cesped-suave font-display text-xl font-bold text-cesped-hondo">
                      {iniciales}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold text-tiza">{session.nombre}</h2>
                  <p className="truncate text-xs text-niebla">{session.email}</p>
                  {session.username && (
                    <p className="mt-0.5 text-xs font-semibold text-cesped">@{session.username}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-cal/20 pt-4 text-xs">
                <span className="text-niebla">Rol en plataforma</span>
                <span className="font-semibold text-tiza">Jugador ReservaYa</span>
              </div>
            </div>

            {/* Métricas operativas reales (sin datos RPG) */}
            <div className="grid grid-cols-3 divide-x divide-cal border-t border-cal bg-tiza p-4 text-center">
              <div>
                <p className="text-[11px] font-semibold text-pizarra uppercase">Reservas</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-basalto">{reservas.length}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pizarra uppercase">Confirmadas</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-cesped-hondo">{confirmadas}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pizarra uppercase">Completadas</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-basalto">{completadas}</p>
              </div>
            </div>
          </Card>

          {/* Accesos rápidos operativos */}
          <Card className="border-cal bg-tiza">
            <h3 className="font-display text-lg font-bold text-basalto">Sigue jugando</h3>
            <p className="mt-1 text-sm text-pizarra">Encuentra una cancha disponible o revisa tus reservas en curso.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/canchas"
                className="inline-flex items-center justify-center rounded-md bg-cesped px-4 py-2 text-sm font-semibold text-grafito transition hover:bg-cesped-hover"
              >
                Buscar canchas
              </Link>
              <Link
                href="/dashboard/reservas"
                className="inline-flex items-center justify-center rounded-md border border-borde bg-tiza px-4 py-2 text-sm font-semibold text-basalto transition hover:bg-piedra"
              >
                Ver reservas
              </Link>
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Formulario de edición de perfil */}
        <div>
          <PerfilForm usuario={session} />
        </div>
      </div>
    </div>
  )
}
