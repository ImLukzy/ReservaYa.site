import { Controller, Get, Inject, Injectable, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { money, utc } from '../public/format';
import { Access, managementRoles, type Actor } from '../management/access';
import { canchaShape } from '../management/canchas';
import { zero } from '../caja/money';
type Reserva=Prisma.ReservaGetPayload<{include:{canchaByCanchaId:true;usuarioByUsuarioId:true}}>|Prisma.ReservaGetPayload<{include:{canchaByCanchaId:true}}>;
// .NET decimal division keeps 28-29 significant digits before Math.Round.
const Wide=Prisma.Decimal.clone({precision:40});
const roles=['USUARIO','PERSONAL','ADMIN','SUPERADMIN','TECNICO'];
export function reservaShape(r:Reserva,withUser:boolean){
  const u='usuarioByUsuarioId'in r?r.usuarioByUsuarioId:null;
  return {id:r.id,codigo:r.codigo,usuarioId:r.usuarioId,canchaId:r.canchaId,fecha:utc(r.fecha),horaInicio:r.horaInicio,horaFin:r.horaFin,estado:r.estado,total:money(r.total),notas:r.notas,creadoEn:utc(r.creadoEn),cancha:canchaShape(r.canchaByCanchaId),
    usuario:withUser&&u?{id:u.id,nombre:u.nombre,email:u.email,rol:u.rol,activo:u.activo,creadoEn:utc(u.creadoEn)}:null};
}
const latest:Prisma.ReservaOrderByWithRelationInput[]=[{creadoEn:'desc'},{fecha:'desc'}];
@Injectable()
export class ReportesService {
  private activeCourts?:{count:number;until:number};
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  // IMemoryCache "reportes:canchas_activas_count", 60 seconds.
  private async activeCourtsCached(){const now=Date.now();if(!this.activeCourts||this.activeCourts.until<=now)this.activeCourts={count:await this.db.cancha.count({where:{activa:true}}),until:now+60000};return this.activeCourts.count;}
  /** Strict owner isolation: everything derives from the actor's enabled complexes; only the platform sees all. */
  private async scope(a:Actor){
    const ids=await this.access.ids(a);if(ids===null)return {reservas:{} as Prisma.ReservaWhereInput,canchas:{} as Prisma.CanchaWhereInput,usuarios:{} as Prisma.UsuarioWhereInput};
    const canchas:Prisma.CanchaWhereInput={complejoId:{in:ids}};
    const reservas:Prisma.ReservaWhereInput={OR:[{complejoId:{in:ids}},{complejoId:null,canchaByCanchaId:canchas}]};
    return {reservas,canchas,usuarios:{OR:[{id:a.id},{reservaByUsuarioId:{some:reservas}},{complejoMiembroByUsuarioId:{some:{activo:true,complejoId:{in:ids}}}}]} as Prisma.UsuarioWhereInput};
  }
  async dashboard(r:FastifyRequest){
    const a=await this.access.actor(r),rol=roles.includes(a.rol)?a.rol:'USUARIO';
    if(rol==='USUARIO')return {dashboard:await this.player(a)};
    if(rol==='ADMIN')return {dashboard:await this.admin(a)};
    return {dashboard:await this.superadmin(a)};
  }
  private async player(a:Actor){
    const reservas=await this.db.reserva.count({where:{usuarioId:a.id}}),confirmadas=await this.db.reserva.count({where:{usuarioId:a.id,estado:'CONFIRMADA'}});
    const canchasActivas=await this.activeCourtsCached();
    const ultimas=await this.db.reserva.findMany({where:{usuarioId:a.id},include:{canchaByCanchaId:true},orderBy:latest,take:5});
    return {reservas,reservasConfirmadas:confirmadas,canchasActivas,ultimasReservas:ultimas.map(x=>reservaShape(x,false))};
  }
  private async admin(a:Actor){
    const ids=await this.access.ids(a);
    if(ids!==null&&!ids.length)return {totalReservas:0,reservasPendientes:0,canchasActivas:0,ingresos:'0.00',ultimasReservas:[]};
    const where:Prisma.ReservaWhereInput=ids===null?{}:{OR:[{complejoId:{in:ids}},{complejoId:null,canchaByCanchaId:{complejoId:{in:ids}}}]};
    const totalReservas=await this.db.reserva.count({where}),reservasPendientes=await this.db.reserva.count({where:{AND:[where,{estado:'PENDIENTE'}]}});
    const ingresos=(await this.db.reserva.aggregate({where:{AND:[where,{estado:'CONFIRMADA'}]},_sum:{total:true}}))._sum.total??zero();
    const canchasActivas=ids===null?await this.activeCourtsCached():await this.db.cancha.count({where:{activa:true,complejoId:{in:ids}}});
    const ultimas=await this.db.reserva.findMany({where,include:{canchaByCanchaId:true,usuarioByUsuarioId:true},orderBy:latest,take:8});
    return {totalReservas,reservasPendientes,canchasActivas,ingresos:money(ingresos),ultimasReservas:ultimas.map(x=>reservaShape(x,true))};
  }
  private async superadmin(a:Actor){
    const s=await this.scope(a);
    const usuarios=await this.db.usuario.count({where:s.usuarios}),administradores=await this.db.usuario.count({where:{AND:[s.usuarios,{rol:'ADMIN'}]}});
    const reservas=await this.db.reserva.count({where:s.reservas}),canchas=await this.db.cancha.count({where:s.canchas});
    const ingresos=(await this.db.reserva.aggregate({where:{AND:[s.reservas,{estado:'CONFIRMADA'}]},_sum:{total:true}}))._sum.total??zero();
    return {usuarios,administradores,reservas,canchas,ingresos:money(ingresos)};
  }
  async global(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),s=await this.scope(a);
    const totalUsuarios=await this.db.usuario.count({where:s.usuarios});
    const grupos=await this.db.reserva.groupBy({by:['estado'],where:s.reservas,_count:{_all:true},_sum:{total:true},orderBy:{estado:'asc'}});
    const courts=await this.db.cancha.findMany({where:s.canchas,orderBy:{nombre:'asc'},select:{id:true,nombre:true,tipo:true,activa:true,precioPorHora:true,_count:{select:{reservaByCanchaId:true}}}});
    const income=courts.length?await this.db.reserva.groupBy({by:['canchaId'],where:{canchaId:{in:courts.map(c=>c.id)},estado:'CONFIRMADA'},_sum:{total:true}}):[];
    const byCourt=new Map(income.map(g=>[g.canchaId,g._sum.total??zero()]));
    const data=courts.map(c=>({id:c.id,nombre:c.nombre,tipo:c.tipo,activa:c.activa,precioPorHora:c.precioPorHora,reservas:c._count.reservaByCanchaId,ingresos:byCourt.get(c.id)??zero()}));
    // Stable in-memory ordering, as LINQ OrderByDescending().ThenByDescending().
    const top=[...data].sort((x,y)=>y.reservas-x.reservas||y.ingresos.comparedTo(x.ingresos)).slice(0,5);
    const confirmed=grupos.filter(g=>g.estado==='CONFIRMADA'),confirmadas=confirmed.reduce((t,g)=>t+g._count._all,0);
    const ingresosTotales=confirmed.reduce((t,g)=>t.plus(g._sum.total??zero()),zero());
    const promedio=confirmadas>0?new Wide(ingresosTotales).div(confirmadas).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP):zero();
    const ultimas=await this.db.reserva.findMany({where:s.reservas,include:{canchaByCanchaId:true,usuarioByUsuarioId:true},orderBy:latest,take:10});
    return {report:{totalUsuarios,totalReservas:grupos.reduce((t,g)=>t+g._count._all,0),reservasPorEstado:grupos.map(g=>({estado:g.estado,cantidad:g._count._all})),
      topCanchas:top.map(c=>({id:c.id,nombre:c.nombre,tipo:c.tipo,reservas:c.reservas,ingresos:money(c.ingresos)})),
      canchas:data.map(c=>({id:c.id,nombre:c.nombre,tipo:c.tipo,activa:c.activa,precioPorHora:money(c.precioPorHora),reservas:c.reservas,ingresos:money(c.ingresos)})),
      ingresosTotales:money(ingresosTotales),promedio:money(promedio),ultimasReservas:ultimas.map(x=>reservaShape(x,true))}};
  }
}
@Controller('api/reportes')
export class ReportesController {
  constructor(@Inject(ReportesService)private service:ReportesService){}
  @Get('dashboard') dashboard(@Req()r:FastifyRequest){return this.service.dashboard(r);}
  @Get('global') global(@Req()r:FastifyRequest){return this.service.global(r);}
}
