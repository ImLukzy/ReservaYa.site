'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleHelp, Plus, Trash2, Trophy, X } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputCls } from '@/lib/b2b-theme';
import { cn } from '@/lib/utils';
import {
  ESTADOS_TORNEO,
  ETIQUETA_ESTADO_TORNEO,
  cuerpoResultado,
  lista,
  parseDetalle,
  parseTorneos,
  rutaResultado,
  type Detalle,
  type Torneo,
} from '@/lib/torneos';

interface Complejo {
  id: string;
  nombre: string;
}

function str(v: unknown, fb = ''): string {
  return v === null || v === undefined ? fb : String(v);
}

function badgeEstado(e: string): string {
  if (e === 'EN_CURSO') return 'border border-cesped bg-cesped-suave text-cesped-hondo';
  if (e === 'INSCRIPCIONES_ABIERTAS') return 'border border-dashed border-sol bg-sol-suave text-basalto';
  if (e === 'FINALIZADO' || e === 'CANCELADO') return 'border border-cal bg-piedra text-pizarra';
  return 'border border-dashed border-sol bg-sol-suave text-basalto';
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
    cache: 'no-store',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `Error ${res.status}`);
  return body as T;
}

const TORNEO_VACIO = { complejoId: '', nombre: '', cupoMax: '16', premio: '', fechaInicio: '', fechaFin: '' };

export function TorneosPanel() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [modalInscripcion, setModalInscripcion] = useState(false);
  const [modalPartido, setModalPartido] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const [fTorneo, setFTorneo] = useState(TORNEO_VACIO);
  const [fInsc, setFInsc] = useState({ equipo: '', telefono: '' });
  const [fPartido, setFPartido] = useState({ equipoA: '', equipoB: '', fecha: '' });
  const [fResultado, setFResultado] = useState<{ id: string; ga: string; gb: string } | null>(null);

  // setState solo en callbacks de la promesa; acciones y reintento usan `recargar`.
  const cargar = useCallback(
    () =>
      Promise.all([api<unknown>('/api/torneos'), api<unknown>('/api/complejos').catch(() => null)])
        .then(
          ([bodyTorneos, bodyComplejos]) => {
            setTorneos(parseTorneos(bodyTorneos));
            const cs = lista(bodyComplejos, 'complejos').map((c) => ({ id: str(c.id), nombre: str(c.nombre, 'Complejo') }));
            setComplejos(cs);
            if (cs.length === 1) setFTorneo((f) => ({ ...f, complejoId: f.complejoId || cs[0].id }));
          },
          () => {
            setError('No se pudieron cargar los torneos. Revisa tu conexión e inténtalo de nuevo.');
            setTorneos([]);
          }
        )
        .finally(() => setCargando(false)),
    []
  );

  const recargar = useCallback(() => {
    setCargando(true);
    setError(null);
    return cargar();
  }, [cargar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!modalCrear && !detalle && !modalInscripcion && !modalPartido) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalPartido) setModalPartido(false);
        else if (modalInscripcion) setModalInscripcion(false);
        else if (modalCrear) setModalCrear(false);
        else if (detalle) setDetalle(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalCrear, detalle, modalInscripcion, modalPartido]);

  async function abrirDetalle(id: string) {
    try {
      const d = parseDetalle(await api<unknown>(`/api/torneos/${id}`));
      if (!d) throw new Error('No se pudo abrir el torneo.');
      setDetalle(d);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo abrir el torneo.');
    }
  }

  async function refrescar(id: string) {
    await Promise.all([recargar(), abrirDetalle(id)]);
  }

  async function crearTorneo(e: React.FormEvent) {
    e.preventDefault();
    if (!fTorneo.complejoId) {
      setToast('Elige el complejo del torneo.');
      return;
    }
    if (!fTorneo.nombre.trim() || !fTorneo.fechaInicio) {
      setToast('Ponle un nombre y una fecha de inicio a tu torneo.');
      return;
    }
    setOcupado(true);
    try {
      await api('/api/torneos', {
        method: 'POST',
        body: JSON.stringify({
          complejoId: fTorneo.complejoId,
          nombre: fTorneo.nombre.trim(),
          cupoMax: Number(fTorneo.cupoMax) || undefined,
          premio: fTorneo.premio.trim() || null,
          fechaInicio: fTorneo.fechaInicio,
          fechaFin: fTorneo.fechaFin || null,
        }),
      });
      setToast('Torneo creado.');
      setModalCrear(false);
      setFTorneo({ ...TORNEO_VACIO, complejoId: complejos.length === 1 ? complejos[0].id : '' });
      await recargar();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo crear.');
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarEstado(t: Detalle, estado: string) {
    try {
      await api(`/api/torneos/${t.id}`, { method: 'PUT', body: JSON.stringify({ estado }) });
      setToast(`Torneo en estado «${ETIQUETA_ESTADO_TORNEO[estado] ?? estado}».`);
      await refrescar(t.id);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  }

  async function eliminarTorneo(t: Detalle) {
    if (!window.confirm(`¿Eliminar el torneo “${t.nombre}”?`)) return;
    try {
      await api(`/api/torneos/${t.id}`, { method: 'DELETE' });
      setTorneos((prev) => prev.filter((x) => x.id !== t.id));
      setDetalle(null);
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
        body: JSON.stringify({ equipo: fInsc.equipo.trim(), telefono: fInsc.telefono.trim() || null }),
      });
      setToast('Equipo inscrito.');
      setModalInscripcion(false);
      setFInsc({ equipo: '', telefono: '' });
      await refrescar(detalle.id);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo inscribir.');
    } finally {
      setOcupado(false);
    }
  }

  async function agregarPartido(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle || !fPartido.equipoA.trim() || !fPartido.equipoB.trim()) return;
    setOcupado(true);
    try {
      await api(`/api/torneos/${detalle.id}/partidos`, {
        method: 'POST',
        body: JSON.stringify({
          equipoA: fPartido.equipoA.trim(),
          equipoB: fPartido.equipoB.trim(),
          fecha: fPartido.fecha || null,
        }),
      });
      setToast('Partido agregado al fixture.');
      setModalPartido(false);
      setFPartido({ equipoA: '', equipoB: '', fecha: '' });
      await refrescar(detalle.id);
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
      await api(rutaResultado(fResultado.id), {
        method: 'PUT',
        body: JSON.stringify(cuerpoResultado(fResultado.ga, fResultado.gb)),
      });
      setToast('Resultado registrado.');
      setFResultado(null);
      await refrescar(detalle.id);
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
          <p className="text-[11px] font-bold tracking-[0.14em] text-alerta-hondo">🏆 TORNEOS · BETA</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-basalto">Torneos</h1>
          <p className="mt-1 text-sm text-pizarra">
            Crea copas relámpago, inscribe equipos y lleva el fixture sin Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ayuda"
            aria-label="Ayuda sobre torneos"
            className="btn-tactil flex h-9 w-9 items-center justify-center rounded-full border-2 border-basalto bg-tiza text-pizarra transition-colors hover:text-basalto hover:bg-piedra"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </a>
          <button
            type="button"
            onClick={() => setModalCrear(true)}
            className="btn-tactil flex items-center gap-1.5 rounded-full bg-cesped px-4 py-2.5 text-sm font-bold text-tiza transition-all hover:bg-cesped-hover"
          >
            <Plus size={18} strokeWidth={2.5} /> Crear torneo
          </button>
        </div>
      </div>

      {toast && (
        <p role="status" className="mt-4 rounded-xl border-2 border-basalto bg-tiza px-4 py-3 text-sm font-semibold text-basalto shadow-dura-sm">
          {toast}
        </p>
      )}

      <div className="mt-4">
        {cargando ? (
          <div className="card-tactil p-6">
            <p className="text-center text-sm text-pizarra">Cargando torneos…</p>
          </div>
        ) : error ? (
          <div className="card-tactil p-8 text-center">
            <p className="text-sm font-semibold text-basalto">{error}</p>
            <button
              type="button"
              onClick={() => void recargar()}
              className="btn-tactil mt-3 rounded-full border-2 border-basalto bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra"
            >
              Reintentar
            </button>
          </div>
        ) : torneos.length === 0 ? (
          <div className="card-tactil overflow-hidden">
            <EmptyState
              icon={Trophy}
              title="Aún no tienes torneos…"
              description="Crea tu primera copa, define el cupo y el premio, e inscribe a tus equipos."
              action={
                <button
                  type="button"
                  onClick={() => setModalCrear(true)}
                  className="btn-tactil rounded-full bg-cesped px-4 py-2.5 text-sm font-bold text-tiza transition-all hover:bg-cesped-hover"
                >
                  + Crear mi primer torneo
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {torneos.map((t) => (
              <article key={t.id} className="card-tactil flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-black text-basalto">{t.nombre}</h2>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', badgeEstado(t.estado))}>
                    {ETIQUETA_ESTADO_TORNEO[t.estado] ?? t.estado}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-pizarra">
                  <div className="flex justify-between">
                    <dt>Inscritos</dt>
                    <dd className="font-bold text-basalto">{t.inscritos}{t.cupoMax > 0 ? `/${t.cupoMax}` : ''}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Premio</dt>
                    <dd className="font-bold text-basalto">{t.premio}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Fechas</dt>
                    <dd className="font-bold text-basalto">{fechaCorta(t.fechaInicio)} – {fechaCorta(t.fechaFin)}</dd>
                  </div>
                </dl>
                {t.cupoMax > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-piedra">
                    <div
                      className="h-full rounded-full bg-cesped"
                      style={{ width: `${Math.min(100, Math.round((t.inscritos / t.cupoMax) * 100))}%` }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void abrirDetalle(t.id)}
                  className="btn-tactil mt-4 border-2 border-basalto bg-tiza py-2 text-sm font-bold text-basalto transition-colors hover:bg-piedra hover:text-cesped-hondo"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4" role="dialog" aria-modal="true" aria-label="Crear torneo">
          <form onSubmit={(e) => void crearTorneo(e)} className="w-full max-w-md rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-basalto">Crear torneo</h2>
              <button type="button" onClick={() => setModalCrear(false)} aria-label="Cerrar" className="btn-tactil h-9 w-9 rounded-full border-2 border-basalto bg-tiza p-1.5 text-pizarra hover:text-basalto hover:bg-piedra">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            {complejos.length !== 1 && (
              <label className="mt-4 block text-sm font-semibold text-basalto">Complejo<select value={fTorneo.complejoId} onChange={(e) => setFTorneo((f) => ({ ...f, complejoId: e.target.value }))} className={cn(inputCls, 'mt-1.5', 'bg-tiza')}><option value="">Elige un complejo</option>{complejos.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}</select></label>
            )}
            <label className="mt-4 block text-sm font-semibold text-basalto">Nombre<input value={fTorneo.nombre} onChange={(e) => setFTorneo((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Copa ReservaYa Verano" className={cn(inputCls, 'mt-1.5')} /></label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-basalto">Cupo de equipos<input type="number" min={1} value={fTorneo.cupoMax} onChange={(e) => setFTorneo((f) => ({ ...f, cupoMax: e.target.value }))} className={cn(inputCls, 'mt-1.5')} /></label>
              <label className="block text-sm font-semibold text-basalto">Premio<input value={fTorneo.premio} onChange={(e) => setFTorneo((f) => ({ ...f, premio: e.target.value }))} placeholder="Ej. S/ 1,000" className={cn(inputCls, 'mt-1.5')} /></label>
              <label className="block text-sm font-semibold text-basalto">Inicio<input type="date" required value={fTorneo.fechaInicio} onChange={(e) => setFTorneo((f) => ({ ...f, fechaInicio: e.target.value }))} className={cn(inputCls, 'mt-1.5')} /></label>
              <label className="block text-sm font-semibold text-basalto">Fin<input type="date" value={fTorneo.fechaFin} onChange={(e) => setFTorneo((f) => ({ ...f, fechaFin: e.target.value }))} className={cn(inputCls, 'mt-1.5')} /></label>
            </div>
            <button type="submit" disabled={ocupado} className="btn-tactil mt-5 w-full bg-cesped py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50">
              {ocupado ? 'Creando…' : 'Crear torneo'}
            </button>
          </form>
        </div>
      )}

      {/* Drawer detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Detalle de ${detalle.nombre}`}>
          <div className="absolute inset-0 bg-velo" onClick={() => setDetalle(null)} aria-hidden />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l-2 border-basalto bg-sillar shadow-dura-lg">
            <div className="flex items-start justify-between gap-3 border-b-2 border-basalto bg-tiza p-5">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-alerta-hondo">TORNEO</p>
                <h2 className="mt-0.5 text-xl font-black text-basalto">{detalle.nombre}</h2>
                <span className={cn('mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold', badgeEstado(detalle.estado))}>
                  {ETIQUETA_ESTADO_TORNEO[detalle.estado] ?? detalle.estado}
                </span>
              </div>
              <button type="button" onClick={() => setDetalle(null)} aria-label="Cerrar detalle" className="btn-tactil h-9 w-9 rounded-full border-2 border-basalto bg-tiza p-1.5 text-pizarra hover:text-basalto hover:bg-piedra">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5">
              {/* Estado + eliminar */}
              <div className="card-tactil p-4">
                <p className="text-sm font-bold text-basalto">Estado del torneo</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ESTADOS_TORNEO.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => void cambiarEstado(detalle, e)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                        detalle.estado === e
                          ? 'border-2 border-basalto bg-basalto text-tiza shadow-dura-sm'
                          : 'border-2 border-basalto bg-piedra text-pizarra hover:bg-cal hover:text-basalto'
                      )}
                    >
                      {ETIQUETA_ESTADO_TORNEO[e]}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => void eliminarTorneo(detalle)} className="btn-tactil mt-3 inline-flex items-center gap-1.5 border-2 border-error bg-tiza px-3 py-1.5 text-xs font-bold text-error hover:bg-error-suave hover:text-error-hondo">
                  <Trash2 size={14} strokeWidth={2} /> Eliminar torneo
                </button>
              </div>

              {/* Inscripciones */}
              <div className="card-tactil p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-basalto">
                    Inscripciones · {detalle.inscritos}{detalle.cupoMax > 0 ? `/${detalle.cupoMax}` : ''}
                  </p>
                  <button type="button" onClick={() => setModalInscripcion(true)} className="btn-tactil bg-cesped px-3 py-1.5 text-xs font-bold text-tiza hover:bg-cesped-hover">
                    + Inscribir
                  </button>
                </div>
                {detalle.inscripciones.length === 0 ? (
                  <p className="mt-2 text-sm text-pizarra">Sin equipos inscritos todavía.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-cal">
                    {detalle.inscripciones.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                        <p className="text-sm font-semibold text-basalto">{i.equipo}</p>
                        <p className="text-xs text-pizarra">{i.telefono ?? ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Fixture */}
              <div className="card-tactil p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-basalto">Fixture · {detalle.partidos.length} partidos</p>
                  <button type="button" onClick={() => setModalPartido(true)} className="btn-tactil bg-cesped px-3 py-1.5 text-xs font-bold text-tiza hover:bg-cesped-hover">
                    + Partido
                  </button>
                </div>
                {detalle.partidos.length === 0 ? (
                  <p className="mt-2 text-sm text-pizarra">Sin partidos programados todavía.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detalle.partidos.map((p) => (
                      <li key={p.id} className="rounded-xl border-2 border-basalto bg-tiza p-3 shadow-dura-sm">
                        <p className="text-sm font-bold text-basalto">
                          {p.equipoA} <span className="font-normal text-pizarra">vs</span> {p.equipoB}
                        </p>
                        <p className="mt-0.5 text-xs text-pizarra">
                          {p.fecha ? fechaCorta(p.fecha) : 'Fecha por definir'}
                          {p.golesA !== null && p.golesB !== null
                            ? ` · ${p.golesA} – ${p.golesB}`
                            : ' · sin resultado'}
                        </p>
                        {fResultado?.id === p.id ? (
                          <form onSubmit={(e) => void guardarResultado(e)} className="mt-2 flex items-center gap-2">
                            <input value={fResultado.ga} onChange={(e) => setFResultado((f) => (f ? { ...f, ga: e.target.value } : f))} type="number" min={0} aria-label={`Goles de ${p.equipoA}`} className="w-16 rounded-lg border-2 border-basalto bg-tiza px-2 py-1.5 text-sm text-basalto" />
                            <span className="text-sm font-bold text-basalto">–</span>
                            <input value={fResultado.gb} onChange={(e) => setFResultado((f) => (f ? { ...f, gb: e.target.value } : f))} type="number" min={0} aria-label={`Goles de ${p.equipoB}`} className="w-16 rounded-lg border-2 border-basalto bg-tiza px-2 py-1.5 text-sm text-basalto" />
                            <button type="submit" disabled={ocupado} className="btn-tactil bg-cesped px-3 py-1.5 text-xs font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50">
                              Guardar
                            </button>
                            <button type="button" onClick={() => setFResultado(null)} className="text-xs font-bold text-pizarra hover:text-basalto">
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <button type="button" onClick={() => setFResultado({ id: p.id, ga: String(p.golesA ?? 0), gb: String(p.golesB ?? 0) })} className="mt-2 text-xs font-bold text-cesped-hondo hover:underline">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-velo p-4" role="dialog" aria-modal="true" aria-label="Agregar inscripción">
          <form onSubmit={(e) => void agregarInscripcion(e)} className="w-full max-w-sm rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg">
            <h2 className="text-lg font-black text-basalto">Inscribir equipo</h2>
            <label className="mt-3 block text-sm font-semibold text-basalto">Equipo<input value={fInsc.equipo} onChange={(e) => setFInsc((f) => ({ ...f, equipo: e.target.value }))} placeholder="Ej. Los Amigos FC" className={cn(inputCls, 'mt-1.5')} /></label>
            <label className="mt-3 block text-sm font-semibold text-basalto">Teléfono del capitán (opcional)<input value={fInsc.telefono} onChange={(e) => setFInsc((f) => ({ ...f, telefono: e.target.value }))} inputMode="tel" placeholder="Ej. 999 888 777" className={cn(inputCls, 'mt-1.5')} /></label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setModalInscripcion(false)} className="btn-tactil flex-1 border-2 border-basalto bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra">Cancelar</button>
              <button type="submit" disabled={ocupado} className="btn-tactil flex-1 bg-cesped px-4 py-2 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50">Inscribir</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal partido */}
      {modalPartido && detalle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-velo p-4" role="dialog" aria-modal="true" aria-label="Agregar partido">
          <form onSubmit={(e) => void agregarPartido(e)} className="w-full max-w-sm rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg">
            <h2 className="text-lg font-black text-basalto">Agregar partido</h2>
            <label className="mt-3 block text-sm font-semibold text-basalto">Equipo A<input value={fPartido.equipoA} onChange={(e) => setFPartido((f) => ({ ...f, equipoA: e.target.value }))} placeholder="Ej. Los Amigos FC" className={cn(inputCls, 'mt-1.5')} /></label>
            <label className="mt-3 block text-sm font-semibold text-basalto">Equipo B<input value={fPartido.equipoB} onChange={(e) => setFPartido((f) => ({ ...f, equipoB: e.target.value }))} placeholder="Ej. Barrio FC" className={cn(inputCls, 'mt-1.5')} /></label>
            <label className="mt-3 block text-sm font-semibold text-basalto">Fecha (opcional)<input type="date" value={fPartido.fecha} onChange={(e) => setFPartido((f) => ({ ...f, fecha: e.target.value }))} className={cn(inputCls, 'mt-1.5')} /></label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setModalPartido(false)} className="btn-tactil flex-1 border-2 border-basalto bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra">Cancelar</button>
              <button type="submit" disabled={ocupado} className="btn-tactil flex-1 bg-cesped px-4 py-2 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50">Agregar</button>
            </div>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
