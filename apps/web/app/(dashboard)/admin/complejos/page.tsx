import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getComplejos } from '@/lib/b2b-api';
import { ComplejosDashboard } from '@/components/b2b/ComplejosDashboard';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('complejos', session.rol)) redirect(fallbackPorRol(session.rol));

  const carga = crearCarga();
  const complejos = await carga.de(getComplejos(), [], 'los complejos');
  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <ComplejosDashboard
        iniciales={complejos.map((c) => ({ ...c, canchas: c.totalCanchas, telefono: undefined, direccion: undefined }))}
      />
    </>
  );
}
