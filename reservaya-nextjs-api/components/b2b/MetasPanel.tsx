'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CircleHelp, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn, formatFecha } from '@/lib/utils';
import {
  actualizarMeta,
  B2BApiError,
  crearMeta,
  eliminarMeta,
  getMetas,
  num,
  soles,
  type MetaDto,
  type TipoMeta,
} from '@/lib/b2b-client';

const TIPOS: TipoMeta[] = ['INGRESOS', 'OCUPACION', 'RESERVAS'];

const TIPO_LABEL: Record<string, { label: string; unidad: string }> = {
  INGRESOS: { label: 'Ingresos', unidad: 'S/' },
  OCUPACION: { label: 'Ocupación', unidad: '%' },
  RESERVAS: { label: 'Reservas', unidad: '' },
};

interface HistorialEntry {
  id: string;
  titulo: string;
  tipo: string;
  objetivo: number;
  actual: number;
  completadaEn: string;
}

const HIST_KEY = 'ry-metas-historial';

function leerHistorial(): HistorialEntry[] {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    const arr = raw ? (JSON.parse(raw) as HistorialEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function fmtMeta(v: string, tipo: string) {
  return tipo === 'INGRESOS' ? soles(num(v)) : `${num(v)}${tipo === 'OCUPACION' ? '%' : ''}`;
}

const inputCls =
  'w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25';
const labelCls = 'mb-1 block text-xs font-bold text-[#475569]';
const btnPrimary =
  'rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'rounded-xl border border-[#E7E5E4] bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#22C55E]';

export function MetasPanel({ iniciales }: { iniciales: MetaDto[] }) {
  const [metas, setMetas] = useState<MetaDto[]>(iniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [avance, setAvance] = useState('');
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [histTab, setHistTab] = useState<'semanal' | 'mensual'>('semanal');

  const mesBanner = useMemo(() => {
    const ahora = new Date();
    const nombre = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(ahora);
    return `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} ${ahora.getFullYear()}`;
  }, []);

  const registrarCompletadas = useCallback((lista: MetaDto[]) => {
    const prev = leerHistorial();
    const conocidos = new Set(prev.map((h) => h.id));
    const nuevas = lista
      .filter((m) => {
        const pct = num(m.objetivo) > 0 ? (num(m.actual) / num(m.objetivo)) * 100 : 0;
        return pct >= 100 && !conocidos.has(m.id);
      })
      .map((m) => ({
        id: m.id,
        titulo: m.titulo,
        tipo: m.tipo,
        objetivo: num(m.objetivo),
        actual: num(m.actual),
        completadaEn: new Date().toISOString(),
      }));
    if (nuevas.length > 0) {
      const next = [...nuevas, ...prev].slice(0, 50);
      localStorage.setItem(HIST_KEY, JSON.stringify(next));
      setHistorial(next);
    }
  }, []);

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await getMetas();
      setMetas(res.metas);
      registrarCompletadas(res.metas);
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudieron cargar las metas');
    } finally {
      setCargando(false);
    }
  }, [registrarCompletadas]);

  useEffect(() => {
    setHistorial(leerHistorial());
    void refrescar();
  }, [refrescar]);

  async function guardar(fd: FormData) {
    setGuardando(true);
    setFormError(null);
    try {
      await crearMeta({
        titulo: String(fd.get('titulo') ?? '').trim(),
        tipo: String(fd.get('tipo') ?? 'INGRESOS') as TipoMeta,
        objetivo: Number(fd.get('objetivo') ?? 0),
        periodoInicio: String(fd.get('periodoInicio') ?? ''),
        periodoFin: String(fd.get('periodoFin') ?? ''),
      });
      setModal(false);
      await refrescar();
    } catch (e) {
      setFormError(e instanceof B2BApiError ? e.message : 'No se pudo crear la meta');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarAvance(id: string) {
    setError(null);
    try {
      await actualizarMeta(id, { actual: Number(avance) || 0 });
      setEditando(null);
      setAvance('');
      await refrescar();
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo actualizar el avance');
    }
  }

  async function borrar(id: string, titulo: string) {
    if (!window.confirm(`¿Eliminar la meta «${titulo}»?`)) return;
    try {
      await eliminarMeta(id);
      await refrescar();
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo eliminar la meta');
    }
  }

  const histFiltrado = useMemo(() => {
    const limite = Date.now() - (histTab === 'semanal' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return historial.filter((h) => new Date(h.completadaEn).getTime() >= limite);
  }, [historial, histTab]);

  const hoy = new Date();
  const iniMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const finMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()}`;

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">▦ METAS</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Mis metas</h1>
          <p className="text-sm text-[#64748B]">Define objetivos de ingresos, ocupación y reservas, y sigue tu avance.</p>
        </div>
        <Link
          href="/admin/ayuda"
          aria-label="Ayuda"
          className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-white px-3 text-sm font-bold text-[#64748B] transition-colors hover:border-[#22C55E]"
        >
          <CircleHelp size={18} strokeWidth={1.85} /> Ayuda
        </Link>
      </div>

      {/* Banner */}
      <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#060A08] via-[#0A2E1F] to-[#14532D] p-5 text-white">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#4ADE80]">METAS DE {mesBanner.toUpperCase()}</p>
        <p className="mt-1 text-xl font-black">Define tus metas para empezar 🎯</p>
        <p className="mt-0.5 text-[13px] text-white/65">Un objetivo claro por mes: ingresos, ocupación o reservas.</p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Metas */}
      {cargando && metas.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white p-12 text-center text-sm text-[#64748B]">
          Cargando metas…
        </div>
      ) : metas.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white">
          <EmptyState
            icon={Target}
            title="Aún no defines tus metas"
            description="Empieza con una meta de ingresos del mes y mide tu avance cada semana."
            action={
              <button type="button" onClick={() => setModal(true)} className={btnPrimary}>
                <span className="inline-flex items-center gap-1.5"><Plus size={16} /> Definir mi primera meta</span>
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setModal(true)} className={btnPrimary}>
              <span className="inline-flex items-center gap-1.5"><Plus size={16} /> Nueva meta</span>
            </button>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {metas.map((m) => {
              const obj = num(m.objetivo);
              const act = num(m.actual);
              const pct = obj > 0 ? Math.min(100, Math.round((act / obj) * 100)) : 0;
              const completa = pct >= 100;
              const tipo = TIPO_LABEL[m.tipo] ?? { label: m.tipo, unidad: '' };
              return (
                <div key={m.id} className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]">
                        {tipo.label}
                      </span>
                      <h2 className="mt-2 text-lg font-black text-[#0F172A]">{m.titulo}</h2>
                      <p className="text-xs text-[#64748B]">{formatFecha(m.periodoInicio)} – {formatFecha(m.periodoFin)}</p>
                    </div>
                    <button type="button" onClick={() => borrar(m.id, m.titulo)} aria-label={`Eliminar ${m.titulo}`} className="rounded-lg border border-[#E7E5E4] p-1.5 text-[#CBD5E1] hover:border-red-300 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <p className="text-2xl font-black text-[#0F172A]">{pct}%</p>
                    <p className="text-xs font-semibold text-[#64748B]">{fmtMeta(m.actual, m.tipo)} de {fmtMeta(m.objetivo, m.tipo)}</p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#F1F0EE]">
                    <div className={cn('h-full rounded-full', completa ? 'bg-[#16A34A]' : 'bg-[#22C55E]')} style={{ width: `${pct}%` }} />
                  </div>
                  {completa ? (
                    <p className="mt-3 rounded-xl bg-[#DCFCE7] px-3 py-2 text-sm font-bold text-[#15803D]">🎉 ¡Meta cumplida!</p>
                  ) : editando === m.id ? (
                    <div className="mt-3 flex gap-2">
                      <input type="number" min="0" step="any" value={avance} onChange={(e) => setAvance(e.target.value)} placeholder={m.actual} aria-label="Nuevo avance" className={inputCls} />
                      <button type="button" onClick={() => guardarAvance(m.id)} className={btnPrimary}>Guardar</button>
                      <button type="button" onClick={() => setEditando(null)} className={btnGhost}>X</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setEditando(m.id); setAvance(m.actual); }} className={cn(btnGhost, 'mt-3 w-full')}>
                      <span className="inline-flex items-center gap-1.5"><Pencil size={15} /> Actualizar avance</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Historial */}
      <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-5">
        <h2 className="text-lg font-black text-[#0F172A]">Tu historial</h2>
        <div className="mt-3 inline-flex gap-1 rounded-xl bg-[#F5F5F3] p-1">
          {(['semanal', 'mensual'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setHistTab(t)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-bold capitalize transition-all',
                histTab === t ? 'bg-white text-[#0F172A] shadow' : 'text-[#64748B]'
              )}
            >
              {t === 'semanal' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
        {histFiltrado.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748B]">
            Aún no completas metas {histTab === 'semanal' ? 'esta semana' : 'este mes'}. Cuando llegues al 100% aparecen aquí. 🏁
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[#F1F0EE]">
            {histFiltrado.map((h) => (
              <li key={`${h.id}-${h.completadaEn}`} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-bold text-[#0F172A]">✅ {h.titulo}</p>
                  <p className="text-xs text-[#64748B]">
                    {new Date(h.completadaEn).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} · {TIPO_LABEL[h.tipo]?.label ?? h.tipo}
                  </p>
                </div>
                <p className="font-black text-[#15803D]">{h.tipo === 'INGRESOS' ? soles(h.actual) : h.actual}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[#22C55E]/40 bg-[#DCFCE7] p-4 text-sm leading-relaxed text-[#0F172A]">
        <strong>¿Cómo se calculan?</strong> El progreso es tu avance ÷ objetivo. Para INGRESOS compara soles acumulados,
        para OCUPACIÓN el % de horas reservadas y para RESERVAS la cantidad de reservas del periodo.
        Actualiza tu avance manualmente y el historial de metas cumplidas se guarda en este dispositivo.
      </div>

      {/* Modal nueva meta */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setModal(false)} role="dialog" aria-modal="true" aria-label="Definir meta">
          <div className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#0F172A]">Definir mi meta</h3>
              <button type="button" onClick={() => setModal(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7E5E4] text-[#64748B] hover:border-[#22C55E]">
                <X size={16} />
              </button>
            </div>
            <form action={guardar}>
              <label className={labelCls} htmlFor="meta-titulo">Título</label>
              <input id="meta-titulo" name="titulo" required maxLength={80} placeholder="Ej. Llegar a S/ 8,000 en septiembre" className={inputCls} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="meta-tipo">Tipo</label>
                  <select id="meta-tipo" name="tipo" className={inputCls} defaultValue="INGRESOS">
                    {TIPOS.map((t) => (<option key={t} value={t}>{TIPO_LABEL[t].label}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="meta-objetivo">Objetivo</label>
                  <input id="meta-objetivo" name="objetivo" type="number" min="1" step="any" required placeholder="8000" className={inputCls} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="meta-ini">Periodo inicio</label>
                  <input id="meta-ini" name="periodoInicio" type="date" required defaultValue={iniMes} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="meta-fin">Periodo fin</label>
                  <input id="meta-fin" name="periodoFin" type="date" required defaultValue={finMes} className={inputCls} />
                </div>
              </div>
              {formError && <p className="mt-3 text-sm font-semibold text-red-600">{formError}</p>}
              <button type="submit" disabled={guardando} className={cn(btnPrimary, 'mt-4 w-full')}>
                {guardando ? 'Guardando…' : 'Guardar meta'}
              </button>
            </form>
          </div>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
