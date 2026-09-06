import { redirect } from 'next/navigation';
import { getSession, getDashboardPorRol } from '@/lib/session';

// Catch-all de la ruta deprecada /superadmin/*: redirige según rol.
// (El proxy ya desvía a no-dueños; esto cubre al dueño.)
export const dynamic = 'force-dynamic';

export default async function SuperAdminCatchAll() {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(getDashboardPorRol(session.rol));
}
