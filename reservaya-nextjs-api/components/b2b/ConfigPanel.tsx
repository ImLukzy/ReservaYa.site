'use client';

import { useEffect, useState } from 'react';
import { Banknote, CreditCard, QrCode, Settings, User, Wallet } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';

type Tab = 'perfil' | 'cobros' | 'plan' | 'pagos';

interface Perfil {
  nombre: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  nombreNegocio: string;
}

interface Cobros {
  yape: boolean;
  tarjeta: boolean;
  efectivo: boolean;
}

interface Abono {
  id: string;
  concepto: string;
  monto: string | number;
  fecha: string;
  estado?: string;
}

const PERFIL_KEY = 'ry_perfil';
const COBROS_KEY = 'ry_cobros';

const PERFIL_VACIO: Perfil = { nombre: '', telefono: '', fechaNacimiento: '', genero: '', nombreNegocio: '' };
const COBROS_DEFAULT: Cobros = { yape: true, tarjeta: false, efectivo: true };

function leerLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function parseAbonos(body: unknown): Abono[] {
  const pick = (arr: unknown[]): Abono[] =>
    arr.map((a) => {
      const x = a as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        concepto: String(x.concepto ?? x.descripcion ?? x.plan ?? 'Abono'),
        monto: (x.monto ?? x.total ?? '—') as string | number,
        fecha: String(x.fecha ?? x.creadoEn ?? ''),
        estado: x.estado ? String(x.estado) : undefined,
      };
    });
  if (Array.isArray(body)) return pick(body);
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.abonos)) return pick(b.abonos);
    if (Array.isArray(b.pagos)) return pick(b.pagos);
    if (Array.isArray(b.data)) return pick(b.data);
  }
  return [];
}

const TABS: { id: Tab; label: string; grupo: string }[] = [
  { id: 'perfil', label: 'Mi perfil', grupo: 'GENERAL' },
  { id: 'cobros', label: 'Cobros', grupo: 'GENERAL' },
  { id: 'plan', label: 'Tu plan', grupo: 'SUSCRIPCIÓN' },
  { id: 'pagos', label: 'Pagos', grupo: 'SUSCRIPCIÓN' },
];

const inputCls =
  'mt-1.5 w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30';

export function ConfigPanel() {
  const [tab, setTab] = useState<Tab>('perfil');
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VACIO);
  const [cobros, setCobros] = useState<Cobros>(COBROS_DEFAULT);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Hidrata perfil: localStorage primero + intenta completar con la sesión real.
  useEffect(() => {
    setPerfil(leerLocal<Perfil>(PERFIL_KEY, PERFIL_VACIO));
    setCobros(leerLocal<Cobros>(COBROS_KEY, COBROS_DEFAULT));
    void fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const u = body?.usuario as { nombre?: string } | undefined;
        if (u?.nombre) {
          setPerfil((p) => {
            if (p.nombre) return p;
            const next = { ...p, nombre: String(u.nombre) };
            try {
              localStorage.setItem(PERFIL_KEY, JSON.stringify(next));
            } catch {
              /* almacenamiento no disponible */
            }
            return next;
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (tab !== 'pagos') return;
    setCargandoPagos(true);
    void fetch('/api/abonos', { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json().catch(() => null);
      })
      .then((body) => setAbonos(parseAbonos(body)))
      .catch(() => setAbonos([]))
      .finally(() => setCargandoPagos(false));
  }, [tab]);

  function setP<K extends keyof Perfil>(k: K, v: Perfil[K]) {
    setPerfil((p) => ({ ...p, [k]: v }));
  }

  function toggleCobro(k: keyof Cobros) {
    setCobros((c) => {
      const next = { ...c, [k]: !c[k] };
      try {
        localStorage.setItem(COBROS_KEY, JSON.stringify(next));
      } catch {
        /* almacenamiento no disponible */
      }
      return next;
    });
  }

  // Guarda en localStorage y además intenta PATCH al backend si existe el endpoint.
  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil));
    } catch {
      /* almacenamiento no disponible */
    }
    let remoto = false;
    for (const ruta of ['/api/usuarios/me', '/api/auth/me']) {
      try {
        const res = await fetch(ruta, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nombre: perfil.nombre,
            telefono: perfil.telefono,
            fechaNacimiento: perfil.fechaNacimiento || null,
            genero: perfil.genero || null,
            nombreNegocio: perfil.nombreNegocio,
          }),
        });
        if (res.ok) {
          remoto = true;
          break;
        }
      } catch {
        /* endpoint aún no disponible: se conserva el guardado local */
      }
    }
    setToast(
      remoto
        ? 'Perfil guardado correctamente.'
        : 'Perfil guardado en este dispositivo (el servidor aún no expone PATCH /api/usuarios/me).'
    );
    setGuardando(false);
  }

  return (
    <div>
      <div>
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">⚙️ CONFIGURACIÓN</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">
          Configuración de tu cuenta
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Tus datos, cómo te pagan tus jugadores y tu suscripción, todo en un solo lugar.
        </p>
      </div>

      {toast && (
        <p role="status" className="mt-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm">
          {toast}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-[#E7E5E4] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {(['GENERAL', 'SUSCRIPCIÓN'] as const).map((grupo) => (
            <div key={grupo} className="mb-2 last:mb-0">
              <p className="px-2 pb-1 pt-2 text-[11px] font-bold tracking-[0.12em] text-[#94A3B8]">
                {grupo}
              </p>
              {TABS.filter((t) => t.grupo === grupo).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={cn(
                    'mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                    tab === t.id
                      ? 'bg-[#DCFCE7] text-[#15803D]'
                      : 'text-[#475569] hover:bg-[#F5F5F3] hover:text-[#0F172A]'
                  )}
                >
                  {t.id === 'perfil' && <User size={16} strokeWidth={2} />}
                  {t.id === 'cobros' && <Wallet size={16} strokeWidth={2} />}
                  {t.id === 'plan' && <Settings size={16} strokeWidth={2} />}
                  {t.id === 'pagos' && <Banknote size={16} strokeWidth={2} />}
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Contenido */}
        <section className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:p-6">
          {tab === 'perfil' && (
            <form onSubmit={(e) => void guardarPerfil(e)}>
              <h2 className="text-lg font-black text-[#0F172A]">Mi perfil</h2>
              <p className="mt-0.5 text-sm text-[#64748B]">
                Así te verán tus jugadores y nuestro equipo de soporte.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Nombre
                  <input value={perfil.nombre} onChange={(e) => setP('nombre', e.target.value)} placeholder="Ej. Carlos Quispe" className={inputCls} />
                </label>
                <label className="text-sm font-semibold text-[#0F172A]">
                  Teléfono / WhatsApp
                  <input value={perfil.telefono} onChange={(e) => setP('telefono', e.target.value)} placeholder="Ej. 999 888 777" inputMode="tel" className={inputCls} />
                </label>
                <label className="text-sm font-semibold text-[#0F172A]">
                  Fecha de nacimiento
                  <input type="date" value={perfil.fechaNacimiento} onChange={(e) => setP('fechaNacimiento', e.target.value)} className={inputCls} />
                </label>
                <label className="text-sm font-semibold text-[#0F172A]">
                  Género
                  <select value={perfil.genero} onChange={(e) => setP('genero', e.target.value)} className={cn(inputCls, 'bg-white')}>
                    <option value="">Seleccionar…</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="prefiero-no-decir">Prefiero no decir</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-[#0F172A] md:col-span-2">
                  Nombre del negocio
                  <input value={perfil.nombreNegocio} onChange={(e) => setP('nombreNegocio', e.target.value)} placeholder="Ej. Canchas El Golazo" className={inputCls} />
                </label>
              </div>
              <button
                type="submit"
                disabled={guardando}
                className="mt-5 rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98] disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
              <p className="mt-3 font-mono text-[11px] text-[#94A3B8]">
                PATCH /api/usuarios/me (con respaldo local “ry_perfil”)
              </p>
            </form>
          )}

          {tab === 'cobros' && (
            <div>
              <h2 className="text-lg font-black text-[#0F172A]">Cobros</h2>
              <p className="mt-0.5 text-sm text-[#64748B]">
                Elige cómo te pueden pagar tus jugadores. Se guarda en este dispositivo.
              </p>
              <ul className="mt-4 space-y-3">
                {(
                  [
                    { id: 'yape', label: 'Yape', desc: 'Pagos inmediatos con QR', Icon: QrCode },
                    { id: 'tarjeta', label: 'Tarjeta', desc: 'Visa, Mastercard y más (próximamente online)', Icon: CreditCard },
                    { id: 'efectivo', label: 'Efectivo', desc: 'Pago en cancha al llegar', Icon: Banknote },
                  ] as const
                ).map(({ id, label, desc, Icon }) => (
                  <li key={id} className="flex items-center gap-3 rounded-xl border border-[#E7E5E4] p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
                      <Icon size={19} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{label}</p>
                      <p className="text-xs text-[#64748B]">{desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={cobros[id]}
                      aria-label={`Activar cobro con ${label}`}
                      onClick={() => toggleCobro(id)}
                      className={cn(
                        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                        cobros[id] ? 'bg-[#22C55E]' : 'bg-[#E7E5E4]'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                          cobros[id] ? 'left-[22px]' : 'left-0.5'
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[#64748B]">
                Contenido guardado localmente (“ry_cobros”). El QR de Yape y el pago online con
                tarjeta llegan en la próxima novedad.
              </p>
            </div>
          )}

          {tab === 'plan' && (
            <div>
              <h2 className="text-lg font-black text-[#0F172A]">Tu plan</h2>
              <p className="mt-0.5 text-sm text-[#64748B]">
                Empieza gratis y crece a Pro cuando lo necesites. Contenido informativo.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border-2 border-[#22C55E] bg-white p-5">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-[#15803D]">PLAN ACTUAL</p>
                  <p className="mt-1 text-xl font-black text-[#0F172A]">Actual</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-[#475569]">
                    <li>✓ Agenda y cronograma</li>
                    <li>✓ Caja del día</li>
                    <li>✓ Validar código QR</li>
                    <li>✓ Hasta 2 canchas</li>
                  </ul>
                  <p className="mt-4 rounded-xl bg-[#DCFCE7] py-2 text-center text-sm font-bold text-[#15803D]">
                    Plan activo
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#F5F5F3] p-5">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-[#64748B]">SUSCRIPCIÓN</p>
                  <p className="mt-1 text-xl font-black text-[#0F172A]">Pro</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-[#475569]">
                    <li>✓ Todo lo del plan Actual</li>
                    <li>✓ Canchas ilimitadas</li>
                    <li>✓ Torneos BETA</li>
                    <li>✓ Pagos online</li>
                  </ul>
                  <a
                    href="https://wa.me/51907425900"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block rounded-xl bg-[#0F172A] py-2 text-center text-sm font-bold text-white hover:bg-[#1E293B]"
                  >
                    Quiero ser Pro
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === 'pagos' && (
            <div>
              <h2 className="text-lg font-black text-[#0F172A]">Pagos</h2>
              <p className="mt-0.5 text-sm text-[#64748B]">
                Historial de tus pagos de suscripción. Fuente: GET /api/abonos.
              </p>
              <div className="mt-4">
                {cargandoPagos ? (
                  <p className="py-8 text-center text-sm text-[#64748B]">Cargando pagos…</p>
                ) : abonos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E7E5E4] p-8 text-center">
                    <p className="text-sm font-bold text-[#0F172A]">Sin pagos registrados</p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Cuando pagues tu suscripción Pro verás aquí tu historial.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#F1F0EE] rounded-xl border border-[#E7E5E4]">
                    {abonos.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-[#0F172A]">{a.concepto}</p>
                          <p className="text-xs text-[#64748B]">
                            {a.fecha ? new Date(a.fecha).toLocaleDateString('es-PE') : 'Fecha —'}
                            {a.estado ? ` · ${a.estado}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-black text-[#15803D]">
                          S/ {typeof a.monto === 'number' ? a.monto.toFixed(2) : a.monto}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
