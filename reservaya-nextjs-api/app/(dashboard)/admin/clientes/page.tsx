import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import * as api from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';
import { ClientesPanel } from '@/components/features/ClientesPanel';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.rol !== 'SUPERADMIN' && session.rol !== 'TECNICO') redirect('/admin/agenda');

  const carga = crearCarga();
  const [clientes, complejos] = await Promise.all([
    carga.de(api.getClientes(), [], 'los clientes'),
    carga.de(getComplejos(), [], 'los complejos'),
  ]);

  return (
    <div>
      <AvisoCarga errores={carga.errores} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500 mt-1">
          Quienes reservaron en tus locales: revisa historiales, califica o restringe ingresos.
        </p>
      </div>
      <ClientesPanel
        iniciales={clientes}
        complejos={complejos.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
