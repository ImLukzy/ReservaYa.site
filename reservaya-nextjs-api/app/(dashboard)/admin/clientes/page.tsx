import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import * as api from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';
import { ClientesPanel } from '@/components/features/ClientesPanel';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.rol !== 'SUPERADMIN' && session.rol !== 'TECNICO') redirect('/admin/agenda');

  const [clientes, complejos] = await Promise.all([
    api.getClientes().catch(() => []),
    getComplejos().catch(() => []),
  ]);

  return (
    <div>
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
