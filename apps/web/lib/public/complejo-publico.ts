import type { TipoCancha } from '../api-types'
export interface ComplejoPublico {
  complejo: { slug: string; nombre: string; direccion: string; distrito: string; ciudad: string; telefono: string | null; descripcion: string | null; imagen: string | null; fotos: string[]; latitud: number | null; longitud: number | null; anticipacionMinMin: number; cancelacionMinMin: number; politica: string | null }
  canchas: { id: string; nombre: string; tipo: TipoCancha; precioPorHora: string; imagen: string | null; techada: boolean; superficie: string | null; capacidad: number }[]
  valoracion: { promedio: number; total: number }
}
export function reservaPublicaHref(nombre: string, distrito: string, tipo: string): string {
  return `/dashboard/canchas?${new URLSearchParams({ q: nombre, distrito, tipo })}`
}
