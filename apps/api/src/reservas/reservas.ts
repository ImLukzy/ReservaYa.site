import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { Access, managementRoles, type Actor } from '../management/access';
import { canchaShape } from '../management/canchas';
import { parseEnum } from '../management/legacy';
import { databaseError, foreignKeyError } from '../management/errors';
import { cumplePlazo, horasPlazo } from './reglas';
import { Clock, DbService } from '../public/db.service';
import { fail, money, parseDay, quote, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { CorreosReserva } from './correos';
type Tx=Prisma.TransactionClient;
type Row=Prisma.ReservaGetPayload<{include:{canchaByCanchaId:true;usuarioByUsuarioId:true}}>;
type CreateBody={canchaId?:string;fecha?:string;horaInicio?:number;horaFin?:number;notas?:string};
type PatchBody={estado?:string;notas?:string};
const states=['PENDIENTE','CONFIRMADA','CANCELADA','COMPLETADA'] as const;
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const overlaps=(inicio:number,fin:number)=>({horaInicio:{lt:fin},horaFin:{gt:inicio}});
const shape=(r:Row,user:boolean)=>({id:r.id,codigo:r.codigo,usuarioId:r.usuarioId,canchaId:r.canchaId,fecha:utc(r.fecha),horaInicio:r.horaInicio,horaFin:r.horaFin,estado:r.estado,total:money(r.total),notas:r.notas,creadoEn:utc(r.creadoEn),cancha:canchaShape(r.canchaByCanchaId),usuario:user&&r.usuarioByUsuarioId?{id:r.usuarioByUsuarioId.id,nombre:r.usuarioByUsuarioId.nombre,email:r.usuarioByUsuarioId.email,rol:r.usuarioByUsuarioId.rol,activo:r.usuarioByUsuarioId.activo,creadoEn:utc(r.usuarioByUsuarioId.creadoEn)}:null});
const serial=(e:unknown)=>databaseError(e,'P2034')||databaseError(e,'40001')||(e instanceof Error&&/\bcode\s*:\s*"40001"/.test(e.message));
@Injectable()
export class Reservas {
 constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(CorreosReserva)private correos:CorreosReserva,@Inject(Clock)private clock:Clock=new Clock()){}
 private get db(){return this.store.db;}
 private async member(a:Actor,id:string,tx:Tx){if(a.rol==='TECNICO')return Boolean(await tx.complejo.findUnique({where:{id}}));return Boolean(await tx.complejo.findFirst({where:{id,AND:[{id:{in:await this.access.enabled(tx)}}],OR:[{duenoId:a.id},{complejoMiembroByComplejoId:{some:{usuarioId:a.id,activo:true}}}]}}));}
 private async scope(a:Actor,row:Pick<Row,'complejoId'|'canchaByCanchaId'>,tx:Tx){if(a.rol==='TECNICO')return true;const id=row.complejoId??row.canchaByCanchaId?.complejoId;return !id||await this.member(a,id,tx);}
 async list(r:FastifyRequest){const a=await this.access.actor(r);let where:Prisma.ReservaWhereInput={};if(a.rol==='USUARIO')where.usuarioId=a.id;else{const ids=await this.access.ids(a);if(ids!==null){if(!ids.length)return {reservas:[]};const courts=await this.db.cancha.findMany({where:{complejoId:{in:ids}},select:{id:true}});where={OR:[{complejoId:{in:ids}},{complejoId:null,canchaId:{in:courts.map(c=>c.id)}}]};}}
  const rows=await this.db.reserva.findMany({where,include:{canchaByCanchaId:true,usuarioByUsuarioId:a.rol!=='USUARIO'},orderBy:[{creadoEn:'desc'},{fecha:'desc'}]});rows.sort((x,y)=>Number(y.estado==='PENDIENTE')-Number(x.estado==='PENDIENTE'));return {reservas:rows.map(row=>shape(row as Row,a.rol!=='USUARIO'))};
 }
 async get(id:string,r:FastifyRequest){const a=await this.access.actor(r),row=await this.db.reserva.findUnique({where:{id},include:{canchaByCanchaId:true,usuarioByUsuarioId:true}});if(!row)fail(404,'No encontrada');if(a.rol==='USUARIO'?row!.usuarioId!==a.id:!await this.scope(a,row!,this.db))fail(403,'Sin permisos');return {reserva:shape(row!,true)};}
 async validate(body:{codigo?:string},r:FastifyRequest){const a=await this.access.actor(r,managementRoles),codigo=(body.codigo??'').trim().toUpperCase();if(codigo.length<3)fail(400,'Código inválido');return this.db.$transaction(async tx=>{
  const row=await tx.reserva.findUnique({where:{codigo},include:{canchaByCanchaId:true,usuarioByUsuarioId:true}});if(!row)fail(404,'Código no válido');if(!await this.scope(a,row!,tx))fail(403,'Sin permisos');if(row!.estado!=='CONFIRMADA')fail(409,({PENDIENTE:'La reserva aún está pendiente de confirmación',CANCELADA:'La reserva fue cancelada',COMPLETADA:'La reserva ya fue utilizada'} as Record<string,string>)[row!.estado]||'La reserva no está confirmada');
  await tx.reserva.update({where:{id:row!.id},data:{validadaEn:new Date(),validadaPorId:a.id}});const center=row!.complejoId??row!.canchaByCanchaId.complejoId;
  const sanctions=center?await tx.sancion.findMany({where:{activa:true,usuarioId:row!.usuarioId,complejoId:center},orderBy:{creadoEn:'desc'}}):[];sanctions.sort((x,y)=>Number(y.nivel==='BLOQUEO')-Number(x.nivel==='BLOQUEO'));const s=sanctions[0];return {ok:true,reserva:{codigo:row!.codigo,cancha:row!.canchaByCanchaId?.nombre??'',usuario:row!.usuarioByUsuarioId?.nombre??'',fecha:utc(row!.fecha).replace(/Z$/,''),horaInicio:row!.horaInicio,horaFin:row!.horaFin,estado:row!.estado,restriccion:s?{nivel:s.nivel,motivo:s.motivo}:null}};
 });}
 private async slot(tx:Tx,center:string|null,court:string,date:Date,inicio:number,fin:number){if(!center)return;let rows=await tx.horarioOperativo.findMany({where:{complejoId:center,canchaId:court}});if(!rows.length)rows=await tx.horarioOperativo.findMany({where:{complejoId:center,canchaId:null}});if(!rows.length)return;const d=rows.find(row=>row.diaSemana===date.getUTCDay());if(!d?.activo)fail(400,`Cerrado ese día (${days[date.getUTCDay()]})`);if(inicio<d!.aperturaMin||fin>d!.cierreMin){const time=(m:number)=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');fail(400,`Fuera de horario (${time(d!.aperturaMin)}–${time(d!.cierreMin)})`);}}
 async create(b:CreateBody,r:FastifyRequest){const a=await this.access.actor(r);if(!b.canchaId?.trim()||!b.fecha?.trim()||b.horaInicio==null||b.horaFin==null)fail(400,'Faltan campos requeridos');const inicio=b.horaInicio!,fin=b.horaFin!;if(inicio<0||inicio>=1440||fin<1||fin>1440||fin<=inicio)fail(400,'Horario inválido: la hora de fin debe ser posterior a la de inicio');const fecha=parseDay(b.fecha);if(!fecha)fail(400,'Fecha inválida');
  let result:Row|undefined;
  for(let attempt=0;attempt<3;attempt++){try{result=await this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT "id" FROM "Cancha" WHERE "id" = ${b.canchaId!} FOR UPDATE`;
   const court=await tx.cancha.findUnique({where:{id:b.canchaId}});if(!court?.activa)fail(400,'Cancha no disponible');const center=court!.complejoId;
   if(a.rol==='USUARIO'){
    if(center){const complejo=await tx.complejo.findFirst({where:{id:center,publicado:true,AND:[{id:{in:await this.access.enabled(tx)}}]},select:{id:true,anticipacionMinMin:true}});if(!complejo)fail(400,'Cancha no disponible');const minimo=complejo?.anticipacionMinMin??0;if(!cumplePlazo(fecha!,inicio,minimo,this.clock.now()))fail(409,`Este complejo acepta reservas con al menos ${horasPlazo(minimo)} h de anticipación`);}
   }else if(a.rol!=='TECNICO'&&center&&!await this.member(a,center,tx))fail(403,'Sin permisos');
   if(center&&await tx.sancion.findFirst({where:{activa:true,nivel:'BLOQUEO',usuarioId:a.id,complejoId:center}}))fail(403,'Este local restringió tu acceso. Contacta al administrador.');
   if(await tx.reserva.findFirst({where:{canchaId:court!.id,fecha:fecha!,estado:'CONFIRMADA',...overlaps(inicio,fin)}}))fail(409,'Ya existe una reserva en ese horario');await this.slot(tx,center,court!.id,fecha!,inicio,fin);
   const promos=await tx.promocion.findMany({where:{activa:true,tipo:'PRECIO_ESPECIAL',OR:[{canchaId:court!.id},...(center?[{complejoId:center}]:[]),{canchaId:null,complejoId:null}]}});promos.sort((x,y)=>Number(y.canchaId!==null)-Number(x.canchaId!==null)||Number(y.complejoId!==null)-Number(x.complejoId!==null)||y.creadoEn.getTime()-x.creadoEn.getTime());
   return tx.reserva.create({data:{id:newId(),codigo:'RF-'+newId().slice(0,4).toUpperCase(),usuarioId:a.id,canchaId:court!.id,fecha:fecha!,horaInicio:inicio,horaFin:fin,estado:'PENDIENTE',total:quote(court!.precioPorHora,promos,fecha!,inicio,fin).total,notas:b.notas?.trim()||null,creadoEn:new Date()},include:{canchaByCanchaId:true,usuarioByUsuarioId:true}});
  },{isolationLevel:'Serializable',timeout:15000});break;}catch(e){if(foreignKeyError(e))fail(409,'La cancha ya no está disponible');if(serial(e))fail(409,'El horario acaba de ser reservado. Elige otro horario.');if(databaseError(e,'P2002')){if(attempt===2)fail(409,'La reserva no pudo registrarse. Intenta de nuevo.');continue;}throw e;}}
  if(result?.canchaByCanchaId.complejoId){try{const center=result.canchaByCanchaId.complejoId;await this.db.$transaction(async tx=>{if(!await tx.horarioOperativo.findFirst({where:{complejoId:center,canchaId:null}}))await tx.horarioOperativo.createMany({data:days.map((_,diaSemana)=>({id:newId(),complejoId:center,diaSemana,aperturaMin:480,cierreMin:1260,activo:true,creadoEn:new Date()}))});});}catch{/* legacy best effort */}}
  void this.correos.avisar([result!.id],'creada',{dueno:true});
  return {ok:true,reserva:shape(result!,false)};
 }
 async patch(id:string,b:PatchBody,r:FastifyRequest){const a=await this.access.actor(r);let aviso=null as 'confirmada'|'cancelada'|null,rivales:string[]=[];try{const response=await this.db.$transaction(async tx=>{aviso=null;rivales=[];
  const found=await tx.reserva.findUnique({where:{id},include:{canchaByCanchaId:true}});if(!found)fail(404,'No encontrada');await tx.$queryRaw`SELECT "id" FROM "Cancha" WHERE "id" = ${found!.canchaId} FOR UPDATE`;
  const row=await tx.reserva.findUnique({where:{id},include:{canchaByCanchaId:true}});if(!row)fail(404,'No encontrada');if(a.rol==='USUARIO'){if(row!.usuarioId!==a.id)fail(403,'Sin permisos');if(b.estado&&b.estado!=='CANCELADA')fail(403,'Solo puedes cancelar tu reserva');if(b.estado==='CANCELADA'){const center=row!.complejoId??row!.canchaByCanchaId.complejoId;if(center){const reglas=await tx.complejo.findUnique({where:{id:center},select:{cancelacionMinMin:true}});const minimo=reglas?.cancelacionMinMin??0;if(!cumplePlazo(row!.fecha,row!.horaInicio,minimo,this.clock.now()))fail(409,`Solo puedes cancelar hasta ${horasPlazo(minimo)} h antes; contacta al complejo`);}}}else if(!await this.scope(a,row!,tx))fail(403,'Sin permisos');
  const data:Prisma.ReservaUpdateInput={};if(b.estado){const estado=parseEnum(states,b.estado);if(!estado)fail(400,'Estado inválido');if(estado==='CONFIRMADA'){const where={id:{not:id},canchaId:row!.canchaId,fecha:row!.fecha,...overlaps(row!.horaInicio,row!.horaFin)};if(await tx.reserva.findFirst({where:{...where,estado:'CONFIRMADA'}}))fail(409,'Ya existe una reserva confirmada en ese horario');rivales=(await tx.reserva.findMany({where:{...where,estado:'PENDIENTE'},select:{id:true}})).map(x=>x.id);await tx.reserva.updateMany({where:{...where,estado:'PENDIENTE'},data:{estado:'CANCELADA'}});}if(estado!==row!.estado&&(estado==='CONFIRMADA'||estado==='CANCELADA'))aviso=estado==='CONFIRMADA'?'confirmada':'cancelada';data.estado=estado!;}
  if(b.notas!=null)data.notas=b.notas.trim()||null;const updated=await tx.reserva.update({where:{id},data,include:{canchaByCanchaId:true,usuarioByUsuarioId:true}});return {ok:true,reserva:shape(updated,a.rol!=='USUARIO')};
 },{isolationLevel:'Serializable',timeout:15000});
  if(aviso)void this.correos.avisar([id],aviso);if(rivales.length)void this.correos.avisar(rivales,'cancelada');return response;}catch(e){if(serial(e))fail(409,'El horario acaba de ser confirmado por otra solicitud');throw e;}}
 async delete(id:string,r:FastifyRequest){const a=await this.access.actor(r,managementRoles),row=await this.db.reserva.findUnique({where:{id},include:{canchaByCanchaId:true}});if(!row)return {ok:true};if(!await this.scope(a,row,this.db))fail(403,'Sin permisos');await this.db.reserva.delete({where:{id}});return {ok:true};}
}
@Controller('api/reservas')
export class ReservasController {
 constructor(@Inject(Reservas)private service:Reservas){}
 @Get() list(@Req()r:FastifyRequest){return this.service.list(r);}
 @Get(':id') get(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.get(id,r);}
 @Post('validar') @HttpCode(200) validate(@Body()b:{codigo?:string},@Req()r:FastifyRequest){return this.service.validate(b??{},r);}
 @Post() @HttpCode(201) create(@Body()b:CreateBody,@Req()r:FastifyRequest){return this.service.create(b??{},r);}
 @Patch(':id') patch(@Param('id')id:string,@Body()b:PatchBody,@Req()r:FastifyRequest){return this.service.patch(id,b??{},r);}
 @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
}
