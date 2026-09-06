'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Percent, Tag, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { btnPrimary, card } from '@/lib/b2b-theme';
import { cn } from '@/lib/utils';

type TipoDescuento = 'PORCENTAJE' | 'MONTO';

interface Codigo {
  id: string;
  codigo: string;
  tipo: string;
  valor: number;
  usosActuales: number;
  usosMax: number | null;
  usosPorPersona: number | null;
  venceEn: string | null;
  activo: boolean;
  minHoras: number | null;
  minMonto: number | null;
}

const inputCls =
  'w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25';
const labelCls = 'mb-1 block text-xs font-bold text-[#0F172A]';

function normalizar(raw: Record<string, unknown>, i: number): Codigo {
  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: String(raw.id ?? raw._id ?? `promo-${i}`),
    codigo: String(raw.codigo ?? raw.code ?? '').toUpperCase(),
    tipo: String(raw.tipo ?? 'PORCENTAJE').toUpperCase(),
    valor: num(raw.valor ?? raw.porcentaje ?? raw.monto) ?? 0,
    usosActuales: num(raw.usosActuales ?? raw.usos ?? raw.usados) ?? 0,
    usosMax: num(raw.usosMax ?? raw.limiteTotal ?? raw.maxUsos),
    usosPorPersona: num(raw.usosPorPersona ?? raw.limitePorPersona),
    venceEn: raw.venceEn != null && raw.venceEn !== '' ? String(raw.venceEn) : null,
    activo: raw.activo !== false && raw.activa !== false && raw.estado !== 'INACTIVA',
    minHoras: num(raw.minHoras ?? raw.minimoHoras),
    minMonto: num(raw.minMonto ?? raw.montoMinimo),
  };
}

function esPrecioEspecial(tipo: string): boolean {
  return tipo.includes('PRECIO') || tipo.includes('ESPECIAL');
}

async function leerLista(res: Response): Promise<Codigo[]> {
  const body = await res.json().catch(() => null);
  const arr = body?.promociones ?? body?.codigos ?? body?.data ?? body;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((r, i) => normalizar(r as Record<string, unknown>, i))
    .filter((c) => c.codigo !== '' && !esPrecioEspecial(c.tipo));
}

export function DescuentosPanel() {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  // Formulario
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<TipoDescuento>('PORCENTAJE');
  const [valor, setValor] = useState('');
  const [limitarTotal, setLimitarTotal] = useState(false);
  const [usosMax, setUsosMax] = useState('');
  const [limitarPersona, setLimitarPersona] = useState(false);
  const [usosPersona, setUsosPersona] = useState('');
  const [conVencimiento, setConVencimiento] = useState(false);
  const [fechaVence, setFechaVence] = useState('');
  const [conMinHoras, setConMinHoras] = useState(false);
  const [minHoras, setMinHoras] = useState('');
  const [conMinMonto, setConMinMonto] = useState(false);
  const [minMonto, setMinMonto] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch('/api/promociones', { credentials: 'include' });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const lista = await leerLista(res);
        if (vivo) setCodigos(lista);
      } catch {
        if (vivo) setErrorLista('No pudimos cargar tus códigos. Revisa tu conexión e inténtalo de nuevo.');
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
    const code = codigo.trim().toUpperCase();
    const val = Number(valor);
    if (code.length < 3) {
      setErrorForm('El código debe tener al menos 3 letras (ej. GYM20).');
      return;
    }
    if (!Number.isFinite(val) || val <= 0) {
      setErrorForm(tipo === 'PORCENTAJE' ? 'Ingresa un porcentaje válido mayor a 0.' : 'Ingresa un monto válido mayor a 0.');
      return;
    }
    if (tipo === 'PORCENTAJE' && val > 100) {
      setErrorForm('El porcentaje no puede ser mayor a 100.');
      return;
    }
    setCreando(true);
    try {
      const res = await fetch('/api/promociones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          codigo: code,
          tipo: tipo === 'PORCENTAJE' ? 'PORCENTAJE' : 'MONTO_FIJO',
          valor: val,
          usosMax: limitarTotal && usosMax !== '' ? Number(usosMax) : null,
          usosPorPersona: limitarPersona && usosPersona !== '' ? Number(usosPersona) : null,
          venceEn: conVencimiento && fechaVence !== '' ? fechaVence : null,
          minHoras: conMinHoras && minHoras !== '' ? Number(minHoras) : null,
          minMonto: conMinMonto && minMonto !== '' ? Number(minMonto) : null,
          activo: true,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      const nuevo = normalizar((body?.promocion ?? body ?? {}) as Record<string, unknown>, codigos.length);
      setCodigos((prev) => [nuevo.codigo !== '' ? nuevo : { ...nuevo, codigo: code }, ...prev]);
      setCodigo('');
      setValor('');
      setUsosMax('');
      setUsosPersona('');
      setFechaVence('');
      setMinHoras('');
      setMinMonto('');
      setLimitarTotal(false);
      setLimitarPersona(false);
      setConVencimiento(false);
      setConMinHoras(false);
      setConMinMonto(false);
      setOkMsg(`Código ${code} creado correctamente.`);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo crear el código.');
    } finally {
      setCreando(false);
    }
  }

  async function toggleActivo(c: Codigo) {
    const previo = c.activo;
    setCodigos((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)));
    try {
      const res = await fetch(`/api/promociones/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activo: !previo }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCodigos((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: previo } : x)));
    }
  }

  async function eliminar(c: Codigo) {
    if (!window.confirm(`¿Eliminar el código ${c.codigo}? Esta acción no se puede deshacer.`)) return;
    const respaldo = codigos;
    setCodigos((prev) => prev.filter((x) => x.id !== c.id));
    try {
      const res = await fetch(`/api/promociones/${c.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
    } catch {
      setCodigos(respaldo);
    }
  }

  async function copiar(c: Codigo) {
    try {
      await navigator.clipboard.writeText(c.codigo);
      setCopiadoId(c.id);
      setTimeout(() => setCopiadoId((v) => (v === c.id ? null : v)), 1600);
    } catch {
      setCopiadoId(null);
    }
  }

  return (
    <div>
      <TopBar breadcrumb="Gestión / Descuentos" title="Códigos de descuento" />
      <p className="mt-3 mb-6 text-[14px] leading-relaxed text-[#475569]">
        Crea cupones para atraer más reservas entre semana o en horarios con poca ocupación.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[380px_1fr]">
        {/* Nuevo código */}
        <section className={card} aria-label="Nuevo código de descuento">
          <h2 className="text-base font-black text-[#0F172A]">Nuevo código</h2>

          <div className="mt-4">
            <label htmlFor="nuevo-codigo" className={labelCls}>Código</label>
            <input
              id="nuevo-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="GYM20"
              maxLength={20}
              className={cn(inputCls, 'font-mono font-bold tracking-widest uppercase')}
            />
          </div>

          <div className="mt-4">
            <span className={labelCls}>Tipo de descuento</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F5F5F3] p-1" role="group" aria-label="Tipo de descuento">
              {(['PORCENTAJE', 'MONTO'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  aria-pressed={tipo === t}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-bold transition-all',
                    tipo === t ? 'bg-white text-[#0F172A] shadow-sm ring-1 ring-[#E7E5E4]' : 'text-[#64748B] hover:text-[#0F172A]'
                  )}
                >
                  {t === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="valor-descuento" className={labelCls}>
              {tipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto (S/)'}
            </label>
            <input
              id="valor-descuento"
              type="number"
              min={0}
              max={tipo === 'PORCENTAJE' ? 100 : undefined}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={tipo === 'PORCENTAJE' ? '20' : '15.00'}
              className={inputCls}
            />
          </div>

          <div className="mt-4 space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#0F172A]">
              <input
                type="checkbox"
                checked={limitarTotal}
                onChange={(e) => setLimitarTotal(e.target.checked)}
                className="h-4 w-4 rounded accent-[#22C55E]"
              />
              Limitar usos en total
            </label>
            {limitarTotal && (
              <input
                type="number"
                min={1}
                value={usosMax}
                onChange={(e) => setUsosMax(e.target.value)}
                placeholder="Ej. 100"
                aria-label="Usos máximos en total"
                className={inputCls}
              />
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#0F172A]">
              <input
                type="checkbox"
                checked={limitarPersona}
                onChange={(e) => setLimitarPersona(e.target.checked)}
                className="h-4 w-4 rounded accent-[#22C55E]"
              />
              Limitar usos por persona
            </label>
            {limitarPersona && (
              <input
                type="number"
                min={1}
                value={usosPersona}
                onChange={(e) => setUsosPersona(e.target.value)}
                placeholder="Ej. 1 por persona"
                aria-label="Usos máximos por persona"
                className={inputCls}
              />
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#0F172A]">
              <input
                type="checkbox"
                checked={conVencimiento}
                onChange={(e) => setConVencimiento(e.target.checked)}
                className="h-4 w-4 rounded accent-[#22C55E]"
              />
              Tiene fecha de vencimiento
            </label>
            {conVencimiento && (
              <input
                type="date"
                value={fechaVence}
                onChange={(e) => setFechaVence(e.target.value)}
                aria-label="Fecha de vencimiento"
                className={inputCls}
              />
            )}
          </div>

          <div className="mt-5 border-t border-[#E7E5E4] pt-4">
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#64748B]">CONDICIONES</p>
            <div className="mt-2.5 space-y-2.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={conMinHoras}
                  onChange={(e) => setConMinHoras(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#22C55E]"
                />
                Solo para reservas de X horas o más
              </label>
              {conMinHoras && (
                <input
                  type="number"
                  min={1}
                  value={minHoras}
                  onChange={(e) => setMinHoras(e.target.value)}
                  placeholder="Ej. 2 horas"
                  aria-label="Mínimo de horas"
                  className={inputCls}
                />
              )}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={conMinMonto}
                  onChange={(e) => setConMinMonto(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#22C55E]"
                />
                Solo desde cierto monto
              </label>
              {conMinMonto && (
                <input
                  type="number"
                  min={0}
                  value={minMonto}
                  onChange={(e) => setMinMonto(e.target.value)}
                  placeholder="Ej. S/ 50.00"
                  aria-label="Monto mínimo"
                  className={inputCls}
                />
              )}
            </div>
          </div>

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
            {creando ? 'Creando…' : 'Crear código'}
          </button>
        </section>

        {/* Lista */}
        <section className={card} aria-label="Tus códigos">
          <h2 className="text-base font-black text-[#0F172A]">Tus códigos</h2>
          {cargando ? (
            <p className="py-10 text-center text-sm text-[#64748B]">Cargando códigos…</p>
          ) : errorLista && codigos.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#64748B]">{errorLista}</p>
              <button type="button" onClick={() => window.location.reload()} className={cn(btnPrimary, 'mt-3')}>
                Reintentar
              </button>
            </div>
          ) : codigos.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Aún no tienes códigos de descuento"
              description="Crea tu primer cupón desde el panel «Nuevo código» y compártelo por WhatsApp para llenar tus horarios flojos."
              action={
                <a href="#nuevo-codigo" className={btnPrimary}>
                  Crear mi primer código
                </a>
              }
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {codigos.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
                    <Percent size={18} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-base font-black tracking-widest text-[#0F172A]">{c.codigo}</p>
                      <span className="rounded-full bg-[#F1F0EE] px-2.5 py-0.5 text-[11px] font-bold text-[#475569]">
                        {c.tipo.includes('MONTO') ? 'Monto fijo' : 'Porcentaje'}
                      </span>
                      {!c.activo && (
                        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-500">
                          Pausado
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-[#15803D]">{c.tipo.includes('MONTO') ? `− S/ ${c.valor}` : `− ${c.valor}%`}</p>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {c.usosActuales}{c.usosMax != null ? `/${c.usosMax}` : ''} usos
                      {c.usosPorPersona != null ? ` · máx. ${c.usosPorPersona} por persona` : ''}
                      {c.venceEn ? ` · vence ${c.venceEn.slice(0, 10)}` : ''}
                      {c.minHoras != null ? ` · desde ${c.minHoras}h` : ''}
                      {c.minMonto != null ? ` · desde S/ ${c.minMonto}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.activo}
                      aria-label={c.activo ? `Pausar ${c.codigo}` : `Activar ${c.codigo}`}
                      title={c.activo ? 'Pausar' : 'Activar'}
                      onClick={() => toggleActivo(c)}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        c.activo ? 'bg-[#22C55E]' : 'bg-[#E7E5E4]'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                          c.activo ? 'left-[22px]' : 'left-0.5'
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => copiar(c)}
                      aria-label={`Copiar ${c.codigo}`}
                      title="Copiar código"
                      className="rounded-lg p-2 text-[#64748B] transition-colors hover:bg-gray-50 hover:text-[#0F172A]"
                    >
                      {copiadoId === c.id ? <Check size={17} strokeWidth={2} className="text-[#22C55E]" /> : <Copy size={17} strokeWidth={1.85} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(c)}
                      aria-label={`Eliminar ${c.codigo}`}
                      title="Eliminar"
                      className="rounded-lg p-2 text-[#CBD5E1] transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={17} strokeWidth={1.85} />
                    </button>
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
