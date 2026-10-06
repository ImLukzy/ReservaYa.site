import Link from 'next/link';
import { OnboardingChecklist } from '@/components/b2b/OnboardingChecklist';
import { GuiaDueno } from '@/components/b2b/GuiaDueno';
import { TopBar } from '@/components/layout/TopBar';
import { AvisoCarga } from '@/components/ui/AvisoCarga';
import * as api from '@/lib/api';
import { getComplejos, getHorarios } from '@/lib/b2b-api';
import { crearCarga } from '@/lib/carga';
import { pasosOnboarding } from '@/lib/onboarding';
import { requireRole } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Guía del trabajador: solo lo que puede hacer (spec 55 F5).
const TAREAS_TRABAJADOR = [
  { titulo: 'Mira el día en el Cronograma', texto: 'Ves cada cancha por hora: libre, por confirmar o confirmada. Desde ahí registras una reserva de mostrador.', href: '/admin/agenda', accion: 'Abrir Cronograma' },
  { titulo: 'Confirma las reservas', texto: 'En Reservas confirmas o rechazas lo que llega desde la web.', href: '/admin/reservas', accion: 'Abrir Reservas' },
  { titulo: 'Valida el código al llegar', texto: 'El jugador muestra su código; lo escribes y queda registrada su llegada.', href: '/admin/validar-codigo', accion: 'Validar código' },
  { titulo: 'Cobra en Caja', texto: 'Abre la caja al empezar el turno, registra cada cobro con su método y ciérrala al final.', href: '/admin/caja', accion: 'Abrir Caja' },
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ guia?: string }> }) {
  const session = await requireRole(['ADMIN', 'SUPERADMIN', 'TECNICO']);
  // TECNICO es la plataforma: no tiene negocio propio que activar, ve la guía sin progreso.
  if (session.rol === 'TECNICO') return <OnboardingChecklist />;

  if (session.rol === 'ADMIN') {
    return (
      <div>
        <TopBar breadcrumb="Cómo usar el panel" title="Tu turno en 4 pasos" />
        <ol className="mx-auto mt-6 max-w-2xl space-y-3">
          {TAREAS_TRABAJADOR.map((t, i) => (
            <li key={t.href} className="card-tactil flex gap-4 p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cesped-suave font-display text-sm font-bold text-cesped-hondo">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-basalto">{t.titulo}</p>
                <p className="text-sm leading-relaxed text-pizarra">{t.texto}</p>
                <Link href={t.href} className="btn-tactil btn-tactil--claro mt-3 bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra">
                  {t.accion}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const { guia } = await searchParams;
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
  const completados = pasosOnboarding({ complejos, canchas, horarios });

  return (
    <div>
      <AvisoCarga errores={carga.errores} />
      <OnboardingChecklist
        completados={completados}
        accion={<GuiaDueno usuarioId={session.id} completados={completados} pedida={guia === '1'} boton />}
      />
    </div>
  );
}
