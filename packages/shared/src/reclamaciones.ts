export type ConstanciaReclamo = {
  ok: true;
  numero: string;
  fecha: string;
  plazoRespuestaDiasHabiles: 15;
};

function fechaPeru(value: unknown): string {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return text;
  const date = new Date(text.replace(/(\.\d{3})\d+(?=Z|[+-])/, '$1'));
  if (!Number.isFinite(date.getTime())) return text;
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)!.value;
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')} (hora de Perú)`;
}

export function textoReclamacion(datos: Record<string, unknown>, constancia?: ConstanciaReclamo): string {
  const campos = [
    ["fecha", "Fecha"], ["nombre", "Consumidor"], ["documentoTipo", "Tipo de documento"],
    ["documento", "Documento"], ["domicilio", "Domicilio"], ["telefono", "Teléfono"],
    ["email", "Correo"], ["menor", "Menor de edad"], ["apoderado", "Representante"],
    ["apoderadoDocumento", "Documento del representante"],
    ["apoderadoDomicilio", "Domicilio del representante"],
    ["apoderadoTelefono", "Teléfono del representante"], ["bienTipo", "Bien contratado"],
    ["bienDescripcion", "Descripción del bien"], ["monto", "Monto reclamado (S/)"],
    ["tipo", "Queja o reclamo"], ["detalle", "Detalle"], ["pedido", "Pedido"],
    ["respuesta", "Medio de respuesta"],
  ];
  return [
    constancia ? "Constancia — Libro de reclamaciones de ReservaYa" : "Solicitud — Libro de reclamaciones de ReservaYa",
    ...(constancia ? [`Número de registro: ${constancia.numero}`, `Fecha de recepción: ${fechaPeru(constancia.fecha)}`,
      "Plazo máximo de respuesta: 15 días hábiles improrrogables."] : []),
    ...campos.map(([clave, etiqueta]) => `${etiqueta}: ${clave === "fecha" && datos[clave] != null ? fechaPeru(datos[clave]) : String(datos[clave] ?? (clave === "menor" ? "No" : "No indicado"))}`),
  ].join("\n");
}
