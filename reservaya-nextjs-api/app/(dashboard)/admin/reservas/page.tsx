import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getCanchas, getReservas } from '@/lib/api';
import { ReservasPanel } from '@/components/b2b/ReservasPanel';

export const dynamic = 'force-dynamic';

export default async function AdminReservasPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('reservas', session.rol)) redirect(fallbackPorRol(session.rol));

  const [reservas, canchas] = await Promise.all([
    getReservas().catch(() => []),
    getCanchas(true).catch(() => []),
  ]);

  return <ReservasPanel reservasIniciales={reservas} canchas={canchas} />;
}
