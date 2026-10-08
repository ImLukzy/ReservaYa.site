'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormResena } from '@/components/public/resenas/FormResena'
import { crearResena } from '@/lib/api-client'

export function CalificarBtn({ complejoId, complejoNombre }: { complejoId: string; complejoNombre: string }) {
  const [open, setOpen] = useState(false)
  const [listo, setListo] = useState(false)

  async function guardar(puntuacion: number, comentario: string) {
    await crearResena(complejoId, puntuacion, comentario || undefined)
    setListo(true)
    setOpen(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Star size={14} className={listo ? 'fill-sol text-sol' : ''} aria-hidden="true" />
        {listo ? 'Calificada' : 'Calificar'}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Califica ${complejoNombre}`} tono="claro">
        <p className="mb-4 text-sm text-pizarra">¿Cómo estuvo tu experiencia? Si ya calificaste este local, se actualiza tu reseña.</p>
        {open && <FormResena textoEnviar="Guardar calificación" onEnviar={guardar} onCancelar={() => setOpen(false)} />}
      </Modal>
    </div>
  )
}
