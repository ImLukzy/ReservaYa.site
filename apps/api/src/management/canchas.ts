import { databaseError, foreignKeyError } from './errors';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, money, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles, type Actor } from './access';
import { Media, base, legacyImage, mediaUrl, ownPrefix } from './media';
type Cancha=Prisma.CanchaGetPayload<object>;
export const canchaShape=(c:Cancha)=>({id:c.id,nombre:c.nombre,tipo:c.tipo,descripcion:c.descripcion,precioPorHora:money(c.precioPorHora),capacidad:c.capacidad,techada:c.techada,superficie:c.superficie,activa:c.activa,imagen:c.imagen,complejoId:c.complejoId,creadoEn:utc(c.creadoEn),complejo:null,dueno:null});
export type CanchaBody={nombre?:string;tipo?:Cancha['tipo'];descripcion?:string;precioPorHora?:string|number;capacidad?:number;activa?:boolean;complejoId?:string;techada?:boolean;superficie?:string;imagen?:string};
const clean=(s?:string)=>s?.trim()||null;
const race='Otra solicitud cambió las canchas. Revisa la lista antes de reintentar.';
@Injectable()
export class Canchas {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(Media)private media:Media){}
  private async owner(a:Actor,c:Cancha,db:Prisma.TransactionClient=this.store.db){if(a.rol!=='TECNICO'&&(!c.complejoId||!await this.access.owner(a,c.complejoId,db)))fail(403,'Sin permisos');}
  private async target(a:Actor,id:string,db:Prisma.TransactionClient){if(!await db.complejo.findUnique({where:{id}}))fail(400,'Complejo no encontrado');if(!await this.access.owner(a,id,db))fail(403,'Sin permisos');}
  private async quota(tx:Prisma.TransactionClient,id:string,a:Actor,move?:string){
    if(!(await this.access.enabled(tx)).includes(id))fail(403,move?'Suscríbete para reactivar la cancha del complejo de destino.':'Suscríbete para reactivar tu cancha.');
    if(!await this.access.subscribed(id,tx)&&await tx.cancha.findFirst({where:{complejoId:id,...(move?{id:{not:move}}:{})}}))fail(409,move?'El complejo de destino está en prueba y permite máximo una cancha.':'La prueba gratis permite máximo una cancha. Solicita una suscripción para añadir otra.');
  }
  private async transaction<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>){try{return await this.store.db.$transaction(fn,{isolationLevel:'Serializable'});}catch(e){if(databaseError(e,'P2034'))fail(409,race);throw e;}}
  async create(b:CanchaBody,r:FastifyRequest){const a=await this.access.actor(r,managementRoles);return this.transaction(async tx=>{
    if(!clean(b.nombre)||b.tipo==null||b.precioPorHora==null||b.capacidad==null)fail(400,'Faltan campos requeridos');if(Number(b.precioPorHora)<=0||b.capacidad!<=0)fail(400,'El precio y la capacidad deben ser mayores que cero');
    const complejoId=clean(b.complejoId);if(!complejoId&&a.rol!=='TECNICO')fail(400,'Asignar un complejo es obligatorio: sin complejo tu cancha no aparece en búsquedas por lugar ni dueño.');
    if(complejoId){await this.target(a,complejoId,tx);await this.quota(tx,complejoId,a);}
    const imagen=clean(b.imagen)?legacyImage(b.imagen,ownPrefix('cancha',a)):null;if(clean(b.imagen)&&!imagen)fail(400,'Imagen inválida (URL http(s) o ruta / de hasta 500 caracteres)');
    const c=await tx.cancha.create({data:{id:newId(),nombre:b.nombre!.trim(),tipo:b.tipo!,descripcion:clean(b.descripcion),precioPorHora:b.precioPorHora!,capacidad:b.capacidad!,activa:b.activa??true,complejoId,techada:b.techada??false,superficie:clean(b.superficie),imagen,creadoEn:new Date()}});return {ok:true,cancha:canchaShape(c)};
  });}
  async update(id:string,b:CanchaBody,r:FastifyRequest){const a=await this.access.actor(r,managementRoles);let before:string|null=null,after:string|null=null;
    const result=await this.transaction(async tx=>{
      const c=await tx.cancha.findUnique({where:{id}});if(!c)fail(404,'No encontrada');await this.owner(a,c!,tx);before=c!.imagen;
      const data:Prisma.CanchaUncheckedUpdateInput={};if(clean(b.nombre))data.nombre=b.nombre!.trim();if(b.tipo!=null)data.tipo=b.tipo;
      for(const k of ['descripcion','superficie'] as const)if(b[k]!=null)data[k]=clean(b[k]);
      if(b.precioPorHora!=null){if(Number(b.precioPorHora)<=0)fail(400,'El precio debe ser mayor que cero');data.precioPorHora=b.precioPorHora;}
      if(b.capacidad!=null){if(b.capacidad<=0)fail(400,'La capacidad debe ser mayor que cero');data.capacidad=b.capacidad;}
      if(b.activa!=null)data.activa=b.activa;if(b.techada!=null)data.techada=b.techada;
      if(b.imagen!=null){const v=clean(b.imagen)?legacyImage(b.imagen,b.imagen.trim()===c!.imagen?undefined:ownPrefix('cancha',a)):null;if(clean(b.imagen)&&!v)fail(400,'Imagen inválida (URL http(s) o ruta / de hasta 500 caracteres)');data.imagen=v;}
      if(b.complejoId!=null){const next=clean(b.complejoId);if(next!==c!.complejoId){if(!next&&a.rol!=='TECNICO')fail(400,'No puedes quitar la cancha de su complejo: contacta al administrador.');if(next){await this.target(a,next,tx);await this.quota(tx,next,a,id);}data.complejoId=next;}}
      const updated=await tx.cancha.update({where:{id},data});after=updated.imagen;return {ok:true,cancha:canchaShape(updated)};
    });if(before!==after)await this.media.remove(before,'cancha',true);return result;
  }
  async delete(id:string,r:FastifyRequest){const a=await this.access.actor(r,['SUPERADMIN','TECNICO']),c=await this.store.db.cancha.findUnique({where:{id}});if(!c)return {ok:true};await this.owner(a,c);
    if(await this.store.db.reserva.count({where:{canchaId:id}}))fail(409,'No se puede eliminar: la cancha tiene reservas asociadas. Desactívala en su lugar.');try{await this.store.db.cancha.delete({where:{id}});}catch(e){if(foreignKeyError(e))fail(409,'No se puede eliminar: la cancha tiene reservas asociadas. Desactívala en su lugar.');throw e;}await this.media.remove(c.imagen,'cancha',true);return {ok:true};
  }
  async image(id:string,b:{url?:string},r:FastifyRequest){const a=await this.access.actor(r,managementRoles);if(!base())fail(503,'La subida de imágenes no está configurada');const c=await this.store.db.cancha.findUnique({where:{id}});if(!c)fail(404,'No encontrada');await this.owner(a,c!);
    const url=mediaUrl(b.url,b.url?.trim()===c!.imagen?undefined:ownPrefix('cancha',a));if(!url)fail(400,'URL de imagen inválida');const updated=await this.store.db.cancha.update({where:{id},data:{imagen:url}});if(c!.imagen!==url)await this.media.remove(c!.imagen,'cancha',true);return {ok:true,cancha:canchaShape(updated)};
  }
  async upload(id:string,r:FastifyRequest,res:FastifyReply){const a=await this.access.actor(r,managementRoles);res.header('Deprecation','true');const c=await this.store.db.cancha.findUnique({where:{id}});if(!c)fail(404,'No encontrada');await this.owner(a,c!);
    const imagen=await this.media.upload(r,'canchas',id);const updated=await this.store.db.cancha.update({where:{id},data:{imagen}});await this.media.remove(c!.imagen,'cancha');return {ok:true,cancha:canchaShape(updated)};
  }
}
