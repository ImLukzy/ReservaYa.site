import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { EquipoPanel } from '@/components/b2b/EquipoPanel';
import { getComplejos, getEquipo } from '@/lib/b2b-api';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('equipo', session.rol)) redirect(fallbackPorRol(session.rol));
  const carga = crearCarga();
  const complejos = await carga.de(getComplejos(), [], 'los complejos');
  const primerComplejoId = complejos[0]?.id;
  const miembros = primerComplejoId
    ? await carga.de(getEquipo(primerComplejoId), [], 'el equipo')
    : [];
  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <EquipoPanel
        complejosIniciales={complejos.map(({ id, nombre }) => ({ id, nombre }))}
        miembrosIniciales={miembros}
      />
    </>
  );
}
