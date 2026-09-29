'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleHelp, Plus, Trash2, Users, X } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

interface ComplejoOpt {
  id: string;
  nombre: string;
}

interface Miembro {
  id: string;
  complejoId: string;
  nombre: string;
  email: string;
  activo: boolean;
}

interface MiembroApi {
  id: string;
  complejoId: string;
  rolSede: string;
  activo: boolean;
  usuario: { id: string; nombre: string; email: string; rol: string; activo: boolean } | null;
}

function mapear(m: MiembroApi): Miembro {
  return {
    id: m.id,
    complejoId: m.complejoId,
    nombre: m.usuario?.nombre ?? '(sin nombre)',
    email: m.usuario?.email ?? '',
    activo: m.activo,
  };
}

export function EquipoPanel() {
  const [complejos, setComplejos] = useState<ComplejoOpt[]>([]);
  const [complejoId, setComplejoId] = useState('');
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [claveTemporal, setClaveTemporal] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '' });

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
      const lista: MiembroApi[] = Array.isArray(body?.equipo) ? body.equipo : [];
      setMiembros(lista.map(mapear));
    } catch {
      setError('No se pudo cargar el equipo. Revisa tu conexión e inténtalo de nuevo.');
      setMiembros([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/complejos', { credentials: 'include', cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
        const lista: ComplejoOpt[] = Array.isArray(body?.complejos) ? body.complejos : [];
        setComplejos(lista.map((c) => ({ id: c.id, nombre: c.nombre })));
        if (lista.length > 0) {
          setComplejoId(lista[0].id);
          void cargar(lista[0].id);
        } else {
          setCargando(false);
        }
      } catch {
        setError('No se pudo cargar el equipo. Revisa tu conexión e inténtalo de nuevo.');
        setCargando(false);
      }
    })();
  }, [cargar]);

  useEffect(() => {
    if (!toast && !claveTemporal) return;
    const t = setTimeout(() => {
      setToast(null);
      setClaveTemporal(null);
    }, 12000);
    return () => clearTimeout(t);
  }, [toast, claveTemporal]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      setToast('El correo es obligatorio.');
      return;
    }
    setGuardando(true);
    setClaveTemporal(null);
    try {
      const res = await fetch('/api/equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complejoId,
          email: form.email.trim(),
          nombre: form.nombre.trim() || undefined,
          rolSede: 'ADMIN',
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      if (body?.usuarioNuevo && body?.passwordTemporal) {
        setClaveTemporal(`Cuenta nueva: entra con ${form.email.trim()} / clave ${body.passwordTemporal} (cámbiala luego).`);
      }
      setToast(body?.existente ? 'Ya era miembro: se reactivó.' : 'Miembro agregado al equipo (rol ADMIN).');
      setModal(false);
      setForm({ nombre: '', email: '' });
      await cargar(complejoId);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo agregar.');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(m: Miembro) {
    try {
      const res = await fetch(`/api/equipo/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activo: !m.activo }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      setMiembros((prev) => prev.map((x) => (x.id === m.id ? { ...x, activo: !x.activo } : x)));
      setToast(m.activo ? 'Miembro desactivado.' : 'Miembro activado.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  }

  async function eliminar(m: Miembro) {
    if (!window.confirm(`¿Eliminar a ${m.nombre} del equipo?`)) return;
    try {
      const res = await fetch(`/api/equipo/${m.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      setMiembros((prev) => prev.filter((x) => x.id !== m.id));
      setToast('Miembro eliminado.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-cesped-hondo">👥 EQUIPO</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-basalto">Tu equipo</h1>
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
            type="button"
            onClick={() => setModal(true)}
            disabled={!complejoId}
            className="btn-tactil flex items-center gap-1.5 rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
          >
            <Plus size={18} strokeWidth={2.5} /> Agregar
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
            className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
          >
            {complejos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {toast && (
        <p role="status" className="mt-4 rounded-xl border-2 border-basalto bg-tiza px-4 py-3 text-sm font-semibold text-basalto shadow-dura-sm">
          {toast}
        </p>
      )}
      {claveTemporal && (
        <p role="alert" className="mt-2 rounded-xl border border-sol bg-sol-suave px-4 py-3 text-sm font-semibold text-basalto">
          🔑 {claveTemporal}
        </p>
      )}

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
              className="btn-tactil mt-3 rounded-xl border-2 border-basalto bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra"
            >
              Reintentar
            </button>
          </div>
        ) : complejos.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Primero crea tu local"
            description="El equipo trabaja por local. Crea tu complejo para agregar personal."
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
            description="Agrega a tu personal para que te ayude con reservas, caja y validación de códigos. Cada uno entra con su propio correo."
            action={
              <button
                type="button"
                onClick={() => setModal(true)}
                className="btn-tactil rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover"
              >
                + Agregar a tu primera persona
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
                  <p className="truncate text-sm font-bold text-basalto">
                    {m.nombre} {!m.activo && <span className="text-xs font-semibold text-pizarra">(inactivo)</span>}
                  </p>
                  <p className="truncate text-xs text-pizarra">{m.email}</p>
                </div>
                <span className="rounded-full bg-cesped-suave px-3 py-1 text-xs font-bold text-cesped-hondo">
                  ADMIN
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={m.activo}
                  aria-label={`${m.activo ? 'Desactivar' : 'Activar'} a ${m.nombre}`}
                  onClick={() => void toggleActivo(m)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    m.activo ? 'bg-cesped' : 'bg-cal'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-tiza shadow-dura-sm transition-all',
                      m.activo ? 'left-[22px]' : 'left-0.5'
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void eliminar(m)}
                  aria-label={`Eliminar a ${m.nombre}`}
                  title="Eliminar"
                  className="btn-tactil rounded-lg p-2 text-pizarra transition-colors hover:bg-error-suave hover:text-error"
                >
                  <Trash2 size={17} strokeWidth={1.85} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-pizarra">
        Todo el equipo opera con rol ADMIN en tu local: agenda, caja, reservas y torneos.
        Al agregar a alguien se activa su panel admin; al eliminarlo o desactivarlo, lo pierde.
      </p>

      {/* Modal Agregar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4" role="dialog" aria-modal="true" aria-label="Agregar miembro">
          <form
            onSubmit={(e) => void agregar(e)}
            className="w-full max-w-md rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-cesped-hondo">EQUIPO</p>
                <h2 className="mt-1 text-xl font-black text-basalto">Agregar al equipo</h2>
                {complejos.length > 0 && (
                  <p className="mt-1 text-xs text-pizarra">
                    Local: <strong>{complejos.find((c) => c.id === complejoId)?.nombre}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
                className="btn-tactil h-11 w-11 rounded-full border-2 border-basalto bg-tiza p-1.5 text-pizarra hover:text-basalto hover:bg-piedra"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-basalto">
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Juan Pérez"
                className="mt-1.5 w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm font-normal text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
              />
            </label>
            <label className="mt-3 block text-sm font-semibold text-basalto">
              Correo
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Ej. juan@tucancha.pe"
                className="mt-1.5 w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm font-normal text-basalto focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
              />
            </label>
            <div className="mt-3 rounded-xl border border-cesped/30 bg-cesped-suave px-3 py-2.5 text-sm font-semibold text-cesped-hondo">
              Rol: ADMIN · opera agenda, caja y reservas de este local
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="btn-tactil flex-1 rounded-xl border-2 border-basalto bg-tiza px-4 py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="btn-tactil flex-1 rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
              >
                {guardando ? 'Agregando…' : 'Agregar'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-pizarra">
              Si el correo no tiene cuenta, se crea con clave temporal (te la mostraremos una vez).
            </p>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
