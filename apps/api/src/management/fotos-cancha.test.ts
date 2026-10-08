import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { Canchas } from './canchas';
import type { Access } from './access';
import type { Media } from './media';
import type { DbService } from '../public/db.service';
const request = {} as FastifyRequest;
const own = (n: number) => `https://media.example.test/uploads/cancha/owner/foto-${n}.webp`;
beforeEach(() => vi.stubEnv('MEDIA_PUBLIC_URL', 'https://media.example.test'));
afterEach(() => vi.unstubAllEnvs());
function fixture({ permitido = true, rol = 'ADMIN', fotos = [] as string[], imagen = null as string | null } = {}) {
  const row = { id: 'court', complejoId: 'complex', fotos, imagen, precioPorHora: { toFixed: () => '80.00' }, creadoEn: new Date() };
  const tx = {
    cancha: { findUnique: vi.fn(async () => row), update: vi.fn(async ({ data }: { data: object }) => ({ ...row, ...data })), create: vi.fn(async ({ data }: { data: object }) => ({ ...row, ...data, precioPorHora: row.precioPorHora })) },
    complejo: { findUnique: vi.fn(async () => ({ id: 'complex' })) },
  };
  const db = { ...tx, $transaction: async (fn: (client: unknown) => Promise<unknown>) => fn(tx) };
  const access = { actor: vi.fn(async () => ({ id: 'owner', rol })), owner: vi.fn(async () => permitido), enabled: vi.fn(async () => ['complex']), subscribed: vi.fn(async () => true) };
  const media = { remove: vi.fn(async () => {}) };
  return { tx, media, service: new Canchas({ db } as unknown as DbService, access as unknown as Access, media as unknown as Media) };
}
describe('Cancha photos (spec71)', () => {
  it('creates and updates five photos preserving order and synchronizing cover', async () => {
    const { service, tx } = fixture();
    const fotos = Array.from({ length: 5 }, (_, n) => own(n));
    const created = await service.create({ nombre: 'Cancha', tipo: 'FUTBOL', precioPorHora: 80, capacidad: 10, complejoId: 'complex', fotos }, request);
    expect(created.cancha).toMatchObject({ fotos, imagen: fotos[0] });
    const changed = await service.update('court', { fotos: [...fotos].reverse() }, request);
    expect(changed.cancha).toMatchObject({ fotos: [...fotos].reverse(), imagen: fotos[4] });
    expect(tx.cancha.create).toHaveBeenCalledOnce();
  });
  it.each([Array.from({ length: 6 }, (_, n) => own(n)), ['https://foreign.test/a.webp'], ['https://media.example.test.evil.test/uploads/cancha/owner/a.webp'], [own(0).replace('owner', 'other')], [own(0).replace('.webp', '.gif')], [own(0) + '?x=1'], [42], null, 'invalid'])('rejects invalid photos %o before write or deletion', async fotos => {
    const { service, tx, media } = fixture();
    await expect(service.update('court', { fotos } as never, request)).rejects.toMatchObject({ status: 400 });
    expect(tx.cancha.update).not.toHaveBeenCalled();
    expect(media.remove).not.toHaveBeenCalled();
  });
  it('blocks changes to another owner court', async () => {
    const { service, tx } = fixture({ permitido: false });
    await expect(service.update('court', { fotos: [own(0)] }, request)).rejects.toMatchObject({ status: 403 });
    expect(tx.cancha.update).not.toHaveBeenCalled();
  });
  it('allows a technician to maintain assigned courts', async () => {
    const { service } = fixture({ permitido: false, rol: 'TECNICO' });
    expect((await service.update('court', { fotos: [own(0)] }, request)).cancha.imagen).toBe(own(0));
  });
  it('clears cover and deletes removed photos only after commit', async () => {
    const { service, tx, media } = fixture({ fotos: [own(0), own(1)], imagen: own(0) });
    const result = await service.update('court', { fotos: [] }, request);
    expect(result.cancha).toMatchObject({ fotos: [], imagen: null });
    expect(media.remove.mock.calls).toEqual([[own(0), 'cancha', true], [own(1), 'cancha', true]]);
    expect(tx.cancha.update.mock.invocationCallOrder[0]).toBeLessThan(media.remove.mock.invocationCallOrder[0]);
  });
  it('does not delete media after failed save and does not delete retained photos on reorder', async () => {
    const { service, tx, media } = fixture({ fotos: [own(0), own(1)], imagen: own(0) });
    await service.update('court', { fotos: [own(1), own(0)] }, request);
    expect(media.remove).not.toHaveBeenCalled();
    tx.cancha.update.mockRejectedValueOnce(new Error('Save failed'));
    await expect(service.update('court', { fotos: [] }, request)).rejects.toThrow('Save failed');
    expect(media.remove).not.toHaveBeenCalled();
  });
  it('preserves existing legacy cover without granting new external URLs', async () => {
    const imagen = 'https://legacy.example.test/old.jpg';
    const { service } = fixture({ imagen });
    expect((await service.update('court', { fotos: [imagen, own(0)] }, request)).cancha.fotos).toEqual([imagen, own(0)]);
    const saved = fixture({ imagen: own(0), fotos: [own(0), imagen] });
    expect((await saved.service.update('court', { fotos: [imagen, own(0)] }, request)).cancha.imagen).toBe(imagen);
    await expect(service.update('court', { fotos: ['https://legacy.example.test/new.jpg'] }, request)).rejects.toMatchObject({ status: 400 });
  });
});
