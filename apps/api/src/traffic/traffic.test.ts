import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyRequest } from 'fastify';
import { RateLimiter, MAX_RATE_KEYS } from '../auth/rate';
import { createApp } from '../app';
import { installTrafficProtection, ip, GLOBAL_REQUESTS_PER_MINUTE, GLOBAL_WRITES_PER_MINUTE } from './traffic';
const secret = 'fictitious-origin-secret-32-characters';
const headers = { 'x-origin-secret': secret, 'x-reservaya-client-ip': '203.0.113.7' };
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
function server() {
  const app = Fastify();
  installTrafficProtection(app);
  app.get('/healthz', async () => ({ ok: true }));
  app.get('/api/fixture', async request => ({ ip: ip(request) }));
  app.post('/api/fixture', async () => ({ ok: true }));
  return app;
}
describe('origin and global traffic protection', () => {
  it('wires the origin guard into the real Nest API before route handling', async () => {
    vi.stubEnv('ORIGIN_SECRET', secret);
    const app = await createApp();
    try {
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200);
      expect((await app.inject({ method: 'POST', url: '/api/auth/logout' })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: '/api/auth/logout', headers })).statusCode).toBe(200);
    } finally { await app.close(); }
  });
  it('enforces origin, preserves health and allows unset-secret development', async () => {
    vi.stubEnv('ORIGIN_SECRET', secret);
    const app = server();
    try {
      for (const candidate of [{}, { ...headers, 'x-origin-secret': 'wrong' }, { 'x-origin-secret': secret }, { ...headers, 'x-reservaya-client-ip': 'fake' }]) {
        expect((await app.inject({ url: '/api/fixture', headers: candidate })).statusCode).toBe(403);
      }
      expect((await app.inject({ url: '/api/fixture', headers })).statusCode).toBe(200);
      expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200);
    } finally { await app.close(); }
    vi.stubEnv('ORIGIN_SECRET', undefined);
    const local = server();
    try { expect((await local.inject({ url: '/api/fixture' })).statusCode).toBe(200); }
    finally { await local.close(); }
  });
  it('forged X-Forwarded-For does not change the trusted IP or bypass global limits', async () => {
    vi.stubEnv('ORIGIN_SECRET', secret);
    const app = server();
    try {
      for (let i = 0; i < GLOBAL_REQUESTS_PER_MINUTE; i++) {
        const response = await app.inject({ url: '/api/fixture', headers: { ...headers, 'x-forwarded-for': `198.51.100.${i}` } });
        expect(response.statusCode).toBe(200);
        expect(response.json().ip).toBe('203.0.113.7');
      }
      const rejected = await app.inject({ url: '/api/fixture', headers });
      expect(rejected.statusCode).toBe(429);
      expect(rejected.headers['retry-after']).toBe('60');
      expect((await app.inject({ url: '/api/fixture', headers: { ...headers, 'x-reservaya-client-ip': '203.0.113.8' } })).statusCode).toBe(200);
      expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200);
    } finally { await app.close(); }
  });
  it('limits writes separately while reads remain available', async () => {
    vi.stubEnv('ORIGIN_SECRET', secret);
    const app = server();
    try {
      for (let i = 0; i < GLOBAL_WRITES_PER_MINUTE; i++) expect((await app.inject({ method: 'POST', url: '/api/fixture', headers })).statusCode).toBe(200);
      expect((await app.inject({ method: 'POST', url: '/api/fixture', headers })).statusCode).toBe(429);
      expect((await app.inject({ url: '/api/fixture', headers })).statusCode).toBe(200);
    } finally { await app.close(); }
  });
  it('does not trust custom client-IP without a valid origin secret', () => {
    vi.stubEnv('ORIGIN_SECRET', secret);
    const request = { headers: { ...headers, 'x-origin-secret': 'wrong' }, ip: '127.0.0.1' } as unknown as FastifyRequest;
    expect(ip(request)).toBe('127.0.0.1');
    vi.stubEnv('ORIGIN_SECRET', undefined);
    request.headers['x-forwarded-for'] = '203.0.113.9, 127.0.0.1';
    expect(ip(request)).toBe('203.0.113.9');
  });
  it('fails closed on an invalid configured secret', () => {
    vi.stubEnv('ORIGIN_SECRET', 'short');
    expect(server).toThrow(/32/);
  });
});
describe('bounded RateLimiter', () => {
  it('purges expired keys and caps cardinality without evicting active limits', () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const rate = new RateLimiter();
    for (let i = 0; i < MAX_RATE_KEYS; i++) expect(rate.limited(`key:${i}`, 1, 60_000)).toBe(false);
    expect(rate.size).toBe(MAX_RATE_KEYS);
    expect(rate.limited('overflow', 1, 60_000)).toBe(true);
    expect(rate.limited('key:0', 1, 60_000)).toBe(true);
    expect(rate.size).toBe(MAX_RATE_KEYS);
    vi.setSystemTime(60_001);
    expect(rate.limited('fresh', 1, 60_000)).toBe(false);
    expect(rate.size).toBe(1);
    rate.reset('fresh'); expect(rate.size).toBe(0);
  });
});
