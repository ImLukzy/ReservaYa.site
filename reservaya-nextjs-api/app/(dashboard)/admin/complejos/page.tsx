import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getComplejos } from '@/lib/b2b-api';
import { ComplejosDashboard } from '@/components/b2b/ComplejosDashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('complejos', session.rol)) redirect(fallbackPorRol(session.rol));

  const complejos = await getComplejos().catch(() => []);
  return (
    <ComplejosDashboard
      iniciales={complejos.map((c) => ({ ...c, telefono: undefined, direccion: undefined }))}
    />
  );
}
