'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleHelp, Plus, Trash2, Users, X } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { EquipoMiembroResumen } from '@/lib/b2b-api';
import { estadoMiembro } from '@/lib/invitaciones';
import { invitarAlEquipo, quitarDelEquipo } from '@/lib/invitaciones-client';

interface ComplejoOpt {
  id: string;
  nombre: string;
}

interface Miembro {
  id: string;
  complejoId: string;
  nombre: string;
  email: string;
  estado: 'PENDIENTE' | 'ACTIVO';
}

function mapear(m: EquipoMiembroResumen): Miembro {
  return {
    id: m.id,
    complejoId: m.complejoId,
    nombre: m.usuario?.nombre ?? '(sin nombre)',
    email: m.usuario?.email ?? '',
    estado: estadoMiembro(m),
  };
}

export function EquipoPanel({
  complejosIniciales,
  miembrosIniciales,
}: {
  complejosIniciales: ComplejoOpt[];
  miembrosIniciales: EquipoMiembroResumen[];
}) {
  const complejos = complejosIniciales;
  const [complejoId, setComplejoId] = useState(complejosIniciales[0]?.id ?? '');
  const [miembros, setMiembros] = useState<Miembro[]>(() => miembrosIniciales.map(mapear));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const botonInvitar = useRef<HTMLButtonElement>(null);

  const cerrarModal = useCallback(() => {
    setModal(false);
    botonInvitar.current?.focus();
  }, []);

  const cargar = useCallback(async (cid: string) => {
    if (!cid) {
      setMiembros([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/equipo?complejoId=${cid}`, { credentials: 'include', cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      const lista: EquipoMiembroResumen[] = Array.isArray(body?.equipo) ? body.equipo : [];
      setMiembros(lista.map(mapear));
    } catch {
      setError('No se pudo cargar el equipo. Revisa tu conexión e inténtalo de nuevo.');
      setMiembros([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 12000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, cerrarModal]);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    const correo = email.trim();
    if (!correo) {
      setToast('El correo es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const body = await invitarAlEquipo(complejoId, correo);
      setToast(
        body.existente
          ? `${correo} ya tenía una invitación pendiente.`
          : `Invitación enviada a ${correo}. Verá Pendiente hasta que la acepte desde su bandeja.`
      );
      cerrarModal();
      setEmail('');
      await cargar(complejoId);
    } catch (err) {
      // La API explica el motivo (sin cuenta → correo para registrarse, ya es miembro, etc.).
      setToast(err instanceof Error ? err.message : 'No se pudo enviar la invitación.');
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(m: Miembro) {
    const pendiente = m.estado === 'PENDIENTE';
    const pregunta = pendiente
      ? `¿Cancelar la invitación a ${m.nombre}?`
      : `¿Quitar a ${m.nombre} del equipo? Perderá el acceso al panel de este local.`;
    if (!window.confirm(pregunta)) return;
    try {
      await quitarDelEquipo(m.id);
      setMiembros((prev) => prev.filter((x) => x.id !== m.id));
      setToast(pendiente ? 'Invitación cancelada.' : `${m.nombre} ya no es parte del equipo.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo completar. Inténtalo de nuevo.');
    }
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-cesped-hondo">👥 EQUIPO</p>
          <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-basalto">Tu equipo</h1>
          <p className="mt-1 text-sm text-pizarra">
            Quienes te ayudan a operar tus canchas día a día: reservas, caja y validación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ayuda"
            aria-label="Ayuda sobre equipo"
            title="¿Cómo agrego a mi personal?"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cal bg-tiza text-pizarra transition-colors hover:border-cesped hover:text-cesped"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </a>
          <button
            ref={botonInvitar}
            type="button"
            onClick={() => setModal(true)}
            disabled={!complejoId}
            className="btn-tactil flex items-center gap-1.5 rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> Invitar
          </button>
        </div>
      </div>

      {/* Selector de local */}
      {complejos.length > 1 && (
        <div className="mt-4 max-w-xs">
          <label htmlFor="eq-complejo" className="mb-1 block text-xs font-bold text-pizarra">LOCAL</label>
          <select
            id="eq-complejo"
            value={complejoId}
            onChange={(e) => {
              setComplejoId(e.target.value);
              void cargar(e.target.value);
            }}
            className="w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
          >
            {complejos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div role="status" aria-live="polite">
        {toast && (
          <p className="mt-4 rounded-xl border border-cal bg-tiza px-4 py-3 text-sm font-semibold text-basalto shadow-suave-sm">
            {toast}
          </p>
        )}
      </div>

      {/* Contenido */}
      <div className="card-tactil mt-4 p-2">
        {cargando ? (
          <p className="px-6 py-12 text-center text-sm text-pizarra">Cargando equipo…</p>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-semibold text-basalto">{error}</p>
            <button
              type="button"
              onClick={() => void cargar(complejoId)}
              className="btn-tactil mt-3 rounded-xl border border-cal bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra"
            >
              Reintentar
            </button>
          </div>
        ) : complejos.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Primero crea tu local"
            description="El equipo trabaja por local. Crea tu complejo para invitar a tu personal."
            action={
              <a
                href="/admin/complejos"
                className="btn-tactil rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover"
              >
                Ir a Complejos
              </a>
            }
          />
        ) : miembros.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no tienes a nadie en el equipo…"
            description="Invita a tu personal para que te ayude con reservas, caja y validación de códigos. Cada uno acepta la invitación con su propia cuenta."
            action={
              <button
                type="button"
                onClick={() => setModal(true)}
                className="btn-tactil rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover"
              >
                + Invitar a tu primera persona
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-cal">
            {miembros.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cesped text-lg font-black text-tiza">
                  {(m.nombre.trim().charAt(0) || '·').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-basalto">{m.nombre}</p>
                  <p className="truncate text-xs text-pizarra">{m.email}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold',
                    m.estado === 'PENDIENTE' ? 'bg-sol-suave text-basalto' : 'bg-cesped-suave text-cesped-hondo'
                  )}
                >
                  {m.estado === 'PENDIENTE' ? 'Pendiente' : 'Activo'}
                </span>
                <button
                  type="button"
                  onClick={() => void quitar(m)}
                  aria-label={m.estado === 'PENDIENTE' ? `Cancelar la invitación a ${m.nombre}` : `Quitar a ${m.nombre} del equipo`}
                  title={m.estado === 'PENDIENTE' ? 'Cancelar invitación' : 'Quitar del equipo'}
                  className="btn-tactil flex h-11 w-11 items-center justify-center rounded-lg text-pizarra transition-colors hover:bg-error-suave hover:text-error"
                >
                  {m.estado === 'PENDIENTE' ? <X size={17} strokeWidth={1.85} aria-hidden="true" /> : <Trash2 size={17} strokeWidth={1.85} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-pizarra">
        Todo el equipo opera con rol ADMIN en tu local: agenda, caja, reservas y torneos.
        La persona invitada acepta desde su bandeja (campana) y recién ahí se activa su panel; si la quitas, lo pierde.
      </p>

      {/* Modal Invitar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4" role="dialog" aria-modal="true" aria-labelledby="eq-invitar-titulo">
          <form
            onSubmit={(e) => void invitar(e)}
            className="w-full max-w-md rounded-2xl border border-cal bg-tiza p-6 shadow-suave-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-cesped-hondo">EQUIPO</p>
                <h2 id="eq-invitar-titulo" className="mt-1 text-xl font-black text-basalto">Invitar al equipo</h2>
                {complejos.length > 0 && (
                  <p className="mt-1 text-xs text-pizarra">
                    Local: <strong>{complejos.find((c) => c.id === complejoId)?.nombre}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar"
                className="btn-tactil h-11 w-11 rounded-full border border-cal bg-tiza p-1.5 text-pizarra hover:text-basalto hover:bg-piedra"
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-basalto">
              Correo de su cuenta ReservaYa
              <input
                type="email"
                required
                autoFocus
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. juan@tucancha.pe"
                aria-describedby="eq-invitar-ayuda"
                className="mt-1.5 w-full rounded-xl border border-borde bg-tiza px-3 py-2.5 text-sm font-normal text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
              />
            </label>
            <div className="mt-3 rounded-xl border border-cesped/30 bg-cesped-suave px-3 py-2.5 text-sm font-semibold text-cesped-hondo">
              Rol: ADMIN · opera agenda, caja y reservas de este local
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={cerrarModal}
                className="btn-tactil flex-1 rounded-xl border border-cal bg-tiza px-4 py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                aria-busy={guardando || undefined}
                className="btn-tactil flex-1 rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
              >
                {guardando ? 'Enviando…' : 'Enviar invitación'}
              </button>
            </div>
            <p id="eq-invitar-ayuda" className="mt-3 text-[0.6875rem] text-pizarra">
              La persona verá la invitación en su bandeja y decide si acepta. Si aún no tiene cuenta, le enviamos un correo para que se registre; luego vuelve a invitarla.
            </p>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
