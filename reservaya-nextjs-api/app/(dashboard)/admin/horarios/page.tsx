import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getComplejos } from '@/lib/b2b-api';
import * as api from '@/lib/api';
import { HorariosPanel } from '@/components/b2b/HorariosPanel';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function HorariosPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('horarios', session.rol)) redirect(fallbackPorRol(session.rol));

  const carga = crearCarga();
  const [complejos, canchas] = await Promise.all([
    carga.de(getComplejos(), [], 'los complejos'),
    carga.de(api.getCanchas(), [], 'las canchas'),
  ]);

  return (
    <div>
      <AvisoCarga errores={carga.errores} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Horario operativo</h1>
        <p className="text-gray-500 mt-1">
          Días y horas de atención por local. Las reservas fuera de horario se rechazan.
        </p>
      </div>
      <HorariosPanel
        complejos={complejos.map((c) => ({ id: c.id, nombre: c.nombre }))}
        canchas={canchas.map((c) => ({ id: c.id, nombre: c.nombre, complejoId: c.complejoId }))}
      />
    </div>
  );
}
