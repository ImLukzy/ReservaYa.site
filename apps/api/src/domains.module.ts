import { Reservas, ReservasController } from './reservas/reservas';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './public/db.module';
import { ManagementModule } from './management/module';
import { Complejos, ComplejosController } from './complejos/complejos';
import { Equipo, EquipoController, Invitaciones, InvitacionesController } from './equipo/equipo';
import { Partidos, PartidosController } from './partidos/partidos';
import { Resenas, ResenasController } from './resenas/resenas';
import { Sanciones, SancionesController } from './sanciones/sanciones';
import { Solicitudes, SolicitudesController } from './solicitudes/solicitudes';
import { Suscripciones, SuscripcionesController } from './suscripciones/suscripciones';
import { Torneos, TorneosController } from './torneos/torneos';
import { AbonosController, AbonosService } from './abonos/abonos';
import { CajaController, CajaService } from './caja/caja';
import { MetasController, MetasService } from './metas/metas';
import { ReclamosController, ReclamosService } from './reclamos/reclamos';
import { ReportesController, ReportesService } from './reportes/reportes';
// Spec 56 F5: team, requests, subscriptions, sanctions and the remaining complex/match/review/tournament routes.
// Spec 56 F6: cash desk, deposits, goals, reports and the complaints book.
@Module({imports:[DbModule,AuthModule,ManagementModule],controllers:[ReservasController,ComplejosController,EquipoController,InvitacionesController,PartidosController,ResenasController,SancionesController,SolicitudesController,SuscripcionesController,TorneosController,AbonosController,CajaController,MetasController,ReclamosController,ReportesController],providers:[Reservas,Complejos,Equipo,Invitaciones,Partidos,Resenas,Sanciones,Solicitudes,Suscripciones,Torneos,AbonosService,CajaService,MetasService,ReclamosService,ReportesService]})
export class DomainsModule {}
