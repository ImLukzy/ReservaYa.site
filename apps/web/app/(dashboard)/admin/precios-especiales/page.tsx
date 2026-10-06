import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { PreciosEspecialesPanel } from '@/components/b2b/PreciosEspecialesPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('precios-especiales', session.rol)) redirect(fallbackPorRol(session.rol));
  return <PreciosEspecialesPanel />;
}
