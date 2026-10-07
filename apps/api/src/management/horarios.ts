import { Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles } from './access';
export type HorarioBody={complejoId?:string;canchaId?:string;dias?:{dia:number;apertura?:number;cierre?:number;activo?:boolean}[]};
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const clockTime=(v:number|null)=>v===null?null:String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0');
@Injectable()
export class Horarios {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  async list(complejoId:string|undefined,canchaId:string|undefined,r:FastifyRequest){const a=await this.access.actor(r);if(!complejoId?.trim())fail(400,'complejoId es requerido');if(!await this.access.member(a,complejoId!))fail(403,'Sin permisos');const rows=await this.store.db.horarioOperativo.findMany({where:{complejoId,...(canchaId?.trim()?{canchaId}:{})},orderBy:[{canchaId:{sort:'asc',nulls:'last'}},{diaSemana:'asc'}]});return {ok:true,horarios:rows.map(h=>({id:h.id,complejoId:h.complejoId,canchaId:h.canchaId,diaSemana:h.diaSemana,dia:days[h.diaSemana]||'Sábado',aperturaMin:h.aperturaMin,cierreMin:h.cierreMin,apertura:clockTime(h.aperturaMin),cierre:clockTime(h.cierreMin),activo:h.activo}))};}
  async replace(b:HorarioBody,r:FastifyRequest){const a=await this.access.actor(r,managementRoles);if(!b.complejoId?.trim())fail(400,'complejoId es requerido');if(!await this.access.owner(a,b.complejoId!))fail(403,'Sin permisos');if(!b.dias?.length)fail(400,'Envía al menos un día');const canchaId=b.canchaId?.trim()||null;
    if(canchaId&&!await this.store.db.cancha.findFirst({where:{id:canchaId,complejoId:b.complejoId}}))fail(400,'La cancha no es de ese complejo');const seen=new Set<number>();
    for(const d of b.dias!){if(d.dia<0||d.dia>6)fail(400,'Día inválido (0 = domingo, 6 = sábado)');if(seen.has(d.dia))fail(400,'Día duplicado');seen.add(d.dia);const ap=d.apertura??480,ci=d.cierre??1260;if(ap<0||ap>=1440||ci<1||ci>1440||ci<=ap)fail(400,`Horario inválido el día ${d.dia}`);}
    await this.store.db.$transaction(async tx=>{await tx.horarioOperativo.deleteMany({where:{complejoId:b.complejoId,canchaId}});await tx.horarioOperativo.createMany({data:b.dias!.map(d=>({id:newId(),complejoId:b.complejoId!,canchaId,diaSemana:d.dia,aperturaMin:d.apertura??480,cierreMin:d.cierre??1260,activo:d.activo??true,creadoEn:new Date()}))});});return {ok:true};
  }
}
