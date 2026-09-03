'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { updateUsuario } from '@/lib/api-client'

export function ToggleUsuarioBtn({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setLoading(true)
    setError('')
    try {
      await updateUsuario(id, { activo: !activo })
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar el usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant={activo ? 'danger' : 'secondary'} loading={loading} onClick={toggle}>
        {activo ? 'Desactivar' : 'Activar'}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}