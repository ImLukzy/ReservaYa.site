'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import type { Suscripcion } from '@/lib/api';

const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  PENDIENTE: 'yellow',
  ACTIVA: 'green',
  VENCIDA: 'gray',
  CANCELADA: 'red',
  RECHAZADA: 'red',
};

export function SuscripcionesPanel({ iniciales }: { iniciales: Suscripcion[] }) {
  const router = useRouter();
  const [lista, setLista] = useState<Suscripcion[]>(iniciales);
  const [accionId, setAccionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function accion(id: string, ruta: 'aprobar' | 'rechazar' | 'cancelar') {
    if (ruta === 'rechazar' || ruta === 'cancelar') {
      const msg =
        ruta === 'rechazar'
          ? '¿Rechazar esta solicitud? El dueño deberá pedirla de nuevo.'
          : '¿Cancelar esta suscripción? El local saldrá del buscador.';
      if (!window.confirm(msg)) return;
    }
    setAccionId(id);
    setError('');
    try {
      const res = await fetch(`/api/suscripciones/${id}/${ruta}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      const s = body?.suscripcion;
      if (s) {
        setLista((prev) =>
          prev.map((x) =>
            x.id === id
              ? {
                  ...x,
                  estado: s.estado,
                  diasRestantes: s.diasRestantes ?? x.diasRestantes,
                  vigente: s.vigente ?? false,
                }
              : x
          )
        );
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción');
    } finally {
      setAccionId(null);
    }
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
        <p className="text-4xl mb-3">🎟️</p>
        <p className="font-medium text-gray-600">Sin suscripciones con ese filtro</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Local</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vence</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{s.complejoNombre || '—'}</p>
                    <p className="text-xs text-gray-400">{s.fechaInicio.slice(0, 10)} → {s.fechaFin.slice(0, 10)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.plan}</td>
                  <td className="px-6 py-4">
                    <Badge variant={estadoBadge[s.estado] ?? 'gray'}>{s.estado}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {s.vigente ? `${s.diasRestantes} días` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {s.estado === 'PENDIENTE' && (
                        <>
                          <button
                            type="button"
                            disabled={accionId === s.id}
                            onClick={() => accion(s.id, 'aprobar')}
                            className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#16A34A] disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={accionId === s.id}
                            onClick={() => accion(s.id, 'rechazar')}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {s.estado === 'ACTIVA' && (
                        <button
                          type="button"
                          disabled={accionId === s.id}
                          onClick={() => accion(s.id, 'cancelar')}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
