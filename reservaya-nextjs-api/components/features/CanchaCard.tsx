'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Moon, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ReservaForm } from './ReservaForm'
import { tipoCanchaLabel } from './etiquetasJugador'
import type { Cancha } from '@/lib/api'

// Firma visual compartida con la landing (spec 24): croquis de cancha en líneas de
// cal (perímetro, línea media, círculo central) cuando no hay foto o la foto no carga.
// Sin SVG ni imagen, sin icono forzado por deporte.
function CroquisCancha() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-cesped-suave" aria-hidden="true">
      <div className="absolute inset-4 rounded-sm border border-cesped/40" />
      <div className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-cesped/40" />
      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cesped/40" />
    </div>
  )
}

// onError no burbujea y se puede perder si la imagen ya falló antes de hidratar
// (404 casi instantáneo): se revisa img.complete/naturalWidth también al montar.
function ImagenCancha({ src, alt }: { src: string; alt: string }) {
  const [rota, setRota] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setRota(true)
  }, [])

  if (rota) return <CroquisCancha />

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setRota(true)}
    />
  )
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
          {cancha.imagen ? <ImagenCancha src={cancha.imagen} alt={cancha.nombre} /> : <CroquisCancha />}
        </div>

        {/* Contenido de la tarjeta */}
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-basalto leading-tight">{cancha.nombre}</h3>
            <Badge variant={tipoBadge[cancha.tipo] ?? 'gray'}>{tipoCanchaLabel[cancha.tipo] ?? cancha.tipo}</Badge>
          </div>

          {cancha.complejo && (
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-pizarra">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              {cancha.complejo.nombre}
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
            <div className="flex items-center gap-1 text-xs text-pizarra font-display tabular-nums">
              <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="font-semibold text-basalto">{cancha.capacidad}</span> jugadores
            </div>
            <div className="font-display tabular-nums text-lg font-bold text-cesped-hondo">
              S/ {totalEstimado ?? cancha.precioPorHora}
              <span className="text-xs font-normal text-pizarra font-sans">
                {totalEstimado ? ' total' : '/hora'}
              </span>
            </div>
          </div>

          {reglaPrecio && (
            <p className="mb-3 flex items-center gap-1.5 rounded-md border border-cesped/30 bg-cesped-suave px-2.5 py-1 text-xs font-semibold text-cesped-hondo">
              <Moon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              Tarifa aplicada: {reglaPrecio}
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

      <Modal open={open} onClose={() => setOpen(false)} title={`Reservar — ${cancha.nombre}`} tono="claro">
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
