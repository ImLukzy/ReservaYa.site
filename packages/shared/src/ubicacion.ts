// Área operativa de los 29 distritos de la provincia de Arequipa (caja geográfica).
export const AREA_AREQUIPA = { sur: -16.85, norte: -15.70, oeste: -72.45, este: -70.75 } as const;
export interface Punto { latitud: number; longitud: number }
export function puntoEnArequipa(latitud: unknown, longitud: unknown): boolean {
  return typeof latitud === 'number' && Number.isFinite(latitud) && typeof longitud === 'number' && Number.isFinite(longitud)
    && latitud >= AREA_AREQUIPA.sur && latitud <= AREA_AREQUIPA.norte && longitud >= AREA_AREQUIPA.oeste && longitud <= AREA_AREQUIPA.este;
}
