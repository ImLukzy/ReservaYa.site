import { describe, expect, it } from 'vitest';
import { correoReserva, horarioReserva, inicioReserva } from './index';

const datos = { nombre: 'Ana <b>', codigo: 'RF-AB12', estado: 'CONFIRMADA', complejo: 'Complejo & Cía', cancha: 'Cancha 1', fecha: '2026-11-01', horaInicio: 1410, horaFin: 1440, total: '80.00' };

describe('booking mail template', () => {
  it('uses Peru wall-clock time from the day and minutes', () => {
    expect(inicioReserva('2026-11-01', 600).toISOString()).toBe('2026-11-01T15:00:00.000Z');
    expect(inicioReserva(new Date('2026-11-01T00:00:00Z'), 1410).toISOString()).toBe('2026-11-02T04:30:00.000Z');
    expect(horarioReserva('2026-11-01T00:00:00Z', 1410, 1440)).toBe('domingo 01/11/2026, de 23:30 a 24:00 (hora de Perú)');
  });
  it('escapes HTML and links "Cómo llegar" only with valid coordinates', () => {
    const conMapa = correoReserva('confirmada', { ...datos, ubicacion: { latitud: -16.39, longitud: -71.54 } });
    expect(conMapa.html).toContain('Ana &lt;b&gt;');
    expect(conMapa.html).toContain('Complejo &amp; Cía');
    expect(conMapa.html).not.toContain('<b>,');
    expect(conMapa.text).toContain('Cómo llegar: https://www.google.com/maps/dir/?api=1&destination=-16.39,-71.54');
    expect(correoReserva('confirmada', { ...datos, ubicacion: { latitud: 999, longitud: 0 } }).text).not.toContain('Cómo llegar');
  });
});
