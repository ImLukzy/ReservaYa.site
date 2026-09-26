import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { fallbackPorRol } from '@/lib/permissions';

// Catch-all de la ruta deprecada /superadmin/*: redirige según rol.
// (El proxy ya desvía a no-dueños; esto cubre al dueño.)
export const dynamic = 'force-dynamic';

export default async function SuperAdminCatchAll() {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(fallbackPorRol(session.rol));
}
