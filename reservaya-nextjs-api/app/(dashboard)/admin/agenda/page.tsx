import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getCanchas, getReservas } from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';
import { CronogramaView } from '@/components/b2b/CronogramaView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('agenda', session.rol)) redirect(fallbackPorRol(session.rol));

  const [canchas, reservas, complejos] = await Promise.all([
    getCanchas(true).catch(() => []),
    getReservas().catch(() => []),
    getComplejos().catch(() => []),
  ]);

  return (
    <CronogramaView
      canchas={canchas}
      reservasIniciales={reservas}
      complejos={complejos}
      fechaInicial={new Date().toISOString().slice(0, 10)}
    />
  );
}
