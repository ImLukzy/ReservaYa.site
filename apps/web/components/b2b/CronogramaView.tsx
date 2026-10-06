'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { codigoMostrado, formatFecha, formatHora } from '@/lib/utils';
import type { Cancha, EstadoReserva, Reserva, UsuarioReserva } from '@/lib/api';
import type { ComplejoResumen } from '@/lib/b2b-api';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

type Vista = 'dia' | 'semana' | 'mes' | 'horarios';
type FiltroEstado = 'TODOS' | EstadoReserva;

export type CanchaCronograma = Pick<Cancha, 'id' | 'nombre' | 'precioPorHora' | 'complejoId'>;
export type ReservaCronograma = Pick<
  Reserva,
  'id' | 'codigo' | 'canchaId' | 'fecha' | 'horaInicio' | 'horaFin' | 'estado' | 'total' | 'notas'
> & {
  cancha: Pick<Cancha, 'nombre'>;
  usuario: Pick<UsuarioReserva, 'nombre'> | null;
};
export type ComplejoCronograma = Pick<ComplejoResumen, 'id' | 'nombre'>;

const ESTADOS: { id: FiltroEstado; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDIENTE', label: 'Pendiente' },
  { id: 'CONFIRMADA', label: 'Confirmada' },
  { id: 'COMPLETADA', label: 'Completada' },
  { id: 'CANCELADA', label: 'Cancelada' },
];

const HORA_PX = 52;
const HORAS = Array.from({ length: 24 }, (_, h) => h); // 12:00 a.m. – 11:00 p.m.

function esBloqueo(r: ReservaCronograma): boolean {
  return (r.notas ?? '').includes('[BLOQUEO]');
}

function diaISO(r: ReservaCronograma): string {
  return String(r.fecha).slice(0, 10);
}

function parseDia(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sumarDias(iso: string, n: number): string {
  const d = parseDia(iso);
  d.setDate(d.getDate() + n);
  return aISO(d);
}

function lunesDe(iso: string): string {
  const d = parseDia(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return aISO(d);
}

function fechaLarga(iso: string): string {
  const s = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDia(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hora12(h: number): string {
  if (h === 0) return '12:00 a.m.';
  if (h < 12) return `${h}:00 a.m.`;
  if (h === 12) return '12:00 p.m.';
  return `${h - 12}:00 p.m.`;
}

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

async function leerError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? `Error ${res.status}`;
}

function estiloBloque(r: ReservaCronograma): string {
  if (esBloqueo(r)) return 'border-l-4 border-double border-alerta bg-alerta-suave text-alerta-hondo';
  switch (r.estado) {
    case 'CONFIRMADA':
      return 'border-l-4 border-solid border-cesped bg-cesped-suave text-cesped-hondo';
    case 'PENDIENTE':
      return 'border-l-4 border-dashed border-sol bg-sol-suave text-basalto';
    case 'COMPLETADA':
      return 'border-l-4 border-solid border-borde bg-piedra text-pizarra';
    case 'CANCELADA':
      return 'border-l-4 border-dotted border-error bg-error-suave text-error line-through decoration-error/50';
  }
}

function badgeTextoEstado(r: ReservaCronograma): string {
  if (esBloqueo(r)) return '⛔ BLOQUEO';
  switch (r.estado) {
    case 'CONFIRMADA':
      return '✓ CONFIRMADA';
    case 'PENDIENTE':
      return '⏳ PENDIENTE';
    case 'COMPLETADA':
      return '✓✓ COMPLETADA';
    case 'CANCELADA':
      return '✕ CANCELADA';
  }
}

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const aHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const SIN_HORARIO = 'Sin horario: se genera Lun–Dom 08:00–21:00 con la primera reserva.';

export function CronogramaView({
  canchas,
  reservasIniciales,
  complejos,
  fechaInicial,
}: {
  canchas: CanchaCronograma[];
  reservasIniciales: ReservaCronograma[];
  complejos: ComplejoCronograma[];
  fechaInicial?: string;
}) {
  const router = useRouter();
  const hoyISO = new Date().toISOString().slice(0, 10);
  const [reservas, setReservas] = useState<ReservaCronograma[]>(reservasIniciales);
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO);
  const [vista, setVista] = useState<Vista>('dia');
  const [fEstado, setFEstado] = useState<FiltroEstado>('TODOS');
  const [fComplejo, setFComplejo] = useState('todos');
  const [fCancha, setFCancha] = useState('todas');
  const [mostrarBloqueos, setMostrarBloqueos] = useState(true);
  const [detalle, setDetalle] = useState<ReservaCronograma | null>(null);
  const [modal, setModal] = useState<null | 'nueva' | 'bloqueo'>(null);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState('');

  // Form compartido (nueva reserva / bloqueo)
  const [mCancha, setMCancha] = useState('');
  const [mFecha, setMFecha] = useState(fecha);
  const [mInicio, setMInicio] = useState('19:00');
  const [mFin, setMFin] = useState('20:00');
  const [mNotas, setMNotas] = useState('');
  const [mMotivo, setMMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');
  const [horarioTxt, setHorarioTxt] = useState<string | null>(null);
  const [horarioRows, setHorarioRows] = useState<{ dia: number; ap: number; ci: number; activo: boolean }[]>([]);

  // Estado para gestión de horarios (vista horarios)
  const [horarioComplejoId, setHorarioComplejoId] = useState('');
  const [horarioCanchaId, setHorarioCanchaId] = useState('');
  const [horarioDias, setHorarioDias] = useState<{ dia: number; apertura: string; cierre: string; activo: boolean }[]>(
    Array.from({ length: 7 }, (_, dia) => ({ dia, apertura: '08:00', cierre: '21:00', activo: true }))
  );
  const [horarioCargando, setHorarioCargando] = useState(false);
  const [horarioGuardando, setHorarioGuardando] = useState(false);
  const [horarioMsg, setHorarioMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  // Scroll a 08:00 y hora actual
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [minutoActual, setMinutoActual] = useState<number | null>(null);

  useEffect(() => {
    function actualizarMinutos() {
      const d = new Date();
      setMinutoActual(d.getHours() * 60 + d.getMinutes());
    }
    actualizarMinutos();
    const timer = setInterval(actualizarMinutos, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (vista === 'dia' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * HORA_PX;
    }
  }, [vista]);

  // Teclado: Escape cierra drawer y modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (modal) setModal(null);
        else if (detalle) setDetalle(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, detalle]);

  // Cancha sin local: no hay horario que pedir (se genera con la primera reserva).
  const modalSinLocal = Boolean(modal && mCancha) && !canchas.find((c) => c.id === mCancha)?.complejoId;
  const horarioTexto = modalSinLocal ? SIN_HORARIO : horarioTxt;

  // Horario operativo de la cancha elegida (se genera solo Lun–Dom 08:00–21:00).
  useEffect(() => {
    if (!modal || !mCancha) return;
    const cid = canchas.find((c) => c.id === mCancha)?.complejoId ?? null;
    if (!cid) return;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/horarios?complejoId=${cid}`, { credentials: 'include' });
        const body = await res.json().catch(() => null);
        const rows: { diaSemana: number; aperturaMin: number; cierreMin: number; activo: boolean }[] =
          Array.isArray(body?.horarios) ? body.horarios : [];
        if (!vivo) return;
        if (rows.length === 0) {
          setHorarioTxt(SIN_HORARIO);
          setHorarioRows([]);
          return;
        }
        setHorarioRows(rows.map((r) => ({ dia: r.diaSemana, ap: r.aperturaMin, ci: r.cierreMin, activo: r.activo })));
        const partes: string[] = [];
        let ini = 0;
        const chave = (r: (typeof rows)[number]) => (r.activo ? `${aHHMM(r.aperturaMin)}–${aHHMM(r.cierreMin)}` : 'cerrado');
        const orden = [...rows].sort((a, b) => a.diaSemana - b.diaSemana);
        while (ini < orden.length) {
          let fin = ini;
          while (fin + 1 < orden.length && chave(orden[fin + 1]) === chave(orden[ini])) fin++;
          const dias = ini === fin
            ? DIAS_CORTO[orden[ini].diaSemana]
            : `${DIAS_CORTO[orden[ini].diaSemana]}–${DIAS_CORTO[orden[fin].diaSemana]}`;
          partes.push(`${dias} ${chave(orden[ini])}`);
          ini = fin + 1;
        }
        setHorarioTxt(`Horario: ${partes.join(' · ')}`);
      } catch {
        if (vivo) setHorarioTxt(null);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [modal, mCancha, canchas]);

  // Cargar horarios al cambiar complejo/cancha en vista horarios
  useEffect(() => {
    if (vista !== 'horarios' || !horarioComplejoId) return;
    let vivo = true;
    (async () => {
      try {
        const qs = horarioCanchaId
          ? `?complejoId=${horarioComplejoId}&canchaId=${horarioCanchaId}`
          : `?complejoId=${horarioComplejoId}`;
        const res = await fetch(`/api/horarios${qs}`, { credentials: 'include' });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
        const rows: { diaSemana: number; aperturaMin: number; cierreMin: number; activo: boolean }[] =
          Array.isArray(body?.horarios) ? body.horarios : [];
        if (!vivo) return;
        if (rows.length === 0) {
          setHorarioDias(
            Array.from({ length: 7 }, (_, dia) => ({ dia, apertura: '08:00', cierre: '21:00', activo: false }))
          );
        } else {
          const porDia = new Map(rows.map((r) => [r.diaSemana, r]));
          setHorarioDias(
            Array.from({ length: 7 }, (_, dia) => {
              const r = porDia.get(dia);
              return r
                ? { dia, apertura: aHHMM(r.aperturaMin), cierre: aHHMM(r.cierreMin), activo: r.activo }
                : { dia, apertura: '08:00', cierre: '21:00', activo: false };
            })
          );
        }
      } catch (e) {
        if (vivo) setHorarioMsg({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo cargar' });
      } finally {
        if (vivo) setHorarioCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [vista, horarioComplejoId, horarioCanchaId, canchas]);

  function marcarCargaHorario() {
    setHorarioCargando(true);
    setHorarioMsg(null);
  }

  function cambiarVista(v: Vista) {
    if (v === 'horarios' && vista !== 'horarios' && horarioComplejoId) marcarCargaHorario();
    setVista(v);
  }

  const canchasPorId = useMemo(() => new Map(canchas.map((c) => [c.id, c])), [canchas]);

  const canchasVisibles = useMemo(() => {
    if (fComplejo === 'todos') return canchas;
    return canchas.filter((c) => (c.complejoId ?? '') === fComplejo);
  }, [canchas, fComplejo]);

  const idsCanchasVisibles = useMemo(() => new Set(canchasVisibles.map((c) => c.id)), [canchasVisibles]);

  const filtradas = useMemo(() => {
    return reservas.filter((r) => {
      if (!mostrarBloqueos && esBloqueo(r)) return false;
      if (fEstado !== 'TODOS' && r.estado !== fEstado) return false;
      if (fCancha !== 'todas' && r.canchaId !== fCancha) return false;
      if (!idsCanchasVisibles.has(r.canchaId)) {
        if (fComplejo !== 'todos' || fCancha !== 'todas') return false;
      }
      return true;
    });
  }, [reservas, mostrarBloqueos, fEstado, fCancha, fComplejo, idsCanchasVisibles]);

  const porDia = useMemo(() => {
    const map = new Map<string, ReservaCronograma[]>();
    for (const r of filtradas) {
      const d = diaISO(r);
      const arr = map.get(d);
      if (arr) arr.push(r);
      else map.set(d, [r]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.horaInicio - b.horaInicio);
    return map;
  }, [filtradas]);

  const delDia = useMemo(() => porDia.get(fecha) ?? [], [porDia, fecha]);
  const nReservasDia = useMemo(() => delDia.filter((r) => !esBloqueo(r)).length, [delDia]);
  const nBloqueosDia = useMemo(() => delDia.filter(esBloqueo).length, [delDia]);

  const semana = useMemo(() => {
    const ini = lunesDe(fecha);
    return Array.from({ length: 7 }, (_, i) => sumarDias(ini, i));
  }, [fecha]);

  const mesGrid = useMemo(() => {
    const base = parseDia(fecha);
    const primer = new Date(base.getFullYear(), base.getMonth(), 1);
    const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const inicio = lunesDe(aISO(primer));
    const dias: string[] = [];
    let cur = inicio;
    for (let i = 0; i < 42; i++) {
      dias.push(cur);
      if (cur === aISO(ultimo) && (i + 1) % 7 === 0) break;
      cur = sumarDias(cur, 1);
    }
    return dias;
  }, [fecha]);

  const nombreMes = useMemo(() => {
    const s = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(parseDia(fecha));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [fecha]);

  function desplazar(dir: 1 | -1) {
    if (vista === 'horarios') return;
    if (vista === 'dia') setFecha((f) => sumarDias(f, dir));
    else if (vista === 'semana') setFecha((f) => sumarDias(f, 7 * dir));
    else {
      const d = parseDia(fecha);
      setFecha(aISO(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
    }
  }

  async function recargar() {
    const res = await fetch('/api/reservas', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(await leerError(res));
    const body = await res.json().catch(() => null);
    setReservas(body?.reservas ?? []);
    router.refresh();
  }

  async function cambiarEstado(r: ReservaCronograma, estado: EstadoReserva) {
    setAccionando(true);
    setError('');
    try {
      const res = await fetch(`/api/reservas/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error(await leerError(res));
      setDetalle(null);
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la reserva');
    } finally {
      setAccionando(false);
    }
  }

  function abrirModal(kind: 'nueva' | 'bloqueo', presetFecha?: string, presetHora?: number) {
    setFormError('');
    setHorarioTxt(null);
    setHorarioRows([]);
    setMCancha((prev) => prev || canchasVisibles[0]?.id || canchas[0]?.id || '');
    setMFecha(presetFecha ?? fecha);
    if (presetHora !== undefined) {
      const h = Math.floor(presetHora / 60);
      setMInicio(`${String(h).padStart(2, '0')}:00`);
      setMFin(`${String(Math.min(23, h + 1)).padStart(2, '0')}:00`);
    }
    setMNotas('');
    setMMotivo('');
    setModal(kind);
  }

  async function guardar() {
    setFormError('');
    if (!mCancha) {
      setFormError('Elige una cancha.');
      return;
    }
    const ini = aMinutos(mInicio);
    const fin = aMinutos(mFin);
    if (ini === null || fin === null || fin <= ini) {
      setFormError('Horario inválido: la hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mFecha)) {
      setFormError('Fecha inválida.');
      return;
    }
    if (!modalSinLocal && horarioRows.length > 0) {
      const dow = new Date(`${mFecha}T12:00:00`).getDay();
      const row = horarioRows.find((r) => r.dia === dow);
      if (!row || !row.activo) {
        setFormError(`Cerrado ese día (${DIAS_CORTO[dow]}).`);
        return;
      }
      if (ini < row.ap || fin > row.ci) {
        setFormError(`Fuera de horario (${aHHMM(row.ap)}–${aHHMM(row.ci)}).`);
        return;
      }
    }
    const esBloq = modal === 'bloqueo';
    if (esBloq && !mMotivo.trim()) {
      setFormError('Indica el motivo del bloqueo.');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canchaId: mCancha,
          fecha: mFecha,
          horaInicio: ini,
          horaFin: fin,
          notas: esBloq ? `[BLOQUEO] ${mMotivo.trim()}` : mNotas.trim(),
        }),
      });
      if (!res.ok) throw new Error(await leerError(res));
      if (esBloq) {
        const body = await res.json().catch(() => null);
        const id: string | undefined = body?.reserva?.id;
        if (id) {
          const patch = await fetch(`/api/reservas/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ estado: 'CANCELADA' }),
          });
          if (!patch.ok) throw new Error(await leerError(patch));
        } else {
          await recargar();
          const listaRes = await fetch('/api/reservas', { credentials: 'include', cache: 'no-store' });
          const listaBody: { reservas?: ReservaCronograma[] } | null = await listaRes.json().catch(() => null);
          const hallada = listaBody?.reservas?.find(
            (r) => r.canchaId === mCancha && diaISO(r) === mFecha && r.horaInicio === ini && (r.notas ?? '').includes('[BLOQUEO]')
          );
          if (hallada) {
            await fetch(`/api/reservas/${hallada.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ estado: 'CANCELADA' }),
            });
          }
        }
      }
      setModal(null);
      await recargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarHorarios() {
    setHorarioMsg(null);
    const payload = [];
    for (const d of horarioDias) {
      const ap = aMinutos(d.apertura);
      const ci = aMinutos(d.cierre);
      if (ap === null || ci === null || ci <= ap) {
        setHorarioMsg({ ok: false, texto: `Horario inválido el ${DIAS_CORTO[d.dia]}.` });
        return;
      }
      payload.push({ dia: d.dia, apertura: ap, cierre: ci, activo: d.activo });
    }
    setHorarioGuardando(true);
    try {
      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complejoId: horarioComplejoId,
          canchaId: horarioCanchaId === '' ? null : horarioCanchaId,
          dias: payload,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setHorarioMsg({ ok: true, texto: 'Horario guardado. Aplica a nuevas reservas.' });
    } catch (e) {
      setHorarioMsg({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar' });
    } finally {
      setHorarioGuardando(false);
    }
  }

  function setHorarioDia(dia: number, patch: Partial<{ dia: number; apertura: string; cierre: string; activo: boolean }>) {
    setHorarioDias((prev) => prev.map((d) => (d.dia === dia ? { ...d, ...patch } : d)));
  }

  // Vista Día
  function renderVistaDia() {
    if (canchas.length === 0) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="Sin canchas para mostrar"
          description="Agrega tu primera cancha para activar el cronograma operativo del día."
          action={
            <a
              href="/admin/canchas"
              className="btn-tactil bg-cesped px-4 py-2.5 font-display text-sm font-bold text-tiza hover:bg-cesped-hover"
            >
              Agregar cancha
            </a>
          }
        />
      );
    }

    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-cal bg-tiza shadow-suave">
            {/* Encabezado sticky */}
            <div className="sticky top-0 z-20 flex border-b border-cal bg-piedra font-display text-[11px] font-bold tracking-wider text-pizarra uppercase">
              <div className="w-24 shrink-0 border-r border-cal px-3 py-2 text-right">
                Hora
              </div>
              <div className="flex-1 px-4 py-2">
                Reservas y bloqueos
              </div>
            </div>

            {/* Contenedor de alto fijo con scroll a 08:00 */}
            <div
              ref={scrollContainerRef}
              tabIndex={0}
              role="region"
              aria-label="Grilla horaria de 00:00 a 23:00"
              className="relative h-[580px] overflow-y-auto focus-visible:outline-none"
            >
              <div className="flex">
                <div className="w-24 shrink-0 border-r border-cal bg-piedra">
                  {HORAS.map((h) => (
                    <div
                      key={h}
                      className="pr-2 text-right font-display text-[11px] font-semibold tabular-nums text-pizarra"
                      style={{ height: HORA_PX, lineHeight: `${HORA_PX}px` }}
                    >
                      {hora12(h)}
                    </div>
                  ))}
                </div>
                <div className="relative min-w-0 flex-1">
                  {HORAS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-label={`Reservar ${hora12(h)}`}
                      title={`${hora12(h)} · Nueva reserva`}
                      onClick={() => abrirModal('nueva', fecha, h * 60)}
                      className="block w-full border-b border-cal/60 transition-colors hover:bg-cesped-suave/40 focus-visible:bg-cesped-suave/50 focus-visible:outline-none"
                      style={{ height: HORA_PX }}
                    />
                  ))}
                  {/* Hora actual marcada */}
                  {fecha === hoyISO && minutoActual !== null && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: (minutoActual / 60) * HORA_PX }}
                      aria-label="Hora actual"
                    >
                      <span className="h-2.5 w-2.5 -ml-1 rounded-full bg-error ring-2 ring-tiza" />
                      <span className="h-[2px] flex-1 bg-error" />
                    </div>
                  )}
                  {delDia.map((r) => {
                    const top = (r.horaInicio / 60) * HORA_PX;
                    const height = Math.max(32, ((r.horaFin - r.horaInicio) / 60) * HORA_PX - 4);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDetalle(r)}
                        style={{ top, height }}
                        className={cn(
                          'absolute right-2 left-2 overflow-hidden rounded-xl border-l-4 p-2 text-left shadow-suave-sm transition hover:brightness-95 focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-cesped focus-visible:outline-none',
                          estiloBloque(r)
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate font-display text-xs font-bold">
                            {esBloqueo(r) ? '⛔ Bloqueo' : (r.usuario?.nombre ?? 'Cliente')} ·{' '}
                            {canchasPorId.get(r.canchaId)?.nombre ?? r.cancha.nombre}
                          </p>
                          <span className="shrink-0 rounded px-1 text-[9px] font-display font-bold uppercase tracking-wider">
                            {badgeTextoEstado(r)}
                          </span>
                        </div>
                        <p className="font-display text-[11px] font-semibold tabular-nums opacity-90">
                          {formatHora(r.horaInicio)} – {formatHora(r.horaFin)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Leyenda accesible: distinguible también sin color */}
            <div className="flex flex-wrap items-center gap-4 border-t border-cal bg-tiza px-4 py-3 text-[11px] font-semibold text-pizarra">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-solid border-cesped bg-cesped-suave" /> [✓] Confirmada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-dashed border-sol bg-sol-suave" /> [⏳] Pendiente</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-solid border-borde bg-piedra" /> [✓✓] Completada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-dotted border-error bg-error-suave" /> [✕] Cancelada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-double border-alerta bg-alerta-suave" /> [⛔] Bloqueo</span>
            </div>
          </div>
    );
  }

  // Vista Horarios
  function renderVistaHorarios() {
    return (
      <div className="mt-3">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cr-h-complejo" className="mb-1 block font-display text-xs font-bold text-pizarra">Local</label>
            <select
              id="cr-h-complejo"
              value={horarioComplejoId}
              onChange={(e) => {
                marcarCargaHorario();
                setHorarioComplejoId(e.target.value);
                setHorarioCanchaId('');
              }}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm font-semibold text-basalto focus:outline-none"
            >
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cr-h-cancha" className="mb-1 block font-display text-xs font-bold text-pizarra">
              Aplica a <span className="font-normal text-pizarra/70">(vacío = todo el local)</span>
            </label>
            <select
              id="cr-h-cancha"
              value={horarioCanchaId}
              onChange={(e) => {
                marcarCargaHorario();
                setHorarioCanchaId(e.target.value);
              }}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm font-semibold text-basalto focus:outline-none"
            >
              <option value="">Todo el local</option>
              {canchasVisibles.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {horarioCargando ? (
          <p className="py-8 text-center text-sm text-pizarra">Cargando horario…</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-cal bg-tiza shadow-suave">
            {horarioDias.map((d) => (
              <div
                key={d.dia}
                className="flex flex-wrap items-center gap-3 border-b border-cal px-4 py-3 last:border-0"
              >
                <p className="w-24 font-display text-sm font-bold text-basalto">{DIAS_CORTO[d.dia]}</p>
                <label className="flex items-center gap-2 text-sm text-pizarra">
                  <input
                    type="checkbox"
                    checked={d.activo}
                    onChange={(e) => setHorarioDia(d.dia, { activo: e.target.checked })}
                    className="h-4 w-4 accent-cesped"
                  />
                  Abierto
                </label>
                <input
                  type="time"
                  value={d.apertura}
                  disabled={!d.activo}
                  onChange={(e) => setHorarioDia(d.dia, { apertura: e.target.value })}
                  className="rounded-lg border border-borde bg-tiza px-2 py-1.5 font-display text-sm tabular-nums text-basalto disabled:opacity-40"
                  aria-label={`Apertura ${DIAS_CORTO[d.dia]}`}
                />
                <span className="text-pizarra">–</span>
                <input
                  type="time"
                  value={d.cierre}
                  disabled={!d.activo}
                  onChange={(e) => setHorarioDia(d.dia, { cierre: e.target.value })}
                  className="rounded-lg border border-borde bg-tiza px-2 py-1.5 font-display text-sm tabular-nums text-basalto disabled:opacity-40"
                  aria-label={`Cierre ${DIAS_CORTO[d.dia]}`}
                />
              </div>
            ))}
          </div>
        )}

        {horarioMsg && (
          <p
            role={horarioMsg.ok ? 'status' : 'alert'}
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
              horarioMsg.ok ? 'bg-cesped-suave text-cesped-hondo' : 'bg-error-suave text-error'
            }`}
          >
            {horarioMsg.texto}
          </p>
        )}

        <button
          type="button"
          onClick={guardarHorarios}
          disabled={horarioGuardando || !horarioComplejoId}
          className="btn-tactil mt-4 bg-cesped px-6 py-2.5 font-display text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
        >
          {horarioGuardando ? 'Guardando…' : 'Guardar horario'}
        </button>
        <p className="mt-2 text-xs text-pizarra">
          Si un local no tiene horario, se genera Lun–Dom 08:00–21:00 con su primera reserva.
          Las reservas fuera de horario muestran “Fuera de horario” y los días cerrados “Cerrado ese día”.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-cal bg-tiza px-4 py-3 text-[11px] font-semibold text-pizarra">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-solid border-cesped bg-cesped-suave" /> [✓] Confirmada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-dashed border-sol bg-sol-suave" /> [⏳] Pendiente</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-solid border-borde bg-piedra" /> [✓✓] Completada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-dotted border-error bg-error-suave" /> [✕] Cancelada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l border-double border-alerta bg-alerta-suave" /> [⛔] Bloqueo</span>
        </div>
      </div>
    );
  }

  // Vista Semana
  function renderVistaSemana() {
    return (
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {semana.map((d) => {
          const lista = porDia.get(d) ?? [];
          const nR = lista.filter((r) => !esBloqueo(r)).length;
          const nB = lista.filter(esBloqueo).length;
          const esHoy = d === hoyISO;
          const selected = d === fecha;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setFecha(d);
                setVista('dia');
              }}
              className={cn(
                'rounded-2xl border bg-tiza p-3 text-left transition hover:border-cesped',
                selected ? 'border-cesped ring-2 ring-cesped/25' : 'border-cal',
                esHoy && 'bg-cesped-suave/30'
              )}
            >
              <p className="font-display text-[11px] font-bold tracking-wide text-pizarra uppercase">
                {new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(parseDia(d))}
              </p>
              <p className="font-display text-xl font-black tabular-nums text-basalto">{Number(d.slice(8, 10))}</p>
              <p className="mt-1 font-display text-[11px] font-bold tabular-nums text-cesped-hondo">{nR} reservas</p>
              <p className="mt-1 font-display text-[11px] font-semibold tabular-nums text-alerta-hondo">{nB} bloqueos</p>
            </button>
          );
        })}
      </div>
    );
  }

  // Vista Mes
  function renderVistaMes() {
    return (
      <div className="mt-3 overflow-x-auto rounded-2xl border border-cal bg-tiza shadow-suave">
        <div className="sticky top-0 z-10 grid min-w-[560px] grid-cols-7 border-b border-cal bg-piedra">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <p key={d} className="py-2 text-center font-display text-[11px] font-bold tracking-wide text-pizarra uppercase">
              {d}
            </p>
          ))}
        </div>
        <div className="grid min-w-[560px] grid-cols-7">
          {mesGrid.map((d) => {
            const lista = porDia.get(d) ?? [];
            const esOtroMes = d.slice(0, 7) !== fecha.slice(0, 7);
            const esHoy = d === hoyISO;
            const selected = d === fecha;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setFecha(d);
                  setVista('dia');
                }}
                className={cn(
                  'min-h-[76px] border-r border-b border-cal p-1.5 text-left align-top transition last:border-r-0 hover:bg-cesped-suave/30',
                  esOtroMes && 'bg-piedra opacity-50',
                  selected && 'bg-cesped-suave/50'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold tabular-nums',
                    esHoy ? 'bg-cesped text-tiza' : 'text-basalto'
                  )}
                >
                  {Number(d.slice(8, 10))}
                </span>
                {lista.length > 0 && (
                  <span className="mt-1 block rounded-md bg-cesped-hondo px-1.5 py-0.5 text-center font-display text-[10px] font-bold tabular-nums text-tiza">
                    {lista.filter((r) => !esBloqueo(r)).length}R
                    {lista.some(esBloqueo) ? ` · ${lista.filter(esBloqueo).length}B` : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Drawer detalle
  function renderDrawerDetalle() {
    if (!detalle) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-velo"
          onClick={() => setDetalle(null)}
          aria-hidden
        />
        <aside className="fixed top-0 right-0 z-50 flex h-full w-[400px] max-w-[92vw] flex-col border-l border-cal bg-tiza shadow-suave-lg">
          <div className="flex items-center justify-between border-b border-cal p-5">
            <h2 className="font-display text-lg font-bold text-basalto">Detalle de reserva</h2>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              aria-label="Cerrar"
              className="btn-tactil flex h-11 w-11 items-center justify-center rounded-lg p-1.5 text-pizarra hover:bg-piedra hover:text-basalto"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm text-pizarra">
            {esBloqueo(detalle) && (
              <p className="rounded-xl border border-double border-alerta bg-alerta-suave px-3 py-2 font-display text-xs font-bold text-alerta-hondo">
                ⛔ Horario bloqueado · {(detalle.notas ?? '').replace('[BLOQUEO]', '').trim() || 'Sin motivo'}
              </p>
            )}
            <p><strong className="text-basalto">{detalle.usuario?.nombre ?? 'Cliente'}</strong></p>
            <p>{canchasPorId.get(detalle.canchaId)?.nombre ?? detalle.cancha.nombre}</p>
            <p className="font-display tabular-nums">{formatFecha(detalle.fecha)} · {formatHora(detalle.horaInicio)} – {formatHora(detalle.horaFin)}</p>
            <p className="flex items-center gap-2">
              Estado: <Badge variant={detalle.estado === 'CONFIRMADA' ? 'green' : detalle.estado === 'PENDIENTE' ? 'yellow' : detalle.estado === 'CANCELADA' ? 'red' : 'blue'}>{detalle.estado}</Badge>
            </p>
            <p>Total: <strong className="font-display tabular-nums text-basalto">S/ {Number(detalle.total)}</strong></p>
            <p className="font-mono font-bold tracking-wider text-cesped-hondo">{codigoMostrado(detalle)}</p>
            {detalle.notas && !esBloqueo(detalle) && <p className="text-xs">Nota: {detalle.notas}</p>}
          </div>
          <div className="flex gap-2 border-t border-cal p-5">
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="btn-tactil flex-1 border-cal py-2.5 text-sm font-bold text-pizarra hover:text-basalto"
            >
              Cerrar
            </button>
            {!esBloqueo(detalle) && detalle.estado === 'PENDIENTE' && (
              <button
                type="button"
                disabled={accionando}
                onClick={() => cambiarEstado(detalle, 'CONFIRMADA')}
                className="btn-tactil flex-1 bg-cesped py-2.5 font-display text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-60"
              >
                {accionando ? 'Guardando…' : 'Confirmar'}
              </button>
            )}
            {(detalle.estado === 'PENDIENTE' || detalle.estado === 'CONFIRMADA') && (
              <button
                type="button"
                disabled={accionando}
                onClick={() => cambiarEstado(detalle, 'CANCELADA')}
                className="btn-tactil flex-1 border-error/40 py-2.5 font-display text-sm font-bold text-error hover:bg-error-suave disabled:opacity-60"
              >
                Cancelar
              </button>
            )}
          </div>
        </aside>
      </>
    );
  }

  // Modal nueva / bloqueo
  function renderModal() {
    if (!modal) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4"
        onClick={() => setModal(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modal === 'nueva' ? 'Nueva reserva' : 'Bloquear horario'}
          className="w-full max-w-md rounded-2xl border border-cal bg-tiza p-6 shadow-suave-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-basalto">
              {modal === 'nueva' ? 'Nueva reserva' : 'Bloquear horario'}
            </h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setModal(null)}
              className="btn-tactil flex h-11 w-11 items-center justify-center rounded-lg p-1.5 text-pizarra hover:bg-piedra hover:text-basalto"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="cr-m-cancha" className="mb-1 block font-display text-xs font-bold text-pizarra">CANCHA</label>
              <select
                id="cr-m-cancha"
                value={mCancha}
                onChange={(e) => setMCancha(e.target.value)}
                className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto focus:outline-none"
              >
                <option value="">Selecciona una cancha</option>
                {(canchasVisibles.length > 0 ? canchasVisibles : canchas).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} · S/ {Number(c.precioPorHora)}/h</option>
                ))}
              </select>
              {horarioTexto && (
                <p className="mt-1.5 font-display text-xs font-semibold text-cesped-hondo">🕐 {horarioTexto}</p>
              )}
            </div>
            <div>
              <label htmlFor="cr-m-fecha" className="mb-1 block font-display text-xs font-bold text-pizarra">FECHA</label>
              <input
                id="cr-m-fecha"
                type="date"
                value={mFecha}
                onChange={(e) => setMFecha(e.target.value)}
                className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 font-display text-sm tabular-nums text-basalto focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cr-m-ini" className="mb-1 block font-display text-xs font-bold text-pizarra">HORA INICIO</label>
                <input
                  id="cr-m-ini"
                  type="time"
                  value={mInicio}
                  onChange={(e) => setMInicio(e.target.value)}
                  className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 font-display text-sm tabular-nums text-basalto focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="cr-m-fin" className="mb-1 block font-display text-xs font-bold text-pizarra">HORA FIN</label>
                <input
                  id="cr-m-fin"
                  type="time"
                  value={mFin}
                  onChange={(e) => setMFin(e.target.value)}
                  className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 font-display text-sm tabular-nums text-basalto focus:outline-none"
                />
              </div>
            </div>
            {modal === 'nueva' ? (
              <div>
                <label htmlFor="cr-m-notas" className="mb-1 block font-display text-xs font-bold text-pizarra">NOTAS</label>
                <textarea
                  id="cr-m-notas"
                  value={mNotas}
                  onChange={(e) => setMNotas(e.target.value)}
                  placeholder="Cliente, teléfono, anticipo…"
                  rows={3}
                  className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="cr-m-motivo" className="mb-1 block font-display text-xs font-bold text-pizarra">MOTIVO DEL BLOQUEO</label>
                <input
                  id="cr-m-motivo"
                  value={mMotivo}
                  onChange={(e) => setMMotivo(e.target.value)}
                  placeholder="Mantenimiento, evento privado…"
                  className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-pizarra">
                  Se guarda como reserva cancelada con la marca [BLOQUEO].
                </p>
              </div>
            )}
            {formError && (
              <p role="alert" className="rounded-xl bg-error-suave px-3 py-2.5 text-xs font-semibold text-error">
                {formError}
              </p>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="btn-tactil flex-1 border-cal py-2.5 text-sm font-bold text-pizarra hover:text-basalto"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className={cn(
                'btn-tactil flex-1 py-2.5 font-display text-sm font-bold text-tiza disabled:opacity-60',
                modal === 'nueva' ? 'bg-cesped hover:bg-cesped-hover' : 'bg-alerta hover:bg-alerta-hondo'
              )}
            >
              {guardando ? 'Guardando…' : modal === 'nueva' ? 'Guardar reserva' : 'Bloquear'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="densidad-fija">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-bold tracking-[0.14em] text-cesped-hondo">◔ CRONOGRAMA</p>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-basalto sm:text-[28px]">Calendario operativo</h1>
          <p className="text-sm text-pizarra">
            Ve la ocupación por día, semana y mes. Toca un bloque para gestionarlo.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <a
            href="/admin/ayuda"
            aria-label="Ayuda"
            title="Ayuda"
            className="btn-tactil flex h-11 w-11 items-center justify-center rounded-full border border-cal bg-tiza text-sm font-bold text-pizarra transition-colors hover:border-cesped hover:text-cesped"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </a>
          <button
            type="button"
            onClick={() => abrirModal('nueva')}
            className="btn-tactil bg-cesped px-4 py-2.5 font-display text-sm font-bold text-tiza hover:bg-cesped-hover"
          >
            <Plus size={18} strokeWidth={2.5} /> Nueva reserva
          </button>
          <button
            type="button"
            onClick={() => abrirModal('bloqueo')}
            className="btn-tactil flex-1 bg-tiza px-4 py-2.5 font-display text-sm font-bold text-basalto hover:border-alerta hover:text-alerta-hondo sm:flex-none"
          >
            <Ban size={16} strokeWidth={2} /> Bloquear horario
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full border border-cal bg-tiza px-3 py-1.5 font-display text-basalto">
          📅 {formatFecha(fecha)}
        </span>
        <span className="rounded-full border border-cesped/30 bg-cesped-suave px-3 py-1.5 font-display tabular-nums text-cesped-hondo">
          {nReservasDia} reservas
        </span>
        <span className="rounded-full border border-alerta/40 bg-alerta-suave px-3 py-1.5 font-display tabular-nums text-alerta-hondo">
          {nBloqueosDia} bloqueos
        </span>
      </div>

      {/* Filtros */}
      <div className="mt-3 rounded-2xl border border-cal bg-tiza p-4 shadow-suave md:p-5">
        <p className="font-display text-[11px] font-bold tracking-[0.14em] text-pizarra">FILTROS DEL CALENDARIO</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-1.5 font-display text-xs font-bold text-pizarra">ESTADO</p>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setFEstado(e.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 font-display text-xs font-bold transition',
                    fEstado === e.id
                      ? 'border-cal bg-cesped-hondo text-tiza'
                      : 'border-cal bg-tiza text-pizarra hover:border-cesped'
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="cr-complejo" className="mb-1.5 block font-display text-xs font-bold text-pizarra">
              COMPLEJO
            </label>
            <select
              id="cr-complejo"
              value={fComplejo}
              onChange={(e) => {
                setFComplejo(e.target.value);
                setFCancha('todas');
              }}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm font-semibold text-basalto focus:outline-none"
            >
              <option value="todos">Todos los complejos</option>
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {complejos.length === 0 && (
              <p className="mt-1 text-[11px] text-pizarra">Aún no hay complejos registrados.</p>
            )}
          </div>
          <div>
            <label htmlFor="cr-cancha" className="mb-1.5 block font-display text-xs font-bold text-pizarra">
              CANCHA
            </label>
            <select
              id="cr-cancha"
              value={fCancha}
              onChange={(e) => setFCancha(e.target.value)}
              className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm font-semibold text-basalto focus:outline-none"
            >
              <option value="todas">Todas las canchas</option>
              {canchasVisibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {canchasVisibles.length === 0 && (
              <p className="mt-1 text-[11px] text-pizarra">
                Sin canchas en este complejo.{' '}
                <button type="button" onClick={() => setFComplejo('todos')} className="font-bold text-cesped-hondo hover:underline">
                  Ver todas
                </button>
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 font-display text-xs font-bold text-pizarra">EXTRAS</p>
            <button
              type="button"
              role="switch"
              aria-checked={mostrarBloqueos}
              onClick={() => setMostrarBloqueos((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-cal px-3 py-2.5 text-sm font-semibold text-basalto"
            >
              <span
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  mostrarBloqueos ? 'bg-cesped' : 'bg-cal'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-tiza shadow-suave-sm transition-all',
                    mostrarBloqueos ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </span>
              Mostrar bloqueos
            </button>
          </div>
        </div>
      </div>

      {/* Barra de navegación */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => desplazar(-1)}
            aria-label="Anterior"
            className="btn-tactil min-h-[44px] min-w-[44px] p-2.5 text-pizarra hover:text-basalto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped focus-visible:ring-offset-2"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setFecha(hoyISO)}
            className="btn-tactil min-h-[44px] min-w-[44px] px-3.5 py-2 font-display text-sm font-bold text-pizarra hover:text-basalto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped focus-visible:ring-offset-2"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => desplazar(1)}
            aria-label="Siguiente"
            className="btn-tactil min-h-[44px] min-w-[44px] p-2.5 text-pizarra hover:text-basalto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped focus-visible:ring-offset-2"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
          <p className="ml-1 font-display text-[15px] font-bold text-basalto">
            {vista === 'mes' ? nombreMes : fechaLarga(fecha)}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-cal bg-tiza shadow-suave-sm" role="tablist" aria-label="Vista">
          {(['dia', 'semana', 'mes', 'horarios'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => cambiarVista(v)}
              className={cn(
                'min-h-[44px] px-4 py-2 font-display text-sm font-bold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped focus-visible:ring-inset',
                vista === v ? 'bg-cesped text-tiza' : 'text-pizarra hover:text-basalto'
              )}
            >
              {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : v === 'mes' ? 'Mes' : 'Horarios'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-error-suave px-4 py-3 text-sm font-semibold text-error">
          {error}
        </p>
      )}

      {/* Vistas */}
      {vista === 'dia' && renderVistaDia()}
      {vista === 'horarios' && renderVistaHorarios()}
      {vista === 'semana' && renderVistaSemana()}
      {vista === 'mes' && renderVistaMes()}

      {/* Drawer detalle */}
      {renderDrawerDetalle()}

      {/* Modal nueva / bloqueo */}
      {renderModal()}
    </div>
  );
}
