'use client'

import { useMemo, useState } from 'react'
import type { Reserva } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { codigoReserva, formatFecha, formatFechaHoraSolicitud, formatHora } from '@/lib/utils'
import { GestionReservaBtn } from '@/components/features/GestionReservaBtn'

const estadoBadge: Record<string, 'green' | 'yellow' | 'red' | 'blue'> = {
  CONFIRMADA: 'green',
  PENDIENTE: 'yellow',
  CANCELADA: 'red',
  COMPLETADA: 'blue',
}

export function AdminReservasTable({ reservas }: { reservas: Reserva[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const reservasFiltradas = useMemo(() => {
    return reservas
      .filter((reserva) => {
        const fecha = reserva.fecha.slice(0, 10)
        return (!desde || fecha >= desde) && (!hasta || fecha <= hasta)
      })
      .sort((a, b) => {
        const fechaComparada = a.fecha.slice(0, 10).localeCompare(b.fecha.slice(0, 10))
        if (fechaComparada !== 0) return fechaComparada
        if (a.horaInicio !== b.horaInicio) return a.horaInicio - b.horaInicio
        if (a.horaFin !== b.horaFin) return a.horaFin - b.horaFin
        if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1
        if (a.estado !== 'PENDIENTE' && b.estado === 'PENDIENTE') return 1
        return b.creadoEn.localeCompare(a.creadoEn)
      })
  }, [desde, hasta, reservas])

  const rangoInvalido = desde && hasta && desde > hasta

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 mb-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex items-center gap-3 xl:mr-2">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xl">
              📅
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Filtrar por fecha</p>
              <p className="text-xs text-gray-500">Encuentra reservas en un periodo</p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reservas-desde" className="block text-xs font-semibold text-gray-500 mb-1.5">
                FECHA INICIAL
              </label>
              <div className="relative">
                <input
                  id="reservas-desde"
                  type="date"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div>
              <label htmlFor="reservas-hasta" className="block text-xs font-semibold text-gray-500 mb-1.5">
                FECHA FINAL
              </label>
              <input
                id="reservas-hasta"
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDesde('')
              setHasta('')
            }}
            disabled={!desde && !hasta}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/40 px-4 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            <span aria-hidden="true">↺</span>
            Limpiar
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400">
          <span>
            {desde || hasta
              ? `Mostrando ${reservasFiltradas.length} reservas del rango seleccionado`
              : 'Mostrando todas las reservas'}
          </span>
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 font-medium text-indigo-300">
            {reservasFiltradas.length} de {reservas.length}
          </span>
        </div>
        {rangoInvalido && (
          <p className="mt-2 text-sm text-rose-300">La fecha inicial no puede ser posterior a la fecha final.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Solicitud</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cancha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reserva solicitada</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservasFiltradas.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{r.usuario?.nombre ?? '—'}</p>
                    <p className="text-xs text-gray-400">{r.usuario?.email}</p>
                    <p className="text-xs text-indigo-300 mt-1">Recibida: {formatFechaHoraSolicitud(r.creadoEn)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold tracking-wider text-indigo-300">
                    {r.estado === 'CONFIRMADA' ? codigoReserva(r.id) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.cancha.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatFecha(r.fecha)}<br />
                    <span className="text-xs">{formatHora(r.horaInicio)} - {formatHora(r.horaFin)}</span>
                    {r.notas && <p className="text-xs text-gray-400 mt-1 max-w-[220px] break-words">Nota: {r.notas}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">S/ {Number(r.total)}</td>
                  <td className="px-6 py-4"><Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge></td>
                  <td className="px-6 py-4"><GestionReservaBtn id={r.id} estadoActual={r.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {reservasFiltradas.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-gray-400">No hay reservas en el rango seleccionado.</p>
          )}
        </div>
      </div>
    </>
  )
}
