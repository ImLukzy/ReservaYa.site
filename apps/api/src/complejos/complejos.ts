import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Put, Req } from '@nestjs/common';
import { puntoEnArequipa } from '@reservaya/shared';
import { mediaUrl } from '../management/media';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { Clock, DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles } from '../management/access';
import { canchaShape } from '../management/canchas';
import { databaseError, foreignKeyError } from '../management/errors';
import { clean, district, roundEven, utcToday } from '../management/legacy';
import { subscriptionShape } from '../suscripciones/suscripciones';
type Complejo=Prisma.ComplejoGetPayload<object>;
export type ComplejoBody={nombre?:string;direccion?:string;distrito?:string;ciudad?:string;telefono?:string;descripcion?:string;email?:string;publicado?:boolean;fotos?:string[];latitud?:number|null;longitud?:number|null;anticipacionMinMin?:number;cancelacionMinMin?:number;politica?:string|null};
type Stats={canchas:number;proximas:number;ocupacion:number};
const shape=(c:Complejo,canchas:number,proximas:number,ocupacion:number,suscripcion:unknown=null)=>({id:c.id,nombre:c.nombre,slug:c.slug,direccion:c.direccion,distrito:c.distrito,ciudad:c.ciudad,telefono:c.telefono,email:c.email,descripcion:c.descripcion,publicado:c.publicado,fotos:c.fotos,latitud:c.latitud,longitud:c.longitud,anticipacionMinMin:c.anticipacionMinMin,cancelacionMinMin:c.cancelacionMinMin,politica:c.politica,duenoId:c.duenoId,totalCanchas:canchas,reservasProximas:proximas,ocupacion,suscripcion,creadoEn:utc(c.creadoEn)});
// Legacy slug: lowercase, strip combining marks and collapse every other run into '-'.
export const slugify=(nombre:string)=>nombre.trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'complejo';
function reglas(b:ComplejoBody) {
  const data:{anticipacionMinMin?:number;cancelacionMinMin?:number;politica?:string|null}={};
  for(const [key,max] of [['anticipacionMinMin',2880],['cancelacionMinMin',4320]] as const){
    if(b[key]!==undefined){if(typeof b[key]!=='number'||!Number.isInteger(b[key])||b[key]!<0||b[key]!>max)fail(400,`Regla inválida: ${key} debe estar entre 0 y ${max} minutos`);data[key]=b[key];}
  }
  if(b.politica!==undefined){if(b.politica!==null&&(typeof b.politica!=='string'||b.politica.length>300))fail(400,'La política admite hasta 300 caracteres');data.politica=b.politica?.trim()||null;}
  return data;
}
function medios(b:ComplejoBody, anterior?:{latitud:number|null;longitud:number|null}) {
  const data:{fotos?:string[];latitud?:number|null;longitud?:number|null}={};
  if(b.fotos!==undefined){
    if(!Array.isArray(b.fotos)||b.fotos.length>6)fail(400,'Admite hasta 6 fotos');
    if(b.fotos.some(f=>typeof f!=='string'||!mediaUrl(f)||!/\.(jpg|png|webp)$/i.test(f)))fail(400,'Las fotos deben pertenecer al bucket propio (JPG, PNG o WebP)');
    data.fotos=b.fotos;
  }
  if(b.latitud!==undefined||b.longitud!==undefined){
    const lat=b.latitud===undefined?anterior?.latitud:b.latitud,lng=b.longitud===undefined?anterior?.longitud:b.longitud;
    if(lat===null&&lng===null){data.latitud=null;data.longitud=null;}
    else {if(!puntoEnArequipa(lat,lng))fail(400,'La ubicación debe estar dentro del área de Arequipa');data.latitud=lat;data.longitud=lng;}
  }
  return data;
}
const race='Otra solicitud cambió tus complejos. Revisa la lista antes de reintentar.';
@Injectable()
export class Complejos {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(Clock)private clock:Clock){}
  private get db(){return this.store.db;}
  // Upcoming non-cancelled bookings for 7 days; occupancy over 12 h per court and day.
  private async stats(ids:string[]){
    const result=new Map<string,Stats>(ids.map(id=>[id,{canchas:0,proximas:0,ocupacion:0}]));if(!ids.length)return result;
    const canchas=await this.db.cancha.findMany({where:{complejoId:{in:ids}},select:{id:true,complejoId:true}}),owner=new Map(canchas.map(c=>[c.id,c.complejoId!]));
    for(const c of canchas)result.get(c.complejoId!)!.canchas++;
    const today=utcToday(this.clock.now()),limit=new Date(today.getTime()+7*86400000);
    const reservas=await this.db.reserva.findMany({where:{fecha:{gte:today,lt:limit},estado:{not:'CANCELADA'},OR:[{complejoId:{in:ids}},{complejoId:null,canchaId:{in:[...owner.keys()]}}]},select:{complejoId:true,canchaId:true,horaInicio:true,horaFin:true}});
    const hours=new Map<string,number>(),count=new Map<string,number>();
    for(const r of reservas){const id=r.complejoId??owner.get(r.canchaId);if(!id||!result.has(id))continue;count.set(id,(count.get(id)??0)+1);hours.set(id,(hours.get(id)??0)+(r.horaFin-r.horaInicio)/60);}
    for(const [id,s]of result){const denom=s.canchas*12*7;s.proximas=count.get(id)??0;s.ocupacion=denom>0?roundEven((hours.get(id)??0)/denom*100,1):0;}
    return result;
  }
  // Latest ACTIVA subscription by FechaFin, regardless of validity.
  private async subscriptions(ids:string[]){
    const result=new Map<string,ReturnType<typeof subscriptionShape>>();if(!ids.length)return result;
    const now=this.clock.now();for(const s of await this.db.suscripcion.findMany({where:{complejoId:{in:ids},estado:'ACTIVA'},include:{complejoByComplejoId:{select:{nombre:true}}},orderBy:{fechaFin:'desc'}}))if(!result.has(s.complejoId))result.set(s.complejoId,subscriptionShape(s,now));
    return result;
  }
  async list(r:FastifyRequest){
    const a=await this.access.actor(r),ids=await this.access.ids(a);
    const rows=await this.db.complejo.findMany({where:ids===null?{}:{id:{in:ids}},orderBy:{nombre:'asc'}}),keys=rows.map(c=>c.id),[stats,subs]=await Promise.all([this.stats(keys),this.subscriptions(keys)]);
    return {ok:true,complejos:rows.map(c=>{const s=stats.get(c.id)!;return shape(c,s.canchas,s.proximas,s.ocupacion,subs.get(c.id)??null);})};
  }
  async get(id:string,r:FastifyRequest){
    const a=await this.access.actor(r),c=await this.db.complejo.findUnique({where:{id}});if(!c)fail(404,'No encontrado');if(!await this.access.member(a,id))fail(403,'Sin permisos');
    const canchas=await this.db.cancha.findMany({where:{complejoId:id},orderBy:{nombre:'asc'}}),[stats,subs]=await Promise.all([this.stats([id]),this.subscriptions([id])]),s=stats.get(id)!;
    return {ok:true,complejo:shape(c!,canchas.length,s.proximas,s.ocupacion,subs.get(id)??null),canchas:canchas.map(canchaShape)};
  }
  async create(b:ComplejoBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),extra={...medios(b),...reglas(b)};
    try{return await this.db.$transaction(async tx=>{
      if(!clean(b.nombre)||!clean(b.direccion)||!clean(b.distrito))fail(400,'Nombre, dirección y distrito son requeridos');
      const distrito=district(b.distrito);if(!distrito)fail(400,'Distrito inválido: debe ser un distrito de Arequipa');
      const today=utcToday(this.clock.now()),propios=await tx.complejo.findMany({where:{duenoId:a.id},select:{id:true,suscripcionByComplejoId:{where:{estado:'ACTIVA',fechaInicio:{lte:today},fechaFin:{gte:today}},select:{id:true},take:1}}});
      if(propios.length&&!propios.some(p=>p.suscripcionByComplejoId.length))fail(409,'La prueba permite un complejo con una cancha. Suscríbete antes de crear otro complejo.');
      const base=slugify(b.nombre!);let slug=base;for(let i=2;await tx.complejo.findUnique({where:{slug},select:{id:true}});i++)slug=`${base}-${i}`;
      const now=new Date(),c=await tx.complejo.create({data:{...extra,id:newId(),nombre:b.nombre!.trim(),direccion:b.direccion!.trim(),distrito:distrito!,ciudad:'Arequipa',telefono:clean(b.telefono),descripcion:clean(b.descripcion),email:clean(b.email),slug,publicado:true,duenoId:a.id,creadoEn:now,actualizadoEn:now}});
      return {ok:true,complejo:shape(c,0,0,0)};
    },{isolationLevel:'Serializable'});}
    catch(e){if(databaseError(e,'P2002'))fail(409,'Ya existe un complejo con ese nombre');if(databaseError(e,'P2034'))fail(409,race);throw e;}
  }
  async update(id:string,b:ComplejoBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),c=await this.db.complejo.findUnique({where:{id},include:{usuarioByDuenoId:{select:{rol:true}}}});if(!c)fail(404,'No encontrado');
    if(a.rol!=='TECNICO'&&c!.duenoId!==a.id)fail(403,'Sin permisos');
    const data:Prisma.ComplejoUncheckedUpdateInput={...medios(b,c!),...reglas(b)};if(clean(b.nombre))data.nombre=b.nombre!.trim();if(clean(b.direccion))data.direccion=b.direccion!.trim();
    if(clean(b.distrito)){const d=district(b.distrito);if(!d)fail(400,'Distrito inválido: debe ser un distrito de Arequipa');data.distrito=d!;}
    data.ciudad='Arequipa';for(const k of ['telefono','descripcion','email'] as const)if(b[k]!=null)data[k]=clean(b[k]);
    if(b.publicado===true&&c!.usuarioByDuenoId.rol==='USUARIO')fail(409,'Aprueba la solicitud del jugador desde Solicitudes.');
    if(b.publicado!=null)data.publicado=b.publicado;data.actualizadoEn=new Date();
    const updated=await this.db.complejo.update({where:{id},data});return {ok:true,complejo:shape(updated,await this.db.cancha.count({where:{complejoId:id}}),0,0)};
  }
  async delete(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),c=await this.db.complejo.findUnique({where:{id}});if(!c)return {ok:true};
    if(a.rol!=='TECNICO'&&c.duenoId!==a.id)fail(403,'Sin permisos');
    const canchas=(await this.db.cancha.findMany({where:{complejoId:id},select:{id:true}})).map(x=>x.id);
    if(await this.db.reserva.findFirst({where:{OR:[{complejoId:id},{canchaId:{in:canchas}}]},select:{id:true}}))fail(409,'No se puede eliminar: el complejo tiene reservas asociadas');
    try{await this.db.complejo.delete({where:{id}});}catch(e){if(foreignKeyError(e))fail(409,'No se puede eliminar: el complejo tiene registros asociados');throw e;}
    return {ok:true};
  }
}
@Controller('api/complejos')
export class ComplejosController {
  constructor(@Inject(Complejos)private service:Complejos){}
  @Get() list(@Req()r:FastifyRequest){return this.service.list(r);}
  @Get(':id') get(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.get(id,r);}
  @Post() @HttpCode(201) create(@Body()b:ComplejoBody,@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Put(':id') update(@Param('id')id:string,@Body()b:ComplejoBody,@Req()r:FastifyRequest){return this.service.update(id,b??{},r);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
}
