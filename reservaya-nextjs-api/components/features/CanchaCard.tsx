'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Moon, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CroquisCancha } from '@/components/ui/CroquisCancha'
import { tipoCanchaLabel } from './etiquetasJugador'
import type { Cancha } from '@/lib/api'

const ModalDinamico = dynamic(
  () => import('@/components/ui/Modal').then((modulo) => modulo.Modal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4" role="status">
        <div className="card-tactil w-full max-w-lg bg-tiza p-6 text-sm font-semibold text-pizarra shadow-dura-lg">
          Cargando reserva…
        </div>
      </div>
    ),
  }
)
const ReservaFormDinamico = dynamic(
  () => import('./ReservaForm').then((modulo) => modulo.ReservaForm),
  {
    loading: () => <p className="py-8 text-center text-sm font-semibold text-pizarra">Cargando formulario…</p>,
  }
)

function precargarReserva() {
  if (typeof window === 'undefined') return
  void import('@/components/ui/Modal')
  void import('./ReservaForm')
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

const tipoBadge: Record<string, 'futbol' | 'voley' | 'basquet' | 'padel' | 'tenis' | 'losa'> = {
  FUTBOL: 'futbol', FUTBOL5: 'futbol', FUTBOL7: 'futbol',
  VOLLEYBALL: 'voley', BASQUET: 'basquet', PADEL: 'padel', TENIS: 'tenis', LOZA: 'losa',
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
      <div className="card-tactil flex flex-col overflow-hidden transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-lg">
        {/* Contenedor de imagen reservado anti-CLS */}
        <div className="relative aspect-video w-full overflow-hidden border-b-2 border-basalto bg-piedra">
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
              <span className="rounded-full border border-basalto bg-piedra px-2.5 py-0.5 text-[0.6875rem] font-bold text-basalto">
                Techada
              </span>
            )}
            {cancha.superficie && (
              <span className="rounded-full border border-basalto bg-piedra px-2.5 py-0.5 text-[0.6875rem] font-bold text-basalto">
                {cancha.superficie}
              </span>
            )}
          </div>

          <div className="mt-auto mb-4 flex items-center justify-between border-t-2 border-basalto/15 pt-3">
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
            onMouseEnter={precargarReserva}
            onFocus={precargarReserva}
            onClick={() => setOpen(true)}
          >
            Reservar ahora
          </Button>
        </div>
      </div>

      {open && (
        <ModalDinamico open onClose={() => setOpen(false)} title={`Reservar — ${cancha.nombre}`} tono="claro">
          <ReservaFormDinamico
            cancha={cancha}
            fechaInicial={fecha}
            horaInicioInicial={horaInicio}
            horaFinInicial={horaFin}
            totalInicial={totalEstimado}
            reglaInicial={reglaPrecio}
            onSuccess={() => setOpen(false)}
          />
        </ModalDinamico>
      )}
    </>
  )
}
