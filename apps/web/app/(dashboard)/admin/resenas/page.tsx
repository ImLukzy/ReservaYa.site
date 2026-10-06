import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { ResenasPanel } from '@/components/b2b/ResenasPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('resenas', session.rol)) redirect(fallbackPorRol(session.rol));
  return <ResenasPanel />;
}
