'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ReservaForm } from './ReservaForm'
import type { Cancha } from '@/lib/api'

const tipoEmoji: Record<string, string> = {
  FUTBOL: '⚽',
  FUTBOL5: '⚽',
  FUTBOL7: '⚽',
  PADEL: '🎾',
  TENIS: '🎾',
  BASQUET: '🏀',
  VOLLEYBALL: '🏐',
  LOZA: '🏟️',
}

const tipoBadge: Record<string, 'green' | 'blue' | 'yellow' | 'red'> = {
  FUTBOL: 'green',
  FUTBOL5: 'green',
  FUTBOL7: 'green',
  PADEL: 'yellow',
  TENIS: 'yellow',
  BASQUET: 'blue',
  VOLLEYBALL: 'red',
  LOZA: 'blue',
}

export function CanchaCard({
  cancha,
  disponible = true,
  motivo = null,
  fecha,
  horaInicio,
  horaFin,
  totalEstimado = null,
  reglaPrecio = null,
}: {
  cancha: Cancha
  disponible?: boolean
  motivo?: string | null
  fecha?: string
  horaInicio?: number
  horaFin?: number
  totalEstimado?: string | null
  reglaPrecio?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0A3D22] via-[#14532D] to-[#060A08] text-center">
          {cancha.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cancha.imagen} alt={cancha.nombre} className="h-44 w-full object-cover" />
          ) : (
            <div className="p-6 text-6xl">{tipoEmoji[cancha.tipo] ?? '🏟️'}</div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{cancha.nombre}</h3>
            <Badge variant={tipoBadge[cancha.tipo] ?? 'gray'}>{cancha.tipo}</Badge>
          </div>
          {cancha.complejo && (
            <p className="text-xs font-semibold text-gray-500 mb-1">
              📍 {cancha.complejo.nombre}
              {cancha.complejo.distrito ? ` · ${cancha.complejo.distrito}` : ''}
              {cancha.complejo.ciudad ? `, ${cancha.complejo.ciudad}` : ''}
            </p>
          )}
          {cancha.dueno && (
            <p className="text-xs text-gray-400 mb-1">Por {cancha.dueno.nombre}</p>
          )}
          {cancha.descripcion && (
            <p className="text-gray-500 text-sm mb-4">{cancha.descripcion}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {cancha.techada && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Techada</span>
            )}
            {cancha.superficie && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{cancha.superficie}</span>
            )}
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              👥 <span className="font-medium">{cancha.capacidad}</span> personas
            </div>
            <div className="text-lg font-bold text-[#15803D]">
              S/ {totalEstimado ?? cancha.precioPorHora}
              <span className="text-sm font-normal text-gray-400">{totalEstimado ? ' total' : '/hora'}</span>
            </div>
          </div>
          {reglaPrecio && (
            <p className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700">
              🌙 Tarifa aplicada: {reglaPrecio}
            </p>
          )}
          {!disponible && (
            <p className="mb-3 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
              {motivo ?? 'No disponible en ese horario'}
            </p>
          )}
          <Button className="w-full" disabled={!disponible} onClick={() => setOpen(true)}>
            Reservar ahora
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Reservar — ${cancha.nombre}`}>
        <ReservaForm
          cancha={cancha}
          fechaInicial={fecha}
          horaInicioInicial={horaInicio}
          horaFinInicial={horaFin}
          totalInicial={totalEstimado}
          reglaInicial={reglaPrecio}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  )
}