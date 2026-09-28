import * as api from '@/lib/api'
import { crearCarga } from '@/lib/carga'
import { AvisoCarga } from '@/components/ui/AvisoCarga'
import { PartidosJugadorPanel } from '@/components/features/PartidosJugadorPanel'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<{ tab?: string }>
}

export default async function MisPartidosPage({ searchParams }: PageProps) {
  const carga = crearCarga()
  const data = await carga.de(
    api.getMisPartidos(),
    { organizo: [], meAnote: [] },
    'los partidos'
  )
  const sp = searchParams ? await searchParams : undefined
  const initialTab = sp?.tab === 'anotado' || sp?.tab === 'meAnote' ? 'meAnote' : 'organizo'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-cal pb-4">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-cesped-hondo">
          Comunidad y pichangas
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-basalto">
          Mis partidos
        </h1>
        <p className="mt-1 text-sm text-pizarra">
          Gestiona los partidos que organizas y aquellos a los que te anotaste para completar el cuadro.
        </p>
      </div>

      <AvisoCarga errores={carga.errores} />

      <PartidosJugadorPanel initialData={data} defaultTab={initialTab} />
    </div>
  )
}
