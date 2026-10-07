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
// Spec 56 F5: team, requests, subscriptions, sanctions and the remaining complex/match/review/tournament routes.
@Module({imports:[DbModule,AuthModule,ManagementModule],controllers:[ComplejosController,EquipoController,InvitacionesController,PartidosController,ResenasController,SancionesController,SolicitudesController,SuscripcionesController,TorneosController],providers:[Complejos,Equipo,Invitaciones,Partidos,Resenas,Sanciones,Solicitudes,Suscripciones,Torneos]})
export class DomainsModule {}
