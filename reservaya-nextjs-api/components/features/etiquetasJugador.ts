// Etiquetas legibles para los enums crudos de la API en el lado jugador (spec 24).
// No toca Badge.tsx ni lib/: los consumidores hacen estadoLabel[valor] ?? valor.
export const estadoLabel: Record<string, string> = {
  CONFIRMADA: 'Confirmada',
  PENDIENTE: 'Pendiente',
  CANCELADA: 'Cancelada',
  COMPLETADA: 'Completada',
}

export const tipoCanchaLabel: Record<string, string> = {
  FUTBOL: 'Fútbol',
  FUTBOL5: 'Fútbol 5',
  FUTBOL7: 'Fútbol 7',
  PADEL: 'Pádel',
  TENIS: 'Tenis',
  BASQUET: 'Básquet',
  VOLLEYBALL: 'Vóley',
  LOZA: 'Loza',
}
