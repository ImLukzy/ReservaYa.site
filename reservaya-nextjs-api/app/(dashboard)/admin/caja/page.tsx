import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getCanchas } from '@/lib/api';
import { CajaPanel } from '@/components/b2b/CajaPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('caja', session.rol)) redirect(fallbackPorRol(session.rol));

  const canchas = await getCanchas(true).catch(() => []);

  return (
    <CajaPanel
      canchas={canchas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        tipo: String(c.tipo),
        precioPorHora: String(c.precioPorHora),
      }))}
    />
  );
}
