'use client';

import { useState } from 'react';
import { ChevronDown, Newspaper } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';

// Contenido estático documentado: sin backend. Edita este arreglo para publicar novedades.
const NOVEDADES = [
  {
    fecha: '2 SET 2026',
    titulo: 'Tus jugadores van a poder pagarte online',
    resumen: 'Yape y tarjeta directo a tu cuenta, sin coordinar por WhatsApp.',
    detalle:
      'Estamos activando pagos online: tu jugador reserva y paga con Yape o tarjeta, y tú ves el abono en Caja al instante. Si quieres ser de los primeros en probarlo, escríbenos por WhatsApp y te ponemos en la lista.',
    destacada: true,
  },
  {
    fecha: '28 AGO 2026',
    titulo: 'Nuevo Cronograma por cancha',
    resumen: 'Arrastra, confirma y reprograma reservas por día y por cancha.',
    detalle:
      'El Cronograma ahora muestra la ocupación del día por cancha con colores: verde confirmada, amarillo por confirmar y gris libre. Desde ahí confirmas o cancelas en un toque.',
    destacada: false,
  },
  {
    fecha: '20 AGO 2026',
    titulo: 'Caja del día mejorada',
    resumen: 'Turnos, movimientos y ticket de cobro en un solo lugar.',
    detalle:
      'Caja ahora separa el turno actual de tu personal del resumen del dueño, guarda cada movimiento con su método de pago y genera un ticket listo para mostrar al jugador.',
    destacada: false,
  },
  {
    fecha: '12 AGO 2026',
    titulo: 'Torneos BETA',
    resumen: 'Crea copas, inscribe equipos y lleva el fixture sin Excel.',
    detalle:
      'Ya puedes crear tu primera copa relámpago: define cupo y premio, inscribe equipos y registra resultados del fixture. Está en BETA: cuéntanos qué le falta para tu campeonato.',
    destacada: false,
  },
] as const;

export function NovedadesView() {
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <div>
      <div>
        <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-cesped-hondo">📰 NOVEDADES</p>
        <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-basalto">
          Lo que va cambiando
        </h1>
        <p className="mt-1 text-sm text-pizarra">
          Mejoras de tu panel contadas en simple, sin tecnicismos.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {NOVEDADES.map((n, i) => {
          const open = abierta === i;
          return (
            <article
              key={n.titulo}
              className={cn(
                'rounded-2xl border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
                n.destacada ? 'border-cesped/50' : 'border-cal'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cesped-suave text-lg">
                  <Newspaper size={19} strokeWidth={1.85} className="text-cesped-hondo" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-pizarra">{n.fecha}</p>
                  <h2 className="mt-0.5 text-base font-black text-basalto">{n.titulo}</h2>
                  <p className="mt-1 text-sm text-pizarra">{n.resumen}</p>
                </div>
              </div>
              {open && <p className="mt-3 text-sm leading-relaxed text-basalto">{n.detalle}</p>}
              <button
                type="button"
                onClick={() => setAbierta(open ? null : i)}
                aria-expanded={open}
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-cesped-hondo hover:underline"
              >
                {open ? 'Leer menos' : 'Leer'}
                <ChevronDown size={15} strokeWidth={2.5} className={cn('transition-transform', open && 'rotate-180')} />
              </button>
            </article>
          );
        })}
      </div>

      <WhatsAppFloat />
    </div>
  );
}
