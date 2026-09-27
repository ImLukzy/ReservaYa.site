'use client'

import { useState } from 'react'
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

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={() => { setError(''); setOpen(true) }}>
        {listo ? '★ Calificada' : '★ Calificar'}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Califica ${complejoNombre}`}>
        <p className="text-sm text-slate-300">¿Cómo estuvo tu experiencia? Solo puedes calificar locales donde ya jugaste.</p>
        <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Puntuación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={puntos === n}
              aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
              onClick={() => setPuntos(n)}
              className={`text-3xl transition ${n <= puntos ? 'text-sol' : 'text-slate-500 hover:text-sol'}`}
            >
              ★
            </button>
          ))}
        </div>
        <label className="mt-4 block text-[13px] font-bold text-slate-300">
          Comentario (opcional)
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Cuenta cómo te fue..."
            className="mt-1.5 w-full rounded-xl border border-[#303850] bg-[#151b2e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25 resize-none"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-error/40 bg-error/15 px-3 py-2 text-sm font-semibold text-red-200">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-[#303850] bg-[#151b2e] px-4 py-2 text-xs font-bold text-slate-200 hover:bg-[#20263a] transition"
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
