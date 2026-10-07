import { Catch, HttpException, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';
import { text, type Query } from './read.service';
export class BindingError extends HttpException {}
export function bind(q: Query, ints: string[] = [], bools: string[] = []) {
  const errors: Record<string,string[]> = {};
  for (const key of [...ints, ...bools]) {
    const v = text(q,key);
    if (v === undefined || !v.trim()) continue;
    const n = Number(v);
    const valid = bools.includes(key) ? /^(true|false)$/i.test(v.trim()) : /^[+-]?\d+$/.test(v.trim()) && Number.isInteger(n) && n >= -2147483648 && n <= 2147483647;
    if (!valid) errors[key] = [`The value '${v}' is not valid.`];
  }
  if (Object.keys(errors).length) throw new BindingError({ type:'https://tools.ietf.org/html/rfc9110#section-15.5.1', title:'One or more validation errors occurred.', status:400, errors, traceId:`00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-01` },400);
}
@Catch(BindingError)
export class BindingFilter implements ExceptionFilter {
  catch(error: BindingError, host: ArgumentsHost) { host.switchToHttp().getResponse<FastifyReply>().status(400).type('application/problem+json').send(error.getResponse()); }
}
