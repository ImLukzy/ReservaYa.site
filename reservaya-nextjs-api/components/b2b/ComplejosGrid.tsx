'use client';

import { useEffect, useState } from 'react';
import { Building2, ExternalLink, MapPin, Pencil, Phone, Plus, Share2, Copy, Check, X, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { EmptyState } from '@/components/ui/EmptyState';
import { btnPrimary } from '@/lib/b2b-theme';
import { cn } from '@/lib/utils';

export interface SuscripcionCard {
  estado: string
  plan: string
  fechaFin: string
  diasRestantes: number
  vigente: boolean
}

export interface ComplejoCard {
  id: string;
  nombre: string;
  distrito: string;
  ciudad?: string;
  slug: string;
  canchas: number;
  imagen?: string;
  telefono?: string;
  direccion?: string;
  publicado?: boolean;
  suscripcion?: SuscripcionCard | null
}

const inputCls =
  'w-full rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25';
const labelCls = 'mb-1 block text-xs font-bold text-[#0F172A]';

// Distritos de la provincia de Arequipa (única ciudad operativa).
// Debe coincidir con ComplejosController.DistritosArequipa (backend valida).
export const DISTRITOS_AREQUIPA = [
  'Alto Selva Alegre', 'Arequipa', 'Cayma', 'Cerro Colorado', 'Characato',
  'Chiguata', 'Jacobo Hunter', 'José Luis Bustamante y Rivero', 'La Joya',
  'Mariano Melgar', 'Miraflores', 'Mollebaya', 'Paucarpata', 'Pocsi',
  'Polobaya', 'Quequeña', 'Sabandía', 'Sachaca', 'San Juan de Siguas',
  'San Juan de Tarucani', 'Santa Isabel de Siguas', 'Santa Rita de Siguas',
  'Socabaya', 'Tiabaya', 'Uchumayo', 'Vitor', 'Yanahuara', 'Yarabamba', 'Yura',
];
export const CIUDAD_UNICA = 'Arequipa';

function normalizar(raw: Record<string, unknown>, i: number): ComplejoCard {
  const canchasRaw = raw.canchas ?? raw.totalCanchas ?? (raw._count as Record<string, unknown> | undefined)?.canchas;
  const canchas = Array.isArray(canchasRaw)
    ? canchasRaw.length
    : Number.isFinite(Number(canchasRaw))
      ? Number(canchasRaw)
      : 0;
  const nombre = String(raw.nombre ?? raw.name ?? 'Sin nombre');
  const sub = raw.suscripcion as Record<string, unknown> | null | undefined;
  return {
    id: String(raw.id ?? raw._id ?? `complejo-${i}`),
    nombre,
    distrito: String(raw.distrito ?? raw.district ?? ''),
    ciudad: String(raw.ciudad ?? raw.city ?? ''),
    slug: String(raw.slug ?? raw.id ?? nombre.toLowerCase().replace(/\s+/g, '-')),
    canchas,
    imagen: raw.imagen != null && raw.imagen !== '' ? String(raw.imagen) : undefined,
    telefono: raw.telefono != null && raw.telefono !== '' ? String(raw.telefono) : undefined,
    direccion: raw.direccion != null && raw.direccion !== '' ? String(raw.direccion) : undefined,
    publicado: raw.publicado === true,
    suscripcion: sub != null && typeof sub === 'object'
      ? {
          estado: String(sub.estado ?? ''),
          plan: String(sub.plan ?? ''),
          fechaFin: String(sub.fechaFin ?? '').slice(0, 10),
          diasRestantes: Number(sub.diasRestantes ?? 0),
          vigente: sub.vigente === true,
        }
      : null,
  };
}

function linkPublico(slug: string): string {
  return `https://reservaya.pe/c/${slug}`;
}

interface FormState {
  nombre: string;
  direccion: string;
  distrito: string;
  ciudad: string;
  telefono: string;
  publicado: boolean;
}

const FORM_VACIO: FormState = { nombre: '', direccion: '', distrito: '', ciudad: CIUDAD_UNICA, telefono: '', publicado: true };

export function ComplejosGrid({ complejos }: { complejos: ComplejoCard[] }) {
  const [lista, setLista] = useState<ComplejoCard[]>(complejos);
  const [compartir, setCompartir] = useState<ComplejoCard | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [modal, setModal] = useState<null | { modo: 'crear' } | { modo: 'editar'; id: string }>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [renovar, setRenovar] = useState<ComplejoCard | null>(null);
  const [plan, setPlan] = useState('MENSUAL');
  const [renovando, setRenovando] = useState(false);
  const [errorSub, setErrorSub] = useState<string | null>(null);

  // Refresca desde el backend; si falla, conserva los datos iniciales del servidor.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch('/api/complejos', { credentials: 'include' });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        const arr = body?.complejos ?? body?.data ?? body;
        if (vivo && Array.isArray(arr)) {
          setLista(arr.map((r, i: number) => normalizar(r as Record<string, unknown>, i)));
        }
      } catch {
        // Se mantienen los datos del servidor.
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const waLink = compartir
    ? `https://wa.me/?text=${encodeURIComponent(`Reserva tu cancha aquí: ${linkPublico(compartir.slug)}`)}`
    : '';

  async function copiar() {
    try {
      await navigator.clipboard.writeText(waLink);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  function abrirCrear() {
    setForm(FORM_VACIO);
    setErrorForm(null);
    setModal({ modo: 'crear' });
  }

  function abrirEditar(c: ComplejoCard) {
    setForm({ nombre: c.nombre, direccion: c.direccion ?? '', distrito: c.distrito, ciudad: c.ciudad ?? CIUDAD_UNICA, telefono: c.telefono ?? '', publicado: c.publicado ?? false });
    setErrorForm(null);
    setModal({ modo: 'editar', id: c.id });
  }

  async function guardar() {
    setErrorForm(null);
    if (form.nombre.trim().length < 3) {
      setErrorForm('El nombre debe tener al menos 3 letras.');
      return;
    }
    if (!DISTRITOS_AREQUIPA.includes(form.distrito)) {
      setErrorForm('Elige un distrito de Arequipa de la lista.');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        distrito: form.distrito,
        ciudad: CIUDAD_UNICA,
        telefono: form.telefono.trim(),
        publicado: form.publicado,
      };
      if (modal?.modo === 'editar') {
        const id = modal.id;
        const res = await fetch(`/api/complejos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
        const actualizado = normalizar({ ...(body?.complejo ?? body ?? {}), id } as Record<string, unknown>, 0);
        setLista((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...actualizado, nombre: actualizado.nombre !== 'Sin nombre' ? actualizado.nombre : payload.nombre, canchas: c.canchas, imagen: c.imagen ?? actualizado.imagen }
              : c
          )
        );
      } else {
        const res = await fetch('/api/complejos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
        const creado = normalizar((body?.complejo ?? body ?? {}) as Record<string, unknown>, lista.length);
        setLista((prev) => [
          creado.nombre !== 'Sin nombre'
            ? creado
            : { ...creado, nombre: payload.nombre, distrito: payload.distrito, telefono: payload.telefono || undefined, direccion: payload.direccion || undefined },
          ...prev,
        ]);
      }
      setModal(null);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar el complejo.');
    } finally {
      setGuardando(false);
    }
  }

  async function renovarSuscripcion() {
    if (!renovar) return;
    setErrorSub(null);
    setRenovando(true);
    try {
      const res = await fetch('/api/suscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ complejoId: renovar.id, plan }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      const s = body?.suscripcion as Record<string, unknown> | undefined;
      if (s) {
        const sub: SuscripcionCard = {
          estado: String(s.estado ?? ''),
          plan: String(s.plan ?? ''),
          fechaFin: String(s.fechaFin ?? '').slice(0, 10),
          diasRestantes: Number(s.diasRestantes ?? 0),
          vigente: s.vigente === true,
        };
        setLista((prev) => prev.map((c) => (c.id === renovar.id ? { ...c, suscripcion: sub } : c)));
      }
      setRenovar(null);
    } catch (e) {
      setErrorSub(e instanceof Error ? e.message : 'No se pudo activar la suscripción.');
    } finally {
      setRenovando(false);
    }
  }

  async function eliminar(c: ComplejoCard) {
    if (!window.confirm(`¿Eliminar «${c.nombre}»? También se quitarán sus canchas. Esta acción no se puede deshacer.`)) return;
    const respaldo = lista;
    setLista((prev) => prev.filter((x) => x.id !== c.id));
    try {
      const res = await fetch(`/api/complejos/${c.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
    } catch {
      setLista(respaldo);
    }
  }

  if (lista.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-[#E7E5E4] bg-white">
          <EmptyState
            icon={Building2}
            title="Aún no tienes complejos"
            description="Crea tu primera sede para activar agenda, caja y reservas online."
            action={
              <button type="button" onClick={abrirCrear} className={btnPrimary}>
                + Nuevo complejo
              </button>
            }
          />
        </div>
        {modal && (
          <ModalComplejo
            titulo={modal.modo === 'crear' ? 'Nuevo complejo' : 'Editar complejo'}
            form={form}
            setForm={setForm}
            error={errorForm}
            guardando={guardando}
            onCerrar={() => setModal(null)}
            onGuardar={guardar}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lista.map((c) => (
          <article
            key={c.id}
            className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <div className="relative">
              {c.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imagen} alt={c.nombre} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-[#0A2E1F] to-[#14532D] text-5xl">
                  <span aria-hidden>🏟️</span>
                </div>
              )}
              <span className="absolute top-3 right-3 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
                {c.canchas} cancha{c.canchas === 1 ? '' : 's'}
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-black text-[#0F172A]">{c.nombre}</h3>
              {c.distrito !== '' && (
                <p className="mt-1 flex items-center gap-2 text-sm text-[#64748B]">
                  <MapPin size={16} strokeWidth={1.85} className="shrink-0" />
                  {c.distrito}
                </p>
              )}
              {c.telefono && (
                <p className="mt-1 flex items-center gap-2 text-sm text-[#64748B]">
                  <Phone size={16} strokeWidth={1.85} />
                  {c.telefono}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                {c.suscripcion?.vigente && c.publicado !== false ? (
                  <p className="text-xs font-bold text-[#15803D]">
                    ● Publicada · {c.suscripcion.plan} hasta {c.suscripcion.fechaFin} ({c.suscripcion.diasRestantes}d)
                  </p>
                ) : c.suscripcion?.vigente ? (
                  <p className="text-xs font-bold text-amber-600">
                    ● Suscripción activa pero no publicada: actívala para aparecer
                  </p>
                ) : (
                  <p className="text-xs font-bold text-amber-600">
                    ● Oculta del buscador (sin suscripción vigente)
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPlan(c.suscripcion?.plan ?? 'MENSUAL');
                    setErrorSub(null);
                    setRenovar(c);
                  }}
                  className="shrink-0 rounded-lg bg-[#060A08] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0A1A11]"
                >
                  {c.suscripcion?.vigente ? 'Renovar' : 'Publicar'}
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E7E5E4] pt-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold text-[#475569] transition-colors hover:bg-gray-50 hover:text-[#0F172A]"
                  >
                    <Pencil size={16} strokeWidth={1.85} />
                    Editar
                  </button>
                  <a
                    href={linkPublico(c.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold text-[#475569] transition-colors hover:bg-gray-50 hover:text-[#0F172A]"
                  >
                    <ExternalLink size={16} strokeWidth={1.85} />
                    Ver perfil
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCopiado(false);
                      setCompartir(c);
                    }}
                    aria-label={`Compartir ${c.nombre}`}
                    title="Compartir / QR"
                    className="rounded-lg p-2 text-[#15803D] transition-colors hover:bg-[#DCFCE7]"
                  >
                    <Share2 size={17} strokeWidth={1.85} />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(c)}
                    aria-label={`Eliminar ${c.nombre}`}
                    title="Eliminar"
                    className="rounded-lg p-2 text-[#CBD5E1] transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={17} strokeWidth={1.85} />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* Nuevo complejo */}
        <button
          type="button"
          onClick={abrirCrear}
          className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E7E5E4] bg-white/60 p-6 text-center transition-colors hover:border-[#22C55E] hover:bg-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
            <Plus size={24} strokeWidth={2} />
          </span>
          <span className="font-black text-[#0F172A]">Nuevo complejo</span>
          <span className="max-w-[220px] text-xs text-[#64748B]">Agrega otra sede y gestiona sus canchas por separado.</span>
        </button>
      </div>

      {modal && (
        <ModalComplejo
          titulo={modal.modo === 'crear' ? 'Nuevo complejo' : 'Editar complejo'}
          form={form}
          setForm={setForm}
          error={errorForm}
          guardando={guardando}
          onCerrar={() => setModal(null)}
          onGuardar={guardar}
        />
      )}

      {renovar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setRenovar(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Suscripción de ${renovar.nombre}`}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-[#0F172A]">Publicar «{renovar.nombre}»</h3>
            <p className="mt-1 text-sm text-[#64748B]">
              La suscripción activa la visibilidad de tus canchas en el buscador de jugadores.
            </p>
            <label htmlFor="sub-plan" className={cn(labelCls, 'mt-4')}>Plan</label>
            <select
              id="sub-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={inputCls}
            >
              <option value="MENSUAL">Mensual · 30 días</option>
              <option value="TRIMESTRAL">Trimestral · 90 días</option>
              <option value="ANUAL">Anual · 365 días</option>
            </select>
            {errorSub && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                {errorSub}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRenovar(null)}
                className="flex-1 rounded-xl border border-[#E7E5E4] py-2.5 text-sm font-bold text-[#475569]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={renovarSuscripcion}
                disabled={renovando}
                className={cn(btnPrimary, 'flex-1 py-2.5 disabled:opacity-50')}
              >
                {renovando ? 'Activando…' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {compartir && (
        <div
          className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setCompartir(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Compartir ${compartir.nombre}`}
        >
          <div
            className="modal-card-enter w-full max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-black text-[#0F172A]">{compartir.nombre}</h3>
              <button
                type="button"
                onClick={() => setCompartir(null)}
                aria-label="Cerrar"
                className="rounded-lg p-1 text-[#64748B] hover:bg-gray-100"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="mx-auto w-fit rounded-xl border border-[#E7E5E4] p-4">
              <QRCodeSVG size={200} value={linkPublico(compartir.slug)} />
            </div>
            <p className="mt-3 truncate text-sm text-[#64748B]">{linkPublico(compartir.slug)}</p>
            <a
              href={linkPublico(compartir.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7E5E4] py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#22C55E]"
            >
              <ExternalLink size={17} strokeWidth={1.85} />
              Abrir página pública
            </a>
            <button
              type="button"
              onClick={copiar}
              className="btn-press btn-shine mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] py-3 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98]"
            >
              {copiado ? <Check size={18} strokeWidth={2} /> : <Copy size={18} strokeWidth={2} />}
              {copiado ? '¡Link copiado!' : 'Copiar Link de WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ModalComplejo({
  titulo,
  form,
  setForm,
  error,
  guardando,
  onCerrar,
  onGuardar,
}: {
  titulo: string;
  form: FormState;
  setForm: (f: FormState) => void;
  error: string | null;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-black text-[#0F172A]">{titulo}</h3>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-[#64748B] hover:bg-gray-100"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="complejo-nombre" className={labelCls}>Nombre</label>
            <input
              id="complejo-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Complejo Deportivo Norte"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="complejo-direccion" className={labelCls}>Dirección</label>
            <input
              id="complejo-direccion"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Av. Universitaria 1234"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="complejo-distrito" className={labelCls}>Distrito *</label>
              <select
                id="complejo-distrito"
                value={form.distrito}
                onChange={(e) => setForm({ ...form, distrito: e.target.value })}
                className={inputCls}
              >
                <option value="">Elige un distrito…</option>
                {DISTRITOS_AREQUIPA.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="complejo-ciudad" className={labelCls}>Ciudad</label>
              <input
                id="complejo-ciudad"
                value={CIUDAD_UNICA}
                disabled
                readOnly
                className={`${inputCls} bg-gray-50 text-gray-500`}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="complejo-telefono" className={labelCls}>Teléfono</label>
              <input
                id="complejo-telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="999 888 777"
                inputMode="tel"
                className={inputCls}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[#64748B]">Elige tu distrito de Arequipa: así te encuentran en el buscador.</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E7E5E4] bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.publicado}
              onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
              className="h-5 w-5 accent-[#22C55E]"
            />
            <span className="text-sm font-bold text-[#0F172A]">
              Publicada
              <span className="block text-xs font-normal text-[#64748B]">Visible en el buscador (requiere suscripción vigente)</span>
            </span>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className={cn(btnPrimary, 'mt-4 w-full py-3 disabled:opacity-50')}
        >
          {guardando ? 'Guardando…' : titulo}
        </button>
      </div>
    </div>
  );
}
