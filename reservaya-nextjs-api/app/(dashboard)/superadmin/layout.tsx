import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { fallbackPorRol } from '@/lib/permissions';

// /superadmin/* está deprecado (ahora es panel del dueño en /admin y plataforma
// en /tecnico). Redirige según rol para no romper bookmarks.
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(fallbackPorRol(session.rol));
  return <>{children}</>;
}
