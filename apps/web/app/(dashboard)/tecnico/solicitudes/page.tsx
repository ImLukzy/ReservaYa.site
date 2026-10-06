import type { Metadata } from 'next';
import * as api from '@/lib/api';
import { siDisponible } from '@/lib/solicitudes-server';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';
import { SolicitudesPanel } from '@/components/solicitudes/SolicitudesPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Solicitudes de centros' };

export default async function SolicitudesPage() {
  const carga = crearCarga();
  const { valor: lista, disponible } = await carga.de(
    siDisponible(api.getSolicitudesPendientes(), []),
    { valor: [], disponible: true },
    'las solicitudes'
  );

  return (
    <div className="mx-auto max-w-5xl">
      <AvisoCarga errores={carga.errores} />
      <div className="mb-6 border-b border-cal pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-basalto">Solicitudes de centros</h1>
        <p className="mt-1 text-sm text-pizarra">
          Jugadores que quieren publicar su centro. Revisa los datos y aprueba o rechaza con un motivo.
        </p>
      </div>
      {!disponible && (
        <p role="status" className="mb-4 rounded-xl border border-sol bg-sol-suave px-4 py-3 text-sm font-semibold text-sol-hondo">
          El servidor todavía no expone la cola de solicitudes. Recarga cuando esté actualizado.
        </p>
      )}
      <SolicitudesPanel iniciales={lista} />
    </div>
  );
}
