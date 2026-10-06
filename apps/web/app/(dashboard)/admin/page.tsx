import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ListChecks, Plus } from 'lucide-react';
import * as api from '@/lib/api';
import type { DashboardAdmin } from '@/lib/api';
import { getSession } from '@/lib/session';
import { getComplejos, getHorarios } from '@/lib/b2b-api';
import { pasosOnboarding, PASOS_GUIA } from '@/lib/onboarding';
import { GuiaDueno } from '@/components/b2b/GuiaDueno';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';
import { formatHora } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function saludo(hora: number) {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 2 })}`;

// Inicio del dueño (spec 55 F4): qué falta para dejar listo el centro, el día de hoy y el mes.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ guia?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.rol === 'ADMIN') redirect('/admin/agenda');
  if (session.rol === 'TECNICO') redirect('/tecnico');
  const { guia } = await searchParams;

  const carga = crearCarga();
  const [dashboard, reservas, complejos, canchas] = await Promise.all([
    carga.de(api.getDashboard() as Promise<DashboardAdmin>, null, 'el resumen del mes'),
    carga.de(api.getReservas(), [], 'las reservas'),
    carga.de(getComplejos(), [], 'tus centros'),
    carga.de(api.getCanchas(undefined, true), [], 'las canchas'),
  ]);
  const horarios = Object.fromEntries(
    await Promise.all(
      complejos.map(async (c) => [c.id, await carga.de(getHorarios(c.id), null, `los horarios de ${c.nombre}`)])
    )
  );
  const completados = pasosOnboarding({ complejos, canchas, horarios });
  const hechos = completados.filter(Boolean).length;
  const siguiente = PASOS_GUIA.find((_, i) => !completados[i]);

  const ahora = new Date();
  const fechaLarga = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  const hoyISO = ahora.toISOString().slice(0, 10);
  const nombre = session.nombre.split(' ')[0] || 'Dueño';
  const mes = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(ahora);

  const reservasHoy = reservas
    .filter((r) => String(r.fecha).slice(0, 10) === hoyISO && r.estado !== 'CANCELADA')
    .sort((a, b) => a.horaInicio - b.horaInicio);
  const pendientesHoy = reservasHoy.filter((r) => r.estado === 'PENDIENTE').length;

  // Barras de los últimos 30 días con reservas reales.
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(ahora);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const porDia = dias.map((d) => reservas.filter((r) => String(r.fecha).slice(0, 10) === d).length);
  const maxDia = Math.max(1, ...porDia);

  return (
    <div className="mx-auto max-w-6xl">
      <AvisoCarga errores={carga.errores} />
      <GuiaDueno usuarioId={session.id} completados={completados} pedida={guia === '1'} primeraVez />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cal pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-basalto">
            {saludo(ahora.getHours())}, {nombre}
          </h1>
          <p className="mt-1 text-sm capitalize text-pizarra">{fechaLarga}</p>
        </div>
        <Link
          href="/admin/agenda"
          className="btn-tactil bg-cesped px-5 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover"
        >
          <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> Reserva manual
        </Link>
      </div>

      {siguiente && (
        <Link
          href="/admin/ayuda"
          className="card-tactil mt-4 flex items-center gap-3 p-4 transition-colors hover:border-cesped"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cesped-suave text-cesped-hondo">
            <ListChecks size={18} strokeWidth={1.85} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-bold text-basalto">
              Deja listo tu centro · {hechos} de {PASOS_GUIA.length}
            </strong>
            <span className="block truncate text-xs text-pizarra">Siguiente: {siguiente.titulo}</span>
          </span>
          <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-piedra sm:block" aria-hidden="true">
            <span className="block h-full rounded-full bg-cesped" style={{ width: `${(hechos / PASOS_GUIA.length) * 100}%` }} />
          </span>
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-pizarra" />
        </Link>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Hoy */}
        <section aria-labelledby="hoy-titulo" className="card-tactil p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="hoy-titulo" className="font-display text-lg font-bold text-basalto">Hoy</h2>
            <Link href="/admin/agenda" className="text-sm font-semibold text-cesped-hondo hover:underline">
              Ver cronograma
            </Link>
          </div>
          <p className="mt-1 text-sm text-pizarra">
            {reservasHoy.length === 0
              ? 'Sin reservas por ahora.'
              : `${reservasHoy.length} ${reservasHoy.length === 1 ? 'reserva' : 'reservas'}${pendientesHoy ? `, ${pendientesHoy} por confirmar` : ''}.`}
          </p>
          {reservasHoy.length > 0 && (
            <ul className="mt-4 divide-y divide-cal border-t border-cal">
              {reservasHoy.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="w-28 shrink-0 font-display font-semibold tabular-nums text-basalto">
                    {formatHora(r.horaInicio)}–{formatHora(r.horaFin)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-pizarra">{r.cancha.nombre}</span>
                  <span className={r.estado === 'PENDIENTE' ? 'font-semibold text-sol-hondo' : 'font-semibold text-cesped-hondo'}>
                    {r.estado === 'PENDIENTE' ? 'Por confirmar' : r.estado === 'COMPLETADA' ? 'Jugada' : 'Confirmada'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pendientesHoy > 0 && (
            <Link href="/admin/reservas" className="btn-tactil mt-4 bg-cesped px-4 py-2 text-sm font-bold text-tiza hover:bg-cesped-hover">
              Confirmar reservas
            </Link>
          )}
        </section>

        {/* Mes */}
        <section aria-labelledby="mes-titulo" className="card-tactil p-5">
          <h2 id="mes-titulo" className="font-display text-lg font-bold capitalize text-basalto">{mes}</h2>
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="text-sm text-pizarra">Ingresos confirmados</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-basalto">
                {dashboard ? soles(Number(dashboard.ingresos || 0)) : '—'}
              </dd>
            </div>
            <div className="flex gap-6">
              <div>
                <dt className="text-sm text-pizarra">Reservas</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-basalto">{dashboard?.totalReservas ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-pizarra">Canchas activas</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-basalto">{dashboard?.canchasActivas ?? '—'}</dd>
              </div>
            </div>
          </dl>
          <Link href="/admin/reportes" className="mt-4 inline-block text-sm font-semibold text-cesped-hondo hover:underline">
            Ver reportes
          </Link>
        </section>
      </div>

      <section aria-labelledby="dias-titulo" className="card-tactil mt-4 p-5">
        <h2 id="dias-titulo" className="font-display text-lg font-bold text-basalto">Reservas de los últimos 30 días</h2>
        <div className="mt-4 flex h-24 items-end gap-[0.1875rem]" role="img" aria-label={`${porDia.reduce((a, b) => a + b, 0)} reservas en 30 días`}>
          {porDia.map((v, i) => (
            <div
              key={dias[i]}
              className={v > 0 ? 'flex-1 rounded-sm bg-cesped' : 'flex-1 rounded-sm bg-piedra'}
              style={{ height: `${Math.max(4, (v / maxDia) * 100)}%` }}
              title={`${dias[i]}: ${v} reservas`}
            />
          ))}
        </div>
      </section>

      <WhatsAppFloat />
    </div>
  );
}
