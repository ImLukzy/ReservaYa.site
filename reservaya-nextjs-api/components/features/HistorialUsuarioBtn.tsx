'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { formatFecha, formatHora } from '@/lib/utils';
import type { NivelSancion } from '@/lib/api';

interface Historial {
  usuario: { id: string; nombre: string; email: string; rol: string; activo: boolean };
  stats: { reservas: number; confirmadas: number; canceladas: number; sancionesActivas: number };
  reservas: {
    id: string;
    codigo: string;
    fecha: string;
    horaInicio: number;
    horaFin: number;
    estado: string;
    total: string;
    cancha: { nombre: string };
  }[];
  sanciones: {
    id: string;
    complejo: string;
    nivel: NivelSancion;
    motivo: string;
    activa: boolean;
    creadoEn: string;
  }[];
}

const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
};

export function HistorialUsuarioBtn({ id, nombre }: { id: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Historial | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function abrir() {
    setOpen(true);
    setError('');
    if (data) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/usuarios/${id}/historial`, { credentials: 'include' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setData(body as Historial);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
      >
        Historial
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Historial de ${nombre}`}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Historial · {nombre}</h3>
                {data && (
                  <p className="mt-1 text-sm text-gray-500">
                    {data.stats.reservas} reservas · {data.stats.confirmadas} confirmadas ·{' '}
                    {data.stats.sancionesActivas} sanciones activas
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            {cargando && <p className="py-8 text-center text-sm text-gray-400">Cargando…</p>}
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            {data && (
              <div className="space-y-6">
                <section>
                  <h4 className="mb-2 text-sm font-bold text-gray-700">Reservas</h4>
                  {data.reservas.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin reservas.</p>
                  ) : (
                    <div className="divide-y divide-gray-50 rounded-xl border border-gray-100">
                      {data.reservas.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {r.cancha.nombre} · {r.codigo}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFecha(r.fecha)} · {formatHora(r.horaInicio)} - {formatHora(r.horaFin)} · S/ {Number(r.total)}
                            </p>
                          </div>
                          <Badge variant={estadoBadge[r.estado] ?? 'gray'}>{r.estado}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section>
                  <h4 className="mb-2 text-sm font-bold text-gray-700">Sanciones</h4>
                  {data.sanciones.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin sanciones.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.sanciones.map((s) => (
                        <div
                          key={s.id}
                          className={`rounded-xl border p-3 text-sm ${
                            s.activa ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50 opacity-70'
                          }`}
                        >
                          <p className="font-bold text-gray-900">
                            {s.nivel} · {s.complejo}
                            {!s.activa && <span className="ml-2 font-normal text-gray-400">(inactiva)</span>}
                          </p>
                          <p className="mt-0.5 text-gray-600">{s.motivo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
