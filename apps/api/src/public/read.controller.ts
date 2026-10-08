import { Controller, Inject, Get, Param, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PublicReadService, type Query as QueryValues } from './read.service';
import { bind } from './binding';
import { identity } from './identity';
@Controller('api')
export class PublicReadController {
  constructor(@Inject(PublicReadService) private readonly reads: PublicReadService) {}
  @Get('canchas') async list(@Query() q: QueryValues, @Req() r: FastifyRequest) { await this.reads.guardCancha(identity(r)); bind(q, [], ['activas','propias']); return this.reads.list(q, identity(r)); }
  @Get('canchas/disponibles') disponibles(@Query() q: QueryValues) { bind(q,['horaInicio','horaFin']); return this.reads.disponibles(q); }
  @Get('canchas/opciones') opciones() { return this.reads.opciones(); }
  @Get('canchas/:id/cotizar') cotizar(@Param('id') id: string, @Query() q: QueryValues) { bind(q,['horaInicio','horaFin']); return this.reads.cotizar(id,q); }
  @Get('canchas/:id') async get(@Param('id') id: string, @Req() r: FastifyRequest) { await this.reads.guardCancha(identity(r)); return this.reads.get(id); }
  @Get('partidos') partidos(@Query() q: QueryValues, @Req() r: FastifyRequest) { return this.reads.partidos(q, identity(r)); }
  @Get('complejos/publico/:slug') complejoPublico(@Param('slug') slug: string) { return this.reads.complejoPublico(slug); }
  @Get('resenas/publicas') resenas(@Query() q: QueryValues) { return this.reads.resenas(q); }
}
