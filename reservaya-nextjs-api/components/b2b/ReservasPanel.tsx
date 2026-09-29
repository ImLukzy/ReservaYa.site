'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Download,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { codigoMostrado, formatFecha, formatHora } from '@/lib/utils';
import type { Cancha, EstadoReserva, Reserva } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { NovedadCard } from '@/components/b2b/DashboardWidgets';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';

type Tab = 'TODAS' | 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
type Orden = 'proximas' | 'recientes' | 'caras';

const TABS: { id: Tab; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'CONFIRMADA', label: 'Confirmadas' },
  { id: 'CANCELADA', label: 'Canceladas' },
];

const estadoBadge: Record<EstadoReserva, 'green' | 'yellow' | 'red' | 'blue'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
};

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function aInput(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function leerError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? `Error ${res.status}`;
}

export function ReservasPanel({
  reservasIniciales,
  canchas,
}: {
  reservasIniciales: Reserva[];
  canchas: Cancha[];
}) {
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>(reservasIniciales);
  const [tab, setTab] = useState<Tab>('TODAS');
  const [orden, setOrden] = useState<Orden>('proximas');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [accionId, setAccionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!modalAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalAbierto(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalAbierto]);

  // Form nueva reserva
  const hoy = new Date().toISOString().slice(0, 10);
  const [fCancha, setFCancha] = useState('');
  const [fFecha, setFFecha] = useState(hoy);
  const [fInicio, setFInicio] = useState('19:00');
  const [fFin, setFFin] = useState('20:00');
  const [fNotas, setFNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');

  const conteos = useMemo(() => {
    const c: Record<Tab, number> = {
      TODAS: reservas.length,
      PENDIENTE: 0,
      CONFIRMADA: 0,
      CANCELADA: 0,
    };
    for (const r of reservas) {
      if (r.estado === 'PENDIENTE') c.PENDIENTE += 1;
      else if (r.estado === 'CONFIRMADA') c.CONFIRMADA += 1;
      else if (r.estado === 'CANCELADA') c.CANCELADA += 1;
    }
    return c;
  }, [reservas]);

  const visibles = useMemo(() => {
    const lista = reservas.filter((r) => tab === 'TODAS' || r.estado === tab);
    const copia = [...lista];
    if (orden === 'proximas') {
      copia.sort((a, b) => {
        const f = a.fecha.slice(0, 10).localeCompare(b.fecha.slice(0, 10));
        if (f !== 0) return f;
        return a.horaInicio - b.horaInicio;
      });
    } else if (orden === 'recientes') {
      copia.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    } else {
      copia.sort((a, b) => Number(b.total) - Number(a.total));
    }
    return copia;
  }, [reservas, tab, orden]);

  async function recargar() {
    const res = await fetch('/api/reservas', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(await leerError(res));
    const body = await res.json().catch(() => null);
    setReservas(body?.reservas ?? []);
    router.refresh();
  }

  async function cambiarEstado(id: string, estado: EstadoReserva) {
    setAccionId(id);
    setError('');
    try {
      const res = await fetch(`/api/reservas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error(await leerError(res));
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la reserva');
    } finally {
      setAccionId(null);
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm('¿Eliminar esta reserva? Esta acción no se puede deshacer.')) return;
    setAccionId(id);
    setError('');
    try {
      const res = await fetch(`/api/reservas/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await leerError(res));
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la reserva');
    } finally {
      setAccionId(null);
    }
  }

  function exportarCSV() {
    const filas = [
      ['codigo', 'cliente', 'email', 'cancha', 'fecha', 'hora_inicio', 'hora_fin', 'estado', 'total'].join(','),
      ...visibles.map((r) =>
        [
          codigoMostrado(r),
          `"${(r.usuario?.nombre ?? '').replace(/"/g, '""')}"`,
          r.usuario?.email ?? '',
          `"${r.cancha.nombre.replace(/"/g, '""')}"`,
          r.fecha.slice(0, 10),
          formatHora(r.horaInicio),
          formatHora(r.horaFin),
          r.estado,
          Number(r.total),
        ].join(',')
      ),
    ];
    const blob = new Blob([filas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function abrirModal() {
    setFormError('');
    setFCancha((prev) => prev || canchas.find((c) => c.activa)?.id || canchas[0]?.id || '');
    setFFecha(hoy);
    setFNotas('');
    setModalAbierto(true);
  }

  async function crearReserva() {
    setFormError('');
    if (!fCancha) {
      setFormError('Elige una cancha.');
      return;
    }
    const ini = aMinutos(fInicio);
    const fin = aMinutos(fFin);
    if (ini === null || fin === null || fin <= ini) {
      setFormError('Horario inválido: la hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fFecha)) {
      setFormError('Fecha inválida.');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canchaId: fCancha,
          fecha: fFecha,
          horaInicio: ini,
          horaFin: fin,
          notas: fNotas.trim(),
        }),
      });
      if (!res.ok) throw new Error(await leerError(res));
      setModalAbierto(false);
      await recargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear la reserva');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-cesped-hondo">▦ GESTIÓN</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-basalto">Reservas</h1>
          <p className="mt-1 text-sm text-pizarra">
            Consulta y gestiona las reservas de tu complejo, ordenadas por fecha y hora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            disabled={visibles.length === 0}
            className="btn-tactil flex items-center gap-1.5 rounded-full border-2 border-basalto bg-tiza px-4 py-2.5 text-sm font-bold text-basalto transition hover:bg-piedra disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={16} strokeWidth={2} /> Exportar
          </button>
          <button
            type="button"
            onClick={abrirModal}
            className="btn-tactil flex items-center gap-1.5 rounded-full bg-cesped px-4 py-2.5 text-sm font-bold text-tiza transition-all hover:bg-cesped-hover"
          >
            <Plus size={18} strokeWidth={2.5} /> Nueva reserva
          </button>
        </div>
      </div>

      <div className="mt-3">
        <NovedadCard />
      </div>

      {/* Tabs + ordenar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-bold transition',
                tab === t.id
                  ? 'border-2 border-basalto bg-basalto text-tiza shadow-dura-sm'
                  : 'border-2 border-basalto bg-tiza text-pizarra hover:bg-piedra hover:text-basalto'
              )}
            >
              {t.label}{' '}
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 text-xs font-bold',
                  tab === t.id ? 'bg-tiza/20 text-tiza' : 'bg-piedra text-pizarra'
                )}
              >
                {conteos[t.id]}
              </span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-pizarra">
          Ordenar
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="rounded-xl border-2 border-basalto bg-tiza px-3 py-2 text-sm font-semibold text-basalto focus:border-cesped focus:outline-none"
          >
            <option value="proximas">Próximas primero</option>
            <option value="recientes">Recientes</option>
            <option value="caras">Más caras</option>
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border-2 border-error bg-error-suave px-4 py-3 text-sm font-semibold text-error-hondo">
          {error}
        </p>
      )}

      {/* Lista */}
      {visibles.length === 0 ? (
        <div className="card-tactil mt-4 overflow-hidden">
          <EmptyState
            icon={CalendarDays}
            title="Sin reservas en esta categoría"
            description="Todavía no hay reservas con este estado. Crea una reserva manual para empezar."
            action={
              <button
                type="button"
                onClick={abrirModal}
                className="btn-tactil flex items-center gap-1.5 rounded-full bg-cesped px-4 py-2.5 text-sm font-bold text-tiza transition-all hover:bg-cesped-hover"
              >
                <Plus size={16} strokeWidth={2.5} /> Nueva reserva
              </button>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibles.map((r) => {
            const ocupada = accionId === r.id;
            return (
              <li
                key={r.id}
                className="card-tactil p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-basalto">
                      {r.usuario?.nombre ?? 'Cliente sin nombre'}
                    </p>
                    <p className="truncate text-xs text-pizarra">
                      {r.cancha.nombre} · {formatFecha(r.fecha)} · {formatHora(r.horaInicio)} –{' '}
                      {formatHora(r.horaFin)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge>
                      <span className="font-bold text-basalto">S/ {Number(r.total)}</span>
                      <span className="font-mono font-bold tracking-wider text-cesped-hondo">
                        {codigoMostrado(r)}
                      </span>
                    </div>
                    {r.notas && (
                      <p className="mt-1.5 max-w-xl break-words text-xs text-pizarra">
                        Nota: {r.notas}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {r.estado === 'PENDIENTE' && (
                      <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => cambiarEstado(r.id, 'CONFIRMADA')}
                        className="btn-tactil bg-cesped px-3.5 py-2 text-xs font-bold text-tiza hover:bg-cesped-hover disabled:opacity-60"
                      >
                        {ocupada ? 'Guardando…' : 'Confirmar'}
                      </button>
                    )}
                    {(r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA') && (
                      <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => cambiarEstado(r.id, 'CANCELADA')}
                        className="btn-tactil border-2 border-basalto bg-tiza px-3.5 py-2 text-xs font-bold text-pizarra hover:bg-piedra hover:text-basalto disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={ocupada}
                      onClick={() => eliminar(r.id)}
                      aria-label={`Eliminar reserva de ${r.usuario?.nombre ?? 'cliente'}`}
                      title="Eliminar"
                      className="btn-tactil flex items-center gap-1 border-2 border-error bg-tiza px-3 py-2 text-xs font-bold text-error hover:bg-error-suave hover:text-error-hondo disabled:opacity-60"
                    >
                      <Trash2 size={14} strokeWidth={2} /> Eliminar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal nueva reserva */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nueva reserva"
            className="w-full max-w-md rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-basalto">Nueva reserva</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setModalAbierto(false)}
                className="btn-tactil h-11 w-11 rounded-full border-2 border-basalto bg-tiza p-1.5 text-pizarra hover:text-basalto hover:bg-piedra"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="nr-cancha" className="mb-1 block text-xs font-bold text-pizarra">
                  CANCHA
                </label>
                <select
                  id="nr-cancha"
                  value={fCancha}
                  onChange={(e) => setFCancha(e.target.value)}
                  className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
                >
                  <option value="">Selecciona una cancha</option>
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.activa}>
                      {c.nombre} · S/ {Number(c.precioPorHora)}/h{c.activa ? '' : ' (inactiva)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nr-fecha" className="mb-1 block text-xs font-bold text-pizarra">
                  FECHA
                </label>
                <input
                  id="nr-fecha"
                  type="date"
                  value={fFecha}
                  onChange={(e) => setFFecha(e.target.value)}
                  className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="nr-ini" className="mb-1 block text-xs font-bold text-pizarra">
                    HORA INICIO
                  </label>
                  <input
                    id="nr-ini"
                    type="time"
                    value={fInicio}
                    onChange={(e) => setFInicio(e.target.value)}
                    className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
                  />
                </div>
                <div>
                  <label htmlFor="nr-fin" className="mb-1 block text-xs font-bold text-pizarra">
                    HORA FIN
                  </label>
                  <input
                    id="nr-fin"
                    type="time"
                    value={fFin}
                    onChange={(e) => setFFin(e.target.value)}
                    className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="nr-notas" className="mb-1 block text-xs font-bold text-pizarra">
                  NOTAS
                </label>
                <textarea
                  id="nr-notas"
                  value={fNotas}
                  onChange={(e) => setFNotas(e.target.value)}
                  placeholder="Cliente, teléfono, anticipo…"
                  rows={3}
                  className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
                />
              </div>
              {formError && (
                <p role="alert" className="rounded-xl border border-error bg-error-suave px-3 py-2.5 text-xs font-semibold text-error-hondo">
                  {formError}
                </p>
              )}
              {canchas.length === 0 && (
                <p className="rounded-xl border border-sol bg-sol-suave px-3 py-2.5 text-xs font-semibold text-basalto">
                  Aún no tienes canchas. Agrega una desde{' '}
                  <a href="/admin/canchas" className="underline">
                    Canchas
                  </a>
                  .
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="btn-tactil flex-1 border-2 border-basalto bg-tiza py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={crearReserva}
                disabled={guardando}
                className="btn-tactil flex-1 bg-cesped py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-60"
              >
                {guardando ? 'Guardando…' : 'Guardar reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}

// Re-export para páginas que necesiten el formateador de inputs de hora.
export { aInput };
