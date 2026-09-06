import Link from 'next/link';
import * as api from '@/lib/api';
import { SuscripcionesPanel } from '@/components/features/SuscripcionesPanel';

export const dynamic = 'force-dynamic';

const FILTROS = [
  { v: '', label: 'Todas' },
  { v: 'PENDIENTE', label: 'Pendientes' },
  { v: 'ACTIVA', label: 'Activas' },
  { v: 'VENCIDA', label: 'Vencidas' },
  { v: 'CANCELADA', label: 'Canceladas' },
  { v: 'RECHAZADA', label: 'Rechazadas' },
];

export default async function SuscripcionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const lista = await api.getSuscripciones(undefined, estado || undefined).catch(() => []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
        <p className="text-gray-500 mt-1">Aprueba solicitudes de dueños y gestiona la vitrina.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.v}
            href={f.v ? `/tecnico/suscripciones?estado=${f.v}` : '/tecnico/suscripciones'}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              (estado ?? '') === f.v
                ? 'bg-[#060A08] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#22C55E]'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <SuscripcionesPanel iniciales={lista} />
    </div>
  );
}
