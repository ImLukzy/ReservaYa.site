'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleHelp, Plus, Trash2, Trophy, X } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

interface Inscripcion {
  id: string;
  equipo: string;
  responsable?: string;
}

interface Partido {
  id: string;
  local: string;
  visita: string;
  fecha?: string;
  golesLocal?: number | null;
  golesVisita?: number | null;
}

interface Torneo {
  id: string;
  nombre: string;
  estado: string;
  inscritos: number;
  cupo: number;
  premio: string;
  fechaInicio: string;
  fechaFin: string;
  inscripciones: Inscripcion[];
  partidos: Partido[];
}

function str(v: unknown, fb = ''): string {
  return v === null || v === undefined ? fb : String(v);
}

function num(v: unknown, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function parseTorneos(body: unknown): Torneo[] {
  const arr = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).torneos)
      ? ((body as Record<string, unknown>).torneos as unknown[])
      : body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : [];
  return arr.map((t) => {
    const x = t as Record<string, unknown>;
    const inscRaw = Array.isArray(x.inscripciones) ? (x.inscripciones as Record<string, unknown>[]) : [];
    const partRaw = Array.isArray(x.partidos) ? (x.partidos as Record<string, unknown>[]) : [];
    return {
      id: str(x.id, crypto.randomUUID()),
      nombre: str(x.nombre ?? x.titulo, 'Torneo sin nombre'),
      estado: str(x.estado, 'BORRADOR').toUpperCase(),
      inscritos: num(x.inscritos ?? inscRaw.length, inscRaw.length),
      cupo: num(x.cupo ?? x.capacidad, 0),
      premio: str(x.premio, '—'),
      fechaInicio: str(x.fechaInicio ?? x.inicio),
      fechaFin: str(x.fechaFin ?? x.fin),
      inscripciones: inscRaw.map((i) => ({
        id: str(i.id, crypto.randomUUID()),
        equipo: str(i.equipo ?? i.nombre, 'Equipo'),
        responsable: i.responsable ? str(i.responsable) : undefined,
      })),
      partidos: partRaw.map((p) => ({
        id: str(p.id, crypto.randomUUID()),
        local: str(p.local ?? p.equipoLocal, 'Local'),
        visita: str(p.visita ?? p.equipoVisita, 'Visita'),
        fecha: p.fecha ? str(p.fecha) : undefined,
        golesLocal: p.golesLocal === null || p.golesLocal === undefined ? null : num(p.golesLocal),
        golesVisita: p.golesVisita === null || p.golesVisita === undefined ? null : num(p.golesVisita),
      })),
    };
  });
}

const ESTADOS = ['BORRADOR', 'INSCRIPCIONES', 'EN_CURSO', 'FINALIZADO'] as const;

function badgeEstado(e: string): string {
  if (e === 'EN_CURSO') return 'bg-[#DCFCE7] text-[#15803D]';
  if (e === 'INSCRIPCIONES') return 'bg-[#FEF9C3] text-[#A16207]';
  if (e === 'FINALIZADO') return 'bg-[#F1F0EE] text-[#475569]';
  return 'bg-[#EAB308]/15 text-[#A16207]';
}

function fechaCorta(f: string): string {
  if (!f) return '—';
  const d = new Date(f.length <= 10 ? `${f}T12:00:00` : f);
  if (Number.isNaN(d.getTime())) return f;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

async function api<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `Error ${res.status}`);
  return body as T;
}

const inputCls =
  'mt-1.5 w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30';

export function TorneosPanel() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Torneo | null>(null);
  const [modalInscripcion, setModalInscripcion] = useState(false);
  const [modalPartido, setModalPartido] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const [fTorneo, setFTorneo] = useState({ nombre: '', cupo: '16', premio: '', fechaInicio: '', fechaFin: '' });
  const [fInsc, setFInsc] = useState({ equipo: '', responsable: '' });
  const [fPartido, setFPartido] = useState({ local: '', visita: '', fecha: '' });
  const [fResultado, setFResultado] = useState<{ id: string; gl: string; gv: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/torneos', { credentials: 'include', cache: 'no-store' });
      if (res.status === 404) {
        setTorneos([]);
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setTorneos(parseTorneos(await res.json().catch(() => null)));
    } catch {
      setError('No se pudieron cargar los torneos. Revisa tu conexión e inténtalo de nuevo.');
      setTorneos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const detalle = useMemo(
    () => (seleccionado ? (torneos.find((t) => t.id === seleccionado.id) ?? seleccionado) : null),
    [torneos, seleccionado]
  );

  function refrescarDetalle(list: Torneo[]) {
    if (seleccionado) {
      const act = list.find((t) => t.id === seleccionado.id);
      if (act) setSeleccionado(act);
    }
  }

  async function crearTorneo(e: React.FormEvent) {
    e.preventDefault();
    if (!fTorneo.nombre.trim()) {
      setToast('Ponle un nombre a tu torneo.');
      return;
    }
    setOcupado(true);
    try {
      await api('/api/torneos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: fTorneo.nombre.trim(),
          cupo: Number(fTorneo.cupo) || 0,
          premio: fTorneo.premio.trim() || null,
          fechaInicio: fTorneo.fechaInicio || null,
          fechaFin: fTorneo.fechaFin || null,
        }),
      });
      setToast('Torneo creado.');
      setModalCrear(false);
      setFTorneo({ nombre: '', cupo: '16', premio: '', fechaInicio: '', fechaFin: '' });
      await cargar();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo crear.');
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarEstado(t: Torneo, estado: string) {
    try {
      await api(`/api/torneos/${t.id}`, { method: 'PUT', body: JSON.stringify({ estado }) });
      const list = torneos.map((x) => (x.id === t.id ? { ...x, estado } : x));
      setTorneos(list);
      refrescarDetalle(list);
      setToast(`Torneo en estado ${estado}.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  }

  async function eliminarTorneo(t: Torneo) {
    if (!window.confirm(`¿Eliminar el torneo “${t.nombre}”?`)) return;
    try {
      const res = await fetch(`/api/torneos/${t.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? `Error ${res.status}`);
      }
      setTorneos((prev) => prev.filter((x) => x.id !== t.id));
      setSeleccionado(null);
      setToast('Torneo eliminado.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  async function agregarInscripcion(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle || !fInsc.equipo.trim()) return;
    setOcupado(true);
    try {
      await api(`/api/torneos/${detalle.id}/inscripciones`, {
        method: 'POST',
        body: JSON.stringify({ equipo: fInsc.equipo.trim(), responsable: fInsc.responsable.trim() || null }),
      });
      setToast('Equipo inscrito.');
      setModalInscripcion(false);
      setFInsc({ equipo: '', responsable: '' });
      await cargar();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo inscribir.');
    } finally {
      setOcupado(false);
    }
  }

  async function agregarPartido(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle || !fPartido.local.trim() || !fPartido.visita.trim()) return;
    setOcupado(true);
    try {
      await api(`/api/torneos/${detalle.id}/partidos`, {
        method: 'POST',
        body: JSON.stringify({
          local: fPartido.local.trim(),
          visita: fPartido.visita.trim(),
          fecha: fPartido.fecha || null,
        }),
      });
      setToast('Partido agregado al fixture.');
      setModalPartido(false);
      setFPartido({ local: '', visita: '', fecha: '' });
      await cargar();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo agregar.');
    } finally {
      setOcupado(false);
    }
  }

  async function guardarResultado(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle || !fResultado) return;
    setOcupado(true);
    try {
      await api(`/api/torneos/${detalle.id}/partidos/${fResultado.id}`, {
        method: 'PUT',
        body: JSON.stringify({ golesLocal: Number(fResultado.gl), golesVisita: Number(fResultado.gv) }),
      });
      setToast('Resultado registrado.');
      setFResultado(null);
      await cargar();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo registrar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#EAB308]">🏆 TORNEOS · BETA</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Torneos</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Crea copas relámpago, inscribe equipos y lleva el fixture sin Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ayuda"
            aria-label="Ayuda sobre torneos"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E5E4] bg-white text-[#64748B] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </a>
          <button
            type="button"
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} /> Crear torneo
          </button>
        </div>
      </div>

      {toast && (
        <p role="status" className="mt-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm">
          {toast}
        </p>
      )}

      <div className="mt-4">
        {cargando ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
            <p className="text-center text-sm text-[#64748B]">Cargando torneos…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#0F172A]">{error}</p>
            <button
              type="button"
              onClick={() => void cargar()}
              className="mt-3 rounded-xl border border-[#E7E5E4] px-4 py-2 text-sm font-bold text-[#0F172A] hover:border-[#22C55E]"
            >
              Reintentar
            </button>
          </div>
        ) : torneos.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <EmptyState
              icon={Trophy}
              title="Aún no tienes torneos…"
              description="Crea tu primera copa, define el cupo y el premio, e inscribe a tus equipos."
              action={
                <button
                  type="button"
                  onClick={() => setModalCrear(true)}
                  className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98]"
                >
                  + Crear mi primer torneo
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {torneos.map((t) => (
              <article key={t.id} className="flex flex-col rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-black text-[#0F172A]">{t.nombre}</h2>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', badgeEstado(t.estado))}>
                    {t.estado.replace('_', ' ')}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-[#475569]">
                  <div className="flex justify-between">
                    <dt>Inscritos</dt>
                    <dd className="font-bold text-[#0F172A]">{t.inscritos}{t.cupo > 0 ? `/${t.cupo}` : ''}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Premio</dt>
                    <dd className="font-bold text-[#0F172A]">{t.premio}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Fechas</dt>
                    <dd className="font-bold text-[#0F172A]">{fechaCorta(t.fechaInicio)} – {fechaCorta(t.fechaFin)}</dd>
                  </div>
                </dl>
                {t.cupo > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F1F0EE]">
                    <div
                      className="h-full rounded-full bg-[#22C55E]"
                      style={{ width: `${Math.min(100, Math.round((t.inscritos / t.cupo) * 100))}%` }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSeleccionado(t)}
                  className="mt-4 rounded-xl border border-[#E7E5E4] py-2 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#22C55E] hover:text-[#15803D]"
                >
                  Ver detalle
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Crear torneo">
          <form onSubmit={(e) => void crearTorneo(e)} className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-[#0F172A]">Crear torneo</h2>
              <button type="button" onClick={() => setModalCrear(false)} aria-label="Cerrar" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F0EE]">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#0F172A]">Nombre<input value={fTorneo.nombre} onChange={(e) => setFTorneo((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Copa ReservaYa Verano" className={inputCls} /></label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[#0F172A]">Cupo<input type="number" min={0} value={fTorneo.cupo} onChange={(e) => setFTorneo((f) => ({ ...f, cupo: e.target.value }))} className={inputCls} /></label>
              <label className="block text-sm font-semibold text-[#0F172A]">Premio<input value={fTorneo.premio} onChange={(e) => setFTorneo((f) => ({ ...f, premio: e.target.value }))} placeholder="Ej. S/ 1,000" className={inputCls} /></label>
              <label className="block text-sm font-semibold text-[#0F172A]">Inicio<input type="date" value={fTorneo.fechaInicio} onChange={(e) => setFTorneo((f) => ({ ...f, fechaInicio: e.target.value }))} className={inputCls} /></label>
              <label className="block text-sm font-semibold text-[#0F172A]">Fin<input type="date" value={fTorneo.fechaFin} onChange={(e) => setFTorneo((f) => ({ ...f, fechaFin: e.target.value }))} className={inputCls} /></label>
            </div>
            <button type="submit" disabled={ocupado} className="mt-5 w-full rounded-xl bg-[#22C55E] py-2.5 text-sm font-bold text-white hover:bg-[#16A34A] disabled:opacity-50">
              {ocupado ? 'Creando…' : 'Crear torneo'}
            </button>
            <p className="mt-3 font-mono text-[11px] text-[#94A3B8]">POST /api/torneos</p>
          </form>
        </div>
      )}

      {/* Drawer detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Detalle de ${detalle.nombre}`}>
          <div className="absolute inset-0 bg-slate-950/45" onClick={() => setSeleccionado(null)} aria-hidden />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-[#F5F5F3] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E7E5E4] bg-white p-5">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#EAB308]">TORNEO</p>
                <h2 className="mt-0.5 text-xl font-black text-[#0F172A]">{detalle.nombre}</h2>
                <span className={cn('mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold', badgeEstado(detalle.estado))}>
                  {detalle.estado.replace('_', ' ')}
                </span>
              </div>
              <button type="button" onClick={() => setSeleccionado(null)} aria-label="Cerrar detalle" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F0EE]">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5">
              {/* Estado + eliminar */}
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
                <p className="text-sm font-bold text-[#0F172A]">Estado del torneo</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ESTADOS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => void cambiarEstado(detalle, e)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                        detalle.estado === e ? 'bg-[#0F172A] text-white' : 'bg-[#F1F0EE] text-[#475569] hover:bg-[#E7E5E4]'
                      )}
                    >
                      {e.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[11px] text-[#94A3B8]">PUT /api/torneos/{detalle.id}</p>
                <button type="button" onClick={() => void eliminarTorneo(detalle)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600">
                  <Trash2 size={14} strokeWidth={2} /> Eliminar torneo
                </button>
              </div>

              {/* Inscripciones */}
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#0F172A]">
                    Inscripciones · {detalle.inscritos}{detalle.cupo > 0 ? `/${detalle.cupo}` : ''}
                  </p>
                  <button type="button" onClick={() => setModalInscripcion(true)} className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#16A34A]">
                    + Inscribir
                  </button>
                </div>
                {detalle.inscripciones.length === 0 ? (
                  <p className="mt-2 text-sm text-[#64748B]">Sin equipos inscritos todavía.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#F1F0EE]">
                    {detalle.inscripciones.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                        <p className="text-sm font-semibold text-[#0F172A]">{i.equipo}</p>
                        <p className="text-xs text-[#64748B]">{i.responsable ?? ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Fixture */}
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#0F172A]">Fixture · {detalle.partidos.length} partidos</p>
                  <button type="button" onClick={() => setModalPartido(true)} className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#16A34A]">
                    + Partido
                  </button>
                </div>
                {detalle.partidos.length === 0 ? (
                  <p className="mt-2 text-sm text-[#64748B]">Sin partidos programados todavía.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detalle.partidos.map((p) => (
                      <li key={p.id} className="rounded-xl border border-[#E7E5E4] p-3">
                        <p className="text-sm font-bold text-[#0F172A]">
                          {p.local} <span className="font-normal text-[#94A3B8]">vs</span> {p.visita}
                        </p>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {p.fecha ? fechaCorta(p.fecha) : 'Fecha por definir'}
                          {p.golesLocal !== null && p.golesLocal !== undefined
                            ? ` · ${p.golesLocal} – ${p.golesVisita}`
                            : ' · sin resultado'}
                        </p>
                        {fResultado?.id === p.id ? (
                          <form onSubmit={(e) => void guardarResultado(e)} className="mt-2 flex items-center gap-2">
                            <input value={fResultado.gl} onChange={(e) => setFResultado((f) => (f ? { ...f, gl: e.target.value } : f))} type="number" min={0} aria-label="Goles local" className="w-16 rounded-lg border border-[#E7E5E4] px-2 py-1.5 text-sm" />
                            <span className="text-sm font-bold">–</span>
                            <input value={fResultado.gv} onChange={(e) => setFResultado((f) => (f ? { ...f, gv: e.target.value } : f))} type="number" min={0} aria-label="Goles visita" className="w-16 rounded-lg border border-[#E7E5E4] px-2 py-1.5 text-sm" />
                            <button type="submit" disabled={ocupado} className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                              Guardar
                            </button>
                            <button type="button" onClick={() => setFResultado(null)} className="text-xs font-bold text-[#64748B]">
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <button type="button" onClick={() => setFResultado({ id: p.id, gl: '0', gv: '0' })} className="mt-2 text-xs font-bold text-[#15803D] hover:underline">
                            Registrar resultado
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Modal inscripción */}
      {modalInscripcion && detalle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Agregar inscripción">
          <form onSubmit={(e) => void agregarInscripcion(e)} className="w-full max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-[#0F172A]">Inscribir equipo</h2>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">Equipo<input value={fInsc.equipo} onChange={(e) => setFInsc((f) => ({ ...f, equipo: e.target.value }))} placeholder="Ej. Los Amigos FC" className={inputCls} /></label>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">Responsable (opcional)<input value={fInsc.responsable} onChange={(e) => setFInsc((f) => ({ ...f, responsable: e.target.value }))} placeholder="Ej. 999 888 777" className={inputCls} /></label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setModalInscripcion(false)} className="flex-1 rounded-xl border border-[#E7E5E4] px-4 py-2 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={ocupado} className="flex-1 rounded-xl bg-[#22C55E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Inscribir</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal partido */}
      {modalPartido && detalle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Agregar partido">
          <form onSubmit={(e) => void agregarPartido(e)} className="w-full max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-black text-[#0F172A]">Agregar partido</h2>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">Local<input value={fPartido.local} onChange={(e) => setFPartido((f) => ({ ...f, local: e.target.value }))} placeholder="Ej. Los Amigos FC" className={inputCls} /></label>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">Visita<input value={fPartido.visita} onChange={(e) => setFPartido((f) => ({ ...f, visita: e.target.value }))} placeholder="Ej. Barrio FC" className={inputCls} /></label>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">Fecha (opcional)<input type="date" value={fPartido.fecha} onChange={(e) => setFPartido((f) => ({ ...f, fecha: e.target.value }))} className={inputCls} /></label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setModalPartido(false)} className="flex-1 rounded-xl border border-[#E7E5E4] px-4 py-2 text-sm font-bold">Cancelar</button>
              <button type="submit" disabled={ocupado} className="flex-1 rounded-xl bg-[#22C55E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Agregar</button>
            </div>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
