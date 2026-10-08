import { textoReclamacion as textoCompartido, type ConstanciaReclamo } from '@reservaya/shared';
export type { ConstanciaReclamo } from '@reservaya/shared';

export function payloadReclamacion(datos: Record<string, FormDataEntryValue>) {
  const campos = { ...datos };
  delete campos.fecha;
  delete campos.respuesta;
  return { ...campos, tipo: String(datos.tipo).toUpperCase(), menor: datos.menor === "Sí",
    monto: datos.monto ? Number(datos.monto) : null, medioRespuesta: datos.respuesta };
}

// La constancia se emite únicamente tras confirmar el registro en la API.
export function textoReclamacion(datos: Record<string, FormDataEntryValue>, constancia?: ConstanciaReclamo): string {
  return textoCompartido(datos, constancia);
}
