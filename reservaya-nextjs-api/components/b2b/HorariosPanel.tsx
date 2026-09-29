'use client';

import { useEffect, useState } from 'react';

interface ComplejoOpt {
  id: string;
  nombre: string;
}

interface CanchaOpt {
  id: string;
  nombre: string;
  complejoId: string | null;
}

interface DiaRow {
  dia: number;
  apertura: string;
  cierre: string;
  activo: boolean;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DEFECTO: DiaRow[] = Array.from({ length: 7 }, (_, dia) => ({
  dia,
  apertura: '08:00',
  cierre: '21:00',
  activo: true,
}));

function aMinutos(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function deMinutos(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function HorariosPanel({ complejos, canchas }: { complejos: ComplejoOpt[]; canchas: CanchaOpt[] }) {
  const [complejoId, setComplejoId] = useState(complejos[0]?.id ?? '');
  const [canchaId, setCanchaId] = useState('');
  const [dias, setDias] = useState<DiaRow[]>(DEFECTO);
  const [cargando, setCargando] = useState(Boolean(complejos[0]?.id));
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const canchasDelComplejo = canchas.filter((c) => c.complejoId === complejoId);

  // Spinner y limpieza al cambiar de local/cancha; el efecto solo carga.
  function marcarCarga() {
    setCargando(true);
    setMsg(null);
  }

  useEffect(() => {
    if (!complejoId) return;
    let vivo = true;
    (async () => {
      try {
        const qs = canchaId
          ? `?complejoId=${complejoId}&canchaId=${canchaId}`
          : `?complejoId=${complejoId}`;
        const res = await fetch(`/api/horarios${qs}`, { credentials: 'include' });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
        const rows: { diaSemana: number; aperturaMin: number; cierreMin: number; activo: boolean }[] =
          Array.isArray(body?.horarios) ? body.horarios : [];
        if (!vivo) return;
        if (rows.length === 0) {
          setDias(DEFECTO);
        } else {
          const porDia = new Map(rows.map((r) => [r.diaSemana, r]));
          setDias(
            Array.from({ length: 7 }, (_, dia) => {
              const r = porDia.get(dia);
              return r
                ? { dia, apertura: deMinutos(r.aperturaMin), cierre: deMinutos(r.cierreMin), activo: r.activo }
                : { dia, apertura: '08:00', cierre: '21:00', activo: false };
            })
          );
        }
      } catch (e) {
        if (vivo) setMsg({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo cargar' });
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [complejoId, canchaId]);

  function setDia(dia: number, patch: Partial<DiaRow>) {
    setDias((prev) => prev.map((d) => (d.dia === dia ? { ...d, ...patch } : d)));
  }

  async function guardar() {
    setMsg(null);
    const payload = [];
    for (const d of dias) {
      const ap = aMinutos(d.apertura);
      const ci = aMinutos(d.cierre);
      if (ap === null || ci === null || ci <= ap) {
        setMsg({ ok: false, texto: `Horario inválido el ${DIAS[d.dia]}.` });
        return;
      }
      payload.push({ dia: d.dia, apertura: ap, cierre: ci, activo: d.activo });
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complejoId,
          canchaId: canchaId === '' ? null : canchaId,
          dias: payload,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setMsg({ ok: true, texto: 'Horario guardado. Aplica a nuevas reservas.' });
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  }

  if (complejos.length === 0) {
    return (
      <div className="card-tactil p-12 text-center text-pizarra">
        <p className="text-4xl mb-3">🏟️</p>
        <p className="font-medium text-basalto">Primero crea un complejo</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="h-complejo" className="mb-1 block text-xs font-bold text-basalto">Local</label>
          <select
            id="h-complejo"
            value={complejoId}
            onChange={(e) => {
              marcarCarga();
              setComplejoId(e.target.value);
              setCanchaId('');
            }}
            className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
          >
            {complejos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="h-cancha" className="mb-1 block text-xs font-bold text-basalto">
            Aplica a <span className="font-normal text-pizarra">(vacío = todo el local)</span>
          </label>
          <select
            id="h-cancha"
            value={canchaId}
            onChange={(e) => {
              marcarCarga();
              setCanchaId(e.target.value);
            }}
            className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
          >
            <option value="">Todo el local</option>
            {canchasDelComplejo.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <p className="py-8 text-center text-sm text-pizarra">Cargando horario…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-basalto bg-tiza shadow-dura-sm">
          {dias.map((d) => (
            <div
              key={d.dia}
              className="flex flex-wrap items-center gap-3 border-b border-cal px-4 py-3 last:border-0"
            >
              <p className="w-24 text-sm font-bold text-basalto">{DIAS[d.dia]}</p>
              <label className="flex items-center gap-2 text-sm text-pizarra">
                <input
                  type="checkbox"
                  checked={d.activo}
                  onChange={(e) => setDia(d.dia, { activo: e.target.checked })}
                  className="h-4 w-4 accent-cesped"
                />
                Abierto
              </label>
              <input
                type="time"
                value={d.apertura}
                disabled={!d.activo}
                onChange={(e) => setDia(d.dia, { apertura: e.target.value })}
                className="rounded-lg border border-cal px-2 py-1.5 text-sm text-basalto disabled:opacity-40"
                aria-label={`Apertura ${DIAS[d.dia]}`}
              />
              <span className="text-pizarra">–</span>
              <input
                type="time"
                value={d.cierre}
                disabled={!d.activo}
                onChange={(e) => setDia(d.dia, { cierre: e.target.value })}
                className="rounded-lg border border-cal px-2 py-1.5 text-sm text-basalto disabled:opacity-40"
                aria-label={`Cierre ${DIAS[d.dia]}`}
              />
            </div>
          ))}
        </div>
      )}

      {msg && (
        <p
          role={msg.ok ? 'status' : 'alert'}
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            msg.ok ? 'bg-cesped-suave text-cesped-hondo' : 'bg-error-suave text-error'
          }`}
        >
          {msg.texto}
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando || !complejoId}
        className="btn-tactil mt-4 bg-cesped px-6 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : 'Guardar horario'}
      </button>
      <p className="mt-2 text-xs text-pizarra">
        Si un local no tiene horario, se genera Lun–Dom 08:00–21:00 con su primera reserva.
      </p>
    </div>
  );
}
