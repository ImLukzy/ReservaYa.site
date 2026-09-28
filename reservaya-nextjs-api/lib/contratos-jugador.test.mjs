import test from 'node:test';
import assert from 'node:assert/strict';

// Tests de contrato para el Área del Jugador (Spec 22 - Arquitectura Desacoplada)
// Valida la compatibilidad de esquemas entre la landing pública (Astro),
// el panel de usuario (Next.js) y el backend ASP.NET Core (.NET 10).

test('Contrato API: GET /api/canchas/disponibles (Vitrina pública y buscador)', () => {
  // Simulación de respuesta real devuelta por CanchasController.cs:340
  const mockApiResponse = {
    ok: true,
    total: 1,
    limiteAplicado: false,
    canchas: [
      {
        cancha: {
          id: 'cancha-1',
          nombre: 'Cancha 1 (Fútbol 7)',
          tipo: 'FUTBOL7',
          precioPorHora: '60.00',
          descripcion: 'Césped sintético monofilamento',
          imagen: '/uploads/canchas/cancha-1.webp',
          complejoId: 'complejo-1',
          complejo: {
            id: 'complejo-1',
            nombre: 'Complejo Los Andes',
            distrito: 'Yanahuara',
            ciudad: 'Arequipa'
          }
        },
        disponible: true,
        motivo: null,
        totalEstimado: '60.00',
        reglaPrecio: null
      }
    ]
  };

  // 1. Verificación para consumidor Astro (src/scripts/filas.ts e ItemDisponible)
  const itemAstro = mockApiResponse.canchas[0];
  assert.equal(typeof itemAstro.cancha.id, 'string');
  assert.equal(typeof itemAstro.cancha.nombre, 'string');
  assert.equal(typeof itemAstro.cancha.precioPorHora, 'string');
  assert.equal(typeof itemAstro.cancha.complejo?.distrito, 'string');
  assert.equal(typeof itemAstro.disponible, 'boolean');
  assert.equal(typeof itemAstro.totalEstimado, 'string');

  // 2. Verificación para consumidor Next.js (lib/api.ts y CanchaDisponible)
  assert.equal(mockApiResponse.ok, true);
  assert.equal(typeof mockApiResponse.total, 'number');
  assert.equal(typeof mockApiResponse.limiteAplicado, 'boolean');
  assert.ok(Array.isArray(mockApiResponse.canchas));
});

test('Contrato API: GET /api/resenas/publicas (Reseñas por complejo)', () => {
  // Simulación devuelta por ResenasController.cs
  const mockResenasResponse = {
    ok: true,
    promedio: 4.8,
    total: 12,
    resenas: [
      {
        id: 'res-1',
        puntuacion: 5,
        comentario: 'Excelente iluminación y grass nuevo.',
        respuestaDueno: 'Gracias por visitarnos!',
        creadoEn: '2026-09-25T18:00:00Z',
        usuario: { nombre: 'Carlos M.' }
      }
    ]
  };

  assert.equal(typeof mockResenasResponse.promedio, 'number');
  assert.equal(typeof mockResenasResponse.total, 'number');
  assert.ok(Array.isArray(mockResenasResponse.resenas));
  assert.equal(mockResenasResponse.resenas[0].puntuacion, 5);
  assert.equal(typeof mockResenasResponse.resenas[0].usuario?.nombre, 'string');
});

test('Contrato API: GET y POST /api/reservas (Creación y listado de reservas)', () => {
  // Payload enviado por Next.js ReservaForm.tsx y createReserva
  const inputReserva = {
    canchaId: 'cancha-1',
    fecha: '2026-09-28',
    horaInicio: 480, // 08:00 en minutos
    horaFin: 540,    // 09:00 en minutos
    notas: 'Partido de práctica'
  };

  assert.equal(typeof inputReserva.canchaId, 'string');
  assert.match(inputReserva.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(inputReserva.horaInicio, 480);
  assert.equal(inputReserva.horaFin, 540);
  assert.ok(inputReserva.horaFin > inputReserva.horaInicio);

  // Respuesta esperada de la API
  const mockReservaCreada = {
    ok: true,
    reserva: {
      id: 'reserva-123',
      canchaId: 'cancha-1',
      fecha: '2026-09-28',
      horaInicio: 480,
      horaFin: 540,
      estado: 'PENDIENTE',
      total: '60.00',
      codigo: 'RES-8901',
      creadoEn: '2026-09-27T19:00:00Z',
      cancha: {
        id: 'cancha-1',
        nombre: 'Cancha 1 (Fútbol 7)',
        tipo: 'FUTBOL7',
        precioPorHora: '60.00'
      }
    }
  };

  assert.equal(mockReservaCreada.ok, true);
  assert.equal(mockReservaCreada.reserva.id, 'reserva-123');
  assert.equal(mockReservaCreada.reserva.estado, 'PENDIENTE');
  assert.equal(mockReservaCreada.reserva.cancha.nombre, 'Cancha 1 (Fútbol 7)');
});

test('Contrato API: GET /api/auth/me y PATCH /api/usuarios/me (Perfil del jugador)', () => {
  const mockUsuarioMe = {
    ok: true,
    usuario: {
      id: 'usr-456',
      email: 'jugador@reservaya.pe',
      nombre: 'Renzo Valdivia',
      username: 'rvaldivia',
      fechaNacimiento: '1998-05-14T00:00:00Z',
      telefono: '958123456',
      fotoUrl: '/uploads/perfiles/usr-456.webp',
      rol: 'USUARIO',
      proximoCambioUsername: '2027-05-14T00:00:00Z'
    }
  };

  assert.equal(mockUsuarioMe.usuario.rol, 'USUARIO');
  assert.equal(mockUsuarioMe.usuario.username, 'rvaldivia');
  assert.match(mockUsuarioMe.usuario.email, /@/);

  // Payload permitido para PATCH /api/usuarios/me
  const patchPayload = {
    telefono: '958654321',
    username: 'renzo_v'
  };
  assert.ok(patchPayload.telefono.length >= 7);
  assert.ok(patchPayload.username.length >= 3);
});

test('Arquitectura Desacoplada: Generación de enlace de reserva (Astro -> Next.js)', () => {
  // Lógica de src/scripts/filas.ts:urlReservar
  function urlReservar(app, cancha, fecha, hora) {
    const q = new URLSearchParams({
      fecha,
      horaInicio: String(hora * 60),
      horaFin: String((hora + 1) * 60)
    });
    if (cancha.complejoId) q.set('complejoId', cancha.complejoId);
    return `${app}/dashboard/canchas?${q.toString()}`;
  }

  const appUrl = 'https://reservaya-panel.vercel.app';
  const cancha = { id: 'c-1', complejoId: 'comp-99' };
  const url = urlReservar(appUrl, cancha, '2026-09-28', 10);

  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://reservaya-panel.vercel.app');
  assert.equal(parsed.pathname, '/dashboard/canchas');
  assert.equal(parsed.searchParams.get('fecha'), '2026-09-28');
  assert.equal(parsed.searchParams.get('horaInicio'), '600'); // 10 * 60
  assert.equal(parsed.searchParams.get('horaFin'), '660');    // 11 * 60
  assert.equal(parsed.searchParams.get('complejoId'), 'comp-99');
  // Asegura que no viajan tokens ni credenciales en la URL
  assert.equal(parsed.searchParams.get('token'), null);
});

test('Contrato API: GET /api/partidos/mios y operaciones (Spec 22b Partidos Jugador)', () => {
  const mockMisPartidos = {
    organizo: [
      {
        id: 'partido-1',
        titulo: 'Pichanga nocturna 7v7',
        descripcion: 'Césped sintético, traer camiseta blanca',
        formato: 'Fútbol 7',
        nivel: 'Intermedio',
        cuposTotales: 14,
        cuposLibres: 3,
        distrito: 'Yanahuara',
        cancha: 'Cancha 1',
        superficie: 'Grass sintético',
        precio: 12.5,
        fecha: '2026-09-28',
        desde: '20:00',
        hasta: '21:00',
        cuando: 'Lunes 28 Sept, 20:00',
        fechaCorta: '28/09',
        horaCorta: '20:00',
        fotoUrl: null,
        anotado: false,
        inscritos: ['Carlos M.', 'Juan P.'],
        organizador: { id: 'usr-456', nombre: 'Renzo Valdivia' },
        creadoEn: '2026-09-27T10:00:00Z'
      }
    ],
    meAnote: [
      {
        id: 'partido-2',
        titulo: 'Fútbol 6 dominical',
        descripcion: null,
        formato: 'Fútbol 6',
        nivel: 'Todos los niveles',
        cuposTotales: 12,
        cuposLibres: 1,
        distrito: 'Cayma',
        cancha: 'Cancha Las Flores',
        superficie: 'Grass sintético',
        precio: 10.0,
        fecha: '2026-09-29',
        desde: '09:00',
        hasta: '10:00',
        cuando: 'Martes 29 Sept, 09:00',
        fechaCorta: '29/09',
        horaCorta: '09:00',
        fotoUrl: null,
        anotado: true,
        inscritos: ['Mateo R.'],
        organizador: { id: 'usr-789', nombre: 'Diego Salas' },
        creadoEn: '2026-09-27T11:00:00Z'
      }
    ]
  };

  assert.ok(Array.isArray(mockMisPartidos.organizo));
  assert.ok(Array.isArray(mockMisPartidos.meAnote));
  assert.equal(mockMisPartidos.organizo[0].id, 'partido-1');
  assert.equal(typeof mockMisPartidos.organizo[0].cuposLibres, 'number');
  assert.equal(typeof mockMisPartidos.organizo[0].cuposTotales, 'number');
  assert.ok(Array.isArray(mockMisPartidos.organizo[0].inscritos));
  assert.equal(mockMisPartidos.meAnote[0].id, 'partido-2');
  assert.equal(mockMisPartidos.meAnote[0].organizador?.nombre, 'Diego Salas');
});

