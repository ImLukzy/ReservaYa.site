import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { TorneosPanel } from '@/components/b2b/TorneosPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('torneos', session.rol)) redirect(fallbackPorRol(session.rol));
  return <TorneosPanel />;
}
