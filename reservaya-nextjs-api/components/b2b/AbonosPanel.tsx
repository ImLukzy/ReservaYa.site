'use client';

import { useEffect, useState } from 'react';
import { Banknote, CircleAlert, Clock3, Landmark, Wallet, X } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { btnPrimary, card } from '@/lib/b2b-theme';
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

const inputCls =
  'w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25';
const labelCls = 'mb-1 block text-xs font-bold text-[#0F172A]';

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
    <div>
      <TopBar breadcrumb="Finanzas / Abonos" title="Tus abonos" />
      <p className="mt-3 mb-6 text-[14px] leading-relaxed text-[#475569]">
        Aquí ves el dinero de tus reservas pagadas online y cuándo llega a tu cuenta.
      </p>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#EA580C]">
              <Clock3 size={20} strokeWidth={2} />
            </span>
            <p className="text-sm font-bold text-[#0F172A]">Por abonarte</p>
          </div>
          <p className="mt-3 text-3xl font-black text-[#0F172A]">{cargando ? '…' : soles(porAbonar)}</p>
          <p className="mt-1 text-xs text-[#64748B]">
            {reservasOnline} reserva{reservasOnline === 1 ? '' : 's'} pagada{reservasOnline === 1 ? '' : 's'} online
          </p>
        </div>
        <div className={card}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
              <Wallet size={20} strokeWidth={2} />
            </span>
            <p className="text-sm font-bold text-[#0F172A]">Total abonado</p>
          </div>
          <p className="mt-3 text-3xl font-black text-[#0F172A]">{cargando ? '…' : soles(totalAbonado)}</p>
          <p className="mt-1 text-xs text-[#64748B]">
            {abonos.length} abono{abonos.length === 1 ? '' : 's'} recibido{abonos.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorCarga}
        </p>
      )}

      {/* Explicativa azul */}
      <div className="mt-4 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-5">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB]">
            <Banknote size={20} strokeWidth={2} />
          </span>
          <div>
            <p className="font-black text-[#0F172A]">Todavía no hay abonos en camino</p>
            <p className="mt-1 text-sm leading-relaxed text-[#475569]">
              Cuando un jugador pague online, ese dinero se suma a «Por abonarte». Ni bien se procese la
              transferencia lo verás en «Total abonado» y en la tabla de abonos recibidos de más abajo.
            </p>
          </div>
        </div>
      </div>

      {/* Verde: cuándo te abonamos */}
      <div className="mt-4 rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] p-5">
        <p className="font-black text-[#0F172A]">Cuándo te abonamos</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#475569]">
          <li>Agrupamos tus pagos online y te los transferimos a tu cuenta registrada.</li>
          <li>Verás cada transferencia como una fila en «Abonos recibidos», con fecha, monto y referencia.</li>
          <li>Si algún pago está en revisión, seguirá sumando en «Por abonarte» hasta liberarse.</li>
        </ul>
      </div>

      {/* Amarilla: falta tu cuenta */}
      {cuenta ? (
        <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
                <Landmark size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="font-black text-[#0F172A]">Tu cuenta para abonos</p>
                <p className="mt-0.5 text-sm text-[#475569]">
                  {cuenta.banco} · {cuenta.titular} · <span className="font-mono font-bold">{cuenta.numero}</span>
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setModal(true)} className="rounded-xl border border-[#E7E5E4] px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#22C55E]">
              Cambiar cuenta
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#D97706]">
                <CircleAlert size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="font-black text-[#0F172A]">Nos falta tu cuenta</p>
                <p className="mt-0.5 max-w-xl text-sm text-[#475569]">
                  Para poder abonarte necesitamos tu cuenta bancaria. Agrégala ahora y tus pagos online
                  llegarán sin demoras.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setModal(true)} className={cn(btnPrimary, 'shrink-0')}>
              Agregar mi cuenta
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className={cn(card, 'mt-4')}>
        <h2 className="text-base font-black text-[#0F172A]">Abonos recibidos</h2>
        {cargando ? (
          <p className="py-8 text-center text-sm text-[#64748B]">Cargando abonos…</p>
        ) : abonos.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#64748B]">
            Aún no recibes abonos. Cuando procesemos tu primera transferencia aparecerá aquí.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#E7E5E4] text-xs text-[#64748B]">
                  <th className="py-2 pr-3 font-bold">Fecha</th>
                  <th className="py-2 pr-3 font-bold">Referencia</th>
                  <th className="py-2 pr-3 font-bold">Método</th>
                  <th className="py-2 pr-3 font-bold">Estado</th>
                  <th className="py-2 text-right font-bold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F0EE]">
                {abonos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 pr-3 text-[#0F172A]">{a.fecha ? a.fecha.slice(0, 10) : '—'}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-[#475569]">{a.referencia}</td>
                    <td className="py-2.5 pr-3 text-[#475569]">{a.metodo}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]">
                        {a.estado}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-black text-[#0F172A]">{soles(a.monto)}</td>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Agregar cuenta bancaria"
        >
          <div className={cn(card, 'w-full max-w-md')} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-black text-[#0F172A]">Agregar mi cuenta</h3>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1 text-[#64748B] hover:bg-gray-100"
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
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                {errorCuenta}
              </p>
            )}
            <button type="button" onClick={guardarCuenta} disabled={guardando} className={cn(btnPrimary, 'mt-4 w-full py-3 disabled:opacity-50')}>
              {guardando ? 'Guardando…' : 'Guardar cuenta'}
            </button>
          </div>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
