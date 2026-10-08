import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { createApp } from '../app';
import { Clock, DbService } from '../public/db.service';
import type { Access } from '../management/access';
import { RateLimiter } from '../auth/rate';
import { Resenas } from './resenas';
import { autorCorto } from './publico';
const request = {} as FastifyRequest;
const ana = { id: 'u-ana', nombre: 'ana maría quispe', email: 'ana@example.invalid' };
type Row = { id: string; complejoId: string; usuarioId: string; puntuacion: number; comentario: string | null; respuestaDueno: string | null; creadoEn: Date };
const row = (over: Partial<Row> = {}): Row => ({ id: 'r1', complejoId: 'c1', usuarioId: ana.id, puntuacion: 4, comentario: 'Buena cancha', respuestaDueno: null, creadoEn: new Date('2026-10-01T15:00:00Z'), ...over });
function service(opts: { actor?: { id: string; rol: string }; jugo?: boolean; existing?: Row | null; owner?: boolean } = {}) {
  const withAuthor = (r: Row) => ({ ...r, usuarioByUsuarioId: ana });
  const db = {
    complejo: { findUnique: vi.fn(async () => ({ id: 'c1' })), findFirst: vi.fn(async () => ({ id: 'c1' })) },
    reserva: { findFirst: vi.fn(async () => (opts.jugo ?? true) ? { id: 'res' } : null) },
    resena: {
      findUnique: vi.fn(async ({ include }: { include?: unknown }) => opts.existing ? (include ? withAuthor(opts.existing) : opts.existing) : null),
      create: vi.fn(async ({ data, include }: { data: Row; include?: unknown }) => include ? withAuthor(data) : data),
      update: vi.fn(async ({ data }: { data: Partial<Row> }) => withAuthor({ ...(opts.existing ?? row()), ...data })),
      delete: vi.fn(async () => ({})),
    },
  };
  const access = { actor: vi.fn(async (_r: unknown, roles?: string[]) => {
    const a = opts.actor ?? { id: ana.id, rol: 'USUARIO' };
    if (roles && !roles.includes(a.rol)) throw Object.assign(new Error('Sin permisos'), { status: 403 });
    return a;
  }), owner: vi.fn(async () => opts.owner ?? false) } as unknown as Access;
  return { db, s: new Resenas({ db } as unknown as DbService, access, new RateLimiter()) };
}
describe('Reseñas: calificar, editar y borrar', () => {
  it('rechaza calificar sin una reserva COMPLETADA en el complejo (403)', async () => {
    const { s, db } = service({ jugo: false });
    await expect(s.create({ complejoId: 'c1', puntuacion: 5 }, request)).rejects.toMatchObject({ status: 403 });
    expect(db.resena.create).not.toHaveBeenCalled();
  });
  it('crear devuelve el autor (nombre corto y datos propios)', async () => {
    const { s, db } = service();
    const { resena } = await s.create({ complejoId: 'c1', puntuacion: 5, comentario: '  Excelente  ' }, request);
    expect(db.resena.create.mock.calls[0][0]).toMatchObject({ include: { usuarioByUsuarioId: expect.anything() }, data: { comentario: 'Excelente', puntuacion: 5 } });
    expect(resena.autor).toBe('Ana Q.');
    expect(resena.usuario).toEqual(ana);
  });
  it('volver a enviar edita la reseña existente', async () => {
    const { s, db } = service({ existing: row() });
    const { resena } = await s.create({ complejoId: 'c1', puntuacion: 2, comentario: '' }, request);
    expect(db.resena.create).not.toHaveBeenCalled();
    expect(db.resena.update.mock.calls[0][0]).toMatchObject({ where: { id: 'r1' }, data: { puntuacion: 2, comentario: null } });
    expect(resena).toMatchObject({ puntuacion: 2, comentario: null, autor: 'Ana Q.' });
  });
  it('valida puntuación entera, comentario ≤ 500 y limita 10 envíos por hora', async () => {
    const { s } = service();
    await expect(s.create({ complejoId: 'c1', puntuacion: 4.5 }, request)).rejects.toMatchObject({ status: 400 });
    await expect(s.create({ complejoId: 'c1', puntuacion: 4, comentario: 'x'.repeat(501) }, request)).rejects.toMatchObject({ status: 400 });
    for (let i = 0; i < 10; i++) await s.create({ complejoId: 'c1', puntuacion: 4 }, request);
    await expect(s.create({ complejoId: 'c1', puntuacion: 4 }, request)).rejects.toMatchObject({ status: 429 });
  });
  it('el autor borra su reseña (200); otro jugador recibe 403', async () => {
    const own = service({ existing: row() });
    expect(await own.s.remove('r1', request)).toEqual({ ok: true });
    expect(own.db.resena.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    const other = service({ existing: row(), actor: { id: 'u-otro', rol: 'USUARIO' } });
    await expect(other.s.remove('r1', request)).rejects.toMatchObject({ status: 403 });
    expect(other.db.resena.delete).not.toHaveBeenCalled();
  });
  it('ADMIN/SUPERADMIN borra solo reseñas de su propio complejo', async () => {
    const dueno = service({ existing: row(), actor: { id: 'u-dueno', rol: 'SUPERADMIN' }, owner: true });
    expect(await dueno.s.remove('r1', request)).toEqual({ ok: true });
    const ajeno = service({ existing: row(), actor: { id: 'u-ajeno', rol: 'SUPERADMIN' }, owner: false });
    await expect(ajeno.s.remove('r1', request)).rejects.toMatchObject({ status: 403 });
    await expect(service({ existing: null }).s.remove('nada', request)).rejects.toMatchObject({ status: 404 });
  });
});
describe('Reseñas: respuesta del dueño', () => {
  it('solo el dueño responde y edita la respuesta (≤ 500)', async () => {
    const dueno = service({ existing: row(), actor: { id: 'u-dueno', rol: 'SUPERADMIN' }, owner: true });
    const { resena } = await dueno.s.reply('r1', { respuesta: ' Gracias ' }, request);
    expect(resena.respuestaDueno).toBe('Gracias');
    await expect(dueno.s.reply('r1', { respuesta: 'x'.repeat(501) }, request)).rejects.toMatchObject({ status: 400 });
    await expect(dueno.s.reply('r1', { respuesta: '  ' }, request)).rejects.toMatchObject({ status: 400 });
    const ajeno = service({ existing: row(), actor: { id: 'u-ajeno', rol: 'SUPERADMIN' }, owner: false });
    await expect(ajeno.s.reply('r1', { respuesta: 'Hola' }, request)).rejects.toMatchObject({ status: 403 });
    const jugador = service({ existing: row() });
    await expect(jugador.s.reply('r1', { respuesta: 'Hola' }, request)).rejects.toMatchObject({ status: 403 });
  });
});
describe('GET /api/resenas/mia', () => {
  it('informa si puede calificar y devuelve la reseña propia', async () => {
    const nuevo = await service({ jugo: false }).s.mine({ slug: 'centro' }, request);
    expect(nuevo).toEqual({ ok: true, complejoId: 'c1', puedeCalificar: false, motivo: 'SIN_RESERVA_COMPLETADA', resena: null });
    const jugo = await service({ existing: row() }).s.mine({ complejoId: 'c1' }, request);
    expect(jugo).toMatchObject({ puedeCalificar: true, motivo: null, resena: { id: 'r1', autor: 'Ana Q.' } });
    await expect(service().s.mine({}, request)).rejects.toMatchObject({ status: 400 });
  });
});
describe('autorCorto', () => {
  it('muestra "Nombre I." y nunca el email', () => {
    expect(autorCorto('ana maría quispe')).toBe('Ana Q.');
    expect(autorCorto('Luis')).toBe('Luis');
    expect(autorCorto('pepe.lopez@correo.com')).toBe('Pepe.lopez');
    expect(autorCorto('   ')).toBe('Jugador');
    expect(autorCorto(null)).toBe('Jugador');
  });
});
// Lectura pública vía HTTP con una base en memoria que respeta orderBy/cursor/take como Prisma.
const now = new Date('2026-10-08T12:00:00Z');
afterEach(() => vi.unstubAllEnvs());
async function publicApp(rows: (Row & { nombre: string; email: string })[]) {
  vi.stubEnv('ORIGIN_SECRET', undefined);
  type Order = Record<string, 'asc' | 'desc'>;
  const cmp = (orden: Order[]) => (a: Row, b: Row) => {
    for (const o of orden) { const [k, d] = Object.entries(o)[0]; const x = a[k as keyof Row]!, y = b[k as keyof Row]!; if (x < y) return d === 'asc' ? -1 : 1; if (x > y) return d === 'asc' ? 1 : -1; }
    return 0;
  };
  const db = {
    complejo: {
      findMany: vi.fn(async () => [{ id: 'c1', publicado: true }]),
      findFirst: vi.fn(async ({ where }: { where: { slug: string } }) => where.slug === 'centro' ? { id: 'c1' } : null),
    },
    resena: {
      groupBy: vi.fn(async () => Object.values(rows.reduce<Record<number, { puntuacion: number; _count: { _all: number } }>>((acc, r) => {
        (acc[r.puntuacion] ??= { puntuacion: r.puntuacion, _count: { _all: 0 } })._count._all++; return acc;
      }, {}))),
      findMany: vi.fn(async ({ orderBy, take, cursor, skip }: { orderBy: Order[]; take: number; cursor?: { id: string }; skip?: number }) => {
        const sorted = [...rows].sort(cmp(orderBy)), start = cursor ? sorted.findIndex(r => r.id === cursor.id) + (skip ?? 0) : 0;
        return sorted.slice(start, start + take).map(r => ({ ...r, usuarioByUsuarioId: { nombre: r.nombre } }));
      }),
    },
  };
  const app = await createApp();
  vi.spyOn(app.get(DbService), 'db', 'get').mockReturnValue(db as never);
  vi.spyOn(app.get(Clock), 'now').mockReturnValue(now);
  await app.init(); await app.getHttpAdapter().getInstance().ready();
  return app;
}
const fixtures = [5, 4, 4, 1, 3].map((p, i) => ({ ...row({ id: `r${i}`, puntuacion: p, creadoEn: new Date(Date.UTC(2026, 9, 1 + i)), respuestaDueno: i === 0 ? 'Gracias' : null, usuarioId: `u${i}` }), nombre: `Jugador${i} Apellido${i}`, email: `j${i}@example.invalid` }));
describe('GET /api/resenas/publicas', () => {
  it('pagina por cursor con resumen, distribución y autor "Nombre I." sin email', async () => {
    const app = await publicApp(fixtures);
    try {
      const first = await app.inject({ url: '/api/resenas/publicas?slug=centro&limite=2' });
      expect(first.statusCode).toBe(200);
      const a = first.json();
      expect(a).toMatchObject({ promedio: 3.4, total: 5, distribucion: { 1: 1, 2: 0, 3: 1, 4: 2, 5: 1 }, orden: 'recientes' });
      expect(a.resenas.map((r: { id: string }) => r.id)).toEqual(['r4', 'r3']);
      expect(a.resenas[0]).toEqual({ id: 'r4', puntuacion: 3, comentario: 'Buena cancha', respuestaDueno: null, creadoEn: '2026-10-05T00:00:00Z', autor: 'Jugador4 A.' });
      expect(JSON.stringify(a)).not.toMatch(/@example|usuarioId|"u\d"/);
      expect(a.siguiente).toBe('r3');
      const last = (await app.inject({ url: '/api/resenas/publicas?slug=centro&limite=2&cursor=r1' })).json();
      expect(last.resenas.map((r: { id: string }) => r.id)).toEqual(['r0']);
      expect(last.resenas[0].respuestaDueno).toBe('Gracias');
      expect(last.siguiente).toBeNull();
    } finally { await app.close(); }
  });
  it('ordena por mejor y peor valoradas y valida parámetros', async () => {
    const app = await publicApp(fixtures);
    try {
      const ids = async (orden: string) => (await app.inject({ url: `/api/resenas/publicas?complejoId=c1&orden=${orden}` })).json().resenas.map((r: { puntuacion: number }) => r.puntuacion);
      expect(await ids('mejor')).toEqual([5, 4, 4, 3, 1]);
      expect(await ids('peor')).toEqual([1, 3, 4, 4, 5]);
      expect((await app.inject({ url: '/api/resenas/publicas?complejoId=c1&orden=azar' })).statusCode).toBe(400);
      expect((await app.inject({ url: '/api/resenas/publicas?complejoId=c1&limite=21' })).statusCode).toBe(400);
      expect((await app.inject({ url: '/api/resenas/publicas' })).statusCode).toBe(400);
      expect((await app.inject({ url: '/api/resenas/publicas?slug=oculto' })).statusCode).toBe(404);
    } finally { await app.close(); }
  });
  it.each([['DELETE', '/api/resenas/x'], ['PUT', '/api/resenas/x/responder'], ['GET', '/api/resenas/mia?slug=centro']])('%s %s requiere sesión', async (method, url) => {
    const app = await publicApp([]);
    try { expect((await app.inject({ method: method as 'GET', url })).statusCode).toBe(401); }
    finally { await app.close(); }
  });
});
