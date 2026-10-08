import { Body, Controller, Delete, Get, HttpCode, HttpException, Inject, Injectable, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { RateLimiter } from '../auth/rate';
import { MailProvider, htmlEncode, type EmailMessage } from '../auth/providers';
import { Access, managementRoles } from '../management/access';
import { databaseError } from '../management/errors';
import { netRoles, parseEnum } from '../management/legacy';
type Miembro=Prisma.ComplejoMiembroGetPayload<object>&{usuarioByUsuarioId?:Prisma.UsuarioGetPayload<object>|null};
type MiembroBody={complejoId?:string;email?:string;nombre?:string;rolSede?:string;activo?:boolean};
const shape=(m:Miembro)=>{const u=m.usuarioByUsuarioId;return {id:m.id,complejoId:m.complejoId,rolSede:m.rolSede,activo:m.activo,estado:m.activo?'ACTIVO':'PENDIENTE',creadoEn:utc(m.creadoEn),usuario:u?{id:u.id,nombre:u.nombre,email:u.email,rol:u.rol,activo:u.activo}:null};};
const invalidRole='rolSede inválido (solo ADMIN: el equipo opera con rol admin)';
// Public web origin from PASSWORD_RESET_URL, as Uri.GetLeftPart(Authority).
function publicOrigin(){try{const u=new URL(process.env.PASSWORD_RESET_URL||'');return `${u.protocol}//${u.host}`;}catch{return 'https://reservaya.site';}}
const button=(link:string,text:string)=>`<p><a href="${htmlEncode(link)}" style="display:inline-block;background:#22C55E;color:#060C08;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none">${htmlEncode(text)}</a></p>`;
const wrap=(body:string)=>`<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101613">${body}</div>`;
export function noticeEmail(email:string,nombre:string,invitador:string,complejo:string,base:string):EmailMessage{
  const link=`${base}/login`;
  return {to:email,subject:`${invitador} te invitó a su equipo en ${complejo}`,
    text:`Hola ${nombre},\n\n${invitador} te invitó a su equipo en ${complejo} (ReservaYa).\nEntra con tu cuenta y acepta o rechaza la invitación desde la bandeja (icono de campana):\n${link}\n\nSi no esperabas esta invitación, puedes rechazarla o ignorar este correo.`,
    html:wrap(`<p>Hola ${htmlEncode(nombre)},</p><p><strong>${htmlEncode(invitador)}</strong> te invitó a su equipo en <strong>${htmlEncode(complejo)}</strong>.</p><p>Entra con tu cuenta y acepta o rechaza la invitación desde la bandeja (icono de campana).</p>`+button(link,'Ver invitación')+'<p style="font-size:13px;color:#5B6660">Si no esperabas esta invitación, puedes rechazarla o ignorar este correo.</p>')};
}
export function signupEmail(email:string,invitador:string,complejo:string,base:string):EmailMessage{
  const link=`${base}/register`;
  return {to:email,subject:`${invitador} quiere sumarte a su equipo en ReservaYa`,
    text:`Hola,\n\n${invitador} quiere sumarte a su equipo en ${complejo} (ReservaYa), pero aún no tienes cuenta.\nCrea tu cuenta gratis con este mismo correo:\n${link}\n\nCuando te registres, avísale para que vuelva a invitarte. Si no esperabas este correo, ignóralo.`,
    html:wrap(`<p>Hola,</p><p><strong>${htmlEncode(invitador)}</strong> quiere sumarte a su equipo en <strong>${htmlEncode(complejo)}</strong>, pero aún no tienes cuenta en ReservaYa.</p><p>Crea tu cuenta gratis con este mismo correo.</p>`+button(link,'Crear mi cuenta')+'<p style="font-size:13px;color:#5B6660">Cuando te registres, avísale para que vuelva a invitarte. Si no esperabas este correo, ignóralo.</p>')};
}
@Injectable()
export class Equipo {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(RateLimiter)private rate:RateLimiter,@Inject(MailProvider)private mail:MailProvider){}
  private get db(){return this.store.db;}
  // Per-recipient cap: three invitation mails per day.
  private canMail(email:string){return !this.rate.limited(`invitar-correo:${email}`,3,86400000);}
  private role(v?:string){if(!v?.trim())return null;if(parseEnum(netRoles,v)!=='ADMIN')fail(400,invalidRole);return 'ADMIN' as const;}
  async list(complejoId:string|undefined,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);if(!complejoId?.trim())fail(400,'complejoId es requerido');
    if(!await this.db.complejo.findUnique({where:{id:complejoId},select:{id:true}}))fail(404,'Complejo no encontrado');if(!await this.access.member(a,complejoId!))fail(403,'Sin permisos');
    return {ok:true,equipo:(await this.db.complejoMiembro.findMany({where:{complejoId},include:{usuarioByUsuarioId:true},orderBy:{creadoEn:'desc'}})).map(shape)};
  }
  async invite(b:MiembroBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles);if(!b.complejoId?.trim())fail(400,'complejoId es requerido');if(!b.email?.trim())fail(400,'Email requerido');
    const c=await this.db.complejo.findUnique({where:{id:b.complejoId}});if(!c)fail(404,'Complejo no encontrado');if(!await this.access.owner(a,c!.id))fail(403,'Sin permisos');
    const rolSede=this.role(b.rolSede)??'ADMIN';
    if(this.rate.limited(`invitar:${a.id}`,30,3600000))fail(429,'Demasiadas invitaciones seguidas. Espera un rato e inténtalo de nuevo.');
    const email=b.email!.trim().toLowerCase(),invitador=(await this.db.usuario.findUnique({where:{id:a.id},select:{nombre:true}}))?.nombre??'Un dueño',base=publicOrigin();
    const u=await this.db.usuario.findUnique({where:{email}});
    if(!u){const correoEnviado=this.canMail(email)&&this.mail.queue(signupEmail(email,invitador,c!.nombre,base));throw new HttpException({error:'Esa persona aún no tiene cuenta; le enviamos un correo para registrarse. Vuelve a invitarla cuando se registre.',codigo:'SIN_CUENTA',correoEnviado},404);}
    if(u.id===a.id)fail(422,'No puedes invitarte a ti mismo.');
    if(u.rol==='SUPERADMIN'||u.rol==='TECNICO')fail(422,'Esa cuenta no puede unirse a un equipo (es dueño de un centro o personal de la plataforma).');
    if(!u.activo)fail(422,'Esa cuenta está desactivada.');
    if(await this.db.complejo.findFirst({where:{duenoId:u.id},select:{id:true}}))fail(422,'Esa persona tiene un centro propio o una solicitud de centro en revisión.');
    const existing=await this.db.complejoMiembro.findUnique({where:{usuarioId_complejoId:{usuarioId:u.id,complejoId:c!.id}}});
    if(existing?.activo)fail(409,'Esa persona ya es parte del equipo.');
    if(existing)return {ok:true,existente:true,miembro:shape({...existing,usuarioByUsuarioId:u})};
    let m;try{m=await this.db.complejoMiembro.create({data:{id:newId(),usuarioId:u.id,complejoId:c!.id,rolSede,activo:false,creadoEn:new Date()}});}
    catch(e){if(databaseError(e,'P2002'))fail(409,'Ya existe una invitación o membresía para esa persona.');throw e;}
    // Notice only after the membership is committed.
    const correoEnviado=this.canMail(email)&&this.mail.queue(noticeEmail(u.email,u.nombre,invitador,c!.nombre,base));
    return {ok:true,existente:false,miembro:shape({...m!,usuarioByUsuarioId:u}),correoEnviado};
  }
  async update(id:string,b:MiembroBody,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),m=await this.db.complejoMiembro.findUnique({where:{id},include:{usuarioByUsuarioId:true}});if(!m)fail(404,'No encontrado');
    if(!await this.access.owner(a,m!.complejoId))fail(403,'Sin permisos');
    if(b.activo!=null)fail(400,'El estado no se edita: la persona acepta la invitación y para quitarla se usa DELETE /api/equipo/{id}.');
    const rolSede=this.role(b.rolSede);if(!rolSede)return {ok:true,miembro:shape(m!)};
    return {ok:true,miembro:shape(await this.db.complejoMiembro.update({where:{id},data:{rolSede},include:{usuarioByUsuarioId:true}}))};
  }
  async delete(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),m=await this.db.complejoMiembro.findUnique({where:{id}});if(!m)return {ok:true};
    if(!await this.access.owner(a,m.complejoId))fail(403,'Sin permisos');
    await this.db.complejoMiembro.delete({where:{id}});
    // Leaving the last team revokes the admin dashboard; a pending invite never changed the role.
    if(m.activo){const u=await this.db.usuario.findUnique({where:{id:m.usuarioId}});
      if(u?.rol==='ADMIN'&&!await this.db.complejoMiembro.findFirst({where:{usuarioId:u.id,activo:true},select:{id:true}})&&!await this.db.complejo.findFirst({where:{duenoId:u.id},select:{id:true}}))await this.db.usuario.update({where:{id:u.id},data:{rol:'USUARIO',tokenVersion:{increment:1}}});}
    return {ok:true};
  }
}
@Injectable()
export class Invitaciones {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  async mine(r:FastifyRequest){
    const a=await this.access.actor(r);
    const rows=await this.db.complejoMiembro.findMany({where:{usuarioId:a.id,activo:false},orderBy:{creadoEn:'desc'},include:{complejoByComplejoId:{select:{id:true,nombre:true,distrito:true,usuarioByDuenoId:{select:{nombre:true}}}}}});
    return {ok:true,invitaciones:rows.map(m=>{const c=m.complejoByComplejoId;return {id:m.id,complejo:{id:c.id,nombre:c.nombre,distrito:c.distrito},invitadoPor:{nombre:c.usuarioByDuenoId.nombre},creadoEn:utc(m.creadoEn)};})};
  }
  async accept(id:string,r:FastifyRequest){
    const a=await this.access.actor(r),m=await this.db.complejoMiembro.findFirst({where:{id,usuarioId:a.id,activo:false},include:{complejoByComplejoId:{select:{id:true,nombre:true}}}});
    if(!m)fail(404,'La invitación ya no está disponible (quizá la cancelaron).');
    const u=await this.db.usuario.findUnique({where:{id:a.id}});if(!u)fail(401,'Sesión inválida');
    if(u!.rol==='SUPERADMIN'||u!.rol==='TECNICO')fail(409,'Tu cuenta no puede unirse a un equipo (eres dueño de un centro o personal de la plataforma).');
    if(await this.db.complejo.findFirst({where:{duenoId:a.id},select:{id:true}}))fail(409,'Tienes una solicitud de centro en revisión; no puedes unirte a un equipo mientras tanto.');
    // Privilege promotion keeps TokenVersion; the web refreshes the cookie afterwards.
    await this.db.$transaction([this.db.complejoMiembro.update({where:{id},data:{activo:true}}),...(u!.rol==='USUARIO'?[this.db.usuario.update({where:{id:a.id},data:{rol:'ADMIN'}})]:[])]);
    return {ok:true,complejo:{id:m!.complejoByComplejoId.id,nombre:m!.complejoByComplejoId.nombre},requiereRefrescarSesion:true};
  }
  async reject(id:string,r:FastifyRequest){
    const a=await this.access.actor(r),m=await this.db.complejoMiembro.findFirst({where:{id,usuarioId:a.id,activo:false}});if(!m)fail(404,'La invitación ya no está disponible.');
    await this.db.complejoMiembro.delete({where:{id}});return {ok:true};
  }
}
@Controller('api/equipo')
export class EquipoController {
  constructor(@Inject(Equipo)private service:Equipo){}
  @Get() list(@Query('complejoId')id:string|undefined,@Req()r:FastifyRequest){return this.service.list(id,r);}
  @Post() async invite(@Body()b:MiembroBody,@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){const x=await this.service.invite(b??{},r);s.status(x.existente?200:201);return x;}
  @Put(':id') update(@Param('id')id:string,@Body()b:MiembroBody,@Req()r:FastifyRequest){return this.service.update(id,b??{},r);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
}
@Controller('api/invitaciones')
export class InvitacionesController {
  constructor(@Inject(Invitaciones)private service:Invitaciones){}
  @Get('mias') mine(@Req()r:FastifyRequest){return this.service.mine(r);}
  @Post(':id/aceptar') @HttpCode(200) accept(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.accept(id,r);}
  @Post(':id/rechazar') @HttpCode(200) reject(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.reject(id,r);}
}
