'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, User } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';

type Tab = 'perfil' | 'suscripcion';

// GET /api/auth/me → usuario. Nombre, correo y nacimiento no se editan (UsuariosController).
interface Perfil {
  nombre: string;
  email: string;
  fechaNacimiento: string;
  telefono: string;
  username: string;
  proximoCambioUsername: string | null;
}

// GET /api/suscripciones → suscripciones (SuscripcionesController.SuscripcionShape).
interface Suscripcion {
  id: string;
  complejoNombre: string;
  plan: string;
  estado: string;
  fechaFin: string;
  diasRestantes: number;
}

interface Complejo {
  id: string;
  nombre: string;
}

const PLANES = [
  { id: 'MENSUAL', label: 'Mensual (30 días)' },
  { id: 'TRIMESTRAL', label: 'Trimestral (90 días)' },
  { id: 'ANUAL', label: 'Anual (365 días)' },
] as const;

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente de aprobación',
  ACTIVA: 'Activa',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
  RECHAZADA: 'Rechazada',
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'perfil', label: 'Mi perfil' },
  { id: 'suscripcion', label: 'Suscripción' },
];

// Claves que versiones anteriores guardaban en el navegador (datos personales): se borran.
const CLAVES_OBSOLETAS = ['ry_perfil', 'ry_cobros'];

const inputCls =
  'mt-1.5 w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30';
const soloLecturaCls = 'mt-1.5 w-full rounded-xl border border-[#E7E5E4] bg-[#F5F5F3] px-3 py-2.5 text-sm text-[#475569]';

function texto(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function fecha(f: string): string {
  if (!f) return '—';
  const d = new Date(f.length <= 10 ? `${f}T12:00:00` : f);
  return Number.isNaN(d.getTime()) ? f : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function pedir(ruta: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
    cache: 'no-store',
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `Error ${res.status}`);
  return body;
}

function lista(body: unknown, clave: string): Record<string, unknown>[] {
  const v = body && typeof body === 'object' ? (body as Record<string, unknown>)[clave] : null;
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

export function ConfigPanel() {
  const [tab, setTab] = useState<Tab>('perfil');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [original, setOriginal] = useState<Perfil | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[] | null>(null);
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [solicitud, setSolicitud] = useState({ complejoId: '', plan: 'MENSUAL' });
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      CLAVES_OBSOLETAS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* almacenamiento no disponible */
    }
    pedir('/api/auth/me')
      .then((body) => {
        const u = ((body as { usuario?: Record<string, unknown> } | null)?.usuario ?? {}) as Record<string, unknown>;
        const p: Perfil = {
          nombre: texto(u.nombre),
          email: texto(u.email),
          fechaNacimiento: texto(u.fechaNacimiento),
          telefono: texto(u.telefono),
          username: texto(u.username),
          proximoCambioUsername: u.proximoCambioUsername ? texto(u.proximoCambioUsername) : null,
        };
        setPerfil(p);
        setOriginal(p);
      })
      .catch(() => setErrorPerfil('No pudimos cargar tu perfil. Recarga la página para intentarlo de nuevo.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (tab !== 'suscripcion' || suscripciones !== null) return;
    Promise.all([pedir('/api/suscripciones'), pedir('/api/complejos').catch(() => null)])
      .then(([bodySus, bodyComplejos]) => {
        setSuscripciones(
          lista(bodySus, 'suscripciones').map((s) => ({
            id: texto(s.id),
            complejoNombre: texto(s.complejoNombre) || 'Complejo',
            plan: texto(s.plan),
            estado: texto(s.estado),
            fechaFin: texto(s.fechaFin),
            diasRestantes: Number(s.diasRestantes) || 0,
          }))
        );
        const cs = lista(bodyComplejos, 'complejos').map((c) => ({ id: texto(c.id), nombre: texto(c.nombre) || 'Complejo' }));
        setComplejos(cs);
        if (cs.length > 0) setSolicitud((s) => ({ ...s, complejoId: s.complejoId || cs[0].id }));
      })
      .catch(() => {
        setSuscripciones([]);
        setToast('No pudimos cargar tus suscripciones.');
      });
  }, [tab, suscripciones]);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil || !original) return;
    const cambios: Record<string, string> = {};
    if (perfil.telefono.trim() !== original.telefono) cambios.telefono = perfil.telefono.trim();
    if (perfil.username.trim() && perfil.username.trim() !== original.username) cambios.username = perfil.username.trim();
    if (Object.keys(cambios).length === 0) {
      setToast('No hay cambios que guardar.');
      return;
    }
    setGuardando(true);
    try {
      await pedir('/api/usuarios/me', { method: 'PATCH', body: JSON.stringify(cambios) });
      const actualizado = { ...perfil, telefono: perfil.telefono.trim(), username: perfil.username.trim() };
      setPerfil(actualizado);
      setOriginal(actualizado);
      setToast('Perfil guardado.');
    } catch (err) {
      setToast(err instanceof Error && !/^Error \d+$/.test(err.message) ? err.message : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function solicitarSuscripcion(e: React.FormEvent) {
    e.preventDefault();
    if (!solicitud.complejoId) return;
    setGuardando(true);
    try {
      await pedir('/api/suscripciones', { method: 'POST', body: JSON.stringify(solicitud) });
      setToast('Solicitud enviada. La verás como «Pendiente de aprobación».');
      setSuscripciones(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Configuración de tu cuenta</h1>
        <p className="mt-1 text-sm text-[#64748B]">Tus datos de contacto y la suscripción de tus complejos.</p>
      </div>

      {toast && (
        <p role="status" className="mt-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm">
          {toast}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Secciones de configuración" className="h-fit rounded-2xl border border-[#E7E5E4] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors last:mb-0',
                tab === t.id ? 'bg-[#DCFCE7] text-[#15803D]' : 'text-[#475569] hover:bg-[#F5F5F3] hover:text-[#0F172A]'
              )}
            >
              {t.id === 'perfil' ? <User size={16} strokeWidth={2} /> : <BadgeCheck size={16} strokeWidth={2} />}
              {t.label}
            </button>
          ))}
        </nav>

        <section className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:p-6">
          {tab === 'perfil' &&
            (errorPerfil ? (
              <p className="text-sm font-semibold text-[#B42318]">{errorPerfil}</p>
            ) : !perfil ? (
              <p className="py-8 text-center text-sm text-[#64748B]">Cargando tu perfil…</p>
            ) : (
              <form onSubmit={(e) => void guardarPerfil(e)}>
                <h2 className="text-lg font-black text-[#0F172A]">Mi perfil</h2>
                <p className="mt-0.5 text-sm text-[#64748B]">Tu equipo y el soporte de ReservaYa te contactan con estos datos.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Nombre
                    <input value={perfil.nombre} readOnly className={soloLecturaCls} />
                  </label>
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Correo
                    <input value={perfil.email} readOnly className={soloLecturaCls} />
                  </label>
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Teléfono / WhatsApp
                    <input
                      value={perfil.telefono}
                      onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                      placeholder="Ej. 999 888 777"
                      inputMode="tel"
                      className={inputCls}
                    />
                  </label>
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Usuario
                    <input
                      value={perfil.username}
                      onChange={(e) => setPerfil({ ...perfil, username: e.target.value })}
                      aria-describedby="nota-usuario"
                      className={inputCls}
                    />
                    <span id="nota-usuario" className="mt-1 block text-xs font-normal text-[#64748B]">
                      {perfil.proximoCambioUsername
                        ? `Podrás cambiarlo de nuevo el ${fecha(perfil.proximoCambioUsername)}.`
                        : 'Se puede cambiar una vez al año.'}
                    </span>
                  </label>
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Fecha de nacimiento
                    <input value={fecha(perfil.fechaNacimiento)} readOnly className={soloLecturaCls} />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={guardando}
                  className="mt-5 rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-bold text-[#060C08] transition-all hover:bg-[#16A34A] active:scale-[0.98] disabled:opacity-50"
                >
                  {guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </form>
            ))}

          {tab === 'suscripcion' && (
            <div>
              <h2 className="text-lg font-black text-[#0F172A]">Suscripción</h2>
              <p className="mt-0.5 text-sm text-[#64748B]">
                El estado de la suscripción de cada complejo. Las solicitudes nuevas las aprueba el equipo de ReservaYa.
              </p>
              {suscripciones === null ? (
                <p className="py-8 text-center text-sm text-[#64748B]">Cargando suscripciones…</p>
              ) : suscripciones.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[#E7E5E4] p-6 text-center text-sm text-[#64748B]">
                  Aún no tienes suscripciones. Solicita una abajo.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[#F1F0EE] rounded-xl border border-[#E7E5E4]">
                  {suscripciones.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">{s.complejoNombre}</p>
                        <p className="text-xs text-[#64748B]">
                          Plan {s.plan.toLowerCase()} · vence el {fecha(s.fechaFin)}
                          {s.estado === 'ACTIVA' ? ` (${s.diasRestantes} días)` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#F1F0EE] px-2.5 py-1 text-xs font-bold text-[#0F172A]">
                        {ETIQUETA_ESTADO[s.estado] ?? s.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {complejos.length > 0 && (
                <form onSubmit={(e) => void solicitarSuscripcion(e)} className="mt-5 grid gap-3 rounded-xl border border-[#E7E5E4] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Complejo
                    <select
                      value={solicitud.complejoId}
                      onChange={(e) => setSolicitud((s) => ({ ...s, complejoId: e.target.value }))}
                      className={cn(inputCls, 'bg-white')}
                    >
                      {complejos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-[#0F172A]">
                    Plan
                    <select
                      value={solicitud.plan}
                      onChange={(e) => setSolicitud((s) => ({ ...s, plan: e.target.value }))}
                      className={cn(inputCls, 'bg-white')}
                    >
                      {PLANES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-bold text-[#060C08] transition-all hover:bg-[#16A34A] disabled:opacity-50"
                  >
                    Solicitar suscripción
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
