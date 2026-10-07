import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, money, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { pagination } from '../sanciones/pagination';
import { Access, managementRoles } from '../management/access';
import { databaseError } from '../management/errors';
import { courtTypes, parseEnum, parseNetDateTime, plain } from '../management/legacy';
type Torneo=Prisma.TorneoGetPayload<object>;
type PartidoTorneo=Prisma.PartidoTorneoGetPayload<object>;
export type TorneoBody={complejoId?:string;nombre?:string;deporte?:string;fechaInicio?:string;fechaFin?:string;costoInscripcion?:number|string;cupoMax?:number;premio?:string;reglamento?:string;estado?:string};
export type InscripcionBody={equipo?:string;capitanId?:string;telefono?:string;pagado?:boolean};
export type PartidoBody={fase?:string;equipoA?:string;equipoB?:string;fecha?:string;canchaId?:string;golesA?:number;golesB?:number;ganador?:string};
const states=['BORRADOR','INSCRIPCIONES_ABIERTAS','EN_CURSO','FINALIZADO','CANCELADO'] as const;
const torneoShape=(t:Torneo)=>({id:t.id,complejoId:t.complejoId,nombre:t.nombre,deporte:t.deporte,fechaInicio:utc(t.fechaInicio),fechaFin:t.fechaFin?utc(t.fechaFin):null,costoInscripcion:money(t.costoInscripcion),cupoMax:t.cupoMax,premio:t.premio,reglamento:t.reglamento,estado:t.estado,creadoEn:utc(t.creadoEn)});
const inscripcionShape=(i:Prisma.InscripcionTorneoGetPayload<object>)=>({id:i.id,torneoId:i.torneoId,equipo:i.equipo,capitanId:i.capitanId,telefono:i.telefono,pagado:i.pagado,creadoEn:utc(i.creadoEn)});
// fecha is the raw DateTime: stored values are Unspecified; request values keep their parsed kind.
const partidoShape=(p:PartidoTorneo,fecha?:string|null)=>({id:p.id,torneoId:p.torneoId,fase:p.fase,equipoA:p.equipoA,equipoB:p.equipoB,golesA:p.golesA,golesB:p.golesB,fecha:fecha!==undefined?fecha:p.fecha?plain(p.fecha):null,canchaId:p.canchaId,ganador:p.ganador});
const exactDay=(v?:string)=>{const t=v?.trim();if(!t||!/^\d{4}-\d{2}-\d{2}$/.test(t))return null;const d=new Date(t+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===t?d:null;};
const winner=(a:string,b:string,ga:number|null,gb:number|null,current:string|null)=>ga===null||gb===null?current:ga>gb?a:gb>ga?b:'EMPATE';
const blank=(s?:string)=>!s?.trim();
@Injectable()
export class Torneos {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  async list(complejoId:string|undefined,r:FastifyRequest,params:{cursor?:unknown;take?:unknown}={}){
    const a=await this.access.actor(r,managementRoles),page=pagination(params.cursor,params.take),where:Prisma.TorneoWhereInput={};
    if(complejoId?.trim()){if(!await this.access.member(a,complejoId))fail(403,'Sin permisos');where.complejoId=complejoId;}
    else{const ids=await this.access.ids(a);if(ids!==null){if(!ids.length){if(page?.cursor)fail(400,'Cursor inválido');return {ok:true,...(page?{nextCursor:null}:{}),torneos:[]};}where.complejoId={in:ids};}}
    if(page?.cursor&&!await this.db.torneo.findFirst({where:{...where,id:page.cursor},select:{id:true}}))fail(400,'Cursor inválido');
    const rows=await this.db.torneo.findMany({where,orderBy:page?[{creadoEn:'desc'},{id:'asc'}]:{creadoEn:'desc'},...(page?{take:page.take+1,...(page.cursor?{cursor:{id:page.cursor},skip:1}:{})}:{}),include:{_count:{select:{inscripcionTorneoByTorneoId:true,partidoTorneoByTorneoId:true}}}});
    const items=page?rows.slice(0,page.take):rows;return {ok:true,...(page?{nextCursor:rows.length>page.take?items[items.length-1]!.id:null}:{}),torneos:items.map(t=>({...torneoShape(t),_count:{inscripciones:t._count.inscripcionTorneoByTorneoId,partidos:t._count.partidoTorneoByTorneoId}}))};
  }
  async get(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),t=await this.db.torneo.findUnique({where:{id},include:{inscripcionTorneoByTorneoId:{orderBy:{creadoEn:'asc'}},partidoTorneoByTorneoId:{orderBy:{fecha:'asc'}}}});
    if(!t)fail(404,'No encontrado');if(!await this.access.member(a,t!.complejoId))fail(403,'Sin permisos');
    return {ok:true,torneo:torneoShape(t!),inscripciones:t!.inscripcionTorneoByTorneoId.map(inscripcionShape),partidos:t!.partidoTorneoByTorneoId.map(p=>partidoShape(p))};
  }
  async create(b:TorneoBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);if(blank(b.complejoId))fail(400,'complejoId es requerido');if(blank(b.nombre))fail(400,'Nombre requerido');
    const inicio=exactDay(b.fechaInicio);if(!inicio)fail(400,'fechaInicio inválida (yyyy-MM-dd)');
    let fin:Date|null=null;if(!blank(b.fechaFin)){fin=exactDay(b.fechaFin);if(!fin)fail(400,'fechaFin inválida (yyyy-MM-dd)');if(fin!<inicio!)fail(400,'fechaFin debe ser posterior a fechaInicio');}
    let deporte:typeof courtTypes[number]='FUTBOL7';if(!blank(b.deporte)){const d=parseEnum(courtTypes,b.deporte);if(!d)fail(400,'Deporte inválido');deporte=d!;}
    if(b.costoInscripcion!=null&&Number(b.costoInscripcion)<0)fail(400,'Costo de inscripción inválido');if(b.cupoMax!=null&&b.cupoMax<=0)fail(400,'Cupo máximo inválido');
    if(!await this.db.complejo.findUnique({where:{id:b.complejoId},select:{id:true}}))fail(400,'Complejo no encontrado');if(!await this.access.owner(a,b.complejoId!))fail(403,'Sin permisos');
    const t=await this.db.torneo.create({data:{id:newId(),complejoId:b.complejoId!,nombre:b.nombre!.trim(),deporte,fechaInicio:inicio!,fechaFin:fin,costoInscripcion:b.costoInscripcion??0,cupoMax:b.cupoMax??16,premio:b.premio?.trim()||null,reglamento:b.reglamento?.trim()||null,estado:'BORRADOR',creadoEn:new Date()}});
    return {ok:true,torneo:torneoShape(t)};
  }
  async update(id:string,b:TorneoBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),t=await this.db.torneo.findUnique({where:{id}});if(!t)fail(404,'No encontrado');if(!await this.access.owner(a,t!.complejoId))fail(403,'Sin permisos');
    const data:Prisma.TorneoUncheckedUpdateInput={},next={...t!};
    if(!blank(b.nombre))data.nombre=b.nombre!.trim();
    if(!blank(b.deporte)){const d=parseEnum(courtTypes,b.deporte);if(!d)fail(400,'Deporte inválido');data.deporte=d!;}
    if(!blank(b.fechaInicio)){const d=exactDay(b.fechaInicio);if(!d)fail(400,'fechaInicio inválida (yyyy-MM-dd)');data.fechaInicio=next.fechaInicio=d!;}
    if(b.fechaFin!=null){if(blank(b.fechaFin))data.fechaFin=next.fechaFin=null;else{const d=exactDay(b.fechaFin);if(!d)fail(400,'fechaFin inválida (yyyy-MM-dd)');data.fechaFin=next.fechaFin=d;}}
    if(next.fechaFin&&next.fechaFin<next.fechaInicio)fail(400,'fechaFin debe ser posterior a fechaInicio');
    if(b.costoInscripcion!=null){if(Number(b.costoInscripcion)<0)fail(400,'Costo de inscripción inválido');data.costoInscripcion=b.costoInscripcion;}
    if(b.cupoMax!=null){if(b.cupoMax<=0)fail(400,'Cupo máximo inválido');data.cupoMax=b.cupoMax;}
    if(b.premio!=null)data.premio=b.premio.trim()||null;if(b.reglamento!=null)data.reglamento=b.reglamento.trim()||null;
    if(!blank(b.estado)){const e=parseEnum(states,b.estado);if(!e)fail(400,'Estado inválido');data.estado=e!;}
    return {ok:true,torneo:torneoShape(await this.db.torneo.update({where:{id},data}))};
  }
  async delete(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),t=await this.db.torneo.findUnique({where:{id}});if(!t)return {ok:true};if(!await this.access.owner(a,t.complejoId))fail(403,'Sin permisos');
    await this.db.torneo.delete({where:{id}});return {ok:true};
  }
  async enroll(id:string,b:InscripcionBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);if(blank(b.equipo))fail(400,'Nombre del equipo requerido');
    const found=await this.db.torneo.findUnique({where:{id}});if(!found)fail(404,'Torneo no encontrado');if(!await this.access.member(a,found!.complejoId))fail(403,'Sin permisos');
    try{return await this.db.$transaction(async tx=>{
      // Row lock keeps concurrent enrollments within CupoMax.
      await tx.$queryRaw`SELECT "id" FROM "Torneo" WHERE "id" = ${id} FOR UPDATE`;
      const t=await tx.torneo.findUnique({where:{id}});if(!t)fail(404,'Torneo no encontrado');
      if(await tx.inscripcionTorneo.count({where:{torneoId:id}})>=t!.cupoMax)fail(409,'Cupo máximo alcanzado');
      const capitanId=blank(b.capitanId)?a.id:b.capitanId!.trim();if(!await tx.usuario.findUnique({where:{id:capitanId},select:{id:true}}))fail(400,'Capitán no encontrado');
      return {ok:true,inscripcion:inscripcionShape(await tx.inscripcionTorneo.create({data:{id:newId(),torneoId:id,equipo:b.equipo!.trim(),capitanId,telefono:b.telefono?.trim()||null,pagado:b.pagado??false,creadoEn:new Date()}}))};
    });}catch(e){if(databaseError(e,'P2002'))fail(409,'Ese equipo ya está inscrito');throw e;}
  }
  async createMatch(id:string,b:PartidoBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);if(blank(b.equipoA)||blank(b.equipoB))fail(400,'Ambos equipos son requeridos');if(b.equipoA!.trim()===b.equipoB!.trim())fail(400,'Los equipos deben ser distintos');
    const t=await this.db.torneo.findUnique({where:{id}});if(!t)fail(404,'Torneo no encontrado');if(!await this.access.owner(a,t!.complejoId))fail(403,'Sin permisos');
    let fecha:{date:Date;json:string}|null=null;if(!blank(b.fecha)){fecha=parseNetDateTime(b.fecha!);if(!fecha)fail(400,'Fecha inválida');}
    if(!blank(b.canchaId)&&!await this.db.cancha.findUnique({where:{id:b.canchaId},select:{id:true}}))fail(400,'Cancha no encontrada');
    if((b.golesA!=null&&b.golesA<0)||(b.golesB!=null&&b.golesB<0))fail(400,'Goles inválidos');
    const equipoA=b.equipoA!.trim(),equipoB=b.equipoB!.trim(),golesA=b.golesA??null,golesB=b.golesB??null;
    const p=await this.db.partidoTorneo.create({data:{id:newId(),torneoId:id,fase:b.fase?.trim()||'Grupos',equipoA,equipoB,fecha:fecha?.date??null,canchaId:blank(b.canchaId)?null:b.canchaId!,golesA,golesB,ganador:blank(b.ganador)?winner(equipoA,equipoB,golesA,golesB,null):b.ganador!.trim()}});
    return {ok:true,partido:partidoShape(p,fecha?.json??null)};
  }
  async updateMatch(id:string,b:PartidoBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),p=await this.db.partidoTorneo.findUnique({where:{id}});if(!p)fail(404,'Partido no encontrado');
    const t=await this.db.torneo.findUnique({where:{id:p!.torneoId}});if(!t)fail(404,'Torneo no encontrado');if(!await this.access.owner(a,t!.complejoId))fail(403,'Sin permisos');
    const next={...p!};let fecha:string|null|undefined;
    if(!blank(b.fase))next.fase=b.fase!.trim();if(!blank(b.equipoA))next.equipoA=b.equipoA!.trim();if(!blank(b.equipoB))next.equipoB=b.equipoB!.trim();
    if(b.fecha!=null){if(blank(b.fecha)){next.fecha=null;fecha=null;}else{const d=parseNetDateTime(b.fecha);if(!d)fail(400,'Fecha inválida');next.fecha=d!.date;fecha=d!.json;}}
    if(b.canchaId!=null)next.canchaId=blank(b.canchaId)?null:b.canchaId;
    if(b.golesA!=null){if(b.golesA<0)fail(400,'Goles inválidos');next.golesA=b.golesA;}
    if(b.golesB!=null){if(b.golesB<0)fail(400,'Goles inválidos');next.golesB=b.golesB;}
    if(!blank(b.ganador))next.ganador=b.ganador!.trim();else if(b.golesA!=null||b.golesB!=null)next.ganador=winner(next.equipoA,next.equipoB,next.golesA,next.golesB,next.ganador);
    const data={fase:next.fase,equipoA:next.equipoA,equipoB:next.equipoB,fecha:next.fecha,canchaId:next.canchaId,golesA:next.golesA,golesB:next.golesB,ganador:next.ganador};
    return {ok:true,partido:partidoShape(await this.db.partidoTorneo.update({where:{id},data}),fecha)};
  }
}
@Controller('api/torneos')
export class TorneosController {
  constructor(@Inject(Torneos)private service:Torneos){}
  @Get() list(@Query('complejoId')id:string|undefined,@Req()r:FastifyRequest,@Query('cursor')cursor?:string,@Query('take')take?:string){return this.service.list(id,r,{cursor,take});}
  @Get(':id') get(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.get(id,r);}
  @Post() @HttpCode(201) create(@Body()b:TorneoBody,@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Put('partidos/:partidoId') updateMatch(@Param('partidoId')id:string,@Body()b:PartidoBody,@Req()r:FastifyRequest){return this.service.updateMatch(id,b??{},r);}
  @Put(':id') update(@Param('id')id:string,@Body()b:TorneoBody,@Req()r:FastifyRequest){return this.service.update(id,b??{},r);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
  @Post(':id/inscripciones') @HttpCode(201) enroll(@Param('id')id:string,@Body()b:InscripcionBody,@Req()r:FastifyRequest){return this.service.enroll(id,b??{},r);}
  @Post(':id/partidos') @HttpCode(201) createMatch(@Param('id')id:string,@Body()b:PartidoBody,@Req()r:FastifyRequest){return this.service.createMatch(id,b??{},r);}
}
