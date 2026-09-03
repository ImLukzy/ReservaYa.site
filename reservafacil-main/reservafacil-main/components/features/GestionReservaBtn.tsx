'use client'

import { useRouter } from 'next/navigation'
import { updateReserva } from '@/lib/api-client'
import type { EstadoReserva } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export function GestionReservaBtn({ id, estadoActual }: { id: string; estadoActual: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function cambiarEstado(estado: string) {
    setLoading(true)
    setError('')
    try {
      await updateReserva(id, estado as EstadoReserva)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar la reserva')
    } finally {
      setLoading(false)
    }
  }

  if (estadoActual === 'PENDIENTE') return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
      <Button size="sm" loading={loading} onClick={() => cambiarEstado('CONFIRMADA')}>✅ Confirmar</Button>
      <Button size="sm" variant="danger" loading={loading} onClick={() => cambiarEstado('CANCELADA')}>❌ Cancelar</Button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )

  if (estadoActual === 'CONFIRMADA') return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" loading={loading} onClick={() => cambiarEstado('COMPLETADA')}>🏁 Completar</Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )

  return <span className="text-xs text-gray-400">Sin acciones</span>
}