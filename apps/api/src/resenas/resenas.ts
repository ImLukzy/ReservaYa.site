import { Body, Controller, Get, HttpCode, Inject, Injectable, Param, Post, Query, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles } from '../management/access';
type Resena=Prisma.ResenaGetPayload<object>&{usuarioByUsuarioId?:{id:string;nombre:string;email:string}|null};
const author={select:{id:true,nombre:true,email:true}} as const;
const shape=(r:Resena)=>({id:r.id,complejoId:r.complejoId,puntuacion:r.puntuacion,comentario:r.comentario,respuestaDueno:r.respuestaDueno,creadoEn:utc(r.creadoEn),usuario:r.usuarioByUsuarioId?{id:r.usuarioByUsuarioId.id,nombre:r.usuarioByUsuarioId.nombre,email:r.usuarioByUsuarioId.email}:null});
@Injectable()
export class Resenas {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  async create(b:{complejoId?:string;puntuacion?:number;comentario?:string},r:FastifyRequest){
    const a=await this.access.actor(r);if(!b.complejoId?.trim())fail(400,'complejoId es requerido');
    if(b.puntuacion==null||b.puntuacion<1||b.puntuacion>5)fail(400,'Puntuación de 1 a 5');
    const comentario=b.comentario?.trim()?b.comentario.trim().slice(0,500):null,complejoId=b.complejoId!;
    if(!await this.db.complejo.findUnique({where:{id:complejoId},select:{id:true}}))fail(404,'No encontrado');
    if(!await this.db.reserva.findFirst({where:{usuarioId:a.id,estado:'COMPLETADA',OR:[{complejoId},{canchaByCanchaId:{complejoId}}]},select:{id:true}}))fail(403,'Solo puedes calificar locales donde ya jugaste');
    const existing=await this.db.resena.findUnique({where:{complejoId_usuarioId:{complejoId,usuarioId:a.id}}});
    // A new review is not linked to its tracked author in legacy, so its usuario is null.
    if(!existing)return {ok:true,resena:shape(await this.db.resena.create({data:{id:newId(),complejoId,usuarioId:a.id,puntuacion:b.puntuacion!,comentario,creadoEn:new Date()}}))};
    return {ok:true,resena:shape(await this.db.resena.update({where:{id:existing.id},data:{puntuacion:b.puntuacion!,comentario},include:{usuarioByUsuarioId:author}}))};
  }
  async list(complejoId:string|undefined,r:FastifyRequest){
    const a=await this.access.actor(r),where:Prisma.ResenaWhereInput={};
    if(complejoId?.trim()){if(!await this.access.member(a,complejoId))fail(403,'Sin permisos');where.complejoId=complejoId;}
    else{const ids=await this.access.ids(a);if(ids!==null){if(!ids.length)return {ok:true,resenas:[]};where.complejoId={in:ids};}}
    return {ok:true,resenas:(await this.db.resena.findMany({where,include:{usuarioByUsuarioId:author},orderBy:{creadoEn:'desc'}})).map(shape)};
  }
  async reply(id:string,b:{respuesta?:string},r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);if(!b.respuesta?.trim())fail(400,'Respuesta requerida');
    const x=await this.db.resena.findUnique({where:{id}});if(!x)fail(404,'No encontrada');if(!await this.access.owner(a,x!.complejoId))fail(403,'Sin permisos');
    return {ok:true,resena:shape(await this.db.resena.update({where:{id},data:{respuestaDueno:b.respuesta!.trim()},include:{usuarioByUsuarioId:author}}))};
  }
}
@Controller('api/resenas')
export class ResenasController {
  constructor(@Inject(Resenas)private service:Resenas){}
  @Post() @HttpCode(200) create(@Body()b:{complejoId?:string;puntuacion?:number;comentario?:string},@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Get() list(@Query('complejoId')id:string|undefined,@Req()r:FastifyRequest){return this.service.list(id,r);}
  @Post(':id/responder') @HttpCode(200) reply(@Param('id')id:string,@Body()b:{respuesta?:string},@Req()r:FastifyRequest){return this.service.reply(id,b??{},r);}
}
