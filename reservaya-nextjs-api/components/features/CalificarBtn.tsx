'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { crearResena } from '@/lib/api-client'

export function CalificarBtn({ complejoId, complejoNombre }: { complejoId: string; complejoNombre: string }) {
  const [open, setOpen] = useState(false)
  const [puntos, setPuntos] = useState(5)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  async function guardar() {
    setLoading(true)
    setError('')
    try {
      await crearResena(complejoId, puntos, comentario.trim() || undefined)
      setListo(true)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu calificación')
    } finally {
      setLoading(false)
    }
  }

  // Roving tabindex: solo la estrella seleccionada es alcanzable con Tab; las flechas mueven el foco.
  function onKeyDownEstrellas(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const siguiente = e.key === 'ArrowRight' ? Math.min(5, puntos + 1) : Math.max(1, puntos - 1)
    setPuntos(siguiente)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-n="${siguiente}"]`)?.focus()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={() => { setError(''); setOpen(true) }}>
        <Star size={14} className={listo ? 'fill-sol text-sol' : ''} aria-hidden="true" />
        {listo ? 'Calificada' : 'Calificar'}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Califica ${complejoNombre}`} tono="claro">
        <p className="text-sm text-pizarra">¿Cómo estuvo tu experiencia? Solo puedes calificar locales donde ya jugaste.</p>
        <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Puntuación" onKeyDown={onKeyDownEstrellas}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              data-n={n}
              aria-checked={puntos === n}
              aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
              tabIndex={puntos === n ? 0 : -1}
              onClick={() => setPuntos(n)}
              className={`rounded-md p-0.5 transition ${n <= puntos ? 'text-sol' : 'text-cal hover:text-sol'}`}
            >
              <Star size={28} className={n <= puntos ? 'fill-sol' : ''} aria-hidden="true" />
            </button>
          ))}
        </div>
        <label className="mt-4 block text-[13px] font-bold text-pizarra">
          Comentario (opcional)
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Cuenta cómo te fue..."
            className="mt-1.5 w-full rounded-xl border border-cal bg-tiza px-4 py-2.5 text-sm text-basalto placeholder:text-niebla focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25 resize-none"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-error/30 bg-error-suave px-3 py-2 text-sm font-semibold text-error">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-cal bg-tiza px-4 py-2 text-xs font-bold text-basalto hover:bg-piedra transition"
          >
            Cancelar
          </button>
          <Button size="sm" variant="primary" loading={loading} onClick={guardar}>
            Guardar calificación
          </Button>
        </div>
      </Modal>
    </div>
  )
}
