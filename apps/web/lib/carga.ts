import { unstable_rethrow } from 'next/navigation'
import { crearCargaCon, type Carga } from './carga-core'

export type { Carga }

/** Colector por página: `carga.de(promesa, vacío, 'las reservas')` + `<AvisoCarga errores={carga.errores} />`. */
export function crearCarga(): Carga {
  return crearCargaCon(unstable_rethrow)
}
