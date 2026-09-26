import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getReporteGlobal, getReservas } from '@/lib/api';
import { ReportesPanel } from '@/components/b2b/ReportesPanel';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('reportes', session.rol)) redirect(fallbackPorRol(session.rol));

  const carga = crearCarga();
  const [reporte, reservas] = await Promise.all([
    carga.de(getReporteGlobal(), null, 'el reporte'),
    carga.de(getReservas(), [], 'las reservas'),
  ]);

  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <ReportesPanel reservas={reservas} reporte={reporte} />
    </>
  );
}
