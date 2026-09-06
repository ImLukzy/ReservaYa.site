import { OnboardingChecklist } from '@/components/b2b/OnboardingChecklist';
import { requireRole } from '@/lib/session';

export default async function Page() {
  await requireRole(['ADMIN', 'SUPERADMIN', 'TECNICO']);
  // TODO: calcular `done` desde /api/complejos/onboarding (complejo→canchas→horarios→fotos→compartido).
  return <OnboardingChecklist done={0} />;
}
