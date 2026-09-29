import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, HeartHandshake, ListChecks, Plus } from 'lucide-react';
import * as api from '@/lib/api';
import type { DashboardAdmin } from '@/lib/api';
import { getSession } from '@/lib/session';
import { getComplejos } from '@/lib/b2b-api';
import { NovedadCard } from '@/components/b2b/DashboardWidgets';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { whatsappUrl, whatsappVisible } from '@/lib/whatsapp';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

function saludo(hora: number) {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.rol === 'ADMIN') redirect('/admin/agenda');
  if (session.rol === 'TECNICO') redirect('/tecnico');

  const carga = crearCarga();
  const [dashboard, reservas, complejos] = await Promise.all([
    api.getDashboard() as Promise<DashboardAdmin>,
    carga.de(api.getReservas(), [], 'las reservas'),
    carga.de(getComplejos(), [], 'los complejos'),
  ]);

  const ahora = new Date();
  const fechaLarga = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(ahora);
  const hoyISO = ahora.toISOString().slice(0, 10);
  const nombre = session.nombre.split(' ')[0] || 'Dueño';

  const reservasHoy = reservas.filter((r) => String(r.fecha).slice(0, 10) === hoyISO);
  const pendientesHoy = reservasHoy.filter((r) => r.estado === 'PENDIENTE').length;
  const ingresosMes = Number(dashboard.ingresos || 0);

  // Checklist 5 pasos con datos reales
  const pasos = [
    { ok: complejos.length > 0 || dashboard.canchasActivas > 0, falta: 'Crea tu complejo' },
    { ok: dashboard.canchasActivas > 0, falta: 'Agrega tus canchas' },
    { ok: dashboard.totalReservas > 0, falta: 'Configura tus horarios' },
    { ok: false, falta: 'Fotos de tus canchas' },
    { ok: false, falta: 'Comparte tu página' },
  ];
  const hechos = pasos.filter((p) => p.ok).length;
  const siguiente = pasos.find((p) => !p.ok)?.falta ?? 'Todo listo';

  // Chart 30 días desde reservas reales
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(ahora);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const porDia = dias.map((d) => reservas.filter((r) => String(r.fecha).slice(0, 10) === d).length);
  const maxDia = Math.max(1, ...porDia);

  // Timeline 07:00–23:00
  const INI = 7 * 60;
  const FIN = 23 * 60;
  const segs = reservasHoy.map((r) => ({
    ini: Math.max(INI, Math.min(r.horaInicio, FIN)),
    fin: Math.max(INI, Math.min(r.horaFin, FIN)),
    conf: r.estado === 'CONFIRMADA',
  }));
  const nowMin = ahora.getHours() * 60 + ahora.getMinutes();
  const nowPct = Math.max(0, Math.min(100, ((nowMin - INI) / (FIN - INI)) * 100));

  return (
    <div>
      <AvisoCarga errores={carga.errores} />
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-cesped-hondo">
            ▦ DASHBOARD <span className="font-normal text-pizarra">· en vivo</span>
          </p>
          <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-basalto">
            {saludo(ahora.getHours())}, {nombre} 👋
          </h1>
          <p className="text-sm text-pizarra capitalize">{fechaLarga} De {ahora.getFullYear()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/agenda"
            className="flex items-center gap-1.5 rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-grafito transition-all hover:bg-cesped-hover hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} /> Reserva manual
          </Link>
        </div>
      </div>

      {/* Bienvenida */}
      <div className="relative mt-4 flex flex-col justify-between gap-3 overflow-hidden rounded-2xl bg-noche border-2 border-basalto p-5 text-white md:flex-row md:items-center">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/10" />
        <div className="relative flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cesped/40 bg-cesped/15 text-cesped">
            <HeartHandshake size={20} strokeWidth={1.85} />
          </span>
          <div>
            <span className="rounded-full border border-cesped/40 px-2 py-0.5 text-[0.625rem] font-bold tracking-wider text-cesped">
              CUENTA CREADA · PRONTO TE CONTACTAMOS
            </span>
            <p className="mt-1.5 font-bold">¡Bienvenido, {nombre}! Ya tienes tu panel listo. 🎉</p>
            <p className="mt-0.5 max-w-2xl text-[0.8125rem] text-white/65">
              Estamos revisando tu complejo. En breve nos pondremos en contacto para ayudarte a dejarlo
              fino (fotos, horarios y verificación). Mientras tanto ya puedes cargar tus reservas.
            </p>
          </div>
        </div>
        {whatsappUrl() && (
          <a
            href={whatsappUrl() ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="relative shrink-0 rounded-xl bg-cesped px-4 py-2.5 text-sm font-bold text-grafito transition hover:bg-cesped-hover"
          >
            Escríbenos por WhatsApp · {whatsappVisible()}
          </a>
        )}
      </div>

      {/* Checklist */}
      <Link
        href="/admin/ayuda"
        className="mt-3 flex items-center gap-3 rounded-xl border border-cal bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition hover:border-cesped"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cesped-suave text-cesped-hondo">
          <ListChecks size={18} strokeWidth={1.85} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-bold text-basalto">
            Completa tu complejo · {hechos} de 5
          </strong>
          <span className="block truncate text-xs text-pizarra">
            Lo más importante que te falta: {siguiente}
          </span>
        </span>
        <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-piedra">
          <span className="block h-full rounded-full bg-cesped" style={{ width: `${(hechos / 5) * 100}%` }} />
        </span>
        <span aria-hidden className="shrink-0 text-pizarra">
          <ChevronRight size={18} strokeWidth={2} />
        </span>
      </Link>

      <div className="mt-3">
        <NovedadCard />
      </div>

      {/* Resumen del mes */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-pizarra">RESUMEN DEL MES</p>
        <div className="flex items-center gap-4 text-xs font-semibold text-pizarra">
          <Link href="/admin/reportes" className="transition hover:text-cesped-hondo">
            📊 Ver reportes detallados
          </Link>
          <Link href="/admin/ayuda" className="transition hover:text-cesped-hondo">
            ⓘ ¿Qué significa cada número?
          </Link>
        </div>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl bg-noche border-2 border-basalto p-5 text-white lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-white/55">
                INGRESOS DE {new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(ahora).toUpperCase()}
              </p>
              <p className="mt-1 text-3xl font-black">S/ {ingresosMes.toLocaleString('es-PE')}</p>
              <p className="mt-0.5 text-xs text-white/50">vs S/ 0 en los mismos días del mes pasado</p>
            </div>
          </div>
          <div className="mt-6 flex h-20 items-end gap-[0.1875rem]">
            {porDia.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
                <div
                  className="w-full rounded-sm bg-cesped/80"
                  style={{ height: `${Math.max(3, (v / maxDia) * 56)}px`, opacity: v > 0 ? 1 : 0.25 }}
                  title={`Día ${i + 1}: ${v} reservas`}
                />
                <span className="text-[0.5rem] text-white/40">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-noche border-2 border-basalto p-5 text-white">
            <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-white/60">HOY</p>
            <p className="mt-1 text-2xl font-black">S/ 0</p>
            <p className="text-xs text-white/55">{reservasHoy.length} reservas hoy</p>
          </div>
          <Link
            href="/admin/agenda"
            className="group block rounded-2xl border border-cal bg-white p-5 transition hover:border-cesped"
          >
            <p className="flex items-center justify-between text-[0.6875rem] font-bold tracking-[0.14em] text-pizarra">
              PENDIENTES HOY
              <ChevronRight size={16} strokeWidth={2} className="text-pizarra transition group-hover:text-cesped" />
            </p>
            <p className="mt-1 text-2xl font-black text-basalto">{pendientesHoy}</p>
            <p className="text-xs text-pizarra">todo el día</p>
          </Link>
        </div>
      </div>

      {/* Tu día */}
      <div className="mt-4">
        <div className="rounded-2xl border border-cal bg-white p-5">
          <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-pizarra">TU DÍA DE HOY</p>
          <p className="mt-1 text-xl font-black text-basalto">
            {reservasHoy.length} <span className="text-sm font-semibold text-pizarra">reservas</span>
          </p>
          <div className="relative mt-5 h-8 overflow-hidden rounded-full bg-sillar">
            {segs.map((s, i) => (
              <span
                key={i}
                className={`absolute inset-y-0 ${s.conf ? 'bg-cesped' : 'bg-sol'}`}
                style={{
                  left: `${((s.ini - INI) / (FIN - INI)) * 100}%`,
                  width: `${Math.max(1.5, ((s.fin - s.ini) / (FIN - INI)) * 100)}%`,
                }}
              />
            ))}
            <span
              className="absolute inset-y-0 w-0.5 bg-red-500"
              style={{ left: `${nowPct}%` }}
              title="Ahora"
            />
          </div>
          <div className="mt-1 flex justify-between text-[0.625rem] text-pizarra">
            <span>07:00</span>
            <span>11:00</span>
            <span>15:00</span>
            <span>19:00</span>
            <span>23:00</span>
          </div>
          <div className="mt-4 flex gap-4 border-t border-gray-100 pt-3 text-xs text-pizarra">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cesped" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sol" /> Por confirmar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-piedra" /> Libre
            </span>
          </div>
        </div>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
