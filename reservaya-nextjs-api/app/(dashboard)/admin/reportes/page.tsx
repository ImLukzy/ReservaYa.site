import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getReporteGlobal, getReservas } from '@/lib/api';
import { ReportesPanel } from '@/components/b2b/ReportesPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('reportes', session.rol)) redirect(fallbackPorRol(session.rol));

  const [reporte, reservas] = await Promise.all([
    getReporteGlobal().catch(() => null),
    getReservas().catch(() => []),
  ]);

  return <ReportesPanel reservas={reservas} reporte={reporte} />;
}
