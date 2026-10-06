'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import type { Solicitud } from '@/lib/api-types';
import { ApiError } from '@/lib/api-types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DISTRITOS_AREQUIPA } from '@/lib/distritos';
import { TIPOS_CANCHA, validarSolicitud, type FormSolicitud } from '@/lib/solicitudes';
import { enviarSolicitud } from '@/lib/solicitudes-client';
import { useMiSolicitud } from './useMiSolicitud';
import { IrAPanelDueno } from './IrAPanelDueno';

const VACIO: FormSolicitud = {
  nombre: '', direccion: '', distrito: '', telefono: '',
  canchaNombre: 'Cancha 1', tipo: 'FUTBOL5', precio: '', capacidad: '10', acepta: false,
};

const PASOS = [
  'Envías tu centro con su primera cancha.',
  'Lo revisamos y te avisamos por correo.',
  'Al aprobarlo, tu cuenta pasa a dueño y tu centro aparece en ReservaYa.',
  'Recibes reservas gratis 30 días con 1 cancha. Después necesitas una suscripción.',
];

function mensajeEnvio(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'El envío de solicitudes todavía no está disponible. Inténtalo más tarde.';
    if (e.status === 409) return e.message || 'Ya tienes una solicitud en curso.';
    return e.message;
  }
  return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
}

export function PublicarCentro({ inicial, disponible }: { inicial: Solicitud | null; disponible: boolean }) {
  const [solicitud, setSolicitud] = useMiSolicitud(inicial);
  const [form, setForm] = useState<FormSolicitud>(VACIO);
  const [error, setError] = useState<{ campo: keyof FormSolicitud | null; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const cambiar = <K extends keyof FormSolicitud>(campo: K, valor: FormSolicitud[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));
  const invalido = (campo: keyof FormSolicitud) => (error?.campo === campo ? true : undefined);
  // Error junto al campo que lo causa; los del servidor (sin campo) van al pie.
  const errorDe = (campo: keyof FormSolicitud) =>
    error?.campo === campo ? (
      <p id={`pc-error-${campo}`} role="alert" className="mt-1.5 text-sm font-semibold text-error">{error.texto}</p>
    ) : null;
  const describe = (campo: keyof FormSolicitud) => (error?.campo === campo ? `pc-error-${campo}` : undefined);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const r = validarSolicitud(form, DISTRITOS_AREQUIPA);
    if ('error' in r) {
      setError({ campo: r.campo, texto: r.error });
      formRef.current?.querySelector<HTMLElement>(`[name="${r.campo}"]`)?.focus();
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const { solicitud: creada } = await enviarSolicitud(r.input);
      setSolicitud(creada);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError({ campo: null, texto: mensajeEnvio(err) });
    } finally {
      setEnviando(false);
    }
  }

  if (solicitud) {
    const aprobada = solicitud.estado === 'APROBADA';
    return (
      <Card className="mx-auto max-w-2xl">
        <div aria-live="polite" className="flex flex-col gap-4">
          <span
            className={
              aprobada
                ? 'flex h-12 w-12 items-center justify-center rounded-full bg-cesped-suave text-cesped-hondo'
                : 'flex h-12 w-12 items-center justify-center rounded-full bg-sol-suave text-sol-hondo'
            }
          >
            {aprobada ? <CheckCircle2 size={26} aria-hidden="true" /> : <Clock size={26} aria-hidden="true" />}
          </span>
          <div>
            <Badge variant={aprobada ? 'green' : 'yellow'}>{aprobada ? 'Aprobado' : 'En revisión'}</Badge>
            <h2 className="mt-2 font-display text-2xl font-bold text-basalto">
              {aprobada ? '¡Tu centro fue aprobado!' : 'Recibimos tu centro'}
            </h2>
            <p className="mt-1 text-sm text-pizarra">
              {aprobada
                ? 'Tu cuenta ya es de dueño y tu prueba gratis de 30 días empezó. Entra a tu panel: te guiamos paso a paso.'
                : 'Lo estamos revisando. Te escribimos al correo de tu cuenta y esta página se actualiza sola.'}
            </p>
          </div>
          <dl className="grid gap-x-6 gap-y-3 border-t border-cal pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-pizarra">Centro</dt>
              <dd className="font-semibold text-basalto">{solicitud.complejo.nombre}</dd>
            </div>
            <div>
              <dt className="text-pizarra">Distrito</dt>
              <dd className="font-semibold text-basalto">{solicitud.complejo.distrito}</dd>
            </div>
            {solicitud.cancha && (
              <div>
                <dt className="text-pizarra">Primera cancha</dt>
                <dd className="font-semibold text-basalto">
                  {solicitud.cancha.nombre} · S/ {Number(solicitud.cancha.precioPorHora)} por hora
                </dd>
              </div>
            )}
          </dl>
          {aprobada ? (
            <IrAPanelDueno className="self-start" />
          ) : (
            <p className="text-sm text-pizarra">
              Mientras tanto puedes seguir <Link href="/dashboard/canchas" className="font-semibold text-cesped-hondo underline">reservando canchas</Link>.
              Si no la aprobamos, te contamos el motivo por correo y puedes enviarla de nuevo.
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <form ref={formRef} onSubmit={enviar} noValidate className="space-y-6">
        {!disponible && (
          <p role="status" className="rounded-xl border border-sol bg-sol-suave px-4 py-3 text-sm font-semibold text-sol-hondo">
            El envío de solicitudes estará disponible muy pronto. Puedes preparar tus datos.
          </p>
        )}
        <Card>
          <h2 className="font-display text-lg font-bold text-basalto">1. Tu centro</h2>
          <p className="mt-0.5 text-sm text-pizarra">Así lo verán los jugadores en el buscador.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input id="pc-nombre" name="nombre" etiqueta="Nombre del centro" placeholder="Complejo Los Andes"
              value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} aria-invalid={invalido('nombre')} aria-errormessage={describe('nombre')}
              autoComplete="organization" />
              {errorDe('nombre')}
            </div>
            <div>
              <Select id="pc-distrito" name="distrito" etiqueta="Distrito" value={form.distrito}
              onChange={(e) => cambiar('distrito', e.target.value)} aria-invalid={invalido('distrito')} aria-errormessage={describe('distrito')}>
              <option value="">Elige un distrito…</option>
              {DISTRITOS_AREQUIPA.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
              {errorDe('distrito')}
            </div>
            <div>
              <Input id="pc-telefono" name="telefono" type="tel" inputMode="tel" etiqueta="Teléfono o WhatsApp"
              placeholder="959 123 456" value={form.telefono} onChange={(e) => cambiar('telefono', e.target.value)}
              aria-invalid={invalido('telefono')} aria-errormessage={describe('telefono')} autoComplete="tel" />
              {errorDe('telefono')}
            </div>
            <div className="sm:col-span-2">
              <Input id="pc-direccion" name="direccion" etiqueta="Dirección" placeholder="Av. Ejército 123"
              value={form.direccion} onChange={(e) => cambiar('direccion', e.target.value)}
              aria-invalid={invalido('direccion')} aria-errormessage={describe('direccion')} autoComplete="street-address" />
              {errorDe('direccion')}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-basalto">2. Tu primera cancha</h2>
          <p className="mt-0.5 text-sm text-pizarra">La prueba gratis incluye una cancha. Fotos y horarios los agregas después en tu panel.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Input id="pc-cancha" name="canchaNombre" etiqueta="Nombre de la cancha" value={form.canchaNombre}
              onChange={(e) => cambiar('canchaNombre', e.target.value)} aria-invalid={invalido('canchaNombre')} aria-errormessage={describe('canchaNombre')} />
              {errorDe('canchaNombre')}
            </div>
            <div>
              <Select id="pc-tipo" name="tipo" etiqueta="Tipo" value={form.tipo} opciones={TIPOS_CANCHA}
              onChange={(e) => cambiar('tipo', e.target.value)} aria-invalid={invalido('tipo')} aria-errormessage={describe('tipo')} />
              {errorDe('tipo')}
            </div>
            <div>
              <Input id="pc-precio" name="precio" inputMode="decimal" etiqueta="Precio por hora (S/)" placeholder="60"
              value={form.precio} onChange={(e) => cambiar('precio', e.target.value)} aria-invalid={invalido('precio')} aria-errormessage={describe('precio')} />
              {errorDe('precio')}
            </div>
            <div>
              <Input id="pc-capacidad" name="capacidad" type="number" min={2} etiqueta="Jugadores en cancha"
              value={form.capacidad} onChange={(e) => cambiar('capacidad', e.target.value)} aria-invalid={invalido('capacidad')} aria-errormessage={describe('capacidad')} />
              {errorDe('capacidad')}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-basalto">3. Convenio de prueba</h2>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-basalto">
            <input
              type="checkbox"
              name="acepta"
              checked={form.acepta}
              onChange={(e) => cambiar('acepta', e.target.checked)}
              aria-invalid={invalido('acepta')}
              className="mt-0.5 h-5 w-5 shrink-0 accent-cesped"
            />
            <span>
              Acepto el convenio de prueba y los{' '}
              <a href="/legal/terms" target="_blank" rel="noopener" className="font-semibold text-cesped-hondo underline">Términos</a>:
              30 días gratis con una cancha desde la aprobación. Después necesito una suscripción activa; sin ella mi cancha deja de recibir reservas.
            </span>
          </label>
        </Card>

        {errorDe('acepta')}
        {error && error.campo === null && (
          <p role="alert" className="rounded-xl border border-error bg-error-suave px-4 py-3 text-sm font-semibold text-error">
            {error.texto}
          </p>
        )}
        <Button type="submit" size="lg" loading={enviando} className="w-full sm:w-auto">
          {enviando ? 'Enviando…' : 'Enviar mi centro a revisión'}
        </Button>
      </form>

      <aside aria-labelledby="pc-como" className="card-tactil p-5 lg:sticky lg:top-6">
        <h2 id="pc-como" className="font-display text-base font-bold text-basalto">Cómo funciona</h2>
        <ol className="mt-3 space-y-3 text-sm text-pizarra">
          {PASOS.map((p, i) => (
            <li key={p} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cesped-suave font-display text-xs font-bold text-cesped-hondo">
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
