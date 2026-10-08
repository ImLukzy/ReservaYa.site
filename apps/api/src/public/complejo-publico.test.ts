import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@reservaya/db';
import { createApp } from '../app';
import { DbService, Clock } from './db.service';
const now = new Date('2026-10-08T12:00:00Z');
const complejo = { id: 'internal-complex', slug: 'centro-fixture', nombre: 'Centro fixture', direccion: 'Dirección fixture', distrito: 'Cayma', ciudad: 'Arequipa', telefono: '987654321', descripcion: null, latitud: -16.4, longitud: -71.53, fotos: ['https://media.example.com/fixture.webp'], publicado: true, creadoEn: new Date('2026-01-01'), duenoId: 'private-owner', email: 'private@example.invalid', rol: 'ADMIN' };
const cancha = { id: 'fixture-cancha', nombre: 'Cancha fixture', tipo: 'FUTBOL', precioPorHora: new Prisma.Decimal('40.10'), imagen: null, techada: true, superficie: 'Sintética', capacidad: 10, activa: true, complejoId: complejo.id, creadoEn: now };
afterEach(() => vi.unstubAllEnvs());
async function fixture(options: { exists?: boolean; published?: boolean; subscription?: 'active' | 'expired' | 'absent'; created?: Date; role?: string; photo?: boolean; courts?: boolean } = {}) {
  vi.stubEnv('ORIGIN_SECRET', undefined);
  const row = { ...complejo, publicado: options.published ?? true, creadoEn: options.created ?? complejo.creadoEn, rol: options.role ?? 'ADMIN', fotos: options.photo === false ? [] : complejo.fotos };
  const db = {
    complejo: {
      findMany: vi.fn(async ({ where }: { where: { OR: { creadoEn?: { gt: Date }; usuarioByDuenoId?: { rol: { not: string } } }[] } }) => {
        const trial = where.OR[0];
        const grace = row.creadoEn > trial.creadoEn!.gt && row.rol !== trial.usuarioByDuenoId!.rol.not;
        return (options.subscription ?? 'active') === 'active' || grace ? [{ id: row.id, publicado: row.publicado }] : [];
      }),
      findFirst: vi.fn(async ({ where }: { where: { slug: string; id: { in: string[] }; publicado: boolean } }) => options.exists !== false && where.slug === row.slug && row.publicado === where.publicado && where.id.in.includes(row.id) ? row : null),
    },
    cancha: { findMany: vi.fn(async (query: unknown) => { void query; return options.courts === false ? [] : [{ ...cancha, imagen: options.photo === false ? 'https://media.example.com/court.webp' : null }]; }) },
    resena: { aggregate: vi.fn(async () => ({ _avg: { puntuacion: 4.25 }, _count: 2 })) },
  };
  const app = await createApp();
  vi.spyOn(app.get(DbService), 'db', 'get').mockReturnValue(db as never);
  vi.spyOn(app.get(Clock), 'now').mockReturnValue(now);
  await app.init(); await app.getHttpAdapter().getInstance().ready();
  return { app, db };
}
describe('GET /api/complejos/publico/:slug', () => {
  it('serves a published subscribed complex without auth and without private fields', async () => {
    const { app, db } = await fixture();
    try {
      const response = await app.inject({ url: '/api/complejos/publico/centro-fixture' });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Object.keys(body).sort()).toEqual(['canchas', 'complejo', 'valoracion']);
      expect(Object.keys(body.complejo).sort()).toEqual(['ciudad', 'descripcion', 'direccion', 'distrito', 'fotos', 'imagen', 'latitud', 'longitud', 'nombre', 'slug', 'telefono']);
      expect(Object.keys(body.canchas[0]).sort()).toEqual(['capacidad', 'id', 'imagen', 'nombre', 'precioPorHora', 'superficie', 'techada', 'tipo']);
      expect(body.canchas[0].precioPorHora).toBe('40.10');
      expect(body.complejo.fotos).toEqual(complejo.fotos);
      expect(body.complejo.latitud).toBe(-16.4); expect(body.complejo.longitud).toBe(-71.53);
      expect(body.valoracion).toEqual({ promedio: 4.3, total: 2 });
      expect(JSON.stringify(body)).not.toMatch(/private-owner|private@example|internal-complex/);
      expect(db.cancha.findMany.mock.calls[0][0]).toMatchObject({ where: { complejoId: complejo.id, activa: true } });
      expect(db.complejo.findMany.mock.calls[0][0]).toMatchObject({ where: { OR: [{}, { suscripcionByComplejoId: { some: { estado: 'ACTIVA', fechaInicio: { lte: expect.any(Date) }, fechaFin: { gte: expect.any(Date) } } } }] } });
    } finally { await app.close(); }
  });
  it.each([{ exists: false }, { published: false }, { subscription: 'expired' as const }, { subscription: 'absent' as const }])('returns 404 for hidden/unavailable profiles: %o', async options => {
    const { app, db } = await fixture(options);
    try {
      expect((await app.inject({ url: '/api/complejos/publico/centro-fixture' })).statusCode).toBe(404);
      expect(db.cancha.findMany).not.toHaveBeenCalled();
      expect(db.resena.aggregate).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('preserves catalog grace for newly created centers', async () => {
    const { app } = await fixture({ subscription: 'absent', created: new Date('2026-10-07'), role: 'ADMIN' });
    try { expect((await app.inject({ url: '/api/complejos/publico/centro-fixture' })).statusCode).toBe(200); }
    finally { await app.close(); }
  });
  it('does not extend grace to a USUARIO owner', async () => {
    const { app } = await fixture({ subscription: 'absent', created: new Date('2026-10-07'), role: 'USUARIO' });
    try { expect((await app.inject({ url: '/api/complejos/publico/centro-fixture' })).statusCode).toBe(404); }
    finally { await app.close(); }
  });
  it('falls back to a court image and permits an empty active court list', async () => {
    const first = await fixture({ photo: false });
    try { expect((await first.app.inject({ url: '/api/complejos/publico/centro-fixture' })).json().complejo.imagen).toBe('https://media.example.com/court.webp'); }
    finally { await first.app.close(); }
    const second = await fixture({ photo: false, courts: false });
    try {
      const body = (await second.app.inject({ url: '/api/complejos/publico/centro-fixture' })).json();
      expect(body.canchas).toEqual([]); expect(body.complejo.imagen).toBeNull();
    } finally { await second.app.close(); }
  });
});
