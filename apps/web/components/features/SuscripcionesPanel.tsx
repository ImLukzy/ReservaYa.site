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
      <div className="rounded-2xl border border-cal bg-tiza p-12 text-center text-pizarra">
        <p className="text-4xl mb-3">🎟️</p>
        <p className="font-medium text-pizarra">Sin suscripciones con ese filtro</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-error-suave px-4 py-3 text-sm font-semibold text-error">
          {error}
        </p>
      )}
      <div className="bg-tiza rounded-2xl shadow-sm border border-cal overflow-hidden">
        <div className="densidad-fija overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-tiza border-b border-cal">
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Local</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Plan</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Vence</th>
                <th className="px-6 py-3 text-xs font-semibold text-pizarra uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal">
              {lista.map((s) => (
                <tr key={s.id} className="hover:bg-tiza">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-basalto">{s.complejoNombre || '—'}</p>
                    <p className="text-xs text-pizarra">{s.fechaInicio.slice(0, 10)} → {s.fechaFin.slice(0, 10)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-pizarra">{s.plan}</td>
                  <td className="px-6 py-4">
                    <Badge variant={estadoBadge[s.estado] ?? 'gray'}>{s.estado}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-pizarra">
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
                            className="rounded-lg bg-cesped px-3 py-1.5 text-xs font-bold text-tiza transition hover:bg-cesped-hover disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={accionId === s.id}
                            onClick={() => accion(s.id, 'rechazar')}
                            className="rounded-lg border border-cal px-3 py-1.5 text-xs font-bold text-pizarra transition hover:bg-tiza disabled:opacity-50"
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
                          className="rounded-lg border border-error px-3 py-1.5 text-xs font-bold text-error transition hover:bg-error-suave disabled:opacity-50"
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
