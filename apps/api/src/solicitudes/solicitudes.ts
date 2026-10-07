import { Body, Controller, Get, HttpCode, Inject, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { MailProvider, htmlEncode } from '../auth/providers';
import { Access } from '../management/access';
import { canchaShape, type CanchaBody } from '../management/canchas';
import { databaseError } from '../management/errors';
import { legacyImage, ownPrefix } from '../management/media';
import { courtTypes, district } from '../management/legacy';
import type { ComplejoBody } from '../complejos/complejos';
const full={usuarioByDuenoId:true,canchaByComplejoId:{orderBy:{id:'asc'}}} as const;
type Centro=Prisma.ComplejoGetPayload<{include:typeof full}>;
export type SolicitudBody={complejo?:ComplejoBody;cancha?:CanchaBody;aceptaConvenio?:boolean};
// Included courts carry their complex and owner, as the legacy include fix-up does.
function shape(c:Centro,solicitante=false){
  const cancha=c.canchaByComplejoId[0],u=c.usuarioByDuenoId;
  return {id:c.id,estado:!c.publicado&&u.rol==='USUARIO'?'PENDIENTE':'APROBADA',creadoEn:utc(c.creadoEn),complejo:{id:c.id,nombre:c.nombre,direccion:c.direccion,distrito:c.distrito,ciudad:c.ciudad,telefono:c.telefono,email:c.email,descripcion:c.descripcion,publicado:c.publicado},
    cancha:cancha?{...canchaShape(cancha),complejo:{id:c.id,nombre:c.nombre,distrito:c.distrito,ciudad:c.ciudad},dueno:{id:u.id,nombre:u.nombre}}:null,...(solicitante?{solicitante:{id:u.id,nombre:u.nombre,email:u.email}}:{})};
}
const conflict=(e:unknown)=>['P2034','P2002','P2003'].some(code=>databaseError(e,code));
// JsonStringEnumConverter accepts names case-insensitively and defined integers.
const courtType=(v:unknown)=>typeof v==='number'?courtTypes[v]??null:typeof v==='string'?courtTypes.find(t=>t===v.toUpperCase())??null:null;
@Injectable()
export class Solicitudes {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(MailProvider)private mail:MailProvider){}
  private get db(){return this.store.db;}
  async list(r:FastifyRequest){
    await this.access.actor(r,['TECNICO']);
    return {ok:true,solicitudes:(await this.db.complejo.findMany({where:{publicado:false,usuarioByDuenoId:{rol:'USUARIO'}},include:full,orderBy:{creadoEn:'asc'}})).map(c=>shape(c,true))};
  }
  async mine(r:FastifyRequest){
    const a=await this.access.actor(r,['USUARIO','SUPERADMIN']),c=await this.db.complejo.findFirst({where:{duenoId:a.id},include:full,orderBy:{creadoEn:'desc'}});
    return {ok:true,solicitud:c?shape(c):null};
  }
  async create(b:SolicitudBody,r:FastifyRequest){
    const a=await this.access.actor(r,['USUARIO']),centro=b.complejo,cancha=b.cancha;
    if(b.aceptaConvenio!==true)fail(400,'Debes aceptar el convenio de prueba y los Términos.');
    const tipo=courtType(cancha?.tipo);
    if(!centro||!cancha||!centro.nombre?.trim()||!centro.direccion?.trim()||!cancha.nombre?.trim()||!tipo||cancha.capacidad==null||cancha.capacidad<=0||cancha.precioPorHora==null||Number(cancha.precioPorHora)<=0)fail(400,'Completa los datos del centro y de una cancha con precio y capacidad mayores que cero.');
    const distrito=district(centro!.distrito);if(!distrito)fail(400,'Distrito inválido: debe ser un distrito de Arequipa.');
    const imagen=cancha!.imagen?.trim()?legacyImage(cancha!.imagen,ownPrefix('cancha',a)):null;if(cancha!.imagen?.trim()&&!imagen)fail(400,'Imagen inválida.');
    try{return await this.db.$transaction(async tx=>{
      const u=await tx.usuario.findUnique({where:{id:a.id}});if(!u||u.rol!=='USUARIO')fail(403,'Solo jugadores pueden solicitar un centro.');
      if(await tx.complejo.findFirst({where:{duenoId:a.id},select:{id:true}}))fail(409,'Ya tienes un centro pendiente o aprobado.');
      const now=new Date(),id=newId();
      const c=await tx.complejo.create({data:{id,duenoId:a.id,nombre:centro!.nombre!.trim(),direccion:centro!.direccion!.trim(),distrito:distrito!,ciudad:'Arequipa',telefono:centro!.telefono?.trim()??null,email:centro!.email?.trim()??null,descripcion:centro!.descripcion?.trim()??null,publicado:false,slug:`centro-${id}`,creadoEn:now,actualizadoEn:now,
        canchaByComplejoId:{create:{id:newId(),nombre:cancha!.nombre!.trim(),tipo:tipo!,precioPorHora:cancha!.precioPorHora!,capacidad:cancha!.capacidad!,descripcion:cancha!.descripcion?.trim()??null,techada:cancha!.techada??false,superficie:cancha!.superficie?.trim()??null,imagen,activa:false,creadoEn:now}}},include:full});
      return {ok:true,solicitud:shape(c)};
    },{isolationLevel:'Serializable'});}catch(e){if(conflict(e))fail(409,'Otra solicitud cambió tus centros. Revisa el estado antes de reintentar.');throw e;}
  }
  async approve(id:string,r:FastifyRequest){
    await this.access.actor(r,['TECNICO']);
    try{return await this.db.$transaction(async tx=>{
      const c=await tx.complejo.findUnique({where:{id},include:full});if(!c)fail(404,'Solicitud no encontrada.');
      if(c!.publicado||c!.usuarioByDuenoId.rol!=='USUARIO')fail(409,'Solo se aprueban solicitudes pendientes de jugadores.');
      if(c!.canchaByComplejoId.length!==1||c!.canchaByComplejoId.some(x=>x.activa))fail(409,'La solicitud debe contener exactamente una cancha inactiva.');
      if(await tx.complejo.findFirst({where:{duenoId:c!.duenoId,id:{not:id}},select:{id:true}}))fail(409,'El solicitante ya tiene otro centro.');
      // Promotion only: TokenVersion is kept, the web refreshes the session afterwards.
      const now=new Date();await tx.cancha.update({where:{id:c!.canchaByComplejoId[0].id},data:{activa:true}});await tx.usuario.update({where:{id:c!.duenoId},data:{rol:'SUPERADMIN'}});
      const updated=await tx.complejo.update({where:{id},data:{publicado:true,creadoEn:now,actualizadoEn:now},include:full});
      return {ok:true,solicitud:shape(updated),requiereRefrescarSesion:true};
    },{isolationLevel:'Serializable'});}catch(e){if(conflict(e))fail(409,'La solicitud cambió durante la revisión. Recarga antes de reintentar.');throw e;}
  }
  async reject(id:string,b:{motivo?:string},r:FastifyRequest){
    await this.access.actor(r,['TECNICO']);const motivo=b.motivo?.trim();if(!motivo||motivo.length>2000)fail(400,'Indica un motivo de hasta 2000 caracteres.');
    let to:string;
    try{to=await this.db.$transaction(async tx=>{
      const c=await tx.complejo.findUnique({where:{id},include:full});if(!c)fail(404,'Solicitud no encontrada.');
      if(c!.publicado||c!.usuarioByDuenoId.rol!=='USUARIO')fail(409,'Solo se rechazan solicitudes pendientes de jugadores.');
      if(c!.canchaByComplejoId.some(x=>x.activa))fail(409,'La solicitud tiene canchas activas; no se puede borrar.');
      await tx.cancha.deleteMany({where:{complejoId:id}});await tx.complejo.delete({where:{id}});return c!.usuarioByDuenoId.email;
    },{isolationLevel:'Serializable'});}catch(e){if(conflict(e))fail(409,'La solicitud cambió o tiene datos asociados. No se rechazó; recarga antes de reintentar.');throw e;}
    // Notice after commit, only through a real provider; failures keep the rejection.
    let emailEnviado=false;
    if(this.mail.configured()){try{await this.mail.deliver({to,subject:'Solicitud de centro revisada — ReservaYa',text:`Tu solicitud fue rechazada. Motivo: ${motivo}\nPuedes enviar una nueva solicitud desde tu panel.`,html:`<p>Tu solicitud fue rechazada.</p><p>Motivo: ${htmlEncode(motivo!)}</p><p>Puedes enviar una nueva solicitud desde tu panel.</p>`});emailEnviado=true;}catch{/* legacy logs a warning only */}}
    return {ok:true,estado:'RECHAZADA',emailEnviado};
  }
}
@Controller('api/solicitudes')
export class SolicitudesController {
  constructor(@Inject(Solicitudes)private service:Solicitudes){}
  @Get() list(@Req()r:FastifyRequest){return this.service.list(r);}
  @Get('mias') mine(@Req()r:FastifyRequest){return this.service.mine(r);}
  @Post() @HttpCode(201) create(@Body()b:SolicitudBody,@Req()r:FastifyRequest){return this.service.create(b??{},r);}
  @Patch(':id/aprobar') approve(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.approve(id,r);}
  @Patch(':id/rechazar') reject(@Param('id')id:string,@Body()b:{motivo?:string},@Req()r:FastifyRequest){return this.service.reject(id,b??{},r);}
}
