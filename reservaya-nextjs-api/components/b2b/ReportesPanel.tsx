'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CircleHelp, Download } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';
import { num, soles } from '@/lib/b2b-client';
import type { ReporteGlobal, Reserva } from '@/lib/api';

const MESES = [
  { key: '2026-04', corto: 'Abr 2026', largo: 'Abril 2026' },
  { key: '2026-05', corto: 'May 2026', largo: 'Mayo 2026' },
  { key: '2026-06', corto: 'Jun 2026', largo: 'Junio 2026' },
  { key: '2026-07', corto: 'Jul 2026', largo: 'Julio 2026' },
  { key: '2026-08', corto: 'Ago 2026', largo: 'Agosto 2026' },
  { key: '2026-09', corto: 'Sep 2026', largo: 'Septiembre 2026' },
];

const PAGADAS = ['CONFIRMADA', 'COMPLETADA'];
const HORAS_POR_DIA = 16; // 07:00–23:00

function mesActualKey() {
  const ahora = new Date();
  const key = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  return MESES.some((m) => m.key === key) ? key : MESES[MESES.length - 1].key;
}

function diasDelMes(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function ReportesPanel({
  reservas,
  reporte,
}: {
  reservas: Reserva[];
  reporte: ReporteGlobal | null;
}) {
  const [mes, setMes] = useState(mesActualKey);
  const mesInfo = MESES.find((m) => m.key === mes) ?? MESES[MESES.length - 1];

  const canchasActivas = useMemo(() => {
    if (reporte && reporte.canchas.length > 0) {
      const activas = reporte.canchas.filter((c) => c.activa);
      return activas.length > 0 ? activas.length : reporte.canchas.length;
    }
    return new Set(reservas.map((r) => r.canchaId)).size;
  }, [reporte, reservas]);

  const enMes = useMemo(
    () => reservas.filter((r) => String(r.fecha).slice(0, 7) === mes),
    [reservas, mes]
  );
  const validas = useMemo(() => enMes.filter((r) => r.estado !== 'CANCELADA'), [enMes]);
  const pagadas = useMemo(() => enMes.filter((r) => PAGADAS.includes(r.estado)), [enMes]);

  const ingresosMes = useMemo(() => pagadas.reduce((acc, r) => acc + num(r.total), 0), [pagadas]);
  const promedio = pagadas.length > 0 ? ingresosMes / pagadas.length : 0;
  const clientesUnicos = useMemo(() => new Set(enMes.map((r) => r.usuarioId)).size, [enMes]);

  const dias = diasDelMes(mes);
  const capacidadHoras = canchasActivas * dias * HORAS_POR_DIA;
  const horasReservadas = useMemo(
    () => validas.reduce((acc, r) => acc + Math.max(0, r.horaFin - r.horaInicio) / 60, 0),
    [validas]
  );
  const ocupacion = capacidadHoras > 0 ? Math.min(100, (horasReservadas / capacidadHoras) * 100) : 0;

  const serieDiaria = useMemo(() => {
    const arr = Array.from({ length: dias }, (_, i) => ({
      dia: i + 1,
      reservas: 0,
      ingresos: 0,
    }));
    for (const r of enMes) {
      const d = Number(String(r.fecha).slice(8, 10));
      if (d >= 1 && d <= dias) {
        if (r.estado !== 'CANCELADA') arr[d - 1].reservas += 1;
        if (PAGADAS.includes(r.estado)) arr[d - 1].ingresos += num(r.total);
      }
    }
    return arr;
  }, [enMes, dias]);
  const maxDia = Math.max(1, ...serieDiaria.map((s) => s.reservas));

  const porCancha = useMemo(() => {
    const acc = new Map<string, { nombre: string; horas: number; reservas: number }>();
    for (const r of validas) {
      const cur = acc.get(r.canchaId) ?? { nombre: r.cancha?.nombre ?? 'Cancha', horas: 0, reservas: 0 };
      cur.horas += Math.max(0, r.horaFin - r.horaInicio) / 60;
      cur.reservas += 1;
      acc.set(r.canchaId, cur);
    }
    const capCancha = dias * HORAS_POR_DIA;
    return [...acc.values()]
      .map((c) => ({ ...c, pct: capCancha > 0 ? Math.min(100, (c.horas / capCancha) * 100) : 0 }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 6);
  }, [validas, dias]);

  const ultimos6 = useMemo(
    () =>
      MESES.map((m) => {
        const rs = reservas.filter((r) => String(r.fecha).slice(0, 7) === m.key && PAGADAS.includes(r.estado));
        return { ...m, ingresos: rs.reduce((acc, r) => acc + num(r.total), 0), reservas: rs.length };
      }),
    [reservas]
  );
  const max6 = Math.max(1, ...ultimos6.map((m) => m.ingresos));

  const topClientes = useMemo(() => {
    const acc = new Map<string, { nombre: string; reservas: number; ingresos: number }>();
    for (const r of enMes) {
      const cur = acc.get(r.usuarioId) ?? { nombre: r.usuario?.nombre ?? 'Cliente', reservas: 0, ingresos: 0 };
      cur.reservas += 1;
      if (PAGADAS.includes(r.estado)) cur.ingresos += num(r.total);
      acc.set(r.usuarioId, cur);
    }
    return [...acc.values()].sort((a, b) => b.ingresos - a.ingresos || b.reservas - a.reservas).slice(0, 5);
  }, [enMes]);

  function exportarExcel() {
    const filas = [
      ['Reporte', mesInfo.largo],
      [],
      ['KPI', 'Valor'],
      ['Ingresos del mes (S/)', ingresosMes.toFixed(2)],
      ['Reservas del mes', pagadas.length],
      ['Promedio por reserva (S/)', promedio.toFixed(2)],
      ['Clientes únicos', clientesUnicos],
      ['Ocupación (%)', ocupacion.toFixed(1)],
      ['Horas reservadas', horasReservadas.toFixed(1)],
      [],
      ['Día', 'Reservas', 'Ingresos (S/)'],
      ...serieDiaria.map((s) => [s.dia, s.reservas, s.ingresos.toFixed(2)]),
    ];
    const csv = '﻿' + filas.map((f) => f.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reportes-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: `Ingresos · ${mesInfo.corto}`, valor: soles(ingresosMes), sub: `${pagadas.length} reservas pagadas`, oscuro: true },
    { label: 'Reservas del mes', valor: String(enMes.length), sub: `${validas.length} vigentes`, oscuro: false },
    { label: 'Promedio por reserva', valor: soles(promedio), sub: 'Ticket promedio', oscuro: false },
    { label: 'Clientes únicos', valor: String(clientesUnicos), sub: 'Jugadores distintos', oscuro: false },
  ];

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">▦ REPORTES</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">Mis reportes</h1>
          <p className="text-sm text-[#64748B]">
            Tus números reales: ingresos, ocupación y clientes de {mesInfo.largo.toLowerCase()}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ayuda"
            aria-label="Ayuda"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-white px-3 text-sm font-bold text-[#64748B] transition-colors hover:border-[#22C55E]"
          >
            <CircleHelp size={18} strokeWidth={1.85} /> Ayuda
          </Link>
          <button
            type="button"
            onClick={exportarExcel}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 text-sm font-bold text-white transition-all hover:bg-black active:scale-[0.98]"
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Selector de mes */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-[#E7E5E4] bg-white p-1.5" role="tablist" aria-label="Mes">
        {MESES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mes === m.key}
            onClick={() => setMes(m.key)}
            className={cn(
              'shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all',
              mes === m.key ? 'bg-[#0F172A] text-white shadow' : 'text-[#64748B] hover:bg-[#F5F5F3] hover:text-[#0F172A]'
            )}
          >
            {m.corto}
          </button>
        ))}
      </div>

      {enMes.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white">
          <EmptyState
            icon={BarChart3}
            title={`Sin reservas en ${mesInfo.largo}`}
            description="Cuando registres reservas verás aquí tus ingresos, ocupación y mejores clientes."
            action={
              <Link href="/admin/agenda" className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A]">
                Crear reserva manual
              </Link>
            }
          />
        </div>
      ) : null}

      {/* KPIs */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn(
              'rounded-2xl border p-5',
              k.oscuro
                ? 'border-transparent bg-gradient-to-br from-[#060A08] via-[#0A2E1F] to-[#14532D] text-white'
                : 'border-[#E7E5E4] bg-white'
            )}
          >
            <p className={cn('text-[11px] font-bold tracking-[0.12em]', k.oscuro ? 'text-white/60' : 'text-[#64748B]')}>
              {k.label.toUpperCase()}
            </p>
            <p className={cn('mt-1 text-3xl font-black', k.oscuro ? 'text-white' : 'text-[#0F172A]')}>{k.valor}</p>
            <p className={cn('mt-0.5 text-xs', k.oscuro ? 'text-white/55' : 'text-[#64748B]')}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Ocupación + serie diaria */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] p-5 text-white">
          <p className="text-[11px] font-bold tracking-[0.14em] text-white/60">OCUPACIÓN · {mesInfo.largo.toUpperCase()}</p>
          <p className="mt-1 text-5xl font-black">{canchasActivas > 0 ? `${ocupacion.toFixed(1)}%` : '—'}</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${ocupacion}%` }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/70">
            {canchasActivas > 0
              ? `Reservaste ${horasReservadas.toFixed(0)} de ${capacidadHoras.toFixed(0)} horas disponibles (${canchasActivas} cancha${canchasActivas === 1 ? '' : 's'} × ${dias} días × ${HORAS_POR_DIA}h de 07:00 a 23:00).`
              : 'Agrega tus canchas para medir la ocupación.'}
          </p>
          {reporte && (
            <p className="mt-2 text-xs text-white/50">
              Global: {reporte.totalReservas} reservas totales · S/ {num(reporte.ingresosTotales).toLocaleString('es-PE')} ingresos confirmados.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#64748B]">RESERVAS DÍA A DÍA</p>
          <div className="mt-4 flex h-32 items-end gap-[3px]">
            {serieDiaria.map((s) => (
              <div key={s.dia} className="flex flex-1 flex-col items-center gap-1" title={`Día ${s.dia}: ${s.reservas} reservas`}>
                <div
                  className="w-full rounded-sm bg-[#22C55E]"
                  style={{ height: `${Math.max(3, (s.reservas / maxDia) * 112)}px`, opacity: s.reservas > 0 ? 1 : 0.2 }}
                />
                {s.dia % 5 === 0 && <span className="text-[9px] text-[#94A3B8]">{s.dia}</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#64748B]">{validas.length} reservas vigentes en {mesInfo.largo.toLowerCase()}.</p>
        </div>
      </div>

      {/* Por cancha + últimos 6 meses + top clientes */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#64748B]">OCUPACIÓN POR CANCHA</p>
          {porCancha.length === 0 ? (
            <p className="mt-3 text-sm text-[#64748B]">Sin datos este mes.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {porCancha.map((c) => (
                <li key={c.nombre}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-[#0F172A]">{c.nombre}</span>
                    <span className="text-xs font-semibold text-[#64748B]">{c.horas.toFixed(0)}h · {c.pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F1F0EE]">
                    <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${c.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#64748B]">INGRESOS ÚLTIMOS 6 MESES</p>
          <div className="mt-4 flex h-32 items-end gap-2">
            {ultimos6.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1" title={`${m.largo}: ${soles(m.ingresos)}`}>
                <span className="text-[10px] font-bold text-[#15803D]">{m.ingresos > 0 ? `S/${Math.round(m.ingresos)}` : ''}</span>
                <div
                  className={cn('w-full rounded-t-lg', m.key === mes ? 'bg-[#0F172A]' : 'bg-[#22C55E]/70')}
                  style={{ height: `${Math.max(4, (m.ingresos / max6) * 96)}px`, opacity: m.ingresos > 0 ? 1 : 0.25 }}
                />
                <span className="text-[10px] font-semibold text-[#64748B]">{m.corto.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#64748B]">TOP CLIENTES DEL MES</p>
        {topClientes.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748B]">Aún no hay clientes este mes.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#F1F0EE]">
            {topClientes.map((c, i) => (
              <li key={`${c.nombre}-${i}`} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCFCE7] text-sm font-black text-[#15803D]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-[#0F172A]">{c.nombre}</p>
                    <p className="text-xs text-[#64748B]">{c.reservas} reserva{c.reservas === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <p className="font-black text-[#15803D]">{soles(c.ingresos)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WhatsAppFloat />
    </div>
  );
}
