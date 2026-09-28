'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, Trophy } from 'lucide-react'
import type { MisPartidos, PartidoJugador } from '@/lib/api-types'
import { cancelarPartido, salirseDePartido } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { publicAppUrl } from '@/lib/public-app'
import { cn } from '@/lib/utils'

interface PartidosJugadorPanelProps {
  initialData: MisPartidos
  defaultTab?: 'organizo' | 'meAnote'
}

export function PartidosJugadorPanel({
  initialData,
  defaultTab = 'organizo',
}: PartidosJugadorPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'organizo' | 'meAnote'>(defaultTab)
  const [organizo, setOrganizo] = useState<PartidoJugador[]>(initialData.organizo ?? [])
  const [meAnote, setMeAnote] = useState<PartidoJugador[]>(initialData.meAnote ?? [])

  // Modal de confirmación
  const [partidoModal, setPartidoModal] = useState<PartidoJugador | null>(null)
  const [tipoModal, setTipoModal] = useState<'cancelar' | 'salir' | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  function abrirModal(partido: PartidoJugador, tipo: 'cancelar' | 'salir') {
    setPartidoModal(partido)
    setTipoModal(tipo)
    setErrorModal(null)
  }

  function cerrarModal() {
    if (loadingModal) return
    setPartidoModal(null)
    setTipoModal(null)
    setErrorModal(null)
  }

  async function ejecutarAccion() {
    if (!partidoModal || !tipoModal) return

    setLoadingModal(true)
    setErrorModal(null)

    try {
      if (tipoModal === 'cancelar') {
        await cancelarPartido(partidoModal.id)
        setOrganizo((prev) => prev.filter((p) => p.id !== partidoModal.id))
      } else {
        await salirseDePartido(partidoModal.id)
        setMeAnote((prev) => prev.filter((p) => p.id !== partidoModal.id))
      }
      cerrarModal()
      router.refresh()
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : 'Error al procesar la solicitud')
    } finally {
      setLoadingModal(false)
    }
  }

  const itemsActuales = tab === 'organizo' ? organizo : meAnote

  return (
    <div className="space-y-6">
      {/* Pestañas de filtro */}
      <div className="flex border-b border-cal" role="tablist" aria-label="Filtro de mis partidos">
        <button
          type="button"
          role="tab"
          id="tab-organizo"
          aria-selected={tab === 'organizo'}
          aria-controls="panel-organizo"
          onClick={() => setTab('organizo')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 font-display text-sm font-bold transition-colors',
            tab === 'organizo'
              ? 'border-cesped text-basalto'
              : 'border-transparent text-pizarra hover:text-basalto'
          )}
        >
          Organizo
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              tab === 'organizo'
                ? 'bg-cesped-suave text-cesped-hondo'
                : 'bg-piedra text-pizarra'
            )}
          >
            {organizo.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-me-anote"
          aria-selected={tab === 'meAnote'}
          aria-controls="panel-me-anote"
          onClick={() => setTab('meAnote')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-5 py-3 font-display text-sm font-bold transition-colors',
            tab === 'meAnote'
              ? 'border-cesped text-basalto'
              : 'border-transparent text-pizarra hover:text-basalto'
          )}
        >
          Me anoté
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              tab === 'meAnote'
                ? 'bg-cesped-suave text-cesped-hondo'
                : 'bg-piedra text-pizarra'
            )}
          >
            {meAnote.length}
          </span>
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div
        id={tab === 'organizo' ? 'panel-organizo' : 'panel-me-anote'}
        role="tabpanel"
        aria-labelledby={tab === 'organizo' ? 'tab-organizo' : 'tab-me-anote'}
      >
        {itemsActuales.length === 0 ? (
          tab === 'organizo' ? (
            <EmptyState
              icon={Users}
              title="Todavía no organizas partidos"
              description="Publica uno en la comunidad y encuentra con quién jugar para completar tu cuadro."
              action={
                <a
                  href={`${publicAppUrl}/completar-cuadro`}
                  className="inline-flex items-center justify-center rounded-md bg-cesped px-4 py-2 font-display text-sm font-semibold text-grafito transition hover:bg-cesped-hover"
                >
                  Publicar un partido
                </a>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No te anotaste a ningún partido"
              description="Mira los partidos abiertos de tu distrito y súmate a una pichanga."
              action={
                <a
                  href={`${publicAppUrl}/completar-cuadro`}
                  className="inline-flex items-center justify-center rounded-md bg-cesped px-4 py-2 font-display text-sm font-semibold text-grafito transition hover:bg-cesped-hover"
                >
                  Ver partidos abiertos
                </a>
              }
            />
          )
        ) : (
          <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2" aria-live="polite">
            {itemsActuales.map((p) => {
              const cuandoTexto =
                p.cuando || [p.fechaCorta, p.horaCorta].filter(Boolean).join(' ') || p.fecha
              const nInscritos = Array.isArray(p.inscritos) ? p.inscritos : []

              return (
                <li
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-cal bg-tiza p-5 shadow-sm transition hover:border-borde"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-bold text-basalto leading-snug">
                          {p.titulo || 'Partido abierto'}
                        </h2>
                        {p.descripcion && (
                          <p className="mt-1 text-xs text-pizarra line-clamp-2">
                            {p.descripcion}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {p.formato && <Badge variant="blue">{p.formato}</Badge>}
                        {p.nivel && <Badge variant="gray">{p.nivel}</Badge>}
                      </div>
                    </div>

                    <div className="grid gap-2 border-t border-cal pt-3 text-xs text-pizarra sm:grid-cols-2">
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-pizarra" aria-hidden="true" />
                        <span className="truncate">
                          {p.cancha} &bull; {p.distrito}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 tabular-nums">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-cesped-hondo" aria-hidden="true" />
                        <span>{cuandoTexto}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0 text-pizarra" aria-hidden="true" />
                        <span className="tabular-nums font-medium text-basalto">
                          {p.cuposLibres != null ? p.cuposLibres : '–'} de {p.cuposTotales} cupos libres
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 font-display tabular-nums">
                        <Trophy className="h-3.5 w-3.5 shrink-0 text-sol" aria-hidden="true" />
                        <span className="font-bold text-basalto">
                          {p.precio > 0 ? `S/ ${p.precio.toFixed(2)} por pers.` : 'Gratis'}
                        </span>
                      </p>
                    </div>

                    {tab === 'organizo' ? (
                      <div className="rounded-lg border border-cal bg-piedra/50 p-3 text-xs text-pizarra">
                        <p className="font-semibold text-basalto">
                          Jugadores anotados ({nInscritos.length}):
                        </p>
                        <p className="mt-1">
                          {nInscritos.length > 0 ? (
                            <span className="font-medium text-basalto">{nInscritos.join(', ')}</span>
                          ) : (
                            <span className="italic">Nadie anotado todavía.</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      p.organizador && (
                        <p className="text-xs text-pizarra">
                          Organizado por:{' '}
                          <strong className="text-basalto">{p.organizador.nombre}</strong>
                        </p>
                      )
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end border-t border-cal pt-3">
                    {tab === 'organizo' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => abrirModal(p, 'cancelar')}
                      >
                        Cancelar partido
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => abrirModal(p, 'salir')}
                      >
                        Salirme del partido
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Modal accesible de confirmación */}
      <Modal
        open={!!partidoModal}
        onClose={cerrarModal}
        title={tipoModal === 'cancelar' ? 'Cancelar partido' : 'Salirme del partido'}
        tono="claro"
      >
        <div className="space-y-4">
          <p className="text-sm text-pizarra">
            {tipoModal === 'cancelar'
              ? `¿Estás seguro de cancelar «${partidoModal?.titulo || 'este partido'}»? Los jugadores anotados verán que ya no va y el partido quedará cancelado en la comunidad.`
              : `¿Deseas retirarte de «${partidoModal?.titulo || 'este partido'}»? Tu cupo quedará libre para que otro jugador se anote.`}
          </p>

          {errorModal && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error-suave p-3 text-xs font-semibold text-error"
            >
              {errorModal}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loadingModal}
              onClick={cerrarModal}
            >
              Volver
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={loadingModal}
              onClick={ejecutarAccion}
            >
              {tipoModal === 'cancelar' ? 'Confirmar cancelación' : 'Confirmar y salir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
