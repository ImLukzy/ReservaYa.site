// Núcleo puro de lib/carga.ts (sin imports, probado con `node --test`).
// Si una lectura falla, la página sigue con el valor vacío pero el error queda
// visible (<AvisoCarga />), nunca en silencio.

/** Texto corto y sin detalles internos para un error de lectura. */
export function mensajeCarga(e: unknown): string {
  if (e && typeof e === 'object' && 'status' in e && typeof e.status === 'number') {
    const msg = e instanceof Error ? e.message : ''
    return msg && !/^Error \d+$/.test(msg) ? msg : `la API respondió ${e.status}`
  }
  if (e instanceof TypeError) return 'sin conexión con la API'
  return 'error inesperado'
}

export interface Carga {
  readonly errores: string[]
  de<T, V>(promesa: Promise<T>, vacio: V, que: string): Promise<T | V>
}

/** `rethrow` relanza los errores de control del framework (redirect, notFound…). */
export function crearCargaCon(rethrow: (e: unknown) => void): Carga {
  const errores: string[] = []
  return {
    errores,
    async de(promesa, vacio, que) {
      try {
        return await promesa
      } catch (e) {
        rethrow(e)
        console.error(`[carga] ${que}:`, e)
        errores.push(`No se pudieron cargar ${que}: ${mensajeCarga(e)}.`)
        return vacio
      }
    },
  }
}
