import { requireAuth } from '@/lib/session'
import Link from 'next/link'
import { ShieldCheck, Mail, Phone, ArrowUpRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CarnePage() {
  const session = await requireAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-wider text-cesped-hondo">
          Credencial Digital
        </p>
        <h1 className="font-display text-3xl font-extrabold text-basalto tracking-tight">
          Carné de jugador
        </h1>
        <p className="mt-1 text-sm text-pizarra">
          Comparte tus datos con el complejo al llegar a tu reserva.
        </p>
      </div>

      {/* Tarjeta de Carné estilo Ficha Reglamentaria de Juego */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-cal bg-tiza p-6 sm:p-8 shadow-md">
        {/* Franja superior de marca y estado */}
        <div className="flex items-center justify-between border-b border-cal pb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cesped text-grafito font-black font-display text-base shadow-sm">
              RY
            </div>
            <div>
              <p className="font-display text-sm font-black tracking-wider text-basalto uppercase">
                ReservaYa
              </p>
              <p className="text-[10px] uppercase font-bold text-pizarra tracking-wider">
                Credencial
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cesped/30 bg-cesped-suave px-3 py-1 text-xs font-bold text-cesped-hondo">
            <ShieldCheck className="h-3.5 w-3.5" />
            Jugador Activo
          </span>
        </div>

        {/* Contenido principal del carné */}
        <div className="mt-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar con dimensiones estrictamente reservadas anti-CLS */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-cal bg-piedra flex items-center justify-center text-3xl font-bold font-display text-pizarra">
            {session.fotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={session.fotoUrl}
                alt={session.nombre}
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{session.nombre.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="font-display text-2xl font-black text-basalto tracking-tight">
              {session.nombre}
            </h2>
            {session.username ? (
              <p className="text-sm font-bold text-cesped-hondo">
                @{session.username}
              </p>
            ) : (
              <p className="text-xs text-pizarra italic">
                Sin nombre de usuario fijado
              </p>
            )}
            <p className="text-xs text-pizarra flex items-center justify-center sm:justify-start gap-1 pt-1">
              <Mail className="h-3.5 w-3.5 text-pizarra" />
              {session.email}
            </p>
            {session.telefono && (
              <p className="text-xs text-pizarra flex items-center justify-center sm:justify-start gap-1">
                <Phone className="h-3.5 w-3.5 text-pizarra" />
                <span className="font-display tabular-nums">{session.telefono}</span>
              </p>
            )}
          </div>
        </div>

        {/* Datos del carné */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-cal pt-4 text-xs">
          <div className="rounded-xl border border-cal bg-piedra/40 p-2.5">
            <p className="text-[10px] uppercase font-bold text-pizarra">Tipo</p>
            <p className="mt-0.5 font-display font-bold text-basalto">Jugador ReservaYa</p>
          </div>
          <div className="rounded-xl border border-cal bg-piedra/40 p-2.5">
            <p className="text-[10px] uppercase font-bold text-pizarra">Estado</p>
            <p className="mt-0.5 font-display font-bold text-cesped-hondo">Cuenta activa</p>
          </div>
        </div>
      </div>

      {/* Acciones de gestión de perfil */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-cal bg-tiza p-5 shadow-sm">
        <div>
          <h3 className="font-display text-sm font-bold text-basalto">
            ¿Necesitas actualizar tus datos o foto?
          </h3>
          <p className="mt-0.5 text-xs text-pizarra">
            Los cambios en tu teléfono, usuario o foto se reflejarán de inmediato en este carné.
          </p>
        </div>
        <Link
          href="/dashboard/perfil"
          className="inline-flex items-center gap-1.5 rounded-xl border border-cal bg-piedra px-4 py-2.5 text-xs font-bold text-basalto transition hover:border-borde hover:bg-tiza shrink-0"
        >
          Editar perfil
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
