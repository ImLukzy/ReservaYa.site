import { redirect } from 'next/navigation';
import { getSession, getDashboardPorRol } from '@/lib/session';

// /superadmin/* está deprecado (ahora es panel del dueño en /admin y plataforma
// en /tecnico). Redirige según rol para no romper bookmarks.
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(getDashboardPorRol(session.rol));
  return <>{children}</>;
}
