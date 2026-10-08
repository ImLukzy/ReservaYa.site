import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Minutos desde medianoche -> "HH:MM" (480 -> "08:00")
export function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Las fechas de reserva representan un día de calendario, no un instante horario.
export function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.slice(0, 10).split('-')
  if (!year || !month || !day) return fecha
  return `${day}/${month}/${year}`
}

// Código a mostrar: el QR real si llegó del backend, si no el derivado del id.
export function codigoMostrado(reserva: { codigo?: string | null; id: string }): string {
  return reserva.codigo?.trim() || reserva.id.slice(-6).toUpperCase()
}

export function fechaFinReservaEnMs(fecha: string, minutos: number): number {
  const [year, month, day] = fecha.slice(0, 10).split('-').map(Number)
  const hora = Math.floor(minutos / 60)
  const minuto = minutos % 60
  return Date.UTC(year, month - 1, day, hora, minuto) + 5 * 60 * 60 * 1000
}