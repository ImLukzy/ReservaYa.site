import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { AbonosPanel } from '@/components/b2b/AbonosPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('abonos', session.rol)) redirect(fallbackPorRol(session.rol));
  return <AbonosPanel />;
}
