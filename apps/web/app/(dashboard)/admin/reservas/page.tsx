import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getCanchas, getReservas } from '@/lib/api';
import { ReservasPanel } from '@/components/b2b/ReservasPanel';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function AdminReservasPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('reservas', session.rol)) redirect(fallbackPorRol(session.rol));

  const carga = crearCarga();
  const [reservas, canchas] = await Promise.all([
    carga.de(getReservas(), [], 'las reservas'),
    carga.de(getCanchas(true), [], 'las canchas'),
  ]);

  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <ReservasPanel reservasIniciales={reservas} canchas={canchas} />
    </>
  );
}
