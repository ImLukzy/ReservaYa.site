import { Body, Controller, Get, HttpCode, Inject, Injectable, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { Clock, DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles } from '../management/access';
import { parseEnum, utcToday } from '../management/legacy';
type Sub=Prisma.SuscripcionGetPayload<object>&{complejoByComplejoId?:{nombre:string}|null};
const plans=['MENSUAL','TRIMESTRAL','ANUAL'] as const,states=['PENDIENTE','ACTIVA','VENCIDA','CANCELADA','RECHAZADA'] as const;
const days={MENSUAL:30,TRIMESTRAL:90,ANUAL:365};
export function subscriptionShape(s:Sub,now=new Date()){
  const today=utcToday(now),fin=s.fechaFin;
  return {id:s.id,complejoId:s.complejoId,complejoNombre:s.complejoByComplejoId?.nombre??'',plan:s.plan,estado:s.estado,fechaInicio:utc(s.fechaInicio),fechaFin:utc(fin),diasRestantes:Math.max(0,Math.trunc((fin.getTime()-today.getTime())/86400000)),vigente:s.estado==='ACTIVA'&&fin>=today,creadoEn:utc(s.creadoEn)};
}
@Injectable()
export class Suscripciones {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(Clock)private clock:Clock){}
  private get db(){return this.store.db;}
  async estado(r:FastifyRequest){
    const a=await this.access.actor(r,undefined,false),ids=await this.access.ids(a,true),now=this.clock.now(),today=utcToday(now);
    const rows=await this.db.complejo.findMany({where:ids===null?{}:{id:{in:ids}},orderBy:{creadoEn:'asc'},select:{id:true,nombre:true,publicado:true,creadoEn:true,usuarioByDuenoId:{select:{rol:true}},suscripcionByComplejoId:{where:{estado:'ACTIVA',fechaInicio:{lte:today},fechaFin:{gte:today}},select:{id:true},take:1},_count:{select:{canchaByComplejoId:true}}}});
    return {ok:true,complejos:rows.map(c=>{
      const activa=c.suscripcionByComplejoId.length>0,fin=new Date(c.creadoEn.getTime()+30*86400000),rol=c.usuarioByDuenoId.rol;
      const pendiente=!c.publicado&&rol==='USUARIO',prueba=!pendiente&&!activa&&rol!=='USUARIO'&&fin>now;
      return {complejoId:c.id,nombre:c.nombre,enPrueba:prueba,pendiente,estadoSolicitud:pendiente?'PENDIENTE':'APROBADA',diasRestantes:prueba?Math.ceil((fin.getTime()-now.getTime())/86400000):0,pruebaHasta:utc(fin),activa,vencida:!pendiente&&!activa&&!prueba,bloqueada:pendiente||(!activa&&!prueba),canchasPermitidas:prueba?1:null,puedeCrearCancha:!pendiente&&(activa||(prueba&&c._count.canchaByComplejoId===0))};
    })};
  }
  async list(complejoId:string|undefined,estado:string|undefined,r:FastifyRequest){
    const a=await this.access.actor(r,undefined,false),where:Prisma.SuscripcionWhereInput={};
    if(complejoId?.trim()){if(!await this.access.member(a,complejoId,true))fail(403,'Sin permisos');where.complejoId=complejoId;}
    else if(a.rol!=='TECNICO')where.complejoId={in:(await this.access.ids(a,true))??[]};
    if(estado?.trim()){const e=parseEnum(states,estado);if(!e)fail(400,'Estado inválido');where.estado=e!;}
    const rows=await this.db.suscripcion.findMany({where,include:{complejoByComplejoId:{select:{nombre:true}}},orderBy:{creadoEn:'desc'}});
    return {ok:true,suscripciones:rows.map(s=>subscriptionShape(s,this.clock.now()))};
  }
  async create(b:{complejoId?:string;plan?:string},r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles,false);if(!b.complejoId?.trim())fail(400,'complejoId es requerido');
    const plan=parseEnum(plans,b.plan);if(!plan)fail(400,'Plan inválido (MENSUAL, TRIMESTRAL, ANUAL)');
    const c=await this.db.complejo.findUnique({where:{id:b.complejoId},include:{usuarioByDuenoId:{select:{rol:true}}}});if(!c)fail(400,'Complejo no encontrado');
    if(c!.usuarioByDuenoId.rol==='USUARIO')fail(409,'Aprueba primero la solicitud del jugador.');
    if(!await this.access.owner(a,b.complejoId!,undefined,true))fail(403,'Sin permisos');
    const now=this.clock.now(),today=utcToday(now);
    const s=await this.db.suscripcion.create({data:{id:newId(),complejoId:b.complejoId!,plan:plan!,estado:'PENDIENTE',fechaInicio:today,fechaFin:new Date(today.getTime()+days[plan!]*86400000),creadoEn:now}});
    return {ok:true,suscripcion:subscriptionShape({...s,complejoByComplejoId:c},now)};
  }
  async approve(id:string,r:FastifyRequest){
    await this.access.actor(r,['TECNICO'],false);
    const s=await this.db.suscripcion.findUnique({where:{id},include:{complejoByComplejoId:{include:{usuarioByDuenoId:{select:{rol:true}}}}}});if(!s)fail(404,'No encontrada');
    if(s!.estado!=='PENDIENTE')fail(400,'Solo se pueden aprobar solicitudes pendientes');
    if(s!.complejoByComplejoId.usuarioByDuenoId.rol==='USUARIO')fail(409,'Aprueba primero la solicitud del jugador.');
    const now=this.clock.now(),today=utcToday(now);
    const updated=await this.db.$transaction(async tx=>{
      await tx.suscripcion.updateMany({where:{complejoId:s!.complejoId,id:{not:id},estado:'ACTIVA'},data:{estado:'VENCIDA'}});
      await tx.complejo.update({where:{id:s!.complejoId},data:{publicado:true}});
      return tx.suscripcion.update({where:{id},data:{fechaInicio:today,fechaFin:new Date(today.getTime()+days[s!.plan]*86400000),estado:'ACTIVA'},include:{complejoByComplejoId:{select:{nombre:true}}}});
    });
    return {ok:true,suscripcion:subscriptionShape(updated,now)};
  }
  async reject(id:string,r:FastifyRequest){
    await this.access.actor(r,['TECNICO'],false);const s=await this.db.suscripcion.findUnique({where:{id}});if(!s)fail(404,'No encontrada');
    if(s!.estado!=='PENDIENTE')fail(400,'Solo se pueden rechazar solicitudes pendientes');
    return {ok:true,suscripcion:subscriptionShape(await this.db.suscripcion.update({where:{id},data:{estado:'RECHAZADA'}}),this.clock.now())};
  }
  async cancel(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles,false),s=await this.db.suscripcion.findUnique({where:{id}});if(!s)fail(404,'No encontrada');
    if(!await this.access.owner(a,s!.complejoId,undefined,true))fail(403,'Sin permisos');
    return {ok:true,suscripcion:subscriptionShape(await this.db.suscripcion.update({where:{id},data:{estado:'CANCELADA'}}),this.clock.now())};
  }
}
@Controller('api/suscripciones')
export class SuscripcionesController {
  constructor(@Inject(Suscripciones)private service:Suscripciones){}
  @Get('estado') estado(@Req()r:FastifyRequest){return this.service.estado(r);}
  @Get() list(@Query('complejoId')id:string|undefined,@Query('estado')estado:string|undefined,@Req()r:FastifyRequest){return this.service.list(id,estado,r);}
  @Post() @HttpCode(201) create(@Body()b:{complejoId?:string;plan?:string},@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Patch(':id/aprobar') approve(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.approve(id,r);}
  @Patch(':id/rechazar') reject(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.reject(id,r);}
  @Patch(':id/cancelar') cancel(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.cancel(id,r);}
}
