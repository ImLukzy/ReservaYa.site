// Correos de reserva (spec 66). Reserva.fecha es el día (medianoche UTC) y horaInicio/horaFin son minutos
// de reloj en Arequipa; Perú está en UTC-5 todo el año (sin horario de verano).
export type TipoCorreoReserva = 'creada' | 'confirmada' | 'cancelada' | 'recordatorio' | 'nueva';
export type DatosCorreoReserva = {
  nombre: string;
  codigo: string;
  estado: string;
  complejo: string;
  cancha: string;
  fecha: string | Date;
  horaInicio: number;
  horaFin: number;
  total: string;
  jugador?: string;
  ubicacion?: { latitud: number; longitud: number } | null;
};
export type CorreoReserva = { subject: string; text: string; html: string };

const SITIO = 'https://reservaya.site';
const OFFSET_PERU_MIN = 5 * 60;
const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const estados: Record<string, string> = {
  PENDIENTE: 'Pendiente de confirmación', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', COMPLETADA: 'Completada',
};

const dia = (fecha: string | Date) => {
  const d = fecha instanceof Date ? fecha : new Date(String(fecha).slice(0, 10) + 'T00:00:00Z');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const hora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const escapar = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Instante UTC en que empieza la reserva. */
export function inicioReserva(fecha: string | Date, horaInicio: number): Date {
  return new Date(dia(fecha).getTime() + (horaInicio + OFFSET_PERU_MIN) * 60000);
}

/** "jueves 08/10/2026, de 18:00 a 19:00 (hora de Perú)" */
export function horarioReserva(fecha: string | Date, horaInicio: number, horaFin: number): string {
  const d = dia(fecha);
  const ddmmyyyy = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  return `${dias[d.getUTCDay()]} ${ddmmyyyy}, de ${hora(horaInicio)} a ${hora(horaFin)} (hora de Perú)`;
}

const comoLlegar = (u: DatosCorreoReserva['ubicacion']) =>
  u && Number.isFinite(u.latitud) && Number.isFinite(u.longitud) && Math.abs(u.latitud) <= 90 && Math.abs(u.longitud) <= 180
    ? `https://www.google.com/maps/dir/?api=1&destination=${u.latitud},${u.longitud}` : null;

export function correoReserva(tipo: TipoCorreoReserva, d: DatosCorreoReserva): CorreoReserva {
  const dueno = tipo === 'nueva';
  const panel = `${SITIO}${dueno ? '/admin/reservas' : '/dashboard/reservas'}`;
  const mapa = comoLlegar(d.ubicacion);
  const { subject, intro } = {
    creada: { subject: `Reserva recibida — ${d.codigo}`, intro: 'Recibimos tu reserva. El complejo debe confirmarla; te avisaremos por correo.' },
    confirmada: { subject: `Reserva confirmada — ${d.codigo}`, intro: '¡Tu reserva está confirmada! Muestra el código al llegar.' },
    cancelada: { subject: `Reserva cancelada — ${d.codigo}`, intro: 'Tu reserva fue cancelada. Si no lo esperabas, contacta al complejo.' },
    recordatorio: { subject: `Recordatorio: juegas a las ${hora(d.horaInicio)} — ${d.codigo}`, intro: 'Tu partido empieza pronto. Muestra el código al llegar.' },
    nueva: { subject: `Nueva reserva — ${d.codigo}`, intro: `${d.jugador || 'Un jugador'} hizo una reserva en tu complejo. Revísala y confírmala desde el panel.` },
  }[tipo];
  const filas: [string, string][] = [
    ['Complejo', d.complejo], ['Cancha', d.cancha], ['Fecha y hora', horarioReserva(d.fecha, d.horaInicio, d.horaFin)],
    ['Total', `S/ ${d.total}`], ['Código', d.codigo], ['Estado', estados[d.estado] ?? d.estado],
    ...(dueno && d.jugador ? [['Jugador', d.jugador] as [string, string]] : []),
  ];
  const text = [
    `Hola ${d.nombre},`, '', intro, '',
    ...filas.map(([k, v]) => `${k}: ${v}`), '',
    `${dueno ? 'Gestiona la reserva' : 'Ver mis reservas'}: ${panel}`,
    ...(mapa ? [`Cómo llegar: ${mapa}`] : []),
    '', 'ReservaYa',
  ].join('\n');
  const boton = (href: string, label: string, primario: boolean) =>
    `<a href="${escapar(href)}" style="display:inline-block;margin:0 8px 8px 0;background:${primario ? '#22C55E' : '#E8F2EC'};color:#060C08;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none">${label}</a>`;
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101613">' +
    `<p>Hola ${escapar(d.nombre)},</p><p>${escapar(intro)}</p>` +
    '<table style="border-collapse:collapse;margin:16px 0;font-size:14px">' +
    filas.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5B6660">${k}</td><td style="padding:4px 0;font-weight:bold">${escapar(v)}</td></tr>`).join('') +
    '</table><p>' + boton(panel, dueno ? 'Gestionar reserva' : 'Ver mis reservas', true) + (mapa ? boton(mapa, 'Cómo llegar', false) : '') + '</p>' +
    '<p style="font-size:13px;color:#5B6660">ReservaYa · Reservas de canchas en Arequipa</p></div>';
  return { subject, text, html };
}
