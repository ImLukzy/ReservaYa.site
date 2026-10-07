'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useInvitaciones } from './useInvitaciones';
import { ListaInvitaciones } from './ListaInvitaciones';

// Tarjeta destacada en /dashboard cuando el jugador tiene invitaciones de
// equipo pendientes. Sin sondeo propio: la campana del Sidebar ya consulta
// cada minuto y avisa por evento cuando algo cambia.
export function TarjetaInvitaciones() {
  const { invitaciones, quitar } = useInvitaciones({ sondeo: false });
  const [estado, setEstado] = useState('');
  return (
    <>
      <p role="status" className="sr-only">{estado}</p>
      {invitaciones.length > 0 && (
        <section aria-labelledby="tarjeta-invitaciones" className="card-tactil mb-6 border-cesped p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cesped-suave text-cesped-hondo">
              <UserPlus size={20} strokeWidth={1.85} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="tarjeta-invitaciones" className="font-display text-lg font-bold text-basalto">
                {invitaciones.length === 1 ? 'Te invitaron a un equipo' : `Tienes ${invitaciones.length} invitaciones de equipo`}
              </h2>
              <p className="mt-1 text-sm text-pizarra">
                Si aceptas, entras al panel de trabajador de ese centro: agenda, reservas, caja y validación de códigos.
              </p>
              <ListaInvitaciones idBase="tarjeta-inv" invitaciones={invitaciones} onQuitar={quitar} onEstado={setEstado} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
