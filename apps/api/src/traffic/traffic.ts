import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { RateLimiter } from '../auth/rate';
export const GLOBAL_REQUESTS_PER_MINUTE = 300;
export const GLOBAL_WRITES_PER_MINUTE = 60;
const WINDOW_MS = 60_000;
const writes = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
function validOrigin(request: FastifyRequest, secret: string) {
  const value = request.headers['x-origin-secret'];
  const hash = (text: string) => createHash('sha256').update(text).digest();
  return typeof value === 'string' && timingSafeEqual(hash(value), hash(secret));
}
export function ip(request: FastifyRequest): string {
  const secret = process.env.ORIGIN_SECRET;
  if (!secret) return String(request.headers['x-forwarded-for'] || request.ip || 'unknown').split(',')[0].trim();
  const value = request.headers['x-reservaya-client-ip'];
  return validOrigin(request, secret) && typeof value === 'string' && isIP(value)
    ? value.toLowerCase() : request.ip;
}
export function installTrafficProtection(fastify: FastifyInstance) {
  const secret = process.env.ORIGIN_SECRET;
  if (secret !== undefined && secret.length < 32) throw new Error('ORIGIN_SECRET debe tener al menos 32 caracteres');
  const rate = new RateLimiter();
  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?', 1)[0];
    if (path === '/healthz' || path === '/health') return;
    if (secret) {
      const client = request.headers['x-reservaya-client-ip'];
      if (!validOrigin(request, secret) || typeof client !== 'string' || !isIP(client)) {
        return reply.code(403).send({ error: 'Origen no autorizado' });
      }
    }
    if (path !== '/api' && !path.startsWith('/api/')) return;
    const client = ip(request);
    if (rate.limited(`global:${client}`, GLOBAL_REQUESTS_PER_MINUTE, WINDOW_MS)
      || (writes.has(request.method) && rate.limited(`writes:${client}`, GLOBAL_WRITES_PER_MINUTE, WINDOW_MS))) {
      return reply.header('Retry-After', '60').code(429).send({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' });
    }
  });
}
