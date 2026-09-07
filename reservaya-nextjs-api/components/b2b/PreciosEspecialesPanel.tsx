'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { btnPrimary, card } from '@/lib/b2b-theme';
import { cn } from '@/lib/utils';

interface Regla {
  id: string;
  nombre: string;
  desde: string;
  hasta: string | null;
  precioDia: number | null;
  precioTarde: number | null;
  precioNoche: number | null;
  inicioTarde: string;
  inicioNoche: string;
  repetirAnual: boolean;
}

const inputCls =
  'w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25';
const labelCls = 'mb-1 block text-xs font-bold text-[#0F172A]';

function normalizar(raw: Record<string, unknown>, i: number): Regla {
  const num = (v: unknown): number | null => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown, fb: string): string => (v != null && v !== '' ? String(v) : fb);
  return {
    id: String(raw.id ?? raw._id ?? `regla-${i}`),
    nombre: String(raw.nombre ?? raw.name ?? 'Sin nombre'),
    desde: str(raw.desde ?? raw.fechaInicio ?? raw.fecha, ''),
    hasta: raw.hasta != null && raw.hasta !== '' ? String(raw.hasta) : null,
    precioDia: num(raw.precioDia ?? raw.precioManana ?? raw.precioMañana),
    precioTarde: num(raw.precioTarde),
    precioNoche: num(raw.precioNoche),
    inicioTarde: str(raw.inicioTarde ?? raw.tardeDesde, '17:00'),
    inicioNoche: str(raw.inicioNoche ?? raw.nocheDesde, '20:00'),
    repetirAnual: raw.repetirAnual === true || raw.repetirCadaAno === true,
  };
}

function formatearFecha(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(d);
}

function formatearHora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const suf = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}${suf}`;
}

async function leerLista(res: Response): Promise<Regla[]> {
  const body = await res.json().catch(() => null);
  const arr = body?.reglas ?? body?.promociones ?? body?.data ?? body;
  if (!Array.isArray(arr)) return [];
  return arr.map((r, i) => normalizar(r as Record<string, unknown>, i));
}

export function PreciosEspecialesPanel() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [precioDia, setPrecioDia] = useState('');
  const [precioTarde, setPrecioTarde] = useState('');
  const [precioNoche, setPrecioNoche] = useState('');
  const [inicioTarde, setInicioTarde] = useState('17:00');
  const [inicioNoche, setInicioNoche] = useState('20:00');
  const [repetir, setRepetir] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch('/api/promociones?tipo=PRECIO_ESPECIAL', { credentials: 'include' });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const lista = await leerLista(res);
        if (vivo) setReglas(lista);
      } catch {
        if (vivo) setErrorLista('No pudimos cargar tus reglas. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function crear() {
    setErrorForm(null);
    setOkMsg(null);
    if (nombre.trim().length < 3) {
      setErrorForm('Ponle un nombre a la regla (ej. Fiestas Patrias).');
      return;
    }
    if (!desde) {
      setErrorForm('Elige la fecha Desde.');
      return;
    }
    if (hasta !== '' && hasta < desde) {
      setErrorForm('La fecha Hasta no puede ser anterior a Desde.');
      return;
    }
    if (precioDia === '' && precioTarde === '' && precioNoche === '') {
      setErrorForm('Ingresa al menos el precio de una franja (día, tarde o noche).');
      return;
    }
    setCreando(true);
    try {
      const res = await fetch('/api/promociones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tipo: 'PRECIO_ESPECIAL',
          nombre: nombre.trim(),
          desde,
          hasta: hasta !== '' ? hasta : null,
          precioDia: precioDia !== '' ? Number(precioDia) : null,
          precioTarde: precioTarde !== '' ? Number(precioTarde) : null,
          precioNoche: precioNoche !== '' ? Number(precioNoche) : null,
          inicioTarde,
          inicioNoche,
          repetirAnual: repetir,
          activo: true,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      const nueva = normalizar((body?.promocion ?? body?.regla ?? {}) as Record<string, unknown>, reglas.length);
      setReglas((prev) => [
        nueva.nombre !== 'Sin nombre' ? nueva : { ...nueva, nombre: nombre.trim(), desde, hasta: hasta !== '' ? hasta : null },
        ...prev,
      ]);
      setNombre('');
      setDesde('');
      setHasta('');
      setPrecioDia('');
      setPrecioTarde('');
      setPrecioNoche('');
      setInicioTarde('17:00');
      setInicioNoche('20:00');
      setRepetir(false);
      setOkMsg('Regla creada correctamente.');
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo crear la regla.');
    } finally {
      setCreando(false);
    }
  }

  async function eliminar(r: Regla) {
    if (!window.confirm(`¿Eliminar la regla «${r.nombre}»? Esta acción no se puede deshacer.`)) return;
    const respaldo = reglas;
    setReglas((prev) => prev.filter((x) => x.id !== r.id));
    try {
      const res = await fetch(`/api/promociones/${r.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
    } catch {
      setReglas(respaldo);
    }
  }

  return (
    <div>
      <TopBar breadcrumb="Gestión / Precios especiales" title="Precios por fecha" />
      <p className="mt-3 mb-6 text-[14px] leading-relaxed text-[#475569]">
        Sube o baja tus tarifas en feriados y fechas clave sin tocar tu precio base.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[380px_1fr]">
        {/* Nueva regla */}
        <section className={card} aria-label="Nueva regla de precio">
          <h2 className="text-base font-black text-[#0F172A]">Nueva regla</h2>

          <div className="mt-4">
            <label htmlFor="regla-nombre" className={labelCls}>Nombre</label>
            <input
              id="regla-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Fiestas Patrias"
              maxLength={60}
              className={inputCls}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="regla-desde" className={labelCls}>Desde</label>
              <input
                id="regla-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="regla-hasta" className={labelCls}>Hasta</label>
              <input
                id="regla-hasta"
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-[#64748B]">Para un solo día deja Hasta vacío.</p>

          <div className="mt-4 border-t border-[#E7E5E4] pt-4">
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#64748B]">PRECIO POR TURNO</p>
            <div className="mt-2.5 space-y-2.5">
              <div>
                <label htmlFor="precio-dia" className={labelCls}>Día <span className="font-normal text-[#64748B]">(antes de las 17:00)</span></label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-[#64748B]">S/</span>
                  <input
                    id="precio-dia"
                    type="number"
                    min={0}
                    value={precioDia}
                    onChange={(e) => setPrecioDia(e.target.value)}
                    placeholder="50.00"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="precio-tarde" className={labelCls}>Tarde <span className="font-normal text-[#64748B]">(17:00 – 20:00)</span></label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-[#64748B]">S/</span>
                  <input
                    id="precio-tarde"
                    type="number"
                    min={0}
                    value={precioTarde}
                    onChange={(e) => setPrecioTarde(e.target.value)}
                    placeholder="60.00"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="precio-noche" className={labelCls}>Noche <span className="font-normal text-[#64748B]">(desde las 20:00)</span></label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-[#64748B]">S/</span>
                  <input
                    id="precio-noche"
                    type="number"
                    min={0}
                    value={precioNoche}
                    onChange={(e) => setPrecioNoche(e.target.value)}
                    placeholder="70.00"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-[#64748B]">Deja una franja vacía para mantener su precio normal.</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="inicio-tarde" className={labelCls}>La tarde empieza</label>
              <input
                id="inicio-tarde"
                type="time"
                value={inicioTarde}
                onChange={(e) => setInicioTarde(e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[#64748B]">05:00pm por defecto</p>
            </div>
            <div>
              <label htmlFor="inicio-noche" className={labelCls}>La noche empieza</label>
              <input
                id="inicio-noche"
                type="time"
                value={inicioNoche}
                onChange={(e) => setInicioNoche(e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[#64748B]">08:00pm por defecto</p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-[#0F172A]">
            <input
              type="checkbox"
              checked={repetir}
              onChange={(e) => setRepetir(e.target.checked)}
              className="h-4 w-4 rounded accent-[#22C55E]"
            />
            Repetir cada año
          </label>

          {errorForm && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
              {errorForm}
            </p>
          )}
          {okMsg && (
            <p role="status" className="mt-3 rounded-xl bg-[#DCFCE7] px-3 py-2 text-sm font-semibold text-[#15803D]">
              {okMsg}
            </p>
          )}
          <button type="button" onClick={crear} disabled={creando} className={cn(btnPrimary, 'mt-4 w-full py-3 disabled:opacity-50')}>
            {creando ? 'Creando…' : 'Crear regla'}
          </button>
        </section>

        {/* Lista */}
        <section className={card} aria-label="Tus reglas">
          <h2 className="text-base font-black text-[#0F172A]">Tus reglas</h2>
          {cargando ? (
            <p className="py-10 text-center text-sm text-[#64748B]">Cargando reglas…</p>
          ) : errorLista && reglas.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#64748B]">{errorLista}</p>
              <button type="button" onClick={() => window.location.reload()} className={cn(btnPrimary, 'mt-3')}>
                Reintentar
              </button>
            </div>
          ) : reglas.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Aún no tienes reglas de precios especiales"
              description="Crea tu primera regla (ej. Fiestas Patrias) y ajusta tus tarifas por franja sin tocar tu precio base."
              action={
                <a href="#regla-nombre" className={btnPrimary}>
                  Crear mi primera regla
                </a>
              }
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {reglas.map((r) => (
                <li key={r.id} className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-[#0F172A]">{r.nombre}</p>
                        {r.repetirAnual && (
                          <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]">
                            Cada año
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        {formatearFecha(r.desde)}{r.hasta ? ` → ${formatearFecha(r.hasta)}` : ' · solo ese día'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminar(r)}
                      aria-label={`Eliminar regla ${r.nombre}`}
                      title="Eliminar"
                      className="rounded-lg p-2 text-[#CBD5E1] transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={17} strokeWidth={1.85} />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { t: `Día · hasta ${formatearHora(r.inicioTarde)}`, v: r.precioDia },
                      { t: `Tarde · hasta ${formatearHora(r.inicioNoche)}`, v: r.precioTarde },
                      { t: `Noche · desde ${formatearHora(r.inicioNoche)}`, v: r.precioNoche },
                    ].map((f) => (
                      <div key={f.t} className="rounded-xl bg-[#F5F5F3] px-3 py-2 text-center">
                        <p className="text-[11px] font-semibold text-[#64748B]">{f.t}</p>
                        <p className="mt-0.5 text-sm font-black text-[#0F172A]">
                          {f.v != null ? `S/ ${f.v}` : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
