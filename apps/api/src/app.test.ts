import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { healthResponseSchema } from '@reservaya/shared';
import { createApp } from './app';
import { CajaService } from './caja/caja';
import { body, decimal } from './caja/money';

describe('Health and F2 route boundaries', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => { await app?.close(); });
  it('serves health without a database or session', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({ ok: true });
  });
  it('serves healthz without a database or session', async () => {
    const response = await app.inject({ method: 'GET', url: '/healthz' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
  it('accepts empty and whitespace JSON on bodyless POST and PATCH routes', async () => {
    for (const payload of ['', '  \r\n\t']) {
      const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { 'content-type': 'application/json' }, payload });
      expect(logout.statusCode).toBe(200);
      const patch = await app.inject({ method: 'PATCH', url: '/api/solicitudes/fixture/aprobar', headers: { 'content-type': 'application/json' }, payload });
      expect(patch.statusCode).toBe(401);
    }
  });
  it('preserves raw decimal JSON through a caja route and enforces the body limit', async () => {
    const service = app.get(CajaService);
    const spy = vi.spyOn(service, 'crearProducto').mockImplementation(async request => ({ precio: decimal(body(request), 'precio')!.toString() }) as never);
    try {
      const result = await app.inject({ method: 'POST', url: '/api/caja/productos', headers: { 'content-type': 'application/json' }, payload: '{"precio":10.0000000000000000001}' });
      expect(result.statusCode).toBe(201);
      expect(result.json()).toEqual({ precio: '10.0000000000000000001' });
      const oversized = await app.inject({ method: 'POST', url: '/api/caja/productos', headers: { 'content-type': 'application/json' }, payload: ' '.repeat(1048577) });
      expect(oversized.statusCode).toBe(413);
      const malformed = await app.inject({ method: 'POST', url: '/api/caja/productos', headers: { 'content-type': 'application/json' }, payload: '{' });
      expect(malformed.statusCode).toBe(400);
    } finally { spy.mockRestore(); }
  });
  it('accepts urlencoded POST after registering the custom JSON parser', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/partidos', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'titulo=Fixture&cupos=4' });
    expect(response.statusCode).toBe(401);
  });
  it('loads compatible cookie and multipart plugins', () => {
    const fastify = app.getHttpAdapter().getInstance();
    expect(fastify.hasDecorator('serializeCookie')).toBe(true);
    expect(fastify.hasDecorator('multipartErrors')).toBe(true);
  });
  it('requires authentication for reservation routes', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/reservas', payload: {} });
    const reserva = await app.inject({ method: 'GET', url: '/api/reservas/fixture-id' });
    expect(login.statusCode).toBe(401);
    expect(reserva.statusCode).toBe(401);
  });
});
