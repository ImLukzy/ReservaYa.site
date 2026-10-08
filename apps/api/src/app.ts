import 'reflect-metadata';
import { createRequire } from 'node:module';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { BindingFilter } from './public/binding';
import { AppModule } from './app.module';
import { installTrafficProtection } from './traffic/traffic';

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false, rawBody: true });
  const fastify = app.getHttpAdapter().getInstance();
  installTrafficProtection(fastify);
  const { bodyLimit, onProtoPoisoning, onConstructorPoisoning } = fastify.initialConfig;
  const parseJson = fastify.getDefaultJsonParser(onProtoPoisoning ?? 'error', onConstructorPoisoning ?? 'error');
  app.useBodyParser('application/json', { bodyLimit }, (request, body, done) => {
    const json = body.toString('utf8');
    if (!json.trim()) return done(null, undefined);
    parseJson(request as Parameters<typeof parseJson>[0], json, done);
  });
  // Use the adapter's own parser dependency to preserve its form semantics.
  const { parse } = createRequire(require.resolve('@nestjs/platform-fastify'))('fast-querystring') as { parse: (value: string) => Record<string, string | string[]> };
  app.useBodyParser('application/x-www-form-urlencoded', { bodyLimit }, (_request, body, done) => {
    done(null, parse(body.toString()));
  });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 10, parts: 11 } });
  app.useGlobalFilters(new BindingFilter());
  app.enableShutdownHooks();
  return app;
}
