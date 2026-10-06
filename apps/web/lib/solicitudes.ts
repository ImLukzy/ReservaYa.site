// Spec 55: solicitud jugador→dueño. Funciones puras (sin imports de runtime),
// probadas con `node --test` (lib/solicitudes.test.mjs).
import type { Solicitud, SolicitudInput, TipoCancha } from './api-types'

export const TIPOS_CANCHA: readonly { valor: TipoCancha; etiqueta: string }[] = [
  { valor: 'FUTBOL5', etiqueta: 'Fútbol 5' },
  { valor: 'FUTBOL7', etiqueta: 'Fútbol 7' },
  { valor: 'FUTBOL', etiqueta: 'Fútbol 11' },
  { valor: 'LOZA', etiqueta: 'Losa multiuso' },
  { valor: 'VOLLEYBALL', etiqueta: 'Vóley' },
  { valor: 'BASQUET', etiqueta: 'Básquet' },
  { valor: 'PADEL', etiqueta: 'Pádel' },
  { valor: 'TENIS', etiqueta: 'Tenis' },
]

export interface FormSolicitud {
  nombre: string
  direccion: string
  distrito: string
  telefono: string
  canchaNombre: string
  tipo: string
  precio: string
  capacidad: string
  acepta: boolean
}

/** Primer error del formulario (en el orden en que se ve) o el cuerpo listo para la API. */
export function validarSolicitud(
  f: FormSolicitud,
  distritos: readonly string[]
): { error: string; campo: keyof FormSolicitud } | { input: SolicitudInput } {
  const precio = Number(f.precio.replace(',', '.'))
  const capacidad = Number(f.capacidad)
  if (f.nombre.trim().length < 3) return { campo: 'nombre', error: 'Escribe el nombre de tu centro (mínimo 3 letras).' }
  if (!distritos.includes(f.distrito)) return { campo: 'distrito', error: 'Elige el distrito de Arequipa donde está tu centro.' }
  if (f.direccion.trim().length < 5) return { campo: 'direccion', error: 'Escribe la dirección para que los jugadores lleguen.' }
  if (!/^\+?\d[\d\s]{6,14}$/.test(f.telefono.trim())) return { campo: 'telefono', error: 'Escribe un teléfono o WhatsApp de contacto (solo números).' }
  if (f.canchaNombre.trim().length < 2) return { campo: 'canchaNombre', error: 'Ponle un nombre a tu cancha, por ejemplo «Cancha 1».' }
  if (!TIPOS_CANCHA.some((t) => t.valor === f.tipo)) return { campo: 'tipo', error: 'Elige el tipo de cancha.' }
  if (!Number.isFinite(precio) || precio <= 0) return { campo: 'precio', error: 'Escribe el precio por hora en soles.' }
  if (!Number.isInteger(capacidad) || capacidad < 2) return { campo: 'capacidad', error: 'Escribe cuántos jugadores entran (mínimo 2).' }
  if (!f.acepta) return { campo: 'acepta', error: 'Para enviar tu centro acepta el convenio de prueba y los Términos.' }
  return {
    input: {
      complejo: { nombre: f.nombre.trim(), direccion: f.direccion.trim(), distrito: f.distrito, telefono: f.telefono.trim() },
      cancha: { nombre: f.canchaNombre.trim(), tipo: f.tipo as TipoCancha, precioPorHora: precio, capacidad },
      aceptaConvenio: true,
    },
  }
}

/** `GET /api/solicitudes/mias` → la solicitud vigente o null (nunca envió o fue rechazada). */
export function solicitudDeRespuesta(body: unknown): Solicitud | null {
  if (!body || typeof body !== 'object' || !('solicitud' in body)) return null
  const s = (body as { solicitud: unknown }).solicitud
  if (!s || typeof s !== 'object') return null
  const { estado } = s as { estado?: unknown }
  return estado === 'PENDIENTE' || estado === 'APROBADA' ? (s as Solicitud) : null
}

/** Clave de localStorage de la guía del dueño, por usuario (navegador compartido). */
export function claveGuia(usuarioId: string): string {
  return `ry-guia-dueno:${usuarioId}`
}

/** La guía se abre sola la primera vez (sin marca guardada) o cuando se pide. */
export function guiaAbierta(marca: string | null, pedida: boolean): boolean {
  return pedida || marca === null
}
