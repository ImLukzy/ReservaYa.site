import { Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Prisma } from '@reservaya/db';
import { AuthService } from '../auth/auth.service';
import { verify } from '../auth/crypto';
import { Clock, DbService } from '../public/db.service';
import { day, fail } from '../public/format';
export type Actor={id:string;rol:string};
export const ip=(r:FastifyRequest)=>String(r.headers['x-forwarded-for']||r.ip||'unknown').split(',')[0].trim();
@Injectable()
export class Access {
  constructor(@Inject(DbService)private store:DbService,@Inject(AuthService)private auth:AuthService,@Inject(Clock)private clock:Clock){}
  // expired=false mirrors the legacy middleware exclusion of /api/suscripciones.
  async actor(r:FastifyRequest,roles?:string[],expired=true):Promise<Actor>{
    const u=await this.auth.session(r),claims=verify(r.cookies?.token||r.headers.authorization?.replace(/^Bearer\s+/i,'')||'');
    const actor={id:u.id,rol:String(claims?.rol||'USUARIO')};
    if(roles&&!roles.includes(actor.rol))fail(403,'Sin permisos');
    if(expired&&actor.rol!=='USUARIO'&&actor.rol!=='TECNICO'){
      const all=await this.ids(actor,true);if(all?.length&&!(await this.enabled()).some(id=>all.includes(id)))fail(403,'Suscríbete para reactivar tu cancha.');
    }
    return actor;
  }
  async enabled(db:Prisma.TransactionClient=this.store.db){const now=this.clock.now(),today=new Date(day(now)+'T00:00:00Z');return (await db.complejo.findMany({where:{OR:[{creadoEn:{gt:new Date(now.getTime()-30*86400000)},usuarioByDuenoId:{rol:{not:'USUARIO'}}},{suscripcionByComplejoId:{some:{estado:'ACTIVA',fechaInicio:{lte:today},fechaFin:{gte:today}}}}]},select:{id:true}})).map(c=>c.id);}
  async subscribed(id:string,db:Prisma.TransactionClient=this.store.db){const today=new Date(day(this.clock.now())+'T00:00:00Z');return Boolean(await db.suscripcion.findFirst({where:{complejoId:id,estado:'ACTIVA',fechaInicio:{lte:today},fechaFin:{gte:today}}}));}
  async ids(a:Actor,blocked=false,strict=false){if(a.rol==='TECNICO'&&!strict)return null;const where:Prisma.ComplejoWhereInput={OR:[{duenoId:a.id},{complejoMiembroByComplejoId:{some:{usuarioId:a.id,activo:true}}}]};if(!blocked)where.id={in:await this.enabled()};return (await this.store.db.complejo.findMany({where,select:{id:true}})).map(c=>c.id);}
  async owner(a:Actor,id:string,db:Prisma.TransactionClient=this.store.db,blocked=false){if(!id?.trim())return false;return Boolean(await db.complejo.findFirst({where:{id,...(a.rol==='TECNICO'?{}:{duenoId:a.id,...(blocked?{}:{id:{in:(await this.enabled(db)).filter(x=>x===id)}})})}}));}
  async member(a:Actor,id:string,blocked=false){if(!id?.trim())return false;return a.rol==='TECNICO'?Boolean(await this.store.db.complejo.findUnique({where:{id}})):(await this.ids(a,blocked))!.includes(id);}
}
export const managementRoles=['ADMIN','SUPERADMIN','TECNICO'];
export const validRoles:Prisma.UsuarioGetPayload<object>['rol'][]=['USUARIO','ADMIN','SUPERADMIN','TECNICO'];
