import Link from 'next/link';
import * as api from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function TecnicoPage() {
  const [report, pendientes] = await Promise.all([
    api.getReporteGlobal().catch(() => null),
    api.getSuscripciones(undefined, 'PENDIENTE').catch(() => []),
  ]);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#15803D]">Plataforma ReservaYa</p>
        <h1 className="mt-2 text-3xl font-black text-gray-900">Panel técnico</h1>
        <p className="mt-1 text-gray-500">Opera la plataforma: suscripciones, centros y usuarios.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/tecnico/suscripciones"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 transition hover:shadow-md"
        >
          <p className="text-sm font-semibold text-amber-700">Suscripciones</p>
          <p className="mt-1 text-4xl font-black text-gray-900">{pendientes.length}</p>
          <p className="mt-1 text-sm text-amber-700">
            {pendientes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
          </p>
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Usuarios totales</p>
          <p className="mt-1 text-4xl font-black text-gray-900">{report?.totalUsuarios ?? '—'}</p>
          <p className="mt-1 text-sm text-gray-500">Reservas: {report?.totalReservas ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Ingresos confirmados</p>
          <p className="mt-1 text-4xl font-black text-gray-900">S/ {report?.ingresosTotales ?? '—'}</p>
          <p className="mt-1 text-sm text-gray-500">
            <Link href="/admin/reportes" className="font-semibold text-[#15803D] hover:underline">
              Ver reportes →
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { href: '/tecnico/centros', emoji: '🏟️', t: 'Centros deportivos', d: 'Filtra aceptados, pendientes y sin suscripción.' },
          { href: '/tecnico/usuarios', emoji: '👥', t: 'Usuarios', d: 'Activa, desactiva, cambia roles y ve historiales.' },
          { href: '/admin/canchas', emoji: '📋', t: 'Canchas', d: 'Gestiona canchas de cualquier sede.' },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <p className="text-3xl">{c.emoji}</p>
            <p className="mt-2 font-bold text-gray-900">{c.t}</p>
            <p className="mt-1 text-sm text-gray-500">{c.d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
