'use client';

import { useRef, useState } from 'react';
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

interface SancionApi extends SancionActiva {
  usuarioId: string;
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
  const sancionesPorComplejo = useRef(new Map<string, SancionApi[]>());

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
      let arr = sancionesPorComplejo.current.get(cid);
      if (!arr) {
        const res = await fetch(`/api/sanciones?complejoId=${cid}&soloActivas=true`, {
          credentials: 'include',
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) return;
        const cargadas: SancionApi[] = Array.isArray(body?.sanciones) ? body.sanciones : [];
        sancionesPorComplejo.current.set(cid, cargadas);
        arr = cargadas;
      }
      setActivas(
        arr
          .filter((s) => s.usuarioId === usuarioId)
          .map((s) => ({
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
      sancionesPorComplejo.current.delete(complejoId);
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
      for (const [cid, sanciones] of sancionesPorComplejo.current) {
        sancionesPorComplejo.current.set(cid, sanciones.filter((s) => s.id !== id));
      }
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
          className="w-full max-w-md rounded-xl border border-borde bg-tiza px-4 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
        />
      </div>
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-cal bg-tiza p-12 text-center text-pizarra">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium text-pizarra">Aún nadie reserva en tus locales</p>
          <p className="text-sm mt-1">Aquí verás a quienes reserven para calificarlos o restringirles el ingreso.</p>
        </div>
      ) : (
        <div className="bg-tiza rounded-2xl shadow-sm border border-cal overflow-hidden">
          <div className="densidad-fija overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-tiza border-b border-cal">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Cliente</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Reservas</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Sanciones</th>
                  <th className="px-6 py-3 text-xs font-semibold text-pizarra uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cal">
                {lista.map((c) => (
                  <tr key={c.id} className="hover:bg-tiza">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-basalto">{c.nombre}</p>
                      <p className="text-xs text-pizarra">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-pizarra">
                      {c.reservas} <span className="text-pizarra">({c.confirmadas} conf.)</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.sancionesActivas > 0 ? (
                        <Badge variant="red">{c.sancionesActivas} activa{c.sancionesActivas === 1 ? '' : 's'}</Badge>
                      ) : (
                        <span className="text-xs text-pizarra">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <HistorialUsuarioBtn id={c.id} nombre={c.nombre} />
                        <button
                          type="button"
                          onClick={() => abrirSancion(c)}
                          className="rounded-lg border border-sol px-3 py-1.5 text-xs font-bold text-sol-hondo transition hover:bg-sol-suave"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-grafito/40 p-4"
          onClick={() => setSancionando(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Sancionar a ${sancionando.nombre}`}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-tiza p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-basalto">{sancionando.nombre}</h3>
            <p className="mt-1 text-sm text-pizarra">
              ADVERTENCIA califica sin bloquear. BLOQUEO impide reservar y avisa en recepción.
            </p>
            {activas.length > 0 && (
              <div className="mt-3 space-y-2">
                {activas.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-error-suave px-3 py-2 text-sm">
                    <p className="font-semibold text-error">
                      {s.nivel} <span className="font-normal">· {s.motivo}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => levantar(s.id)}
                      className="shrink-0 text-xs font-bold text-error hover:underline"
                    >
                      Levantar
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label htmlFor="sanc-complejo" className="mb-1 mt-4 block text-xs font-bold text-basalto">
              Local
            </label>
            <select
              id="sanc-complejo"
              value={complejoId}
              onChange={(e) => {
                setComplejoId(e.target.value);
                if (sancionando) void cargarActivas(sancionando.id, e.target.value);
              }}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto"
            >
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <label htmlFor="sanc-nivel" className="mb-1 mt-3 block text-xs font-bold text-basalto">
              Nivel
            </label>
            <select
              id="sanc-nivel"
              value={nivel}
              onChange={(e) => setNivel(e.target.value as NivelSancion)}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto"
            >
              <option value="ADVERTENCIA">ADVERTENCIA — califica, no bloquea</option>
              <option value="BLOQUEO">BLOQUEO — impide reservar e ingresar</option>
            </select>
            <label htmlFor="sanc-motivo" className="mb-1 mt-3 block text-xs font-bold text-basalto">
              Motivo
            </label>
            <textarea
              id="sanc-motivo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. No se presentó dos veces seguidas…"
              maxLength={300}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto resize-none"
            />
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-error-suave px-3 py-2 text-sm font-semibold text-error">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSancionando(null)}
                className="flex-1 rounded-xl border border-cal py-2.5 text-sm font-bold text-pizarra"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={guardarSancion}
                disabled={guardando || complejos.length === 0}
                className="flex-1 rounded-xl bg-cesped py-2.5 text-sm font-semibold text-tiza transition hover:bg-cesped-hondo disabled:opacity-50"
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
