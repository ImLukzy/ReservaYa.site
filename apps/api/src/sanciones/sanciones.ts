import { Body, Controller, Get, HttpCode, Inject, Injectable, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { bind } from '../public/binding';
import { boolean, text, type Query as QueryValues } from '../public/read.service';
import { newId } from '../auth/crypto';
import { pagination } from './pagination';
import { Access } from '../management/access';
import { parseEnum } from '../management/legacy';
type Sancion=Prisma.SancionGetPayload<object>&{complejoByComplejoId?:{nombre:string}|null;usuarioByUsuarioId?:{id:string;nombre:string;email:string}|null};
export type SancionBody={complejoId?:string;usuarioId?:string;nivel?:string;motivo?:string};
const roles=['SUPERADMIN','TECNICO'],levels=['ADVERTENCIA','BLOQUEO'] as const;
// Navigations are only present when legacy loaded them (lists); writes return empty names.
const shape=(s:Sancion)=>({id:s.id,complejoId:s.complejoId,complejo:s.complejoByComplejoId?.nombre??'',usuarioId:s.usuarioId,usuario:s.usuarioByUsuarioId?{id:s.usuarioByUsuarioId.id,nombre:s.usuarioByUsuarioId.nombre,email:s.usuarioByUsuarioId.email}:null,nivel:s.nivel,motivo:s.motivo,activa:s.activa,creadoEn:utc(s.creadoEn)});
@Injectable()
export class Sanciones {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  async list(q:QueryValues,r:FastifyRequest){
    const a=await this.access.actor(r,roles),page=pagination(q.cursor,q.take);bind(q,[],['soloActivas']);const complejoId=text(q,'complejoId'),where:Prisma.SancionWhereInput={};
    if(complejoId?.trim()){if(!await this.access.member(a,complejoId))fail(403,'Sin permisos');where.complejoId=complejoId;}
    else if(a.rol!=='TECNICO')where.complejoId={in:(await this.access.ids(a,true,true))!};
    if(boolean(q,'soloActivas')===true)where.activa=true;
    if(page?.cursor&&!await this.db.sancion.findFirst({where:{...where,id:page.cursor},select:{id:true}}))fail(400,'Cursor inválido');
    const rows=await this.db.sancion.findMany({where,include:{complejoByComplejoId:{select:{nombre:true}},usuarioByUsuarioId:{select:{id:true,nombre:true,email:true}}},orderBy:page?[{creadoEn:'desc'},{id:'asc'}]:{creadoEn:'desc'},take:page?page.take+1:200,...(page?.cursor?{cursor:{id:page.cursor},skip:1}:{})});
    const items=page?rows.slice(0,page.take):rows;return {ok:true,...(page?{nextCursor:rows.length>page.take?items[items.length-1]!.id:null}:{}),sanciones:items.map(shape)};
  }
  async create(b:SancionBody,r:FastifyRequest){
    const a=await this.access.actor(r,roles);if(!b.complejoId?.trim()||!b.usuarioId?.trim()||!b.motivo?.trim())fail(400,'complejoId, usuarioId y motivo son requeridos');
    const nivel=parseEnum(levels,b.nivel);if(!nivel)fail(400,'Nivel inválido (ADVERTENCIA, BLOQUEO)');if(b.motivo!.trim().length<3)fail(400,'Motivo requerido (mínimo 3 caracteres)');
    if(!await this.access.owner(a,b.complejoId!))fail(403,'Sin permisos');
    if(!await this.db.usuario.findUnique({where:{id:b.usuarioId},select:{id:true}}))fail(400,'Usuario no encontrado');
    if(await this.db.sancion.findFirst({where:{complejoId:b.complejoId,usuarioId:b.usuarioId,nivel:nivel!,activa:true},select:{id:true}}))fail(409,'Ya existe una sanción activa de ese nivel para este usuario');
    return {ok:true,sancion:shape(await this.db.sancion.create({data:{id:newId(),complejoId:b.complejoId!,usuarioId:b.usuarioId!,nivel:nivel!,motivo:b.motivo!.trim(),activa:true,creadoPorId:a.id,creadoEn:new Date()}}))};
  }
  async deactivate(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,roles),s=await this.db.sancion.findUnique({where:{id}});if(!s)fail(404,'No encontrada');
    if(!await this.access.owner(a,s!.complejoId))fail(403,'Sin permisos');
    return {ok:true,sancion:shape(await this.db.sancion.update({where:{id},data:{activa:false}}))};
  }
}
@Controller('api/sanciones')
export class SancionesController {
  constructor(@Inject(Sanciones)private service:Sanciones){}
  @Get() list(@Query()q:QueryValues,@Req()r:FastifyRequest){return this.service.list(q,r);}
  @Post() @HttpCode(201) create(@Body()b:SancionBody,@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Patch(':id/desactivar') deactivate(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.deactivate(id,r);}
}
