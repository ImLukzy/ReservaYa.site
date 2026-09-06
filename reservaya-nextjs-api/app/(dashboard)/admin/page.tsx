import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight, CircleHelp, HeartHandshake, Plus, Sparkles } from 'lucide-react';
import * as api from '@/lib/api';
import type { DashboardAdmin } from '@/lib/api';
import { getSession } from '@/lib/session';
import { getComplejos } from '@/lib/b2b-api';
import { NovedadCard } from '@/components/b2b/DashboardWidgets';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';

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

  const [dashboard, reservas, complejos] = await Promise.all([
    api.getDashboard() as Promise<DashboardAdmin>,
    api.getReservas().catch(() => []),
    getComplejos().catch(() => []),
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
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">
            ▦ DASHBOARD <span className="font-normal text-[#8A938D]">· en vivo</span>
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">
            {saludo(ahora.getHours())}, {nombre} 👋
          </h1>
          <p className="text-sm text-[#64748B] capitalize">{fechaLarga} De {ahora.getFullYear()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notificaciones"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E5E4] bg-white text-[#64748B]"
          >
            <Bell size={18} strokeWidth={1.85} />
          </button>
          <button
            type="button"
            aria-label="Ayuda"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E5E4] bg-white text-sm font-bold text-[#64748B]"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </button>
          <Link
            href="/admin/agenda"
            className="flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} /> Reserva manual
          </Link>
        </div>
      </div>

      {/* Bienvenida */}
      <div className="relative mt-4 flex flex-col justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#060A08] via-[#0A2E1F] to-[#14532D] p-5 text-white md:flex-row md:items-center">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/10" />
        <div className="relative flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#22C55E]/40 bg-[#22C55E]/15 text-[#4ADE80]">
            <HeartHandshake size={20} strokeWidth={1.85} />
          </span>
          <div>
            <span className="rounded-full border border-[#4ADE80]/40 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#4ADE80]">
              CUENTA CREADA · PRONTO TE CONTACTAMOS
            </span>
            <p className="mt-1.5 font-bold">¡Bienvenido, {nombre}! Ya tienes tu panel listo. 🎉</p>
            <p className="mt-0.5 max-w-2xl text-[13px] text-white/65">
              Estamos revisando tu complejo. En breve nos pondremos en contacto para ayudarte a dejarlo
              fino (fotos, horarios y verificación). Mientras tanto ya puedes cargar tus reservas.
            </p>
          </div>
        </div>
        <a
          href="https://wa.me/51907425900"
          target="_blank"
          rel="noopener noreferrer"
          className="relative shrink-0 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#16A34A]"
        >
          💬 Escríbenos · 907 425 900
        </a>
      </div>

      {/* Checklist */}
      <Link
        href="/admin/ayuda"
        className="mt-3 flex items-center gap-3 rounded-xl border border-[#E7E5E4] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition hover:border-[#22C55E]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#15803D]">
          <Sparkles size={18} strokeWidth={1.85} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-bold text-[#101613]">
            Completa tu complejo · {hechos} de 5
          </strong>
          <span className="block truncate text-xs text-[#64748B]">
            Lo más importante que te falta: {siguiente}
          </span>
        </span>
        <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-[#EDEEEC]">
          <span className="block h-full rounded-full bg-[#22C55E]" style={{ width: `${(hechos / 5) * 100}%` }} />
        </span>
        <span aria-hidden className="shrink-0 text-[#94A3B8]">
          <ChevronRight size={18} strokeWidth={2} />
        </span>
      </Link>

      <div className="mt-3">
        <NovedadCard />
      </div>

      {/* Resumen del mes */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#8A938D]">RESUMEN DEL MES</p>
        <div className="flex items-center gap-4 text-xs font-semibold text-[#64748B]">
          <Link href="/admin/reportes" className="transition hover:text-[#15803D]">
            📊 Ver reportes detallados
          </Link>
          <Link href="/admin/ayuda" className="transition hover:text-[#15803D]">
            ⓘ ¿Qué significa cada número?
          </Link>
        </div>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#060A08] via-[#0A2415] to-[#14532D] p-5 text-white lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-white/55">
                INGRESOS DE {new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(ahora).toUpperCase()}
              </p>
              <p className="mt-1 text-3xl font-black">S/ {ingresosMes.toLocaleString('es-PE')}</p>
              <p className="mt-0.5 text-xs text-white/50">vs S/ 0 en los mismos días del mes pasado</p>
            </div>
          </div>
          <div className="mt-6 flex h-20 items-end gap-[3px]">
            {porDia.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
                <div
                  className="w-full rounded-sm bg-[#22C55E]/80"
                  style={{ height: `${Math.max(3, (v / maxDia) * 56)}px`, opacity: v > 0 ? 1 : 0.25 }}
                  title={`Día ${i + 1}: ${v} reservas`}
                />
                <span className="text-[8px] text-white/40">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#0A2E1F] to-[#14532D] p-5 text-white">
            <p className="text-[11px] font-bold tracking-[0.14em] text-white/60">HOY</p>
            <p className="mt-1 text-2xl font-black">S/ 0</p>
            <p className="text-xs text-white/55">{reservasHoy.length} reservas hoy</p>
          </div>
          <Link
            href="/admin/agenda"
            className="group block rounded-2xl border border-[#E7E5E4] bg-white p-5 transition hover:border-[#22C55E]"
          >
            <p className="flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-[#64748B]">
              PENDIENTES HOY
              <ChevronRight size={16} strokeWidth={2} className="text-[#CBD5E1] transition group-hover:text-[#22C55E]" />
            </p>
            <p className="mt-1 text-2xl font-black text-[#0F172A]">{pendientesHoy}</p>
            <p className="text-xs text-[#64748B]">todo el día</p>
          </Link>
        </div>
      </div>

      {/* Tu día + AI */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 lg:col-span-2">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#64748B]">TU DÍA DE HOY</p>
          <p className="mt-1 text-xl font-black text-[#0F172A]">
            {reservasHoy.length} <span className="text-sm font-semibold text-[#64748B]">reservas</span>
          </p>
          <div className="relative mt-5 h-8 overflow-hidden rounded-full bg-[#F1F0EE]">
            {segs.map((s, i) => (
              <span
                key={i}
                className={`absolute inset-y-0 ${s.conf ? 'bg-[#22C55E]' : 'bg-[#EAB308]'}`}
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
          <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8]">
            <span>07:00</span>
            <span>11:00</span>
            <span>15:00</span>
            <span>19:00</span>
            <span>23:00</span>
          </div>
          <div className="mt-4 flex gap-4 border-t border-gray-100 pt-3 text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#EAB308]" /> Por confirmar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#E7E5E4]" /> Libre
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-black p-6 text-center text-white">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-[#22C55E]/25 blur-3xl" />
          <span className="rounded-full border border-[#22C55E]/40 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#4ADE80]">
            ✨ PRÓXIMAMENTE
          </span>
          <p className="mt-3 text-2xl font-black">
            Reserva<span className="text-[#4ADE80]">Ya</span> AI
          </p>
          <p className="mx-auto mt-2 max-w-[220px] text-xs text-white/55">
            Pregúntale por tus números y te responde al toque.
          </p>
          <Link
            href="/admin/reportes"
            className="mt-5 block rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Explorar reportes →
          </Link>
        </div>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
