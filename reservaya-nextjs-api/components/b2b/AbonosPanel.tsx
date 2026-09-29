'use client';

import { useEffect, useState } from 'react';
import { Banknote, CircleAlert, Clock3, Landmark, Wallet, X } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { inputCls, labelCls } from '@/lib/b2b-theme';
import { cn } from '@/lib/utils';

interface Abono {
  id: string;
  fecha: string;
  monto: number;
  metodo: string;
  referencia: string;
  estado: string;
}

interface Cuenta {
  banco: string;
  titular: string;
  numero: string;
}

const CUENTA_KEY = 'ry_cuenta';


function soles(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizarAbono(raw: Record<string, unknown>, i: number): Abono {
  const n = Number(raw.monto ?? raw.total ?? 0);
  return {
    id: String(raw.id ?? raw._id ?? `abono-${i}`),
    fecha: String(raw.fecha ?? raw.creadoEn ?? raw.createdAt ?? ''),
    monto: Number.isFinite(n) ? n : 0,
    metodo: String(raw.metodo ?? raw.metodoPago ?? raw.medio ?? '—'),
    referencia: String(raw.referencia ?? raw.refer ?? raw.codigo ?? '—'),
    estado: String(raw.estado ?? raw.status ?? 'ABONADO').toUpperCase(),
  };
}

export function AbonosPanel() {
  const [porAbonar, setPorAbonar] = useState(0);
  const [reservasOnline, setReservasOnline] = useState(0);
  const [totalAbonado, setTotalAbonado] = useState(0);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [modal, setModal] = useState(false);
  const [banco, setBanco] = useState('');
  const [titular, setTitular] = useState('');
  const [numero, setNumero] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);

  // Lectura única de localStorage tras hidratar (en SSR no hay window): sincroniza con un sistema externo.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUENTA_KEY);
      if (raw) {
        const c = JSON.parse(raw) as Cuenta;
        if (c?.banco && c?.numero) {
          setCuenta(c);
          setBanco(c.banco);
          setTitular(c.titular ?? '');
          setNumero(c.numero);
        }
      }
    } catch {
      // Sin cuenta guardada: se muestra el aviso amarillo.
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch('/api/abonos', { credentials: 'include' });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const body = await res.json().catch(() => null);
        const d = body?.resumen ?? body ?? {};
        const arr = d.abonos ?? body?.abonos ?? [];
        if (vivo) {
          setPorAbonar(Number(d.porAbonar ?? d.porAbonarte ?? 0) || 0);
          setReservasOnline(Number(d.reservasPagadasOnline ?? d.reservasOnline ?? 0) || 0);
          setTotalAbonado(Number(d.totalAbonado ?? d.total ?? 0) || 0);
          setAbonos(Array.isArray(arr) ? arr.map((r, i: number) => normalizarAbono(r as Record<string, unknown>, i)) : []);
        }
      } catch {
        if (vivo) setErrorCarga('No pudimos cargar tus abonos. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  async function guardarCuenta() {
    setErrorCuenta(null);
    if (banco.trim().length < 2) {
      setErrorCuenta('Indica tu banco (ej. BCP, Interbank, Yape).');
      return;
    }
    if (titular.trim().length < 3) {
      setErrorCuenta('Indica el nombre del titular de la cuenta.');
      return;
    }
    if (numero.trim().length < 6) {
      setErrorCuenta('El número de cuenta o CCI parece muy corto.');
      return;
    }
    const c: Cuenta = { banco: banco.trim(), titular: titular.trim(), numero: numero.trim() };
    setGuardando(true);
    try {
      // La cuenta queda guardada localmente y se intenta registrar en el backend.
      // Si el endpoint aún no existe, igual conservamos la cuenta en este equipo.
      await fetch('/api/abonos/cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(c),
      }).catch(() => null);
      window.localStorage.setItem(CUENTA_KEY, JSON.stringify(c));
      setCuenta(c);
      setModal(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="densidad-fija">
      <TopBar breadcrumb="Finanzas / Abonos" title="Tus abonos" />
      <p className="mt-3 mb-6 text-[0.875rem] leading-relaxed text-pizarra">
        Aquí ves el dinero de tus reservas pagadas online y cuándo llega a tu cuenta.
      </p>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-tactil p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-alerta/30 bg-alerta-suave text-alerta-hondo">
              <Clock3 size={20} strokeWidth={2} />
            </span>
            <p className="font-display text-sm font-bold text-basalto">Por abonarte</p>
          </div>
          <p className="mt-3 font-display text-3xl font-black tabular-nums text-basalto">{cargando ? '…' : soles(porAbonar)}</p>
          <p className="mt-1 text-xs text-pizarra">
            {reservasOnline} reserva{reservasOnline === 1 ? '' : 's'} pagada{reservasOnline === 1 ? '' : 's'} online
          </p>
        </div>
        <div className="card-tactil p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cesped/30 bg-cesped-suave text-cesped-hondo">
              <Wallet size={20} strokeWidth={2} />
            </span>
            <p className="font-display text-sm font-bold text-basalto">Total abonado</p>
          </div>
          <p className="mt-3 font-display text-3xl font-black tabular-nums text-basalto">{cargando ? '…' : soles(totalAbonado)}</p>
          <p className="mt-1 text-xs text-pizarra">
            {abonos.length} abono{abonos.length === 1 ? '' : 's'} recibido{abonos.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-2xl border border-error/40 bg-error-suave px-4 py-3 text-sm font-semibold text-error">
          {errorCarga}
        </p>
      )}

      {/* Explicativa cielo */}
      <div className="card-tactil mt-4 border-2 border-basalto bg-cielo p-5">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-basalto/20 bg-tiza text-basalto">
            <Banknote size={20} strokeWidth={2} />
          </span>
          <div>
            <p className="font-display font-black text-basalto">Todavía no hay abonos en camino</p>
            <p className="mt-1 text-sm leading-relaxed text-pizarra">
              Cuando un jugador pague online, ese dinero se suma a «Por abonarte». Ni bien se procese la
              transferencia lo verás en «Total abonado» y en la tabla de abonos recibidos de más abajo.
            </p>
          </div>
        </div>
      </div>

      {/* Verde: cuándo te abonamos */}
      <div className="card-tactil mt-4 border-2 border-basalto bg-cesped-suave p-5">
        <p className="font-display font-black text-basalto">Cuándo te abonamos</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-pizarra">
          <li>Agrupamos tus pagos online y te los transferimos a tu cuenta registrada.</li>
          <li>Verás cada transferencia como una fila en «Abonos recibidos», con fecha, monto y referencia.</li>
          <li>Si algún pago está en revisión, seguirá sumando en «Por abonarte» hasta liberarse.</li>
        </ul>
      </div>

      {/* Amarilla: falta tu cuenta */}
      {cuenta ? (
        <div className="card-tactil mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cesped/30 bg-cesped-suave text-cesped-hondo">
                <Landmark size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="font-display font-black text-basalto">Tu cuenta para abonos</p>
                <p className="mt-0.5 text-sm text-pizarra">
                  {cuenta.banco} · {cuenta.titular} · <span className="font-mono font-bold text-basalto">{cuenta.numero}</span>
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setModal(true)} className="btn-tactil bg-tiza px-4 py-2.5 font-display text-sm font-bold text-basalto hover:bg-piedra">
              Cambiar cuenta
            </button>
          </div>
        </div>
      ) : (
        <div className="card-tactil mt-4 border-2 border-basalto bg-sol-suave p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-basalto/20 bg-tiza text-basalto">
                <CircleAlert size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="font-display font-black text-basalto">Nos falta tu cuenta</p>
                <p className="mt-0.5 max-w-xl text-sm text-pizarra">
                  Para poder abonarte necesitamos tu cuenta bancaria. Agrégala ahora y tus pagos online
                  llegarán sin demoras.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setModal(true)} className="btn-tactil shrink-0 bg-cesped px-4 py-2.5 font-display text-sm font-bold text-tiza hover:bg-cesped-hover">
              Agregar mi cuenta
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card-tactil mt-4 p-5">
        <h2 className="font-display text-base font-black text-basalto">Abonos recibidos</h2>
        {cargando ? (
          <p className="py-8 text-center text-sm text-pizarra">Cargando abonos…</p>
        ) : abonos.length === 0 ? (
          <p className="py-8 text-center text-sm text-pizarra">
            Aún no recibes abonos. Cuando procesemos tu primera transferencia aparecerá aquí.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-cal font-display text-xs text-pizarra">
                  <th className="py-2 pr-3 font-bold">Fecha</th>
                  <th className="py-2 pr-3 font-bold">Referencia</th>
                  <th className="py-2 pr-3 font-bold">Método</th>
                  <th className="py-2 pr-3 font-bold">Estado</th>
                  <th className="py-2 text-right font-bold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cal">
                {abonos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 pr-3 text-basalto">{a.fecha ? a.fecha.slice(0, 10) : '—'}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-pizarra">{a.referencia}</td>
                    <td className="py-2.5 pr-3 text-pizarra">{a.metodo}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full border border-cesped/30 bg-cesped-suave px-2.5 py-0.5 font-display text-[11px] font-bold text-cesped-hondo">
                        {a.estado}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-display font-black tabular-nums text-basalto">{soles(a.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal cuenta */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4"
          onClick={() => setModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Agregar cuenta bancaria"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-display text-lg font-black text-basalto">Agregar mi cuenta</h3>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
                className="btn-tactil flex h-11 w-11 items-center justify-center rounded-full border-2 border-basalto bg-tiza p-1 text-pizarra hover:text-basalto hover:bg-piedra"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="cuenta-banco" className={labelCls}>Banco</label>
                <input
                  id="cuenta-banco"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="BCP, Interbank, BBVA, Yape…"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="cuenta-titular" className={labelCls}>Titular</label>
                <input
                  id="cuenta-titular"
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  placeholder="Nombre completo o razón social"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="cuenta-numero" className={labelCls}>Número de cuenta o CCI</label>
                <input
                  id="cuenta-numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="CCI de 20 dígitos o número de cuenta"
                  inputMode="numeric"
                  className={cn(inputCls, 'font-mono')}
                />
              </div>
            </div>
            {errorCuenta && (
              <p role="alert" className="mt-3 rounded-xl bg-error-suave px-3 py-2 text-sm font-semibold text-error">
                {errorCuenta}
              </p>
            )}
            <button type="button" onClick={guardarCuenta} disabled={guardando} className="btn-tactil mt-5 w-full bg-cesped py-3 font-display text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar cuenta'}
            </button>
          </div>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
