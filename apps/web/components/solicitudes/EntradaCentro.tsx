'use client';

import Link from 'next/link';
import { Store } from 'lucide-react';
import type { Solicitud } from '@/lib/api-types';
import { Badge } from '@/components/ui/Badge';
import { useMiSolicitud } from './useMiSolicitud';
import { IrAPanelDueno } from './IrAPanelDueno';

// Entrada del jugador al paso jugador→dueño (spec 55 F2): cambia con el estado de su solicitud.
export function EntradaCentro({ inicial }: { inicial: Solicitud | null }) {
  const [solicitud] = useMiSolicitud(inicial);

  return (
    <section
      aria-labelledby="entrada-centro-titulo"
      aria-live="polite"
      className="card-tactil flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cesped-suave text-cesped-hondo">
        <Store size={22} strokeWidth={1.85} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {solicitud?.estado === 'APROBADA' ? (
          <>
            <h2 id="entrada-centro-titulo" className="font-display text-lg font-bold text-basalto">
              ¡Tu centro fue aprobado!
            </h2>
            <p className="mt-0.5 text-sm text-pizarra">
              {solicitud.complejo.nombre} ya aparece en ReservaYa. Tu prueba gratis de 30 días empezó hoy.
            </p>
          </>
        ) : solicitud?.estado === 'PENDIENTE' ? (
          <>
            <h2 id="entrada-centro-titulo" className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-basalto">
              {solicitud.complejo.nombre} <Badge variant="yellow">En revisión</Badge>
            </h2>
            <p className="mt-0.5 text-sm text-pizarra">
              Estamos revisando tu centro. Te avisamos por correo y en esta página.
            </p>
          </>
        ) : (
          <>
            <h2 id="entrada-centro-titulo" className="font-display text-lg font-bold text-basalto">
              Publica tu centro deportivo
            </h2>
            <p className="mt-0.5 text-sm text-pizarra">
              ¿Tienes canchas? Envíanos tu centro con una cancha y, al aprobarlo, recibe reservas 30 días gratis.
            </p>
          </>
        )}
      </div>
      {solicitud?.estado === 'APROBADA' ? (
        <IrAPanelDueno className="shrink-0" />
      ) : (
        <Link
          href="/dashboard/publicar-centro"
          className="btn-tactil btn-tactil--claro shrink-0 bg-tiza px-5 py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
        >
          {solicitud ? 'Ver mi solicitud' : 'Publicar mi centro'}
        </Link>
      )}
    </section>
  );
}
