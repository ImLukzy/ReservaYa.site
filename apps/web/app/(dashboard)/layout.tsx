import { requireAuth } from '@/lib/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { getJson } from '@/lib/server-fetch';
import { ApiError } from '@/lib/api-types';
import { panelBloqueado, type EstadoConvenio } from '@/lib/convenio';
import ConvenioPanel from '@/components/b2b/ConvenioPanel';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  const esGestion = session.rol !== 'USUARIO' && session.rol !== 'TECNICO';
  let estados: EstadoConvenio[] = [];
  let falloSuscripcion = false;
  if (esGestion) {
    try {
      estados = (await getJson<{ complejos: EstadoConvenio[] }>('/api/suscripciones/estado')).complejos;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
      falloSuscripcion = true;
    }
  }
  const bloqueado = panelBloqueado(estados);

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden bg-sillar font-cuerpo text-basalto'
      )}
    >
      <Sidebar
        rol={session.rol}
        nombre={session.nombre}
        email={session.email}
      />
      <main className="relative min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {/* pt-16 hasta lg: deja libre el botón de menú fijo (Sidebar, left-4 top-4). */}
        <div className="px-4 pb-4 pt-16 sm:px-6 sm:pb-6 md:px-8 md:pb-8 lg:pt-8">
          {falloSuscripcion && <p role="status" className="mb-4 text-sm text-pizarra">No pudimos comprobar tu suscripción</p>}
          {/* Suscripción y prueba son decisiones del dueño; el trabajador solo ve el bloqueo. */}
          {estados.length > 0 && session.rol === 'SUPERADMIN' && <ConvenioPanel estados={estados} bloqueado={bloqueado} />}
          {bloqueado && session.rol === 'ADMIN' && (
            <p role="status" className="card-tactil p-5 text-sm font-semibold text-basalto">
              El centro está pausado hasta que el dueño active su suscripción. Avísale para seguir recibiendo reservas.
            </p>
          )}
          {!bloqueado && children}
        </div>
      </main>
    </div>
  );
}
