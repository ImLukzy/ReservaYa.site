import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { DbService, Clock } from './db.service';

const now = new Date('2026-10-08T12:00:00Z');
interface Fila { id: string; slug: string; actualizadoEn: Date; publicado: boolean; creadoEn: Date; rol: string; suscripcion: boolean }
const filas: Fila[] = [
  { id: 'c-visible', slug: 'centro-visible', actualizadoEn: new Date('2026-10-01T10:00:00Z'), publicado: true, creadoEn: new Date('2026-09-20T00:00:00Z'), rol: 'ADMIN', suscripcion: true },
  { id: 'c-viejo', slug: 'centro-viejo', actualizadoEn: new Date('2026-01-02T00:00:00Z'), publicado: true, creadoEn: new Date('2026-01-01T00:00:00Z'), rol: 'ADMIN', suscripcion: false },
  { id: 'c-oculto', slug: 'centro-oculto', actualizadoEn: new Date('2026-09-01T00:00:00Z'), publicado: false, creadoEn: new Date('2026-09-20T00:00:00Z'), rol: 'ADMIN', suscripcion: true },
];

afterEach(() => vi.unstubAllEnvs());

async function fixture() {
  vi.stubEnv('ORIGIN_SECRET', undefined);
  const db = {
    complejo: {
      findMany: vi.fn(async ({ where }: { where: { publicado: boolean; OR: [{ creadoEn: { gt: Date }; usuarioByDuenoId: { rol: { not: string } } }] } }) => {
        const trial = where.OR[0];
        return filas
          .filter((r) => r.publicado === where.publicado)
          .filter((r) => r.suscripcion || (r.creadoEn > trial.creadoEn.gt && r.rol !== trial.usuarioByDuenoId.rol.not))
          .map((r) => ({ slug: r.slug, actualizadoEn: r.actualizadoEn }));
      }),
    },
  };
  const app = await createApp();
  vi.spyOn(app.get(DbService), 'db', 'get').mockReturnValue(db as never);
  vi.spyOn(app.get(Clock), 'now').mockReturnValue(now);
  await app.init(); await app.getHttpAdapter().getInstance().ready();
  return { app, db };
}

describe('GET /api/complejos/publicos/slugs', () => {
  it('lista solo slug + actualizadoEn de complejos visibles, sin secreto ni sesión', async () => {
    const { app, db } = await fixture();
    try {
      const response = await app.inject({ url: '/api/complejos/publicos/slugs' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([{ slug: 'centro-visible', actualizadoEn: new Date('2026-10-01T10:00:00Z').toISOString() }]);
      expect(JSON.stringify(response.json())).not.toMatch(/viejo|oculto/);
      expect(db.complejo.findMany.mock.calls[0][0]).toMatchObject({ where: { publicado: true }, select: { slug: true, actualizadoEn: true } });
    } finally {
      await app.close();
    }
  });
});
