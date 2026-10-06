import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import * as api from '@/lib/api';
import { siDisponible } from '@/lib/solicitudes-server';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Pendiente({ href, cantidad, titulo, singular, plural }: {
  href: string; cantidad: number | null; titulo: string; singular: string; plural: string;
}) {
  const hay = (cantidad ?? 0) > 0;
  return (
    <Link
      href={href}
      className={cn(
        'card-tactil group flex items-center gap-4 p-5 transition-colors hover:border-cesped',
        hay && 'border-sol bg-sol-suave'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold', hay ? 'text-sol-hondo' : 'text-pizarra')}>{titulo}</p>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums text-basalto">{cantidad ?? '—'}</p>
        <p className={cn('text-sm', hay ? 'text-sol-hondo' : 'text-pizarra')}>
          {cantidad === null ? 'no disponible' : hay ? (cantidad === 1 ? singular : plural) : 'nada pendiente'}
        </p>
      </div>
      <ChevronRight size={20} strokeWidth={2} aria-hidden="true" className="shrink-0 text-pizarra group-hover:text-cesped-hondo" />
    </Link>
  );
}

export default async function TecnicoPage() {
  const carga = crearCarga();
  const [report, suscripciones, solicitudes] = await Promise.all([
    carga.de(api.getReporteGlobal(), null, 'el reporte'),
    carga.de(api.getSuscripciones(undefined, 'PENDIENTE'), [], 'las suscripciones'),
    carga.de(siDisponible(api.getSolicitudesPendientes(), []), { valor: [], disponible: false }, 'las solicitudes'),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <AvisoCarga errores={carga.errores} />
      <div className="mb-6 border-b border-cal pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-basalto">Resumen</h1>
        <p className="mt-1 text-sm text-pizarra">Lo que espera tu revisión y cómo va la plataforma.</p>
      </div>

      <h2 className="mb-3 font-display text-base font-bold text-basalto">Por revisar</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Pendiente href="/tecnico/solicitudes" cantidad={solicitudes.disponible ? solicitudes.valor.length : null} titulo="Centros nuevos"
          singular="solicitud por revisar" plural="solicitudes por revisar" />
        <Pendiente href="/tecnico/suscripciones?estado=PENDIENTE" cantidad={suscripciones.length} titulo="Suscripciones"
          singular="pago por confirmar" plural="pagos por confirmar" />
      </div>

      <h2 className="mb-3 mt-8 font-display text-base font-bold text-basalto">Plataforma</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-tactil p-5">
          <p className="text-sm font-semibold text-pizarra">Usuarios</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-basalto">{report?.totalUsuarios ?? '—'}</p>
        </div>
        <div className="card-tactil p-5">
          <p className="text-sm font-semibold text-pizarra">Reservas</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-basalto">{report?.totalReservas ?? '—'}</p>
        </div>
        <Link href="/admin/reportes" className="card-tactil group p-5 transition-colors hover:border-cesped">
          <p className="text-sm font-semibold text-pizarra">Ingresos confirmados</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-basalto">
            {report ? `S/ ${Number(report.ingresosTotales).toLocaleString('es-PE')}` : '—'}
          </p>
          <p className="mt-1 text-sm font-semibold text-cesped-hondo group-hover:underline">Ver reportes</p>
        </Link>
      </div>
    </div>
  );
}
