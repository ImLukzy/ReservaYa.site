import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@reservaya/db';
import { createApp } from '../app';
import { DbService, Clock } from './db.service';

const now = new Date('2026-10-08T12:00:00Z');
const dueno = { id: 'dueno-1', nombre: 'Dueño' };
const base = { tipo: 'FUTBOL', descripcion: null, precioPorHora: new Prisma.Decimal('50'), capacidad: 10, techada: false, superficie: 'Sintética', activa: true, imagen: null, creadoEn: now };
const canchas = [
  { ...base, id: 'lejos', nombre: 'Cancha lejos', complejoId: 'c-lejos', complejoByComplejoId: { id: 'c-lejos', slug: 'complejo-lejos', nombre: 'Complejo lejos', distrito: 'Cayma', ciudad: 'Arequipa', fotos: [], latitud: -16.33, longitud: -71.52, usuarioByDuenoId: dueno } },
  { ...base, id: 'cerca', nombre: 'Cancha cerca', complejoId: 'c-cerca', complejoByComplejoId: { id: 'c-cerca', slug: 'complejo-cerca', nombre: 'Complejo cerca', distrito: 'Yanahuara', ciudad: 'Arequipa', fotos: [], latitud: -16.39, longitud: -71.54, usuarioByDuenoId: dueno } },
  { ...base, id: 'sincorde', nombre: 'Cancha sin coordenadas', complejoId: 'c-sincorde', complejoByComplejoId: { id: 'c-sincorde', slug: 'complejo-sin-coordenadas', nombre: 'Complejo sin coordenadas', distrito: 'Cercado', ciudad: 'Arequipa', fotos: [], latitud: null, longitud: null, usuarioByDuenoId: dueno } },
];

afterEach(() => vi.unstubAllEnvs());

async function fixture() {
  vi.stubEnv('ORIGIN_SECRET', undefined);
  const db = {
    complejo: { findMany: vi.fn(async () => [{ id: 'c-lejos', publicado: true }, { id: 'c-cerca', publicado: true }, { id: 'c-sincorde', publicado: true }]) },
    cancha: { findMany: vi.fn(async () => canchas) },
    reserva: { findMany: vi.fn(async () => []) },
  };
  const app = await createApp();
  vi.spyOn(app.get(DbService), 'db', 'get').mockReturnValue(db as never);
  vi.spyOn(app.get(Clock), 'now').mockReturnValue(now);
  await app.init(); await app.getHttpAdapter().getInstance().ready();
  return { app };
}

describe('GET /api/canchas/disponibles con lat/lng (spec 68)', () => {
  it('ordena por distancia con sin-coordenadas al final y expone distanciaKm', async () => {
    const { app } = await fixture();
    try {
      const response = await app.inject({ url: '/api/canchas/disponibles?lat=-16.3989&lng=-71.5369' });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.canchas.map((c: { cancha: { id: string } }) => c.cancha.id)).toEqual(['cerca', 'lejos', 'sincorde']);
      const [c, l, s] = body.canchas;
      expect(c.distanciaKm).toBeGreaterThan(0);
      expect(c.distanciaKm).toBeLessThan(l.distanciaKm);
      expect(s.distanciaKm).toBeNull();
      expect(c.cancha.complejo).toMatchObject({ latitud: -16.39, longitud: -71.54 });
    } finally {
      await app.close();
    }
  });

  it('includes public complex slug for profile navigation (spec70)', async () => {
    const { app } = await fixture();
    try {
      const response = await app.inject({ url: '/api/canchas/disponibles' });
      expect(response.statusCode).toBe(200);
      expect(response.json().canchas.find((it: { cancha: { id: string } }) => it.cancha.id === 'cerca').cancha.complejo.slug).toBe('complejo-cerca');
    } finally { await app.close(); }
  });
  it('sin lat/lng no ordena por distancia y distanciaKm es null', async () => {
    const { app } = await fixture();
    try {
      const response = await app.inject({ url: '/api/canchas/disponibles' });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.canchas.every((c: { distanciaKm: number | null }) => c.distanciaKm === null)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('lat inválida o suelta → 400', async () => {
    const { app } = await fixture();
    try {
      for (const q of ['lat=abc&lng=-71.5', 'lat=-16.4', 'lat=-100&lng=-71.5']) {
        const response = await app.inject({ url: `/api/canchas/disponibles?${q}` });
        expect(response.statusCode).toBe(400);
      }
    } finally {
      await app.close();
    }
  });
});
