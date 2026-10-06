import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payloadReclamacion, textoReclamacion } from './reclamaciones.ts';

test('payload convierte tipo, monto y menor sin aceptar la fecha del navegador', () => {
  const payload = payloadReclamacion({ tipo: 'Reclamo', menor: 'Sí', monto: '89.90',
    respuesta: 'Carta al domicilio', fecha: '1999-01-01', apoderado: 'Representante' });
  assert.equal(payload.tipo, 'RECLAMO');
  assert.equal(payload.menor, true);
  assert.equal(payload.monto, 89.9);
  assert.equal(payload.medioRespuesta, 'Carta al domicilio');
  assert.equal(payload.apoderado, 'Representante');
  assert.equal('fecha' in payload, false);
  assert.equal('respuesta' in payload, false);
  const sinMonto = payloadReclamacion({ tipo: 'Queja', monto: '' });
  assert.equal(sinMonto.tipo, 'QUEJA');
  assert.equal(sinMonto.monto, null);
  assert.equal(sinMonto.menor, false);
});
test('constancia conserva número, fecha, representante, detalle y plazo', () => {
  const datos = { nombre: 'Consumidor de prueba', documento: '00000000', menor: 'Sí',
    apoderado: 'Representante de prueba', apoderadoDocumento: '00000001',
    bienDescripcion: 'Servicio de reserva', detalle: 'Detalle de prueba completo',
    pedido: 'Respuesta de prueba', fecha: '2026-10-06T13:40:00.000Z' };
  const copia = textoReclamacion(datos, { ok: true, numero: '2026-000001', fecha: datos.fecha, plazoRespuestaDiasHabiles: 15 });
  for (const texto of ['Constancia', '2026-000001', datos.fecha, datos.nombre,
    datos.apoderado, datos.apoderadoDocumento, datos.detalle, datos.pedido, '15 días hábiles']) assert.ok(copia.includes(texto), texto);
  assert.equal(/\[(RAZÓN SOCIAL|RUC|DOMICILIO)\]/.test(copia), false);
});
test('una solicitud sin registro confirmado no inventa constancia ni número', () => {
  const copia = textoReclamacion({ nombre: 'Consumidor de prueba' });
  assert.ok(copia.startsWith('Solicitud'));
  assert.equal(copia.includes('Número de registro:'), false);
});
