'use client';

import { useEffect, useMemo, useState } from 'react';
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
import type { Cancha, EstadoReserva, Reserva } from '@/lib/api';
import type { ComplejoResumen } from '@/lib/b2b-api';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';

type Vista = 'dia' | 'semana' | 'mes' | 'horarios';
type FiltroEstado = 'TODOS' | EstadoReserva;

const ESTADOS: { id: FiltroEstado; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDIENTE', label: 'Pendiente' },
  { id: 'CONFIRMADA', label: 'Confirmada' },
  { id: 'COMPLETADA', label: 'Completada' },
  { id: 'CANCELADA', label: 'Cancelada' },
];

const HORA_PX = 52;
const HORAS = Array.from({ length: 24 }, (_, h) => h); // 12:00 a.m. – 11:00 p.m.

function esBloqueo(r: Reserva): boolean {
  return (r.notas ?? '').includes('[BLOQUEO]');
}

function diaISO(r: Reserva): string {
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

function estiloBloque(r: Reserva): string {
  if (esBloqueo(r)) return 'border-[#F97316] bg-[#FFEDD5] text-[#9A3412]';
  switch (r.estado) {
    case 'CONFIRMADA':
      return 'border-[#22C55E] bg-[#DCFCE7] text-[#15803D]';
    case 'PENDIENTE':
      return 'border-[#EAB308] bg-[#FEFCE8] text-[#A16207]';
    case 'COMPLETADA':
      return 'border-[#94A3B8] bg-[#F1F5F9] text-[#475569]';
    case 'CANCELADA':
      return 'border-[#EF4444] bg-[#FEE2E2] text-[#B91C1C]';
  }
}

export function CronogramaView({
  canchas,
  reservasIniciales,
  complejos,
  fechaInicial,
}: {
  canchas: Cancha[];
  reservasIniciales: Reserva[];
  complejos: ComplejoResumen[];
  fechaInicial?: string;
}) {
  const router = useRouter();
  const hoyISO = new Date().toISOString().slice(0, 10);
  const [reservas, setReservas] = useState<Reserva[]>(reservasIniciales);
  const [fecha, setFecha] = useState(fechaInicial ?? hoyISO);
  const [vista, setVista] = useState<Vista>('dia');
  const [fEstado, setFEstado] = useState<FiltroEstado>('TODOS');
  const [fComplejo, setFComplejo] = useState('todos');
  const [fCancha, setFCancha] = useState('todas');
  const [mostrarBloqueos, setMostrarBloqueos] = useState(true);
  const [detalle, setDetalle] = useState<Reserva | null>(null);
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

  const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const aHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  // Horario operativo de la cancha elegida (se genera solo Lun–Dom 08:00–21:00).
  useEffect(() => {
    if (!modal || !mCancha) return;
    const cancha = canchas.find((c) => c.id === mCancha);
    const cid = cancha?.complejoId ?? null;
    if (!cid) {
      setHorarioTxt('Sin horario: se genera Lun–Dom 08:00–21:00 con la primera reserva.');
      setHorarioRows([]);
      return;
    }
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/horarios?complejoId=${cid}`, { credentials: 'include' });
        const body = await res.json().catch(() => null);
        const rows: { diaSemana: number; aperturaMin: number; cierreMin: number; activo: boolean }[] =
          Array.isArray(body?.horarios) ? body.horarios : [];
        if (!vivo) return;
        if (rows.length === 0) {
          setHorarioTxt('Sin horario: se genera Lun–Dom 08:00–21:00 con la primera reserva.');
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
    setHorarioCargando(true);
    setHorarioMsg(null);
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
        // Si la cancha ya no existe en el catálogo, se muestra solo sin filtro de complejo.
        if (fComplejo !== 'todos' || fCancha !== 'todas') return false;
      }
      return true;
    });
  }, [reservas, mostrarBloqueos, fEstado, fCancha, fComplejo, idsCanchasVisibles]);

  const porDia = useMemo(() => {
    const map = new Map<string, Reserva[]>();
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

  async function cambiarEstado(r: Reserva, estado: EstadoReserva) {
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
    if (horarioRows.length > 0) {
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
        // El backend crea la reserva en PENDIENTE: se cancela para que opere como bloqueo.
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
          const listaBody: { reservas?: Reserva[] } | null = await listaRes.json().catch(() => null);
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
    return (
      <div>
        {canchas.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin canchas para mostrar"
            description="Agrega tu primera cancha para activar el cronograma operativo del día."
            action={
              <a
                href="/admin/canchas"
                className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98]"
              >
                Agregar cancha
              </a>
            }
          />
        ) : delDia.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Día libre"
            description="No hay reservas ni bloqueos este día con los filtros actuales."
            action={
              <button
                type="button"
                onClick={() => abrirModal('nueva')}
                className="flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98]"
              >
                <Plus size={16} strokeWidth={2.5} /> Nueva reserva
              </button>
            }
          />
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="flex">
              <div className="w-24 shrink-0 border-r border-[#F1F0EE] bg-[#FAFAF9]">
                {HORAS.map((h) => (
                  <div
                    key={h}
                    className="pr-2 text-right text-[11px] text-[#94A3B8]"
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
                    className="block w-full border-b border-[#F5F4F2] transition-colors hover:bg-[#DCFCE7]/40"
                    style={{ height: HORA_PX }}
                  />
                ))}
                {delDia.map((r) => {
                  const top = (r.horaInicio / 60) * HORA_PX;
                  const height = Math.max(30, ((r.horaFin - r.horaInicio) / 60) * HORA_PX - 4);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setDetalle(r)}
                      style={{ top, height }}
                      className={cn(
                        'absolute right-2 left-2 overflow-hidden rounded-xl border-l-4 p-2 text-left shadow-sm transition hover:brightness-95',
                        estiloBloque(r)
                      )}
                    >
                      <p className="truncate text-xs font-bold">
                        {esBloqueo(r) ? '⛔ Bloqueo' : (r.usuario?.nombre ?? 'Cliente')} ·{' '}
                        {canchasPorId.get(r.canchaId)?.nombre ?? r.cancha.nombre}
                      </p>
                      <p className="text-[11px] font-semibold opacity-80">
                        {formatHora(r.horaInicio)} – {formatHora(r.horaFin)} · {r.estado}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 border-t border-[#F1F0EE] px-4 py-3 text-[11px] font-semibold text-[#64748B]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#22C55E]"></span> Confirmada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#EAB308]"></span> Pendiente</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#94A3B8]"></span> Completada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]"></span> Cancelada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#F97316]"></span> Bloqueo</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista Horarios
  function renderVistaHorarios() {
    return (
      <div className="mt-3">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cr-h-complejo" className="mb-1 block text-xs font-bold text-[#475569]">Local</label>
            <select
              id="cr-h-complejo"
              value={horarioComplejoId}
              onChange={(e) => {
                setHorarioComplejoId(e.target.value);
                setHorarioCanchaId('');
              }}
              className="w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm font-semibold text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
            >
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cr-h-cancha" className="mb-1 block text-xs font-bold text-[#475569]">
              Aplica a <span className="font-normal text-[#94A3B8]">(vacío = todo el local)</span>
            </label>
            <select
              id="cr-h-cancha"
              value={horarioCanchaId}
              onChange={(e) => setHorarioCanchaId(e.target.value)}
              className="w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm font-semibold text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
            >
              <option value="">Todo el local</option>
              {canchasVisibles.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {horarioCargando ? (
          <p className="py-8 text-center text-sm text-[#94A3B8]">Cargando horario…</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            {horarioDias.map((d) => (
              <div
                key={d.dia}
                className="flex flex-wrap items-center gap-3 border-b border-[#F1F0EE] px-4 py-3 last:border-0"
              >
                <p className="w-24 text-sm font-bold text-[#0F172A]">{DIAS_CORTO[d.dia]}</p>
                <label className="flex items-center gap-2 text-sm text-[#475569]">
                  <input
                    type="checkbox"
                    checked={d.activo}
                    onChange={(e) => setHorarioDia(d.dia, { activo: e.target.checked })}
                    className="h-4 w-4 accent-[#22C55E]"
                  />
                  Abierto
                </label>
                <input
                  type="time"
                  value={d.apertura}
                  disabled={!d.activo}
                  onChange={(e) => setHorarioDia(d.dia, { apertura: e.target.value })}
                  className="rounded-lg border border-[#E7E5E4] bg-white px-2 py-1.5 text-sm text-[#0F172A] disabled:opacity-40"
                  aria-label={`Apertura ${DIAS_CORTO[d.dia]}`}
                />
                <span className="text-[#94A3B8]">–</span>
                <input
                  type="time"
                  value={d.cierre}
                  disabled={!d.activo}
                  onChange={(e) => setHorarioDia(d.dia, { cierre: e.target.value })}
                  className="rounded-lg border border-[#E7E5E4] bg-white px-2 py-1.5 text-sm text-[#0F172A] disabled:opacity-40"
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
              horarioMsg.ok ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-red-50 text-red-700'
            }`}
          >
            {horarioMsg.texto}
          </p>
        )}

        <button
          type="button"
          onClick={guardarHorarios}
          disabled={horarioGuardando || !horarioComplejoId}
          className="mt-4 rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#16A34A] disabled:opacity-50"
        >
          {horarioGuardando ? 'Guardando…' : 'Guardar horario'}
        </button>
        <p className="mt-2 text-xs text-[#94A3B8]">
          Si un local no tiene horario, se genera Lun–Dom 08:00–21:00 con su primera reserva.
          Las reservas fuera de horario muestran "Fuera de horario" y los días cerrados "Cerrado ese día".
        </p>
        <div className="flex flex-wrap gap-4 border-t border-[#F1F0EE] px-4 py-3 text-[11px] font-semibold text-[#64748B]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#22C55E]" /> Confirmada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#EAB308]" /> Pendiente</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#94A3B8]" /> Completada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" /> Cancelada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#F97316]" /> Bloqueo</span>
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
                'rounded-2xl border bg-white p-3 text-left transition hover:border-[#22C55E]',
                selected ? 'border-[#22C55E] ring-2 ring-[#22C55E]/25' : 'border-[#E7E5E4]',
                esHoy && 'bg-[#F0FDF4]'
              )}
            >
              <p className="text-[11px] font-bold tracking-wide text-[#64748B] uppercase">
                {new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(parseDia(d))}
              </p>
              <p className="text-xl font-black text-[#0F172A]">{Number(d.slice(8, 10))}</p>
              <p className="mt-1 text-[11px] font-bold text-[#15803D]">{nR} reservas</p>
              <p className="mt-1 text-[11px] font-semibold text-[#C2410C]">{nB} bloqueos</p>
            </button>
          );
        })}
      </div>
    );
  }

  // Vista Mes
  function renderVistaMes() {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-7 border-b border-[#E7E5E4] bg-[#FAFAF9]">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <p key={d} className="py-2 text-center text-[11px] font-bold tracking-wide text-[#64748B] uppercase">
              {d}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7">
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
                  'min-h-[76px] border-r border-b border-[#F1F0EE] p-1.5 text-left align-top transition last:border-r-0 hover:bg-[#F0FDF4]',
                  esOtroMes && 'bg-[#FAFAF9] opacity-50',
                  selected && 'bg-[#DCFCE7]/50'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    esHoy ? 'bg-[#22C55E] text-white' : 'text-[#0F172A]'
                  )}
                >
                  {Number(d.slice(8, 10))}
                </span>
                {lista.length > 0 && (
                  <span className="mt-1 block rounded-md bg-[#0F172A] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
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
          className="fixed inset-0 z-40 bg-slate-950/40"
          onClick={() => setDetalle(null)}
          aria-hidden
        />
        <aside className="fixed top-0 right-0 z-50 flex h-full w-[400px] max-w-[92vw] flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#E7E5E4] p-5">
            <h2 className="text-lg font-bold text-[#0F172A]">Detalle de reserva</h2>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-[#64748B] hover:bg-gray-100 hover:text-[#0F172A]"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm text-[#475569]">
            {esBloqueo(detalle) && (
              <p className="rounded-xl bg-[#FFEDD5] px-3 py-2 text-xs font-bold text-[#C2410C]">
                ⛔ Horario bloqueado · {(detalle.notas ?? '').replace('[BLOQUEO]', '').trim() || 'Sin motivo'}
              </p>
            )}
            <p><strong className="text-[#0F172A]">{detalle.usuario?.nombre ?? 'Cliente'}</strong></p>
            <p>{canchasPorId.get(detalle.canchaId)?.nombre ?? detalle.cancha.nombre}</p>
            <p>{formatFecha(detalle.fecha)} · {formatHora(detalle.horaInicio)} – {formatHora(detalle.horaFin)}</p>
            <p className="flex items-center gap-2">
              Estado: <Badge variant={detalle.estado === 'CONFIRMADA' ? 'green' : detalle.estado === 'PENDIENTE' ? 'yellow' : detalle.estado === 'CANCELADA' ? 'red' : 'blue'}>{detalle.estado}</Badge>
            </p>
            <p>Total: <strong className="text-[#0F172A]">S/ {Number(detalle.total)}</strong></p>
            <p className="font-mono font-bold tracking-wider text-[#15803D]">{codigoMostrado(detalle)}</p>
            {detalle.notas && !esBloqueo(detalle) && <p className="text-xs">Nota: {detalle.notas}</p>}
          </div>
          <div className="flex gap-2 border-t border-[#E7E5E4] p-5">
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="flex-1 rounded-xl border border-[#E7E5E4] py-2.5 text-sm font-bold text-[#475569] transition hover:text-[#0F172A]"
            >
              Cerrar
            </button>
            {!esBloqueo(detalle) && detalle.estado === 'PENDIENTE' && (
              <button
                type="button"
                disabled={accionando}
                onClick={() => cambiarEstado(detalle, 'CONFIRMADA')}
                className="flex-1 rounded-xl bg-[#22C55E] py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] disabled:opacity-60"
              >
                {accionando ? 'Guardando…' : 'Confirmar'}
              </button>
            )}
            {(detalle.estado === 'PENDIENTE' || detalle.estado === 'CONFIRMADA') && (
              <button
                type="button"
                disabled={accionando}
                onClick={() => cambiarEstado(detalle, 'CANCELADA')}
                className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
        onClick={() => setModal(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modal === 'nueva' ? 'Nueva reserva' : 'Bloquear horario'}
          className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F172A]">
              {modal === 'nueva' ? 'Nueva reserva' : 'Bloquear horario'}
            </h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setModal(null)}
              className="rounded-lg p-1.5 text-[#64748B] hover:bg-gray-100 hover:text-[#0F172A]"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="cr-m-cancha" className="mb-1 block text-xs font-bold text-[#475569]">CANCHA</label>
              <select
                id="cr-m-cancha"
                value={mCancha}
                onChange={(e) => setMCancha(e.target.value)}
                className="w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
              >
                <option value="">Selecciona una cancha</option>
                {(canchasVisibles.length > 0 ? canchasVisibles : canchas).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} · S/ {Number(c.precioPorHora)}/h</option>
                ))}
              </select>
              {horarioTxt && (
                <p className="mt-1.5 text-xs font-semibold text-[#15803D]">🕐 {horarioTxt}</p>
              )}
            </div>
            <div>
              <label htmlFor="cr-m-fecha" className="mb-1 block text-xs font-bold text-[#475569]">FECHA</label>
              <input
                id="cr-m-fecha"
                type="date"
                value={mFecha}
                onChange={(e) => setMFecha(e.target.value)}
                className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cr-m-ini" className="mb-1 block text-xs font-bold text-[#475569]">HORA INICIO</label>
                <input
                  id="cr-m-ini"
                  type="time"
                  value={mInicio}
                  onChange={(e) => setMInicio(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="cr-m-fin" className="mb-1 block text-xs font-bold text-[#475569]">HORA FIN</label>
                <input
                  id="cr-m-fin"
                  type="time"
                  value={mFin}
                  onChange={(e) => setMFin(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
                />
              </div>
            </div>
            {modal === 'nueva' ? (
              <div>
                <label htmlFor="cr-m-notas" className="mb-1 block text-xs font-bold text-[#475569]">NOTAS</label>
                <textarea
                  id="cr-m-notas"
                  value={mNotas}
                  onChange={(e) => setMNotas(e.target.value)}
                  placeholder="Cliente, teléfono, anticipo…"
                  rows={3}
                  className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="cr-m-motivo" className="mb-1 block text-xs font-bold text-[#475569]">MOTIVO DEL BLOQUEO</label>
                <input
                  id="cr-m-motivo"
                  value={mMotivo}
                  onChange={(e) => setMMotivo(e.target.value)}
                  placeholder="Mantenimiento, evento privado…"
                  className="w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#64748B]">
                  Se guarda como reserva cancelada con la marca [BLOQUEO].
                </p>
              </div>
            )}
            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
                {formError}
              </p>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="flex-1 rounded-xl border border-[#E7E5E4] py-2.5 text-sm font-bold text-[#475569] transition hover:text-[#0F172A]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-60',
                modal === 'nueva' ? 'bg-[#22C55E] hover:bg-[#16A34A]' : 'bg-[#F97316] hover:bg-[#EA580C]'
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
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">◔ CRONOGRAMA</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Calendario operativo</h1>
          <p className="text-sm text-[#64748B]">
            Ve la ocupación por día, semana y mes. Toca un bloque para gestionarlo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ayuda"
            aria-label="Ayuda"
            title="Ayuda"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E5E4] bg-white text-sm font-bold text-[#64748B] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </a>
          <button
            type="button"
            onClick={() => abrirModal('nueva')}
            className="flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} /> Nueva reserva
          </button>
          <button
            type="button"
            onClick={() => abrirModal('bloqueo')}
            className="flex items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#C2410C]"
          >
            <Ban size={16} strokeWidth={2} /> Bloquear horario
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-[#0F172A]">
          📅 {formatFecha(fecha)}
        </span>
        <span className="rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-3 py-1.5 text-[#15803D]">
          {nReservasDia} reservas
        </span>
        <span className="rounded-full border border-[#FDBA74] bg-[#FFEDD5] px-3 py-1.5 text-[#C2410C]">
          {nBloqueosDia} bloqueos
        </span>
      </div>

      {/* Filtros */}
      <div className="mt-3 rounded-2xl border border-[#E7E5E4] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] md:p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#64748B]">FILTROS DEL CALENDARIO</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-1.5 text-xs font-bold text-[#475569]">ESTADO</p>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setFEstado(e.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                    fEstado === e.id
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-[#E7E5E4] bg-white text-[#475569] hover:border-[#22C55E]'
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="cr-complejo" className="mb-1.5 block text-xs font-bold text-[#475569]">
              COMPLEJO
            </label>
            <select
              id="cr-complejo"
              value={fComplejo}
              onChange={(e) => {
                setFComplejo(e.target.value);
                setFCancha('todas');
              }}
              className="w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm font-semibold text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
            >
              <option value="todos">Todos los complejos</option>
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {complejos.length === 0 && (
              <p className="mt-1 text-[11px] text-[#94A3B8]">Aún no hay complejos registrados.</p>
            )}
          </div>
          <div>
            <label htmlFor="cr-cancha" className="mb-1.5 block text-xs font-bold text-[#475569]">
              CANCHA
            </label>
            <select
              id="cr-cancha"
              value={fCancha}
              onChange={(e) => setFCancha(e.target.value)}
              className="w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm font-semibold text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
            >
              <option value="todas">Todas las canchas</option>
              {canchasVisibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {canchasVisibles.length === 0 && (
              <p className="mt-1 text-[11px] text-[#94A3B8]">
                Sin canchas en este complejo.{' '}
                <button type="button" onClick={() => setFComplejo('todos')} className="font-bold text-[#15803D] hover:underline">
                  Ver todas
                </button>
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-[#475569]">EXTRAS</p>
            <button
              type="button"
              role="switch"
              aria-checked={mostrarBloqueos}
              onClick={() => setMostrarBloqueos((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm font-semibold text-[#0F172A]"
            >
              <span
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  mostrarBloqueos ? 'bg-[#22C55E]' : 'bg-[#E7E5E4]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
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
            className="rounded-xl border border-[#E7E5E4] bg-white p-2.5 text-[#475569] transition hover:border-[#22C55E] hover:text-[#0F172A]"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setFecha(hoyISO)}
            className="rounded-xl border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-bold text-[#475569] transition hover:border-[#22C55E] hover:text-[#0F172A]"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => desplazar(1)}
            aria-label="Siguiente"
            className="rounded-xl border border-[#E7E5E4] bg-white p-2.5 text-[#475569] transition hover:border-[#22C55E] hover:text-[#0F172A]"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
          <p className="ml-1 text-[15px] font-bold text-[#0F172A]">
            {vista === 'mes' ? nombreMes : fechaLarga(fecha)}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-[#E7E5E4] bg-white" role="tablist" aria-label="Vista">
          {(['dia', 'semana', 'mes', 'horarios'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={cn(
                'px-4 py-2 text-sm font-bold capitalize transition',
                vista === v ? 'bg-[#0F172A] text-white' : 'text-[#475569] hover:text-[#0F172A]'
              )}
            >
              {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : v === 'mes' ? 'Mes' : 'Horarios'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
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
