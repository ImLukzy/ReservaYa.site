import Link from 'next/link';
import * as api from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

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
  const carga = crearCarga();
  const [complejos, subs] = await Promise.all([
    carga.de(getComplejos(), [], 'los complejos'),
    carga.de(api.getSuscripciones(), [], 'las suscripciones'),
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
      <AvisoCarga errores={carga.errores} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-basalto">Centros deportivos</h1>
        <p className="text-pizarra mt-1">Todos los locales creados y su estado de suscripción.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((x) => (
          <Link
            key={x.v}
            href={x.v ? `/tecnico/centros?f=${x.v}` : '/tecnico/centros'}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              filtro === x.v
                ? 'bg-noche text-tiza'
                : 'bg-tiza text-pizarra border border-cal hover:border-cesped'
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {filas.length === 0 ? (
        <div className="rounded-2xl border border-cal bg-tiza p-12 text-center text-pizarra">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="font-medium text-pizarra">Sin centros con ese filtro</p>
        </div>
      ) : (
        <div className="bg-tiza rounded-2xl shadow-sm border border-cal overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-tiza border-b border-cal">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Local</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Distrito</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Canchas</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Suscripción</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cal">
                {filas.map((c) => (
                  <tr key={c.id} className="hover:bg-tiza">
                    <td className="px-6 py-4 text-sm font-medium text-basalto">{c.nombre}</td>
                    <td className="px-6 py-4 text-sm text-pizarra">{c.distrito}</td>
                    <td className="px-6 py-4 text-sm text-pizarra">{c.totalCanchas}</td>
                    <td className="px-6 py-4">
                      {c.sub?.vigente ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cesped-suave text-cesped-hondo">
                          {c.sub.estado} · {c.sub.fechaFin.slice(0, 10)}
                        </span>
                      ) : c.pendiente ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sol-suave text-basalto">
                          Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-tiza text-pizarra">
                          {c.sub ? c.sub.estado : 'Sin suscripción'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/tecnico/suscripciones"
                        className="text-sm font-semibold text-cesped-hondo hover:underline"
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
