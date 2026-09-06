'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CircleHelp,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';
import {
  abrirCaja,
  actualizarProducto,
  B2BApiError,
  cobrarTicket,
  crearProducto,
  eliminarProducto,
  getCajaHoy,
  getCajaSesion,
  getProductos,
  cerrarCaja,
  num,
  registrarMovimiento,
  soles,
  type CajaAbierta,
  type CategoriaProducto,
  type MetodoPago,
  type MovimientoCaja,
  type ProductoCaja,
  type ResumenCaja,
  type TipoMovimiento,
} from '@/lib/b2b-client';

export interface CanchaPOS {
  id: string;
  nombre: string;
  tipo: string;
  precioPorHora: string;
}

const TABS = [
  { id: 'vender', label: 'Vender' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'compras', label: 'Compras' },
  { id: 'salidas', label: 'Salidas' },
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'productos', label: 'Productos' },
  { id: 'reporte', label: 'Reporte' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const INGRESO_TIPOS = ['RESERVA', 'SNACK', 'ALQUILER', 'ABONO'];
const METODOS: MetodoPago[] = ['EFECTIVO', 'YAPE', 'TARJETA', 'TRANSFERENCIA', 'CULQI'];
const CATEGORIAS: CategoriaProducto[] = ['SNACK', 'ALQUILER', 'SERVICIO'];

const TIPO_LABEL: Record<string, string> = {
  RESERVA: 'Reserva',
  SNACK: 'Venta',
  ALQUILER: 'Alquiler',
  ABONO: 'Abono',
  EGRESO: 'Compra',
  AJUSTE: 'Salida',
};

  function horaPeru(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
}

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-[#0F172A]">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7E5E4] text-[#64748B] hover:border-[#22C55E]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25';
const labelCls = 'mb-1 block text-xs font-bold text-[#475569]';
const btnPrimary =
  'rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'rounded-xl border border-[#E7E5E4] bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#22C55E]';

interface Linea {
  key: string;
  productoId?: string;
  nombre: string;
  precio: number;
  qty: number;
}

export function CajaPanel({ canchas }: { canchas: CanchaPOS[] }) {
  const tabs = TABS;
  const [tab, setTab] = useState<TabId>('vender');
  const [productos, setProductos] = useState<ProductoCaja[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [vendidoHoy, setVendidoHoy] = useState(0);
  const [caja, setCaja] = useState<CajaAbierta | null>(null);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vender
  const [q, setQ] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [cobrando, setCobrando] = useState(false);
  const [ticketMsg, setTicketMsg] = useState<string | null>(null);

  // Modales
  const [modalMov, setModalMov] = useState<null | { tipo: TipoMovimiento; titulo: string }>(null);
  const [modalProd, setModalProd] = useState<null | { edit?: ProductoCaja }>(null);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Efectivo
  const [montoApertura, setMontoApertura] = useState('50');
  const [montoCierre, setMontoCierre] = useState('');
  const [cierreInfo, setCierreInfo] = useState<{ diferencia: number } | null>(null);

  const refrescar = useCallback(async (conSpinner = false) => {
    if (conSpinner) setCargando(true);
    setError(null);
    try {
      const [hoy, prods, sesion] = await Promise.all([getCajaHoy(), getProductos(), getCajaSesion()]);
      setMovimientos(hoy.movimientos);
      setVendidoHoy(num(hoy.total));
      setProductos(prods.productos);
      setCaja(sesion.caja);
      setResumen(sesion.resumen);
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo cargar la caja');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void refrescar(true);
  }, [refrescar]);

  const filtrados = useMemo(
    () => productos.filter((p) => p.nombre.toLowerCase().includes(q.trim().toLowerCase())),
    [productos, q]
  );
  const ventas = useMemo(() => movimientos.filter((m) => INGRESO_TIPOS.includes(m.tipo)), [movimientos]);
  const compras = useMemo(() => movimientos.filter((m) => m.tipo === 'EGRESO'), [movimientos]);
  const salidas = useMemo(() => movimientos.filter((m) => m.tipo === 'AJUSTE'), [movimientos]);

  const subtotal = useMemo(() => lineas.reduce((acc, l) => acc + l.precio * l.qty, 0), [lineas]);

  function agregarLinea(l: Omit<Linea, 'qty'>, e?: ReactMouseEvent<HTMLElement>) {
    setTicketMsg(null);
    if (e?.currentTarget instanceof HTMLElement) volarAlTicket(e.currentTarget);
    setLineas((prev) => {
      const ex = prev.find((x) => x.key === l.key);
      if (ex) return prev.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { ...l, qty: 1 }];
    });
  }

  const ticketRef = useRef<HTMLElement>(null);
  const [totalShown, setTotalShown] = useState(0);
  const prevSubtotal = useRef(0);

  // Total con conteo animado (solo números → 60fps)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTotalShown(subtotal);
      prevSubtotal.current = subtotal;
      return;
    }
    const from = prevSubtotal.current;
    prevSubtotal.current = subtotal;
    if (from === subtotal) {
      setTotalShown(subtotal);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 400);
      setTotalShown(from + (subtotal - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [subtotal]);

  function volarAlTicket(origen: HTMLElement) {
    const destino = ticketRef.current;
    if (!destino || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = origen.getBoundingClientRect();
    const b = destino.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'fly-dot';
    const size = 22;
    dot.style.cssText = `width:${size}px;height:${size}px;left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;background:#22C55E;`;
    document.body.appendChild(dot);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + 90 - (a.top + a.height / 2);
    dot.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px,${dy * 0.7 - 60}px) scale(0.85)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px,${dy}px) scale(0.3)`, opacity: 0.4 },
      ],
      { duration: 550, easing: 'cubic-bezier(0.22,1,0.36,1)' }
    ).onfinish = () => {
      dot.remove();
      destino.classList.remove('ticket-bump');
      void destino.offsetWidth;
      destino.classList.add('ticket-bump');
    };
  }

  function cambiarQty(key: string, delta: number) {
    setLineas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0)
    );
  }

  async function cobrar() {
    if (lineas.length === 0 || cobrando) return;
    setCobrando(true);
    setTicketMsg(null);
    setError(null);
    try {
      const res = await cobrarTicket({
        metodoPago: metodo,
        items: lineas.map((l) => ({
          productoId: l.productoId,
          nombre: l.productoId ? undefined : l.nombre,
          precio: l.productoId ? undefined : l.precio,
          cantidad: l.qty,
        })),
      });
      setTicketMsg(`Cobro registrado · ${soles(num(res.total))}`);
      setLineas([]);
      await refrescar();
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo cobrar');
    } finally {
      setCobrando(false);
    }
  }

  async function guardarMovimientoSimple(fd: FormData) {
    if (!modalMov) return;
    setGuardando(true);
    setFormError(null);
    try {
      await registrarMovimiento({
        descripcion: String(fd.get('descripcion') ?? '').trim(),
        monto: Number(fd.get('monto') ?? 0),
        tipo: modalMov.tipo,
        metodoPago: (String(fd.get('metodoPago') ?? 'EFECTIVO') as MetodoPago) ?? 'EFECTIVO',
      });
      setModalMov(null);
      await refrescar();
    } catch (e) {
      setFormError(e instanceof B2BApiError ? e.message : 'No se pudo registrar');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarProducto(fd: FormData) {
    setGuardando(true);
    setFormError(null);
    try {
      const stockRaw = String(fd.get('stock') ?? '').trim();
      const payload = {
        nombre: String(fd.get('nombre') ?? '').trim(),
        categoria: String(fd.get('categoria') ?? 'SNACK') as CategoriaProducto,
        precio: Number(fd.get('precio') ?? 0),
        stock: stockRaw === '' ? null : Number(stockRaw),
      };
      if (modalProd?.edit) await actualizarProducto(modalProd.edit.id, payload);
      else await crearProducto(payload);
      setModalProd(null);
      await refrescar();
    } catch (e) {
      setFormError(e instanceof B2BApiError ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function borrarProducto(id: string) {
    if (!window.confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await eliminarProducto(id);
      await refrescar();
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo eliminar');
    }
  }

  async function abrir() {
    setError(null);
    try {
      await abrirCaja(Number(montoApertura) || 0);
      setCierreInfo(null);
      await refrescar();
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo abrir la caja');
    }
  }

  async function cerrar() {
    setError(null);
    try {
      const res = await cerrarCaja(Number(montoCierre) || 0);
      setCierreInfo({ diferencia: num(res.diferencia) });
      setMontoCierre('');
      await refrescar();
    } catch (e) {
      setError(e instanceof B2BApiError ? e.message : 'No se pudo cerrar la caja');
    }
  }

  const porMetodo = useMemo(() => {
    const acc = new Map<string, number>();
    for (const m of ventas) acc.set(m.metodoPago, (acc.get(m.metodoPago) ?? 0) + num(m.monto));
    return [...acc.entries()].sort((a, b) => b[1] - a[1]);
  }, [ventas]);

  const porTipo = useMemo(() => {
    const acc = new Map<string, number>();
    for (const m of movimientos) {
      const signo = INGRESO_TIPOS.includes(m.tipo) ? 1 : -1;
      acc.set(m.tipo, (acc.get(m.tipo) ?? 0) + signo * num(m.monto));
    }
    return [...acc.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [movimientos]);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">▦ CAJA</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Caja</h1>
          <p className="text-sm text-[#64748B]">
            Registra las ventas de tu tienda, controla el efectivo y cierra tu turno sin fugas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ayuda"
            aria-label="Ayuda"
            title="Ayuda"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-white px-3 text-sm font-bold text-[#64748B] transition-colors hover:border-[#22C55E]"
          >
            <CircleHelp size={18} strokeWidth={1.85} /> Ayuda
          </Link>
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#22C55E]/30 bg-[#DCFCE7] px-4 py-2">
            <Wallet size={20} className="text-[#15803D]" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#15803D]">VENDIDO HOY</p>
              <p className="text-lg font-black leading-none text-[#0F172A]">{soles(vendidoHoy)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-[#E7E5E4] bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all',
              tab === t.id ? 'bg-[#22C55E] text-white shadow' : 'text-[#64748B] hover:bg-[#F5F5F3] hover:text-[#0F172A]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white p-12 text-center text-sm text-[#64748B]">
          Cargando caja…
        </div>
      ) : (
        <div className="mt-4">
          {tab === 'vender' && (
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className="relative">
                  <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar producto…"
                    aria-label="Buscar producto"
                    className="w-full rounded-xl border border-[#E7E5E4] bg-white py-2.5 pr-3 pl-10 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25"
                  />
                </div>

                {canchas.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[#64748B]">ALQUILER DE CANCHA · 1H</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canchas.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={(e) =>
                            agregarLinea(
                              {
                                key: `cancha-${c.id}`,
                                nombre: `Cancha ${c.nombre} · 1h`,
                                precio: num(c.precioPorHora),
                              },
                              e
                            )
                          }
                          className="rounded-xl border border-[#E7E5E4] bg-[#F5F5F3] px-3 py-2 text-left text-xs font-bold text-[#0F172A] transition-all hover:border-[#22C55E] active:scale-[0.98]"
                        >
                          🏟️ {c.nombre} · {soles(num(c.precioPorHora))}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  {productos.length === 0 ? (
                    <div className="rounded-2xl border border-[#E7E5E4] bg-white">
                      <EmptyState
                        icon={ShoppingCart}
                        title="Aún no tienes productos"
                        description="Agrega tus productos para vender desde aquí: snacks, alquileres y servicios."
                        action={
                          <button type="button" onClick={() => setModalProd({})} className={btnPrimary}>
                            <span className="inline-flex items-center gap-1.5"><PackagePlus size={16} /> Agregar producto</span>
                          </button>
                        }
                      />
                    </div>
                  ) : filtrados.length === 0 ? (
                    <div className="rounded-2xl border border-[#E7E5E4] bg-white">
                      <EmptyState
                        icon={Search}
                        title="Sin resultados"
                        description="Prueba con otro término o agrega el producto al catálogo."
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {filtrados.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={(e) =>
                            agregarLinea({ key: `prod-${p.id}`, productoId: p.id, nombre: p.nombre, precio: num(p.precio) }, e)
                          }
                          className="rounded-2xl border border-[#E7E5E4] bg-white p-3 text-left transition-all hover:border-[#22C55E] hover:shadow-md active:scale-[0.98]"
                        >
                          <div className="flex h-16 items-center justify-center rounded-xl bg-[#F5F5F3] text-3xl" aria-hidden>
                            {p.categoria === 'ALQUILER' ? '🎽' : p.categoria === 'SERVICIO' ? '🛎️' : '🥤'}
                          </div>
                          <p className="mt-2 truncate text-sm font-bold text-[#0F172A]">{p.nombre}</p>
                          <p className="text-xs text-[#64748B]">{p.categoria}</p>
                          <p className="font-black text-[#15803D]">{soles(num(p.precio))}</p>
                          {p.stock !== null && (
                            <p className={cn('text-[11px] font-semibold', p.stock <= 0 ? 'text-red-600' : 'text-[#64748B]')}>
                              Stock: {p.stock}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Ticket */}
              <aside ref={ticketRef} className="flex flex-col rounded-2xl border border-[#E7E5E4] bg-white p-5">
                <h2 className="text-lg font-black text-[#0F172A]">Ticket actual</h2>
                <p className="text-xs text-[#64748B]">{lineas.length} ítem{lineas.length === 1 ? '' : 's'}</p>
                <div className="mt-3 min-h-[120px] flex-1">
                  {lineas.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#64748B]">Toca un producto para agregarlo.</p>
                  ) : (
                    <ul className="space-y-3">
                      {lineas.map((l) => (
                        <li key={l.key} className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => cambiarQty(l.key, -1)} aria-label={`Quitar uno de ${l.nombre}`} className="rounded-lg border border-[#E7E5E4] p-1 text-[#475569] hover:text-[#0F172A]">
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-[#0F172A]">{l.qty}</span>
                            <button type="button" onClick={() => cambiarQty(l.key, 1)} aria-label={`Agregar uno de ${l.nombre}`} className="rounded-lg border border-[#E7E5E4] p-1 text-[#475569] hover:text-[#0F172A]">
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0F172A]">{l.nombre}</p>
                          <p className="text-sm font-bold text-[#0F172A]">{soles(l.precio * l.qty)}</p>
                          <button type="button" onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))} aria-label={`Quitar ${l.nombre}`} className="p-1 text-[#CBD5E1] hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {ticketMsg && (
                    <p className="mt-3 rounded-xl bg-[#DCFCE7] px-3 py-2 text-sm font-bold text-[#15803D]">{ticketMsg}</p>
                  )}
                </div>
                <label className={cn(labelCls, 'mt-3')} htmlFor="metodo-pago">Método de pago</label>
                <select id="metodo-pago" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} className={inputCls}>
                  {METODOS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <dl className="mt-3 space-y-1 border-t border-[#F1F0EE] pt-3 text-sm">
                  <div className="flex justify-between text-[#475569]">
                    <dt>Subtotal</dt>
                    <dd className="font-bold text-[#0F172A]">{soles(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-base">
                    <dt className="font-black text-[#0F172A]">Total</dt>
                    <dd className="font-black tabular-nums text-[#0F172A]">{soles(totalShown)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setLineas([]); setTicketMsg(null); }} disabled={lineas.length === 0} className={btnGhost}>Limpiar</button>
                  <button type="button" onClick={cobrar} disabled={lineas.length === 0 || cobrando} className={cn(btnPrimary, 'btn-press btn-shine flex-1 py-3.5 text-base')}>
                    {cobrando ? 'Cobrando…' : `Cobrar ${soles(totalShown)}`}
                  </button>
                </div>
              </aside>
            </div>
          )}

          {(tab === 'ventas' || tab === 'compras' || tab === 'salidas') && (
            <MovimientosTab
              tab={tab}
              movimientos={tab === 'ventas' ? ventas : tab === 'compras' ? compras : salidas}
              onRegistrar={(tipo, titulo) => setModalMov({ tipo, titulo })}
              onVerReporte={() => setTab('reporte')}
            />
          )}

          {tab === 'efectivo' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                <h2 className="text-lg font-black text-[#0F172A]">Estado de caja</h2>
                {caja ? (
                  <div className="mt-3">
                    <span className="badge-live rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#15803D]">CAJA ABIERTA</span>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-[#64748B]">Monto inicial</dt><dd className="font-bold text-[#0F172A]">{soles(num(resumen?.montoInicial))}</dd></div>
                      <div className="flex justify-between"><dt className="text-[#64748B]">Ingresos del turno</dt><dd className="font-bold text-[#15803D]">+{soles(num(resumen?.ingresos))}</dd></div>
                      <div className="flex justify-between"><dt className="text-[#64748B]">Egresos del turno</dt><dd className="font-bold text-red-600">−{soles(num(resumen?.egresos))}</dd></div>
                      <div className="flex justify-between border-t border-[#F1F0EE] pt-2 text-base"><dt className="font-black text-[#0F172A]">Efectivo esperado</dt><dd className="font-black text-[#0F172A]">{soles(num(resumen?.esperado))}</dd></div>
                      <div className="flex justify-between"><dt className="text-[#64748B]">Movimientos</dt><dd className="font-bold text-[#0F172A]">{resumen?.movimientos ?? 0}</dd></div>
                    </dl>
                  </div>
                ) : (
                  <div className="mt-3">
                    <span className="rounded-full bg-[#F1F0EE] px-3 py-1 text-xs font-bold text-[#64748B]">○ CAJA CERRADA</span>
                    {cierreInfo ? (
                      <p className={cn('mt-3 rounded-xl px-3 py-2 text-sm font-bold', cierreInfo.diferencia === 0 ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-amber-50 text-amber-700')}>
                        Turno cerrado · diferencia {soles(cierreInfo.diferencia)}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-[#64748B]">Abre la caja con tu fondo inicial para empezar el turno.</p>
                    )}
                    <label className={cn(labelCls, 'mt-4')} htmlFor="monto-inicial">Monto inicial (S/)</label>
                    <input id="monto-inicial" type="number" min="0" step="0.5" value={montoApertura} onChange={(e) => setMontoApertura(e.target.value)} className={inputCls} />
                    <button type="button" onClick={abrir} className={cn(btnPrimary, 'mt-3 w-full')}>
                      <span className="inline-flex items-center gap-1.5"><Banknote size={16} /> Abrir caja</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                <h2 className="text-lg font-black text-[#0F172A]">Cierre de turno</h2>
                {!caja ? (
                  <p className="mt-3 text-sm text-[#64748B]">No hay una caja abierta. El cierre se habilita al abrir el turno.</p>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-[#64748B]">Cuenta el efectivo del cajón y registra el monto final. Te mostramos la diferencia contra lo esperado.</p>
                    <label className={cn(labelCls, 'mt-4')} htmlFor="monto-final">Monto final contado (S/)</label>
                    <input id="monto-final" type="number" min="0" step="0.5" value={montoCierre} onChange={(e) => setMontoCierre(e.target.value)} placeholder="0.00" className={inputCls} />
                    {montoCierre !== '' && (
                      <p className="mt-2 text-sm font-bold text-[#0F172A]">
                        Diferencia estimada: {soles((Number(montoCierre) || 0) - num(resumen?.esperado))}
                      </p>
                    )}
                    <button type="button" onClick={cerrar} disabled={montoCierre === ''} className={cn(btnPrimary, 'mt-3 w-full')}>
                      Cerrar caja
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'productos' && (
            <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-[#0F172A]">Productos ({productos.length})</h2>
                <button type="button" onClick={() => setModalProd({})} className={btnPrimary}>
                  <span className="inline-flex items-center gap-1.5"><Plus size={16} /> Agregar producto</span>
                </button>
              </div>
              {productos.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Aún no tienes productos"
                  description="Agrega tus productos para vender desde la caja: snacks, alquiler de chalecos o pelotas y servicios."
                  action={
                    <button type="button" onClick={() => setModalProd({})} className={btnPrimary}>
                      <span className="inline-flex items-center gap-1.5"><PackagePlus size={16} /> Agregar producto</span>
                    </button>
                  }
                />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E7E5E4] text-[11px] uppercase tracking-wider text-[#64748B]">
                        <th className="py-2 pr-3">Producto</th>
                        <th className="py-2 pr-3">Categoría</th>
                        <th className="py-2 pr-3">Precio</th>
                        <th className="py-2 pr-3">Stock</th>
                        <th className="py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F0EE]">
                      {productos.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-3 font-bold text-[#0F172A]">{p.nombre}</td>
                          <td className="py-2.5 pr-3"><span className="rounded-full bg-[#F5F5F3] px-2.5 py-0.5 text-xs font-bold text-[#475569]">{p.categoria}</span></td>
                          <td className="py-2.5 pr-3 font-bold text-[#15803D]">{soles(num(p.precio))}</td>
                          <td className="py-2.5 pr-3 text-[#475569]">{p.stock === null ? '∞' : p.stock}</td>
                          <td className="py-2.5 text-right">
                            <button type="button" onClick={() => setModalProd({ edit: p })} aria-label={`Editar ${p.nombre}`} className="rounded-lg border border-[#E7E5E4] p-1.5 text-[#475569] hover:border-[#22C55E] hover:text-[#0F172A]">
                              <Pencil size={15} />
                            </button>{' '}
                            <button type="button" onClick={() => borrarProducto(p.id)} aria-label={`Eliminar ${p.nombre}`} className="rounded-lg border border-[#E7E5E4] p-1.5 text-[#CBD5E1] hover:border-red-300 hover:text-red-500">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'reporte' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                <h2 className="text-lg font-black text-[#0F172A]">Ingresos por método de pago</h2>
                {porMetodo.length === 0 ? (
                  <p className="mt-3 text-sm text-[#64748B]">Aún no hay ventas hoy. Cobra tu primer ticket en Vender.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {porMetodo.map(([m, total]) => (
                      <li key={m}>
                        <div className="flex justify-between text-sm"><span className="font-bold text-[#0F172A]">{m}</span><span className="font-black text-[#15803D]">{soles(total)}</span></div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F1F0EE]">
                          <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${vendidoHoy > 0 ? Math.round((total / vendidoHoy) * 100) : 0}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <h2 className="mt-6 text-lg font-black text-[#0F172A]">Por tipo</h2>
                {porTipo.length === 0 ? (
                  <p className="mt-2 text-sm text-[#64748B]">Sin movimientos hoy.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#F1F0EE] text-sm">
                    {porTipo.map(([t, total]) => (
                      <li key={t} className="flex justify-between py-2">
                        <span className="font-semibold text-[#475569]">{TIPO_LABEL[t] ?? t}</span>
                        <span className={cn('font-black', total >= 0 ? 'text-[#15803D]' : 'text-red-600')}>{soles(total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
                <h2 className="text-lg font-black text-[#0F172A]">Últimos movimientos</h2>
                {movimientos.length === 0 ? (
                  <p className="mt-3 text-sm text-[#64748B]">Sin movimientos hoy. Todo lo que cobres o registres aparece aquí.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-[#F1F0EE]">
                    {movimientos.slice(0, 10).map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0F172A]">{m.descripcion}</p>
                          <p className="text-xs text-[#64748B]">{TIPO_LABEL[m.tipo] ?? m.tipo} · {m.metodoPago} · {horaPeru(m.creadoEn)}</p>
                        </div>
                        <p className={cn('shrink-0 font-black', INGRESO_TIPOS.includes(m.tipo) ? 'text-[#15803D]' : 'text-red-600')}>
                          {INGRESO_TIPOS.includes(m.tipo) ? '+' : '−'}{soles(num(m.monto))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal movimiento simple */}
      {modalMov && (
        <Modal titulo={modalMov.titulo} onClose={() => setModalMov(null)}>
          <form action={guardarMovimientoSimple}>
            <label className={labelCls} htmlFor="mov-desc">Descripción</label>
            <input id="mov-desc" name="descripcion" required maxLength={120} placeholder="Ej. Compra de gaseosas" className={inputCls} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="mov-monto">Monto (S/)</label>
                <input id="mov-monto" name="monto" type="number" min="0.01" step="0.01" required placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="mov-metodo">Método de pago</label>
                <select id="mov-metodo" name="metodoPago" className={inputCls} defaultValue="EFECTIVO">
                  {METODOS.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
            </div>
            {formError && <p className="mt-3 text-sm font-semibold text-red-600">{formError}</p>}
            <button type="submit" disabled={guardando} className={cn(btnPrimary, 'mt-4 w-full')}>
              {guardando ? 'Registrando…' : 'Registrar'}
            </button>
          </form>
        </Modal>
      )}

      {/* Modal producto */}
      {modalProd && (
        <Modal titulo={modalProd.edit ? 'Editar producto' : 'Agregar producto'} onClose={() => setModalProd(null)}>
          <form action={guardarProducto}>
            <label className={labelCls} htmlFor="prod-nombre">Nombre</label>
            <input id="prod-nombre" name="nombre" required maxLength={80} defaultValue={modalProd.edit?.nombre ?? ''} placeholder="Ej. Agua 600ml" className={inputCls} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="prod-cat">Categoría</label>
                <select id="prod-cat" name="categoria" className={inputCls} defaultValue={modalProd.edit?.categoria ?? 'SNACK'}>
                  {CATEGORIAS.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="prod-precio">Precio (S/)</label>
                <input id="prod-precio" name="precio" type="number" min="0.01" step="0.01" required defaultValue={modalProd.edit ? num(modalProd.edit.precio) : ''} placeholder="0.00" className={inputCls} />
              </div>
            </div>
            <label className={cn(labelCls, 'mt-3')} htmlFor="prod-stock">Stock (vacío = ilimitado)</label>
            <input id="prod-stock" name="stock" type="number" min="0" step="1" defaultValue={modalProd.edit?.stock ?? ''} placeholder="∞" className={inputCls} />
            {formError && <p className="mt-3 text-sm font-semibold text-red-600">{formError}</p>}
            <button type="submit" disabled={guardando} className={cn(btnPrimary, 'mt-4 w-full')}>
              {guardando ? 'Guardando…' : modalProd.edit ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </form>
        </Modal>
      )}

      <WhatsAppFloat />
    </div>
  );
}

function MovimientosTab({
  tab,
  movimientos,
  onRegistrar,
  onVerReporte,
}: {
  tab: 'ventas' | 'compras' | 'salidas';
  movimientos: MovimientoCaja[];
  onRegistrar: (tipo: TipoMovimiento, titulo: string) => void;
  onVerReporte: () => void;
}) {
  const cfg = {
    ventas: { tipo: 'SNACK' as TipoMovimiento, titulo: 'Registrar venta', cta: 'Registrar venta', emptyT: 'Aún no hay ventas hoy', emptyD: 'Cobra tickets en Vender o registra una venta manual.' },
    compras: { tipo: 'EGRESO' as TipoMovimiento, titulo: 'Registrar compra', cta: 'Registrar compra', emptyT: 'Aún no hay compras hoy', emptyD: 'Registra la mercadería y gastos de tu tienda.' },
    salidas: { tipo: 'AJUSTE' as TipoMovimiento, titulo: 'Registrar salida', cta: 'Registrar salida', emptyT: 'Aún no hay salidas hoy', emptyD: 'Registra retiros y pagos en efectivo.' },
  }[tab];
  const total = movimientos.reduce((acc, m) => acc + num(m.monto), 0);

  return (
    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black capitalize text-[#0F172A]">{tab} de hoy</h2>
          <p className="text-sm text-[#64748B]">{movimientos.length} movimientos · total {soles(total)}</p>
        </div>
        <button type="button" onClick={() => onRegistrar(cfg.tipo, cfg.titulo)} className={btnPrimary}>
          <span className="inline-flex items-center gap-1.5"><Plus size={16} /> {cfg.cta}</span>
        </button>
      </div>
      {movimientos.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={cfg.emptyT}
          description={cfg.emptyD}
          action={
            <div className="flex gap-2">
              <button type="button" onClick={() => onRegistrar(cfg.tipo, cfg.titulo)} className={btnPrimary}>{cfg.cta}</button>
              <button type="button" onClick={onVerReporte} className={btnGhost}>Ver reporte</button>
            </div>
          }
        />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E7E5E4] text-[11px] uppercase tracking-wider text-[#64748B]">
                <th className="py-2 pr-3">Descripción</th>
                <th className="py-2 pr-3">Método</th>
                <th className="py-2 pr-3">Hora</th>
                <th className="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F0EE]">
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pr-3 font-semibold text-[#0F172A]">{m.descripcion}</td>
                  <td className="py-2.5 pr-3"><span className="rounded-full bg-[#F5F5F3] px-2.5 py-0.5 text-xs font-bold text-[#475569]">{m.metodoPago}</span></td>
                  <td className="py-2.5 pr-3 text-[#64748B]">{horaPeru(m.creadoEn)}</td>
                  <td className="py-2.5 text-right font-black text-[#0F172A]">{soles(num(m.monto))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

