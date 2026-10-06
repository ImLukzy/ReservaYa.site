import type { Metadata } from 'next'
import * as api from '@/lib/api'
import { siDisponible } from '@/lib/solicitudes-server'
import { crearCarga } from '@/lib/carga'
import { AvisoCarga } from '@/components/ui/AvisoCarga'
import { PublicarCentro } from '@/components/solicitudes/PublicarCentro'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Publica tu centro deportivo' }

export default async function PublicarCentroPage() {
  const carga = crearCarga()
  // 404 = la API aún no expone solicitudes (spec 55 F1 en curso): se avisa sin error rojo.
  const { valor: solicitud, disponible } = await carga.de(
    siDisponible(api.getMiSolicitud(), null),
    { valor: null, disponible: true },
    'tu solicitud'
  )

  return (
    <div className="mx-auto max-w-5xl">
      <AvisoCarga errores={carga.errores} />
      <div className="mb-6 border-b border-cal pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-basalto">Publica tu centro deportivo</h1>
        <p className="mt-1 text-sm text-pizarra">
          Completa tres pasos. Nuestro equipo lo revisa y, al aprobarlo, tu cuenta pasa a ser de dueño.
        </p>
      </div>
      <PublicarCentro inicial={solicitud} disponible={disponible} />
    </div>
  )
}
