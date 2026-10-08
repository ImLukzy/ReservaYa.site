'use client'

import { useId, useState } from 'react'
import { Star } from 'lucide-react'
import { MAX_TEXTO } from '@/lib/public/resenas'
import { cn } from '@/lib/utils'

interface FormResenaProps {
  puntuacionInicial?: number
  comentarioInicial?: string
  textoEnviar: string
  onEnviar: (puntuacion: number, comentario: string) => Promise<void>
  onCancelar?: () => void
  className?: string
}

// Formulario único de reseña (perfil público y modal de "Mis reservas"): estrellas como grupo
// de radio con flechas y comentario opcional ≤ 500. Los tokens se adaptan al tema de cada superficie.
export function FormResena({ puntuacionInicial = 5, comentarioInicial = '', textoEnviar, onEnviar, onCancelar, className }: FormResenaProps) {
  const [puntos, setPuntos] = useState(puntuacionInicial)
  const [comentario, setComentario] = useState(comentarioInicial)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const id = useId()

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await onEnviar(puntos, comentario.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu reseña')
    } finally {
      setEnviando(false)
    }
  }

  // Roving tabindex: solo la estrella elegida entra con Tab; las flechas cambian y mueven el foco.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const siguiente = Math.min(5, Math.max(1, puntos + paso))
    setPuntos(siguiente)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-n="${siguiente}"]`)?.focus()
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className={className}>
      <p id={`${id}-p`} className="text-sm font-semibold text-basalto">Tu puntuación</p>
      <div className="mt-1 flex gap-0.5" role="radiogroup" aria-labelledby={`${id}-p`} onKeyDown={onKeyDown}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            data-n={n}
            aria-checked={puntos === n}
            aria-label={`${n} de 5`}
            tabIndex={puntos === n ? 0 : -1}
            onClick={() => setPuntos(n)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sol transition-colors hover:bg-sol-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped"
          >
            <Star size={26} className={cn(n <= puntos ? 'fill-sol' : 'text-borde')} aria-hidden="true" />
          </button>
        ))}
      </div>
      <label htmlFor={`${id}-c`} className="mt-4 block text-sm font-semibold text-basalto">Comentario (opcional)</label>
      <textarea
        id={`${id}-c`}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={MAX_TEXTO}
        rows={3}
        placeholder="Cuenta cómo te fue…"
        aria-describedby={`${id}-n`}
        className="mt-1.5 w-full resize-none rounded-control border border-borde bg-tiza px-4 py-2.5 text-base text-basalto placeholder:text-pizarra focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
      />
      <p id={`${id}-n`} className="mt-1 text-right text-xs text-pizarra tabular-nums">{comentario.length}/{MAX_TEXTO}</p>
      {error && (
        <p role="alert" className="mt-2 rounded-control border border-error/30 bg-error-suave px-3 py-2 text-sm font-semibold text-error">{error}</p>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2.5">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="btn-tactil btn-tactil--claro min-h-11 bg-tiza px-5 text-sm font-semibold text-basalto hover:bg-piedra">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={enviando} aria-busy={enviando || undefined} className="btn-tactil min-h-11 bg-cesped px-5 text-sm font-semibold text-tiza hover:bg-cesped-hover disabled:cursor-not-allowed disabled:opacity-50">
          {enviando ? 'Guardando…' : textoEnviar}
        </button>
      </div>
    </form>
  )
}
