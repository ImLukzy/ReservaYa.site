export interface EstadoConvenio {
  complejoId: string; nombre: string; enPrueba: boolean; diasRestantes: number;
  pruebaHasta: string; activa: boolean; vencida: boolean; bloqueada: boolean;
  canchasPermitidas: number | null; puedeCrearCancha: boolean;
}
export function panelBloqueado(estados: EstadoConvenio[]) {
  return estados.length > 0 && estados.every(e => e.bloqueada);
}
