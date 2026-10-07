import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
// Public reads preserve legacy optional identity. No login/authorization endpoints.
// AllowAnonymous .NET does not apply ValidSessionHandler (tv/activo check).
export function identity(request: FastifyRequest): { id: string; rol: string } | null {
  const cookie = request.cookies?.token;
  const token = cookie || request.headers.authorization?.replace(/^Bearer\s+/i, '');
  const secret = process.env.JWT_SECRET;
  if (!token || !secret || secret.length < 32) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'HS256') return null;
    const actual = Buffer.from(parts[2], 'base64url'), expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const now = Date.now() / 1000;
    if (typeof claims.exp !== 'number' || claims.exp < now - 10 || (typeof claims.nbf === 'number' && claims.nbf > now + 10)) return null;
    return { id: typeof claims.id === 'string' ? claims.id : '', rol: ['USUARIO','ADMIN','SUPERADMIN','TECNICO'].includes(claims.rol) ? claims.rol : 'USUARIO' };
  } catch { return null; }
}
