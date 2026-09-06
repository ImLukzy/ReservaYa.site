import Link from 'next/link'
import { getSession } from '@/lib/session'
import * as api from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const session = await getSession()
  if (!session) return null

  const reservas = await api.getReservas()
  const confirmadas = reservas.filter((reserva) => reserva.estado === 'CONFIRMADA').length
  const completadas = reservas.filter((reserva) => reserva.estado === 'COMPLETADA').length
  const pendientes = reservas.filter((reserva) => reserva.estado === 'PENDIENTE').length
  const iniciales = session.nombre.split(/\s+/).map((parte) => parte[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Mi perfil</p>
        <h1 className="mt-2 text-3xl font-black text-slate-100">Tu perfil. Tu juego.</h1>
        <p className="mt-2 text-slate-400">Consulta tu carné digital y tu historial deportivo en ReservaYa.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#0b130e] to-[#15803D] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Carné digital</p>
            <div className="mt-8 flex items-center gap-4">
              {session.fotoUrl ? (
                <img src={session.fotoUrl} alt="Foto de perfil" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E] text-xl font-black text-[#071c10]">{iniciales}</div>
              )}
              <div>
                <h2 className="text-xl font-black">{session.nombre}</h2>
                <p className="text-sm text-white/70">{session.email}</p>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-4 text-sm">
              <span>Jugador ReservaYa</span>
              <span className="font-bold text-emerald-200">#{session.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-6">
            {[
              ['Velocidad', '82'],
              ['Tiro', '76'],
              ['Defensa', '68'],
              ['Resistencia', '85'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#252b40] p-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <p className="text-xs uppercase tracking-wider text-slate-400">Estilo de juego</p>
            <Badge variant="green">Armador</Badge>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Resumen de reservas</h2>
                <p className="mt-1 text-sm text-slate-400">Tu actividad en la plataforma.</p>
              </div>
              <Link href="/dashboard/reservas" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">Ver historial →</Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-500/10 p-4"><p className="text-sm text-slate-400">Confirmadas</p><p className="mt-1 text-2xl font-black text-emerald-300">{confirmadas}</p></div>
              <div className="rounded-xl bg-blue-500/10 p-4"><p className="text-sm text-slate-400">Completadas</p><p className="mt-1 text-2xl font-black text-blue-300">{completadas}</p></div>
              <div className="rounded-xl bg-amber-500/10 p-4"><p className="text-sm text-slate-400">Pendientes</p><p className="mt-1 text-2xl font-black text-amber-300">{pendientes}</p></div>
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold text-slate-100">Sigue jugando</h2>
            <p className="mt-2 text-slate-400">Encuentra una cancha disponible o arma tu próximo partido.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/canchas" className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-[#071c10] transition hover:bg-emerald-300">Buscar canchas</Link>
              <Link href="/dashboard/mi-partido" className="rounded-lg border border-[#465170] px-4 py-2 font-semibold text-slate-200 transition hover:bg-[#293149]">Mi partido</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
