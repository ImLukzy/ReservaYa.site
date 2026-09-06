import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getMetas } from '@/lib/b2b-api';
import { MetasPanel } from '@/components/b2b/MetasPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('metas', session.rol)) redirect(fallbackPorRol(session.rol));

  const iniciales = await getMetas().catch(() => []);

  return <MetasPanel iniciales={iniciales} />;
}
