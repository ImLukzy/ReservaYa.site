import type { TipoCancha } from '../api-types'
export interface ComplejoPublico {
  complejo: { slug: string; nombre: string; direccion: string; distrito: string; ciudad: string; telefono: string | null; descripcion: string | null; imagen: string | null; fotos: string[]; latitud: number | null; longitud: number | null; anticipacionMinMin: number; cancelacionMinMin: number; politica: string | null }
  canchas: { id: string; nombre: string; tipo: TipoCancha; precioPorHora: string; imagen: string | null; fotos: string[]; techada: boolean; superficie: string | null; capacidad: number }[]
  valoracion: { promedio: number; total: number }
}
export const SELECCION_CANCHA_PERFIL = 'reservaya:cancha-perfil'
export function reservaCanchaHref(slug: string, id: string): string {
  return `/c/${encodeURIComponent(slug)}?${new URLSearchParams({ cancha: id })}#reservar`
}
