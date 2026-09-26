import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getCanchas, getReservas } from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';
import { CronogramaView } from '@/components/b2b/CronogramaView';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('agenda', session.rol)) redirect(fallbackPorRol(session.rol));

  const carga = crearCarga();
  const [canchas, reservas, complejos] = await Promise.all([
    carga.de(getCanchas(true), [], 'las canchas'),
    carga.de(getReservas(), [], 'las reservas'),
    carga.de(getComplejos(), [], 'los complejos'),
  ]);

  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <CronogramaView
        canchas={canchas}
        reservasIniciales={reservas}
        complejos={complejos}
        fechaInicial={new Date().toISOString().slice(0, 10)}
      />
    </>
  );
}
