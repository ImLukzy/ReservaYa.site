import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { EquipoPanel } from '@/components/b2b/EquipoPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('equipo', session.rol)) redirect(fallbackPorRol(session.rol));
  return <EquipoPanel />;
}
