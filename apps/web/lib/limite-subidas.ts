// Límite de firmas de subida por usuario (ventana deslizante, en memoria).
// Es por instancia: cada función/servidor de Next lleva su propio conteo y se
// reinicia al arrancar, así que frena bucles abusivos, no es un tope global.
export function crearLimite(max = 20, ventanaMs = 10 * 60 * 1000) {
  const marcas = new Map<string, number[]>()
  return {
    /** Registra un intento; devuelve false si el usuario ya agotó la ventana. */
    permitir(usuario: string, ahora = Date.now()): boolean {
      const vigentes = (marcas.get(usuario) ?? []).filter((t) => ahora - t < ventanaMs)
      if (vigentes.length >= max) {
        marcas.set(usuario, vigentes)
        return false
      }
      vigentes.push(ahora)
      marcas.set(usuario, vigentes)
      // Purga ocasional de usuarios sin intentos vigentes para no crecer sin fin.
      if (marcas.size > 1000) {
        for (const [id, ts] of marcas) if (!ts.some((t) => ahora - t < ventanaMs)) marcas.delete(id)
      }
      return true
    },
  }
}
