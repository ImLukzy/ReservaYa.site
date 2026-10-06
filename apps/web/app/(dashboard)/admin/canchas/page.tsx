import * as api from '@/lib/api'
import { getComplejos } from '@/lib/b2b-api'
import { getSession } from '@/lib/session'
import { canAccess, fallbackPorRol } from '@/lib/permissions'
import { GestionCanchasPanel } from '@/components/features/GestionCanchasPanel'
import { redirect } from 'next/navigation'
import { crearCarga } from '@/lib/carga'
import { AvisoCarga } from '@/components/ui/AvisoCarga'

export const dynamic = 'force-dynamic'

export default async function AdminCanchasPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canAccess('canchas', session.rol)) redirect(fallbackPorRol(session.rol))
  const carga = crearCarga()
  const [canchas, complejos] = await Promise.all([
    api.getCanchas(undefined, true),
    carga.de(getComplejos(), [], 'los complejos'),
  ])
  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <GestionCanchasPanel
        canchas={canchas}
        complejos={complejos.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </>
  )
}
