import Link from 'next/link';
import * as api from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';

export const dynamic = 'force-dynamic';

const FILTROS = [
  { v: '', label: 'Todos' },
  { v: 'aceptados', label: 'Aceptados' },
  { v: 'pendientes', label: 'Pendientes' },
  { v: 'sin-sub', label: 'Sin suscripción' },
];

export default async function CentrosPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const filtro = f ?? '';
  const [complejos, subs] = await Promise.all([
    getComplejos().catch(() => []),
    api.getSuscripciones().catch(() => []),
  ]);

  const porComplejo = new Map<string, { estado: string; vigente: boolean; fechaFin: string }>();
  for (const s of subs) {
    const prev = porComplejo.get(s.complejoId);
    if (!prev || (s.vigente && !prev.vigente)) {
      porComplejo.set(s.complejoId, { estado: s.estado, vigente: s.vigente, fechaFin: s.fechaFin });
    }
  }
  const tienePendiente = new Set(
    subs.filter((s) => s.estado === 'PENDIENTE').map((s) => s.complejoId)
  );

  const filas = complejos
    .map((c) => ({
      ...c,
      sub: porComplejo.get(c.id) ?? null,
      pendiente: tienePendiente.has(c.id),
    }))
    .filter((c) => {
      if (filtro === 'aceptados') return c.sub?.vigente === true;
      if (filtro === 'pendientes') return c.pendiente;
      if (filtro === 'sin-sub') return !c.sub;
      return true;
    });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Centros deportivos</h1>
        <p className="text-gray-500 mt-1">Todos los locales creados y su estado de suscripción.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((x) => (
          <Link
            key={x.v}
            href={x.v ? `/tecnico/centros?f=${x.v}` : '/tecnico/centros'}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              filtro === x.v
                ? 'bg-[#060A08] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#22C55E]'
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {filas.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="font-medium text-gray-600">Sin centros con ese filtro</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Local</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Distrito</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Canchas</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Suscripción</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filas.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.distrito}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.canchas}</td>
                    <td className="px-6 py-4">
                      {c.sub?.vigente ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                          {c.sub.estado} · {c.sub.fechaFin.slice(0, 10)}
                        </span>
                      ) : c.pendiente ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#A16207]">
                          Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          {c.sub ? c.sub.estado : 'Sin suscripción'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/tecnico/suscripciones"
                        className="text-sm font-semibold text-[#15803D] hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
