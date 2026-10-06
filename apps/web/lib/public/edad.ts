export const EDAD_MINIMA = 14
export const MENSAJE_EDAD = 'Debes tener al menos 14 años para crear una cuenta.'

// Mismo día UTC y corte de cumpleaños que DateTime.UtcNow.Date.AddYears(-14).
export function fechaMaximaRegistro(hoy = new Date()): string {
  const year = hoy.getUTCFullYear() - EDAD_MINIMA
  const month = hoy.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(hoy.getUTCDate(), lastDay)).padStart(2, '0')}`
}
export function edadValida(fecha: string, hoy = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const date = new Date(`${fecha}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === fecha && fecha >= '1900-01-01' && fecha <= fechaMaximaRegistro(hoy)
}
