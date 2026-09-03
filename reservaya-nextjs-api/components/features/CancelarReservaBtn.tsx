'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { updateReserva } from '@/lib/api-client'

export function CancelarReservaBtn({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function cancelar() {
    if (!confirm('¿Cancelar esta reserva?')) return
    setLoading(true)
    setError('')
    try {
      await updateReserva(id, 'CANCELADA')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo cancelar la reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="danger" size="sm" loading={loading} onClick={cancelar}>Cancelar</Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}