// Progreso del checklist de `/admin/ayuda` a partir de datos que ya expone la API.
// Pura y sin imports: se prueba con `node --test` (lib/onboarding.test.mjs).

/** Pasos de la guía del dueño (checklist de `/admin/ayuda` y tour de `GuiaDueno`). */
export const PASOS_GUIA = [
  { titulo: 'Revisa los datos de tu centro', texto: 'Nombre, dirección y WhatsApp: así te encuentran y te escriben los jugadores.', href: '/admin/complejos', accion: 'Ir a Mis centros' },
  { titulo: 'Revisa tu cancha', texto: 'Tipo, precio por hora y cuántos juegan. La prueba gratis incluye una cancha.', href: '/admin/canchas', accion: 'Ir a Canchas' },
  { titulo: 'Configura tus horarios', texto: 'Marca qué días y a qué horas abres. Sin horario nadie puede reservar.', href: '/admin/horarios', accion: 'Ir a Horarios' },
  { titulo: 'Sube fotos de tu cancha', texto: 'Una foto clara de la cancha ayuda a que los jugadores te elijan.', href: '/admin/canchas', accion: 'Subir fotos' },
  { titulo: 'Comparte tu página', texto: 'Copia el enlace de tu centro y envíalo por WhatsApp a tus clientes.', href: '/admin/complejos', accion: 'Copiar enlace' },
] as const

export interface OnboardingDatos {
  complejos: readonly { id: string }[]
  canchas: readonly { complejoId: string | null; activa: boolean; imagen: string | null }[]
  /** Filas de `GET /api/horarios` por complejo; `null` = no se pudo cargar. */
  horarios: Readonly<Record<string, readonly { activo: boolean }[] | null>>
}

/**
 * Estado de cada paso, en el orden de `OnboardingChecklist`:
 * complejo, canchas, horarios, fotos y compartir (no medible: siempre pendiente).
 * Canchas y horarios se exigen en cada complejo; fotos, en cada cancha activa.
 */
export function pasosOnboarding({ complejos, canchas, horarios }: OnboardingDatos): boolean[] {
  const ids = new Set(complejos.map((c) => c.id))
  const activas = canchas.filter((c) => c.activa && c.complejoId !== null && ids.has(c.complejoId))
  const hayComplejo = ids.size > 0
  const todos = (ok: (id: string) => boolean) => hayComplejo && [...ids].every(ok)

  return [
    hayComplejo,
    todos((id) => activas.some((c) => c.complejoId === id)),
    todos((id) => (horarios[id] ?? []).some((h) => h.activo)),
    activas.length > 0 && activas.every((c) => Boolean(c.imagen)),
    false,
  ]
}
