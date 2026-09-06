'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { HistorialUsuarioBtn } from '@/components/features/HistorialUsuarioBtn';
import type { ClienteResumen, NivelSancion } from '@/lib/api';

interface ComplejoOpt {
  id: string;
  nombre: string;
}

interface SancionActiva {
  id: string;
  nivel: NivelSancion;
  motivo: string;
}

export function ClientesPanel({
  iniciales,
  complejos,
}: {
  iniciales: ClienteResumen[];
  complejos: ComplejoOpt[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sancionando, setSancionando] = useState<ClienteResumen | null>(null);
  const [complejoId, setComplejoId] = useState('');
  const [nivel, setNivel] = useState<NivelSancion>('ADVERTENCIA');
  const [motivo, setMotivo] = useState('');
  const [activas, setActivas] = useState<SancionActiva[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const lista = iniciales.filter((c) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return `${c.nombre} ${c.email}`.toLowerCase().includes(t);
  });

  async function abrirSancion(c: ClienteResumen) {
    setSancionando(c);
    setMotivo('');
    setNivel('ADVERTENCIA');
    setError('');
    setActivas([]);
    const primero = complejos[0]?.id ?? '';
    setComplejoId(primero);
    if (primero) await cargarActivas(c.id, primero);
  }

  async function cargarActivas(usuarioId: string, cid: string) {
    try {
      const res = await fetch(`/api/sanciones?complejoId=${cid}&soloActivas=true`, {
        credentials: 'include',
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) return;
      const arr = Array.isArray(body?.sanciones) ? body.sanciones : [];
      setActivas(
        arr
          .filter((s: { usuarioId: string }) => s.usuarioId === usuarioId)
          .map((s: { id: string; nivel: NivelSancion; motivo: string }) => ({
            id: s.id,
            nivel: s.nivel,
            motivo: s.motivo,
          }))
      );
    } catch {
      // Sin sanciones visibles.
    }
  }

  async function guardarSancion() {
    if (!sancionando || !complejoId) return;
    if (motivo.trim().length < 3) {
      setError('Explica el motivo (mínimo 3 caracteres).');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('/api/sanciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complejoId,
          usuarioId: sancionando.id,
          nivel,
          motivo: motivo.trim(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setSancionando(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar.');
    } finally {
      setGuardando(false);
    }
  }

  async function levantar(id: string) {
    if (!window.confirm('¿Levantar esta sanción? El jugador volverá a poder reservar.')) return;
    setError('');
    try {
      const res = await fetch(`/api/sanciones/${id}/desactivar`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setActivas((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo levantar.');
    }
  }

  return (
    <div>
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email…"
          maxLength={60}
          className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25"
        />
      </div>
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium text-gray-600">Aún nadie reserva en tus locales</p>
          <p className="text-sm mt-1">Aquí verás a quienes reserven para calificarlos o restringirles el ingreso.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reservas</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Sanciones</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lista.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {c.reservas} <span className="text-gray-400">({c.confirmadas} conf.)</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.sancionesActivas > 0 ? (
                        <Badge variant="red">{c.sancionesActivas} activa{c.sancionesActivas === 1 ? '' : 's'}</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <HistorialUsuarioBtn id={c.id} nombre={c.nombre} />
                        <button
                          type="button"
                          onClick={() => abrirSancion(c)}
                          className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
                        >
                          Calificar / bloquear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sancionando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSancionando(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Sancionar a ${sancionando.nombre}`}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-gray-900">{sancionando.nombre}</h3>
            <p className="mt-1 text-sm text-gray-500">
              ADVERTENCIA califica sin bloquear. BLOQUEO impide reservar y avisa en recepción.
            </p>
            {activas.length > 0 && (
              <div className="mt-3 space-y-2">
                {activas.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-red-700">
                      {s.nivel} <span className="font-normal">· {s.motivo}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => levantar(s.id)}
                      className="shrink-0 text-xs font-bold text-red-600 hover:underline"
                    >
                      Levantar
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label htmlFor="sanc-complejo" className="mb-1 mt-4 block text-xs font-bold text-gray-700">
              Local
            </label>
            <select
              id="sanc-complejo"
              value={complejoId}
              onChange={(e) => {
                setComplejoId(e.target.value);
                if (sancionando) void cargarActivas(sancionando.id, e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
            >
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <label htmlFor="sanc-nivel" className="mb-1 mt-3 block text-xs font-bold text-gray-700">
              Nivel
            </label>
            <select
              id="sanc-nivel"
              value={nivel}
              onChange={(e) => setNivel(e.target.value as NivelSancion)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
            >
              <option value="ADVERTENCIA">ADVERTENCIA — califica, no bloquea</option>
              <option value="BLOQUEO">BLOQUEO — impide reservar e ingresar</option>
            </select>
            <label htmlFor="sanc-motivo" className="mb-1 mt-3 block text-xs font-bold text-gray-700">
              Motivo
            </label>
            <textarea
              id="sanc-motivo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. No se presentó dos veces seguidas…"
              maxLength={300}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 resize-none"
            />
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSancionando(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={guardarSancion}
                disabled={guardando || complejos.length === 0}
                className="flex-1 rounded-xl bg-[#060A08] py-2.5 text-sm font-bold text-white transition hover:bg-[#0A1A11] disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
