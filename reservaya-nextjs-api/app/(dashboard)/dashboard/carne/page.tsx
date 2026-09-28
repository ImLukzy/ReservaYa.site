import { requireAuth } from '@/lib/session'
import Link from 'next/link'
import { ShieldCheck, Mail, Phone, ArrowUpRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CarnePage() {
  const session = await requireAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-display text-xs font-bold text-cesped-hondo">
          Credencial digital
        </p>
        <h1 className="font-display text-3xl font-extrabold text-basalto tracking-tight">
          Carné de jugador
        </h1>
        <p className="mt-1 text-sm text-pizarra">
          Comparte tus datos con el complejo al llegar a tu reserva.
        </p>
      </div>

      {/* Carné con proporción de tarjeta física CR80 (D2, spec 24); ≤360px cae a alto libre. Sin sombras decorativas. */}
      <div className="mx-auto aspect-[1.586] w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-cal bg-tiza max-[360px]:aspect-auto">
        <div className="h-1 w-full bg-cesped" aria-hidden="true" />
        <div className="flex h-full flex-col justify-between p-5 sm:p-6">
          {/* Cabecera: marca y estado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cesped font-display text-xs font-black text-grafito">
                RY
              </div>
              <p className="font-display text-xs font-black text-basalto">ReservaYa</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-cesped/30 bg-cesped-suave px-2 py-0.5 text-[11px] font-bold text-cesped-hondo">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Activo
            </span>
          </div>

          {/* Identidad del jugador */}
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-cal bg-piedra sm:h-16 sm:w-16">
              {session.fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={session.fotoUrl}
                  alt={session.nombre}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-xl font-bold text-pizarra">
                  {session.nombre.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-lg font-black tracking-tight text-basalto sm:text-xl">
                {session.nombre}
              </h2>
              {session.username ? (
                <p className="truncate text-sm font-bold text-cesped-hondo">@{session.username}</p>
              ) : (
                <p className="truncate text-xs italic text-pizarra">Sin nombre de usuario fijado</p>
              )}
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-pizarra">
                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{session.email}</span>
              </p>
            </div>
          </div>

          {/* Pie: rol y teléfono si existe */}
          <div className="flex items-center justify-between border-t border-cal pt-2 text-xs text-pizarra">
            <span className="font-display font-bold text-basalto">Jugador</span>
            {session.telefono && (
              <span className="flex items-center gap-1 font-display tabular-nums">
                <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                {session.telefono}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Acciones de gestión de perfil */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-cal bg-tiza p-5">
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
