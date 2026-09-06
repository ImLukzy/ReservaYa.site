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
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">👥 EQUIPO</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Tu equipo</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Quienes te ayudan a operar tus canchas día a día: reservas, caja y validación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ayuda"
            aria-label="Ayuda sobre equipo"
            title="¿Cómo agrego a mi personal?"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E5E4] bg-white text-[#64748B] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </a>
          <button
            type="button"
            onClick={() => setModal(true)}
            disabled={!complejoId}
            className="flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            <Plus size={18} strokeWidth={2.5} /> Agregar
          </button>
        </div>
      </div>

      {/* Selector de local */}
      {complejos.length > 1 && (
        <div className="mt-4 max-w-xs">
          <label htmlFor="eq-complejo" className="mb-1 block text-xs font-bold text-[#475569]">LOCAL</label>
          <select
            id="eq-complejo"
            value={complejoId}
            onChange={(e) => {
              setComplejoId(e.target.value);
              void cargar(e.target.value);
            }}
            className="w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#22C55E] focus:outline-none"
          >
            {complejos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {toast && (
        <p role="status" className="mt-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm">
          {toast}
        </p>
      )}
      {claveTemporal && (
        <p role="alert" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          🔑 {claveTemporal}
        </p>
      )}

      {/* Contenido */}
      <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {cargando ? (
          <p className="px-6 py-12 text-center text-sm text-[#64748B]">Cargando equipo…</p>
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-semibold text-[#0F172A]">{error}</p>
            <button
              type="button"
              onClick={() => void cargar(complejoId)}
              className="mt-3 rounded-xl border border-[#E7E5E4] px-4 py-2 text-sm font-bold text-[#0F172A] hover:border-[#22C55E]"
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
                className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98]"
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
                className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98]"
              >
                + Agregar a tu primera persona
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-[#F1F0EE]">
            {miembros.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-lg font-black text-white">
                  {(m.nombre.trim().charAt(0) || '·').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#0F172A]">
                    {m.nombre} {!m.activo && <span className="text-xs font-semibold text-[#94A3B8]">(inactivo)</span>}
                  </p>
                  <p className="truncate text-xs text-[#64748B]">{m.email}</p>
                </div>
                <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#15803D]">
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
                    m.activo ? 'bg-[#22C55E]' : 'bg-[#E7E5E4]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                      m.activo ? 'left-[22px]' : 'left-0.5'
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void eliminar(m)}
                  aria-label={`Eliminar a ${m.nombre}`}
                  title="Eliminar"
                  className="rounded-lg p-2 text-[#CBD5E1] transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={17} strokeWidth={1.85} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-[#64748B]">
        Todo el equipo opera con rol ADMIN en tu local: agenda, caja, reservas y torneos.
        Al agregar a alguien se activa su panel admin; al eliminarlo o desactivarlo, lo pierde.
      </p>

      {/* Modal Agregar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Agregar miembro">
          <form
            onSubmit={(e) => void agregar(e)}
            className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">EQUIPO</p>
                <h2 className="mt-1 text-xl font-black text-[#0F172A]">Agregar al equipo</h2>
                {complejos.length > 0 && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    Local: <strong>{complejos.find((c) => c.id === complejoId)?.nombre}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F0EE] hover:text-[#0F172A]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#0F172A]">
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Juan Pérez"
                className="mt-1.5 w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm font-normal text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30"
              />
            </label>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">
              Correo
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Ej. juan@tucancha.pe"
                className="mt-1.5 w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm font-normal text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30"
              />
            </label>
            <div className="mt-3 rounded-xl bg-[#F0FDF4] px-3 py-2.5 text-sm font-semibold text-[#15803D]">
              Rol: ADMIN · opera agenda, caja y reservas de este local
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="flex-1 rounded-xl border border-[#E7E5E4] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:border-[#22C55E]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#16A34A] disabled:opacity-50"
              >
                {guardando ? 'Agregando…' : 'Agregar'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[#94A3B8]">
              Si el correo no tiene cuenta, se crea con clave temporal (te la mostraremos una vez).
            </p>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
