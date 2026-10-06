import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { ValidarCodigo } from '@/components/b2b/ValidarCodigo';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('validar-codigo', session.rol)) redirect(fallbackPorRol(session.rol));
  return <ValidarCodigo />;
}
