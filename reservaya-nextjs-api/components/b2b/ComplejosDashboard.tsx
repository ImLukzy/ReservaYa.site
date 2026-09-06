import { requireRole } from '@/lib/session';
import { getComplejos } from '@/lib/b2b-api';
import { TopBar } from '@/components/layout/TopBar';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { ComplejosGrid, type ComplejoCard } from '@/components/b2b/ComplejosGrid';

export async function ComplejosDashboard({ iniciales }: { iniciales?: ComplejoCard[] }) {
  await requireRole(['ADMIN', 'SUPERADMIN', 'TECNICO']);
  // La página ya trae los datos del servidor; si no se pasan, se cargan aquí.
  const complejos: ComplejoCard[] =
    iniciales ?? (await getComplejos().catch(() => [])).map((c) => ({ ...c, telefono: undefined, direccion: undefined }));

  return (
    <div>
      <TopBar breadcrumb="MIS COMPLEJOS" title="Complejos" />
      <p className="mt-3 mb-6 text-[14px] leading-relaxed text-[#475569]">
        Gestiona tus sedes: edita sus datos, comparte tu página con QR y crea nuevas sedes.
      </p>
      <ComplejosGrid complejos={complejos} />
      <WhatsAppFloat />
    </div>
  );
}
