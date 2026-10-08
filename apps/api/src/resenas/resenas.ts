import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles } from '../management/access';
import { RateLimiter } from '../auth/rate';
import { autorCorto } from './publico';
type Resena=Prisma.ResenaGetPayload<object>&{usuarioByUsuarioId?:{id:string;nombre:string;email:string}|null};
const author={select:{id:true,nombre:true,email:true}} as const;
const shape=(r:Resena)=>({id:r.id,complejoId:r.complejoId,puntuacion:r.puntuacion,comentario:r.comentario,respuestaDueno:r.respuestaDueno,creadoEn:utc(r.creadoEn),autor:autorCorto(r.usuarioByUsuarioId?.nombre),usuario:r.usuarioByUsuarioId?{id:r.usuarioByUsuarioId.id,nombre:r.usuarioByUsuarioId.nombre,email:r.usuarioByUsuarioId.email}:null});
const MAX=500;
@Injectable()
export class Resenas {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(RateLimiter)private rate:RateLimiter){}
  private get db(){return this.store.db;}
  async create(b:{complejoId?:string;puntuacion?:number;comentario?:string},r:FastifyRequest){
    const a=await this.access.actor(r);if(!b.complejoId?.trim())fail(400,'complejoId es requerido');
    if(!Number.isInteger(b.puntuacion)||b.puntuacion!<1||b.puntuacion!>5)fail(400,'Puntuación de 1 a 5');
    if(typeof b.comentario==='string'&&b.comentario.trim().length>MAX)fail(400,`El comentario admite hasta ${MAX} caracteres`);
    if(this.rate.limited(`resenas:${a.id}`,10,3600000))fail(429,'Demasiadas reseñas enviadas. Espera un momento antes de reintentar.');
    const comentario=b.comentario?.trim()?b.comentario.trim():null,complejoId=b.complejoId!;
    if(!await this.db.complejo.findUnique({where:{id:complejoId},select:{id:true}}))fail(404,'No encontrado');
    if(!await this.db.reserva.findFirst({where:{usuarioId:a.id,estado:'COMPLETADA',OR:[{complejoId},{canchaByCanchaId:{complejoId}}]},select:{id:true}}))fail(403,'Solo puedes calificar locales donde ya jugaste');
    const existing=await this.db.resena.findUnique({where:{complejoId_usuarioId:{complejoId,usuarioId:a.id}}});
    if(!existing)return {ok:true,resena:shape(await this.db.resena.create({data:{id:newId(),complejoId,usuarioId:a.id,puntuacion:b.puntuacion!,comentario,creadoEn:new Date()},include:{usuarioByUsuarioId:author}}))};
    return {ok:true,resena:shape(await this.db.resena.update({where:{id:existing.id},data:{puntuacion:b.puntuacion!,comentario},include:{usuarioByUsuarioId:author}}))};
  }
  async list(complejoId:string|undefined,r:FastifyRequest){
    const a=await this.access.actor(r),where:Prisma.ResenaWhereInput={};
    if(complejoId?.trim()){if(!await this.access.member(a,complejoId))fail(403,'Sin permisos');where.complejoId=complejoId;}
    else{const ids=await this.access.ids(a);if(ids!==null){if(!ids.length)return {ok:true,resenas:[]};where.complejoId={in:ids};}}
    return {ok:true,resenas:(await this.db.resena.findMany({where,include:{usuarioByUsuarioId:author},orderBy:{creadoEn:'desc'}})).map(shape)};
  }
  // POST responde y PUT edita: misma regla, solo el dueño del complejo (o TECNICO).
  async reply(id:string,b:{respuesta?:string},r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);const respuesta=typeof b.respuesta==='string'?b.respuesta.trim():'';
    if(!respuesta)fail(400,'Respuesta requerida');if(respuesta.length>MAX)fail(400,`La respuesta admite hasta ${MAX} caracteres`);
    const x=await this.db.resena.findUnique({where:{id}});if(!x)fail(404,'No encontrada');if(!await this.access.owner(a,x!.complejoId))fail(403,'Sin permisos');
    return {ok:true,resena:shape(await this.db.resena.update({where:{id},data:{respuestaDueno:respuesta},include:{usuarioByUsuarioId:author}}))};
  }
  // Borra el autor; ADMIN/SUPERADMIN solo si es dueño del complejo (multitenancy), TECNICO cualquiera.
  async remove(id:string,r:FastifyRequest){
    const a=await this.access.actor(r);const x=await this.db.resena.findUnique({where:{id}});if(!x)fail(404,'No encontrada');
    if(x!.usuarioId!==a.id&&!(managementRoles.includes(a.rol)&&await this.access.owner(a,x!.complejoId)))fail(403,'Sin permisos');
    await this.db.resena.delete({where:{id}});return {ok:true};
  }
  // Estado del usuario frente a un complejo: si puede calificar y su reseña actual.
  async mine(q:{complejoId?:string;slug?:string},r:FastifyRequest){
    const a=await this.access.actor(r);const complejoId=q.complejoId?.trim()||(q.slug?.trim()?(await this.db.complejo.findFirst({where:{slug:q.slug.trim(),publicado:true},select:{id:true}}))?.id:undefined);
    if(!q.complejoId?.trim()&&!q.slug?.trim())fail(400,'complejoId o slug es requerido');if(!complejoId)fail(404,'No encontrado');
    const [resena,jugo]=await Promise.all([
      this.db.resena.findUnique({where:{complejoId_usuarioId:{complejoId:complejoId!,usuarioId:a.id}},include:{usuarioByUsuarioId:author}}),
      this.db.reserva.findFirst({where:{usuarioId:a.id,estado:'COMPLETADA',OR:[{complejoId},{canchaByCanchaId:{complejoId}}]},select:{id:true}}),
    ]);
    const puede=Boolean(jugo);
    return {ok:true,complejoId,puedeCalificar:puede,motivo:puede?null:'SIN_RESERVA_COMPLETADA',resena:resena?shape(resena):null};
  }
}
@Controller('api/resenas')
export class ResenasController {
  constructor(@Inject(Resenas)private service:Resenas){}
  @Post() @HttpCode(200) create(@Body()b:{complejoId?:string;puntuacion?:number;comentario?:string},@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Get() list(@Query('complejoId')id:string|undefined,@Req()r:FastifyRequest){return this.service.list(id,r);}
  @Get('mia') mine(@Query('complejoId')complejoId:string|undefined,@Query('slug')slug:string|undefined,@Req()r:FastifyRequest){return this.service.mine({complejoId,slug},r);}
  @Delete(':id') remove(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.remove(id,r);}
  @Post(':id/responder') @HttpCode(200) reply(@Param('id')id:string,@Body()b:{respuesta?:string},@Req()r:FastifyRequest){return this.service.reply(id,b??{},r);}
  @Put(':id/responder') editReply(@Param('id')id:string,@Body()b:{respuesta?:string},@Req()r:FastifyRequest){return this.service.reply(id,b??{},r);}
}
