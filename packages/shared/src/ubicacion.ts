// Área operativa de los 29 distritos de la provincia de Arequipa (caja geográfica).
export const AREA_AREQUIPA = { sur: -16.85, norte: -15.70, oeste: -72.45, este: -70.75 } as const;
export interface Punto { latitud: number; longitud: number }
export function puntoEnArequipa(latitud: unknown, longitud: unknown): boolean {
  return typeof latitud === 'number' && Number.isFinite(latitud) && typeof longitud === 'number' && Number.isFinite(longitud)
    && latitud >= AREA_AREQUIPA.sur && latitud <= AREA_AREQUIPA.norte && longitud >= AREA_AREQUIPA.oeste && longitud <= AREA_AREQUIPA.este;
}

// Distancia geodésica en km (Haversine, R = 6371 km). Spec 68: ordenar
// canchas por cercanía; los cálculos viven aquí para reutilizarlos en API y web.
export function distanciaKm(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLng = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
