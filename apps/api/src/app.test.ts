import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { healthResponseSchema } from '@reservaya/shared';
import { createApp } from './app';

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
