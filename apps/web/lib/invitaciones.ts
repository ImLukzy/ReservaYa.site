// Invitaciones de equipo (bandeja del invitado). Funciones puras (sin imports
// de runtime), probadas con `node --test` (lib/invitaciones.test.mjs).

export interface Invitacion {
  id: string
  complejo: { id: string; nombre: string; distrito: string }
  invitadoPor: { nombre: string } | null
  creadoEn: string
}

const texto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Respuesta de GET /api/invitaciones/mias → invitaciones válidas (descarta filas incompletas). */
export function invitacionesDeRespuesta(body: unknown): Invitacion[] {
  if (!body || typeof body !== 'object') return []
  const lista = (body as { invitaciones?: unknown }).invitaciones
  if (!Array.isArray(lista)) return []
  return lista.flatMap((fila): Invitacion[] => {
    if (!fila || typeof fila !== 'object') return []
    const { id, complejo, invitadoPor, creadoEn } = fila as Record<string, unknown>
    if (!texto(id) || !texto(creadoEn) || !complejo || typeof complejo !== 'object') return []
    const c = complejo as Record<string, unknown>
    if (!texto(c.id) || !texto(c.nombre)) return []
    const nombre = invitadoPor && typeof invitadoPor === 'object' ? (invitadoPor as Record<string, unknown>).nombre : null
    return [{
      id,
      complejo: { id: c.id, nombre: c.nombre, distrito: texto(c.distrito) ? c.distrito : '' },
      invitadoPor: texto(nombre) ? { nombre } : null,
      creadoEn,
    }]
  })
}

/** «hace 5 min», «hace 2 h», «hace 3 días», «ahora». */
export function haceCuanto(iso: string, ahora: number = Date.now()): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const min = Math.floor(Math.max(0, ahora - t) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return d === 1 ? 'hace 1 día' : `hace ${d} días`
  const m = Math.floor(d / 30)
  return m === 1 ? 'hace 1 mes' : `hace ${m} meses`
}

/** Texto del contador de la campana: '' sin pendientes, '9+' desde 10. */
export function contador(n: number): string {
  if (n <= 0) return ''
  return n > 9 ? '9+' : String(n)
}

/** Nombre accesible del botón de la bandeja. */
export function etiquetaBandeja(n: number): string {
  if (n <= 0) return 'Invitaciones: no tienes pendientes'
  return n === 1 ? 'Invitaciones: 1 pendiente' : `Invitaciones: ${n} pendientes`
}

/** Frase para aria-live solo cuando llegan invitaciones nuevas (no al bajar el número). */
export function anuncioNuevas(antes: number, ahora: number): string {
  if (ahora <= antes) return ''
  const nuevas = ahora - antes
  return nuevas === 1 ? 'Tienes una invitación de equipo nueva.' : `Tienes ${nuevas} invitaciones de equipo nuevas.`
}

/** Clave de sessionStorage del aviso que se muestra en el panel tras aceptar. */
export const CLAVE_AVISO_UNION = 'ry-aviso-union'

export function avisoUnion(complejo: string): string {
  return `Ya eres parte del equipo de ${complejo}.`
}

/** Miembro del equipo (vista del dueño): PENDIENTE si aún no acepta. */
export function estadoMiembro(m: { activo: boolean; estado?: unknown }): 'PENDIENTE' | 'ACTIVO' {
  if (m.estado === 'PENDIENTE' || m.estado === 'ACTIVO') return m.estado
  return m.activo ? 'ACTIVO' : 'PENDIENTE'
}
