import 'server-only'
import { ApiError } from './api-types'
import { getMiSolicitud } from './api'
import type { Solicitud } from './api-types'

/** Solicitud del jugador; 404 (API sin el endpoint todavía) cuenta como «sin solicitud». */
export async function miSolicitudSegura(): Promise<Solicitud | null> {
  return (await siDisponible(getMiSolicitud(), null)).valor
}

/** Distingue «la API aún no tiene el endpoint» (404) del resto de errores, que siguen a `carga`. */
export async function siDisponible<T, V>(promesa: Promise<T>, vacio: V): Promise<{ valor: T | V; disponible: boolean }> {
  try {
    return { valor: await promesa, disponible: true }
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { valor: vacio, disponible: false }
    throw e
  }
}
