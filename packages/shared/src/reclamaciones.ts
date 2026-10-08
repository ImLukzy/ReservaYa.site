export type ConstanciaReclamo = {
  ok: true;
  numero: string;
  fecha: string;
  plazoRespuestaDiasHabiles: 15;
};

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
    ...(constancia ? [`Número de registro: ${constancia.numero}`, `Fecha de recepción (UTC): ${constancia.fecha}`,
      "Plazo máximo de respuesta: 15 días hábiles improrrogables."] : []),
    ...campos.map(([clave, etiqueta]) => `${etiqueta}: ${String(datos[clave] ?? (clave === "menor" ? "No" : "No indicado"))}`),
  ].join("\n");
}
