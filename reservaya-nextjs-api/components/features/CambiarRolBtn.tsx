'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateUsuario } from '@/lib/api-client'
import type { Rol } from '@/lib/api'

export function CambiarRolBtn({ id, rolActual }: { id: string; rolActual: Rol }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function cambiar(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true)
    setError('')
    try {
      await updateUsuario(id, { rol: e.target.value as Rol })
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo cambiar el rol')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={rolActual}
        onChange={cambiar}
        disabled={loading}
        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="USUARIO">USUARIO</option>
        <option value="ADMIN">ADMIN</option>
        <option value="SUPERADMIN">SUPERADMIN</option>
        <option value="TECNICO">TECNICO</option>
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}