import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { NovedadesView } from './NovedadesView';

export const dynamic = 'force-dynamic';

export default async function NovedadesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('novedades', session.rol)) redirect(fallbackPorRol(session.rol));
  return <NovedadesView />;
}
