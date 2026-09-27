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
      <div className="flex flex-col overflow-hidden rounded-xl border border-cal bg-tiza transition hover:border-borde">
        {/* Contenedor de imagen reservado anti-CLS */}
        <div className="relative aspect-video w-full overflow-hidden border-b border-cal bg-piedra">
          {cancha.imagen ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cancha.imagen} alt={cancha.nombre} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-5xl text-pizarra">
              {tipoEmoji[cancha.tipo] ?? '🏟️'}
            </div>
          )}
        </div>

        {/* Contenido de la tarjeta */}
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-basalto leading-tight">{cancha.nombre}</h3>
            <Badge variant={tipoBadge[cancha.tipo] ?? 'gray'}>{cancha.tipo}</Badge>
          </div>

          {cancha.complejo && (
            <p className="mb-1 text-xs font-semibold text-pizarra">
              📍 {cancha.complejo.nombre}
              {cancha.complejo.distrito ? ` · ${cancha.complejo.distrito}` : ''}
              {cancha.complejo.ciudad ? `, ${cancha.complejo.ciudad}` : ''}
            </p>
          )}

          {cancha.dueno && (
            <p className="mb-1 text-xs text-pizarra">Por {cancha.dueno.nombre}</p>
          )}

          {cancha.descripcion && (
            <p className="mb-4 text-xs text-pizarra line-clamp-2">{cancha.descripcion}</p>
          )}

          <div className="mb-4 flex flex-wrap gap-1.5">
            {cancha.techada && (
              <span className="rounded-md border border-cal bg-piedra px-2 py-0.5 text-[11px] font-semibold text-basalto">
                Techada
              </span>
            )}
            {cancha.superficie && (
              <span className="rounded-md border border-cal bg-piedra px-2 py-0.5 text-[11px] font-semibold text-basalto">
                {cancha.superficie}
              </span>
            )}
          </div>

          <div className="mt-auto mb-4 flex items-center justify-between border-t border-cal pt-3">
            <div className="text-xs text-pizarra font-display tabular-nums">
              👥 <span className="font-semibold text-basalto">{cancha.capacidad}</span> jugadores
            </div>
            <div className="font-display tabular-nums text-lg font-bold text-cesped-hondo">
              S/ {totalEstimado ?? cancha.precioPorHora}
              <span className="text-xs font-normal text-pizarra font-sans">
                {totalEstimado ? ' total' : '/hora'}
              </span>
            </div>
          </div>

          {reglaPrecio && (
            <p className="mb-3 rounded-md border border-cesped/30 bg-cesped-suave px-2.5 py-1 text-xs font-semibold text-cesped-hondo">
              🌙 Tarifa aplicada: {reglaPrecio}
            </p>
          )}

          {!disponible && (
            <p className="mb-3 rounded-md border border-cal bg-piedra px-2.5 py-1 text-xs font-semibold text-pizarra">
              {motivo ?? 'No disponible en ese horario'}
            </p>
          )}

          <Button
            variant="primary"
            className="w-full"
            disabled={!disponible}
            onClick={() => setOpen(true)}
          >
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