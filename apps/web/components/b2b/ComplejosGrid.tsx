'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DISTRITOS_AREQUIPA, CIUDAD_UNICA } from '@/lib/distritos';
import { Building2, ExternalLink, MapPin, Pencil, Phone, Plus, Share2, Copy, Check, X, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputCls, labelCls, btnPrimary } from '@/lib/b2b-theme';
import { cn } from '@/lib/utils';
import { solicitarSuscripcion } from '@/lib/suscripciones-client';
import { FotosEditor } from '@/components/complejos/FotosEditor';
import { UbicacionEditor } from '@/components/complejos/UbicacionEditor';
import { linkPublico } from '@/lib/public/sitio';

interface SuscripcionCard {
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
  fotos?: string[];
  latitud?: number | null;
  longitud?: number | null;
  telefono?: string;
  direccion?: string;
  publicado?: boolean;
  suscripcion?: SuscripcionCard | null
}

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
    fotos: Array.isArray(raw.fotos) ? raw.fotos.filter((f): f is string => typeof f === 'string') : [],
    latitud: typeof raw.latitud === 'number' ? raw.latitud : null,
    longitud: typeof raw.longitud === 'number' ? raw.longitud : null,
    imagen: Array.isArray(raw.fotos) && raw.fotos[0] ? String(raw.fotos[0]) : raw.imagen != null && raw.imagen !== '' ? String(raw.imagen) : undefined,
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

interface FormState {
  nombre: string;
  direccion: string;
  distrito: string;
  ciudad: string;
  telefono: string;
  publicado: boolean;
  fotos: string[];
  latitud: number | null;
  longitud: number | null;
}

const FORM_VACIO: FormState = { nombre: '', direccion: '', distrito: '', ciudad: CIUDAD_UNICA, telefono: '', publicado: true, fotos: [], latitud: null, longitud: null };

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

  useEffect(() => {
    if (!renovar && !compartir && !modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (renovar) setRenovar(null);
        if (compartir) setCompartir(null);
        if (modal) setModal(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [renovar, compartir, modal]);

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
    setForm({ nombre: c.nombre, direccion: c.direccion ?? '', distrito: c.distrito, ciudad: c.ciudad ?? CIUDAD_UNICA, telefono: c.telefono ?? '', publicado: c.publicado ?? false, fotos: c.fotos ?? [], latitud: c.latitud ?? null, longitud: c.longitud ?? null });
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
        fotos: form.fotos, latitud: form.latitud, longitud: form.longitud,
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
              ? { ...actualizado, nombre: actualizado.nombre !== 'Sin nombre' ? actualizado.nombre : payload.nombre, canchas: c.canchas, imagen: actualizado.imagen }
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
      const body = await solicitarSuscripcion(renovar.id, plan);
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
        <div className="card-tactil">
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
            className="card-tactil overflow-hidden p-0"
          >
            <div className="relative">
              {c.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imagen} alt={c.nombre} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-cesped-hondo to-cesped text-5xl">
                  <span aria-hidden>🏟️</span>
                </div>
              )}
              <span className="absolute top-3 right-3 rounded-md bg-noche/80 px-2 py-1 text-xs font-semibold text-tiza backdrop-blur">
                {c.canchas} cancha{c.canchas === 1 ? '' : 's'}
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-black text-basalto">{c.nombre}</h3>
              {c.distrito !== '' && (
                <p className="mt-1 flex items-center gap-2 text-sm text-pizarra">
                  <MapPin size={16} strokeWidth={1.85} className="shrink-0" />
                  {c.distrito}
                </p>
              )}
              {c.telefono && (
                <p className="mt-1 flex items-center gap-2 text-sm text-pizarra">
                  <Phone size={16} strokeWidth={1.85} />
                  {c.telefono}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-cal bg-sillar px-3 py-2">
                {c.suscripcion?.vigente && c.publicado !== false ? (
                  <p className="text-xs font-bold text-cesped-hondo">
                    ● Publicada · {c.suscripcion.plan} hasta {c.suscripcion.fechaFin} ({c.suscripcion.diasRestantes}d)
                  </p>
                ) : c.suscripcion?.vigente ? (
                  <p className="text-xs font-bold text-alerta-hondo">
                    ● Suscripción activa pero no publicada: actívala para aparecer
                  </p>
                ) : (
                  <p className="text-xs font-bold text-alerta-hondo">
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
                  className="btn-tactil shrink-0 rounded-lg bg-cesped-hondo px-3 py-1.5 text-xs font-bold text-tiza hover:bg-noche"
                >
                  {c.suscripcion?.vigente ? 'Renovar' : 'Publicar'}
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-cal pt-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    className="btn-tactil flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold text-pizarra hover:bg-piedra hover:text-basalto"
                  >
                    <Pencil size={16} strokeWidth={1.85} />
                    Editar
                  </button>
                  <a
                    href={linkPublico(c.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-tactil flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold text-pizarra hover:bg-piedra hover:text-basalto"
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
                    className="btn-tactil rounded-lg p-2 text-cesped-hondo hover:bg-cesped-suave"
                  >
                    <Share2 size={17} strokeWidth={1.85} />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(c)}
                    aria-label={`Eliminar ${c.nombre}`}
                    title="Eliminar"
                    className="btn-tactil rounded-lg p-2 text-pizarra hover:bg-error-suave hover:text-error"
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
          className="btn-tactil flex min-h-[17.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cal bg-tiza/60 p-6 text-center transition-colors hover:border-cesped hover:bg-tiza"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cesped-suave text-cesped-hondo">
            <Plus size={24} strokeWidth={2} />
          </span>
          <span className="font-black text-basalto">Nuevo complejo</span>
          <span className="max-w-[13.75rem] text-xs text-pizarra">Agrega otra sede y gestiona sus canchas por separado.</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4 backdrop-blur-sm"
          onClick={() => setRenovar(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Suscripción de ${renovar.nombre}`}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-cal bg-tiza p-6 shadow-suave-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-basalto">Publicar «{renovar.nombre}»</h3>
            <p className="mt-1 text-sm text-pizarra">
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
              <p role="alert" className="mt-3 rounded-xl border border-error bg-error-suave px-3 py-2 text-sm font-semibold text-error-hondo">
                {errorSub}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRenovar(null)}
                className="btn-tactil flex-1 rounded-xl border border-cal bg-tiza py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
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
          className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-velo p-4 backdrop-blur-sm"
          onClick={() => setCompartir(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Compartir ${compartir.nombre}`}
        >
          <div
            className="modal-card-enter w-full max-w-sm rounded-2xl border border-cal bg-tiza p-6 text-center shadow-suave-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-black text-basalto">{compartir.nombre}</h3>
              <button
                type="button"
                onClick={() => setCompartir(null)}
                aria-label="Cerrar"
                className="btn-tactil flex h-11 w-11 items-center justify-center rounded-full border border-cal bg-tiza p-1 text-pizarra hover:text-basalto hover:bg-piedra"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="mx-auto w-fit rounded-xl border border-cal bg-tiza p-4">
              <QRCodeSVG size={200} value={linkPublico(compartir.slug)} />
            </div>
            <p className="mt-3 truncate text-sm text-pizarra">{linkPublico(compartir.slug)}</p>
            <a
              href={linkPublico(compartir.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactil mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cal bg-tiza py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
            >
              <ExternalLink size={17} strokeWidth={1.85} />
              Abrir página pública
            </a>
            <button
              type="button"
              onClick={copiar}
              className="btn-tactil btn-press btn-shine mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cesped py-3 text-sm font-bold text-tiza hover:bg-cesped-hover"
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
  setForm: Dispatch<SetStateAction<FormState>>;
  error: string | null;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: () => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4 backdrop-blur-sm"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cal bg-tiza p-6 shadow-suave-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-black text-basalto">{titulo}</h3>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="btn-tactil flex h-11 w-11 items-center justify-center rounded-full border border-cal bg-tiza p-1 text-pizarra hover:text-basalto hover:bg-piedra"
          >
            <X size={18} strokeWidth={2} />
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
                className={`${inputCls} bg-sillar text-pizarra`}
              />
            </div>
            <div className="sm:col-span-2">
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
          <FotosEditor fotos={form.fotos} onBusy={setSubiendo} onChange={fotos => setForm(prev => ({ ...prev, fotos }))} />
          <UbicacionEditor direccion={form.direccion} punto={form.latitud !== null && form.longitud !== null ? { latitud: form.latitud, longitud: form.longitud } : null} onChange={p => setForm(prev => ({ ...prev, latitud: p?.latitud ?? null, longitud: p?.longitud ?? null }))} onDistrito={distrito => setForm(prev => ({ ...prev, distrito }))} />
          {(!form.fotos.length || form.latitud === null) && <p className="text-sm text-pizarra">Completa fotos y ubicación para mejorar tu perfil. Puedes publicar sin ellas.</p>}
          <p className="mt-2 text-xs text-pizarra">Elige tu distrito de Arequipa: así te encuentran en el buscador.</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-xl border border-cal bg-tiza px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.publicado}
              onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
              className="h-5 w-5 accent-cesped"
            />
            <span className="text-sm font-bold text-basalto">
              Publicada
              <span className="block text-xs font-normal text-pizarra">Visible en el buscador (requiere suscripción vigente)</span>
            </span>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-error bg-error-suave px-3 py-2 text-sm font-semibold text-error-hondo">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando || subiendo}
          className={cn(btnPrimary, 'mt-4 w-full py-3 disabled:opacity-50')}
        >
          {guardando ? 'Guardando…' : titulo}
        </button>
      </div>
    </div>
  );
}
