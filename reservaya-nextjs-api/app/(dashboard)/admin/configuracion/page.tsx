import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { ConfigPanel } from '@/components/b2b/ConfigPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('configuracion', session.rol)) redirect(fallbackPorRol(session.rol));
  return <ConfigPanel />;
}
