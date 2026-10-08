export type EstadoFranja = 'LIBRE' | 'OCUPADA' | 'PASADA' | 'ANTICIPACION'
export interface Franja { inicio: number; fin: number; estado: EstadoFranja; precio: string }
export interface Agenda { canchaId: string; fecha: string; anticipacionMinMin: number; cancelacionMinMin?: number; politica?: string | null; franjas: Franja[] }
export function horaMinutos(m: number): string { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
export function fechasReserva(ahora: Date = new Date()): string[] {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
  return Array.from({ length: 14 }, (_, n) => new Date(Date.parse(`${hoy}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10))
}
export function cambiarSeleccion(franjas: Franja[], elegidas: number[], inicio: number): { seleccion: number[]; error: string } {
  const franja = franjas.find(f => f.inicio === inicio)
  if (!franja || franja.estado !== 'LIBRE') return { seleccion: elegidas, error: 'Esta franja no está disponible.' }
  const orden = [...elegidas].sort((a, b) => a - b)
  if (!orden.length) return { seleccion: [inicio], error: '' }
  if (orden.includes(inicio)) {
    if (inicio !== orden[0] && inicio !== orden[orden.length - 1]) return { seleccion: orden, error: 'Quita las franjas desde un extremo para mantenerlas seguidas.' }
    return { seleccion: orden.filter(n => n !== inicio), error: '' }
  }
  if (inicio !== orden[0] - 30 && inicio !== orden[orden.length - 1] + 30) return { seleccion: orden, error: 'Elige franjas seguidas, sin huecos.' }
  if (orden.length >= 6) return { seleccion: orden, error: 'Puedes reservar hasta 3 horas.' }
  return { seleccion: [...orden, inicio].sort((a, b) => a - b), error: '' }
}
export function resumenSeleccion(franjas: Franja[], seleccion: number[]): { inicio: number; fin: number; total: string } | null {
  const orden = [...new Set(seleccion)].sort((a, b) => a - b)
  if (orden.length < 2 || orden.length > 6 || orden.some((n, i) => i > 0 && n !== orden[i - 1] + 30)) return null
  const elegidas = orden.map(n => franjas.find(f => f.inicio === n && f.fin === n + 30 && f.estado === 'LIBRE'))
  if (elegidas.some(f => !f)) return null
  const centimos = elegidas.reduce((sum, f) => sum + Math.round(Number(f!.precio) * 100), 0)
  return { inicio: orden[0], fin: orden[orden.length - 1] + 30, total: (centimos / 100).toFixed(2) }
}
export function vueltaReserva(slug: string, cancha: string, fecha: string, inicio: number, fin: number): string {
  return `/c/${encodeURIComponent(slug)}?${new URLSearchParams({ cancha, fecha, inicio: String(inicio), fin: String(fin) })}#reservar`
}
