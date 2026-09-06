import { requireAuth } from '@/lib/session'

export default async function CarnePage() {
  const session = await requireAuth()
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#15803D]">Jugador</p><h1 className="mt-2 text-3xl font-bold text-gray-900">Mi perfil y carné</h1><p className="mt-2 text-gray-500">Comparte tus datos con el complejo al llegar a tu reserva.</p></div>
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A3D22] to-[#060A08] p-6 text-white shadow-xl">
        <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">{session.nombre.charAt(0).toUpperCase()}</div><div><p className="text-xl font-bold">{session.nombre}</p><p className="text-sm text-white/70">{session.email}</p></div></div>
        <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/20 pt-5 text-sm"><div><p className="text-white/60">Tipo</p><p className="font-semibold">Jugador ReservaYa</p></div><div><p className="text-white/60">Estado</p><p className="font-semibold">Cuenta activa</p></div></div>
      </div>
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6"><h2 className="font-semibold text-gray-900">Datos de contacto</h2><p className="mt-2 text-sm text-gray-500">Mantén tu correo actualizado para recibir confirmaciones y códigos de reserva.</p><button className="mt-4 rounded-xl border border-[#22C55E] px-4 py-2 text-sm font-semibold text-[#15803D]">Editar perfil</button></div>
    </div>
  )
}
