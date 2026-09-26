import { OnboardingChecklist } from '@/components/b2b/OnboardingChecklist';
import { AvisoCarga } from '@/components/ui/AvisoCarga';
import * as api from '@/lib/api';
import { getComplejos, getHorarios } from '@/lib/b2b-api';
import { crearCarga } from '@/lib/carga';
import { pasosOnboarding } from '@/lib/onboarding';
import { requireRole } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireRole(['ADMIN', 'SUPERADMIN', 'TECNICO']);
  // TECNICO es la plataforma: no tiene negocio propio que activar, ve la guía sin progreso.
  if (session.rol === 'TECNICO') return <OnboardingChecklist />;

  const carga = crearCarga();
  const [complejos, canchas] = await Promise.all([
    carga.de(getComplejos(), [], 'los complejos'),
    carga.de(api.getCanchas(undefined, true), [], 'las canchas'),
  ]);
  const horarios = Object.fromEntries(
    await Promise.all(
      complejos.map(async (c) => [c.id, await carga.de(getHorarios(c.id), null, `los horarios de ${c.nombre}`)])
    )
  );

  return (
    <div>
      <AvisoCarga errores={carga.errores} />
      <OnboardingChecklist completados={pasosOnboarding({ complejos, canchas, horarios })} />
    </div>
  );
}
