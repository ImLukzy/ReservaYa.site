import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import * as api from '@/lib/api'
import type { Rol } from '@/lib/api-types'
import { perfilPorRol } from '@/lib/permissions'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { PerfilForm } from '@/components/features/PerfilForm'
import { crearCarga } from '@/lib/carga'
import { AvisoCarga } from '@/components/ui/AvisoCarga'
import { EntradaCentro } from '@/components/solicitudes/EntradaCentro'
import { miSolicitudSegura } from '@/lib/solicitudes-server'

const ROL_PLATAFORMA: Record<Rol, string> = {
  USUARIO: 'Jugador ReservaYa',
  ADMIN: 'Trabajador de centro',
  SUPERADMIN: 'Dueño de centro',
  TECNICO: 'Supervisor de plataforma',
}

// "Mi perfil" de los 4 roles: /dashboard/perfil, /admin/perfil y /tecnico/perfil montan esta página.
// Métricas de reservas y "Publica tu centro" son solo del jugador; para el resto /api/reservas no
// devuelve sus reservas propias y no tienen solicitud de centro.
export async function PaginaPerfil({ ruta }: { ruta: string }) {
  const session = await getSession()
  if (!session) return null
  if (perfilPorRol(session.rol) !== ruta) redirect(perfilPorRol(session.rol))
  const esJugador = session.rol === 'USUARIO'

  const carga = crearCarga()
  const [reservas, solicitud] = esJugador
    ? await Promise.all([
        carga.de(api.getReservas(), [], 'tus reservas'),
        carga.de(miSolicitudSegura(), null, 'tu solicitud de centro'),
      ])
    : [[], null]

  const confirmadas = reservas.filter((reserva) => reserva.estado === 'CONFIRMADA').length
  const completadas = reservas.filter((reserva) => reserva.estado === 'COMPLETADA').length

  return (
    <div className="mx-auto max-w-5xl">
      <AvisoCarga errores={carga.errores} />
      <div className="mb-8 border-b border-cal pb-4">
        <p className="font-display text-xs font-bold text-cesped-hondo">Mi perfil</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-basalto">{esJugador ? 'Tu perfil. Tu juego.' : 'Tu perfil'}</h1>
        <p className="mt-1 text-sm text-pizarra">
          {esJugador
            ? 'Consulta tu carné digital, edita tus datos y revisa tu historial deportivo en ReservaYa.'
            : 'Edita tus datos de contacto y tu foto. Se verán en tu cuenta en todo ReservaYa.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Columna Izquierda: carné (o tarjeta de cuenta) e historial del jugador */}
        <div className="space-y-6">
          <Card className="overflow-hidden p-0 border-cal bg-tiza">
            {/* Cabecera del carné en superficie sobria */}
            <div className="bg-cesped-hondo p-6 text-tiza">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-niebla">{esJugador ? 'Carné de jugador' : 'Tu cuenta'}</span>
                <span className="font-display text-xs font-bold tabular-nums text-cesped">
                  #{session.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cal bg-piedra shadow-suave-sm">
                  <Avatar
                    nombre={session.nombre}
                    fotoUrl={session.fotoUrl}
                    className="h-full w-full bg-cesped-suave font-display text-xl font-bold text-cesped-hondo"
                  />
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
                <span className="font-semibold text-tiza">{ROL_PLATAFORMA[session.rol]}</span>
              </div>
            </div>

            {/* Métricas operativas reales (sin datos RPG), solo del jugador */}
            {esJugador && (
              <div className="grid grid-cols-3 divide-x divide-cal border-t border-cal bg-tiza p-4 text-center">
                <div>
                  <p className="text-[0.6875rem] font-semibold text-pizarra uppercase">Reservas</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-basalto">{reservas.length}</p>
                </div>
                <div>
                  <p className="text-[0.6875rem] font-semibold text-pizarra uppercase">Confirmadas</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-cesped-hondo">{confirmadas}</p>
                </div>
                <div>
                  <p className="text-[0.6875rem] font-semibold text-pizarra uppercase">Completadas</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-basalto">{completadas}</p>
                </div>
              </div>
            )}
          </Card>

          {esJugador && <EntradaCentro inicial={solicitud} />}
        </div>

        {/* Columna Derecha: Formulario de edición de perfil */}
        <div>
          <PerfilForm usuario={session} jugador={esJugador} />
        </div>
      </div>
    </div>
  )
}
