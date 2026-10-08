import { Controller, Get, Inject } from '@nestjs/common';
import { Clock, DbService } from './db.service';
import { day } from './format';

export interface ComplejoSlug {
  slug: string;
  actualizadoEn: Date;
}

// Solo slug + actualizadoEn de complejos visibles (misma regla que
// PublicReadService: prueba <30 días con dueño no-USUARIO o suscripción
// ACTIVA vigente, más publicado). Lo consume apps/web/app/sitemap.ts.
@Controller('api/complejos/publicos')
export class SlugsController {
  constructor(@Inject(DbService) private readonly store: DbService, @Inject(Clock) private readonly clock: Clock) {}

  @Get('slugs')
  async slugs(): Promise<ComplejoSlug[]> {
    const now = this.clock.now();
    const today = new Date(`${day(now)}T00:00:00Z`);
    const rows = await this.store.db.complejo.findMany({
      where: {
        publicado: true,
        OR: [
          { creadoEn: { gt: new Date(now.getTime() - 30 * 86400000) }, usuarioByDuenoId: { rol: { not: 'USUARIO' } } },
          { suscripcionByComplejoId: { some: { estado: 'ACTIVA', fechaInicio: { lte: today }, fechaFin: { gte: today } } } },
        ],
      },
      select: { slug: true, actualizadoEn: true },
      orderBy: { slug: 'asc' },
    });
    return rows;
  }
}
