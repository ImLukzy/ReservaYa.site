// Progreso del checklist de `/admin/ayuda` a partir de datos que ya expone la API.
// Pura y sin imports: se prueba con `node --test` (lib/onboarding.test.mjs).

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
