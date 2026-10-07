import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, parseDay, day, money, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles, type Actor } from './access';
import { clockTime } from './horarios';
type Promo=Prisma.PromocionGetPayload<object>;
export type PromoBody={complejoId?:string;canchaId?:string;nombre?:string;codigo?:string;tipo?:string;valor?:number|string;horaDesde?:number;horaHasta?:number;usosMax?:number;fechaInicio?:string;fechaFin?:string;descripcion?:string;activa?:boolean;precioDia?:number|string;precioTarde?:number|string;precioNoche?:number|string;inicioTarde?:string;inicioNoche?:string;repetirAnual?:boolean;desde?:string;hasta?:string};
const clean=(s?:string)=>s?.trim()||null;
const kinds:Promo['tipo'][]=['PORCENTAJE','MONTO_FIJO','PRECIO_ESPECIAL'];
export const parseClock=(v?:string)=>{if(!v?.trim())return null;const parts=v.trim().split(':');if(parts.length!==2||parts.some(x=>! /^[+-]?\d+$/.test(x.trim())))return null;const [h,m]=parts.map(Number);return h<0||h>24||m<0||m>59||(h===24&&m!==0)?null:h*60+m;};
const promoShape=(p:Promo)=>({id:p.id,complejoId:p.complejoId,canchaId:p.canchaId,nombre:p.nombre,codigo:p.codigo,tipo:p.tipo,valor:money(p.valor),usosMax:p.usosMax,usosActuales:p.usosActuales,activa:p.activa,horaDesde:p.horaDesde,horaHasta:p.horaHasta,desde:p.fechaInicio?day(p.fechaInicio):null,hasta:p.fechaFin?day(p.fechaFin):null,precioDia:p.precioDia===null?null:Number(p.precioDia),precioTarde:p.precioTarde===null?null:Number(p.precioTarde),precioNoche:p.precioNoche===null?null:Number(p.precioNoche),inicioTarde:clockTime(p.inicioTarde),inicioNoche:clockTime(p.inicioNoche),repetirAnual:p.repetirAnual,descripcion:p.descripcion,creadoEn:utc(p.creadoEn)});
@Injectable()
export class Promociones {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private async owner(a:Actor,p:Promo){if(a.rol==='TECNICO')return;let id=p.complejoId;if(!id&&p.canchaId)id=(await this.store.db.cancha.findUnique({where:{id:p.canchaId}}))?.complejoId??null;if(!id||!await this.access.owner(a,id))fail(403,'Sin permisos');}
  async list(complejoId:string|undefined,tipo:string|undefined,r:FastifyRequest){const a=await this.access.actor(r,managementRoles),where:Prisma.PromocionWhereInput={};
    if(complejoId?.trim()){if(!await this.access.member(a,complejoId))fail(403,'Sin permisos');where.complejoId=complejoId;}else{const ids=await this.access.ids(a);if(ids!==null){if(!ids.length)return {ok:true,promociones:[]};where.complejoId={in:ids};}}
    if(tipo?.trim()){const t=tipo.trim().toLowerCase();if(['descuento','descuentos'].includes(t))where.codigo={not:null};else if(['precio','precio_especial','precios_especiales','precios'].includes(t))where.tipo='PRECIO_ESPECIAL';else{const k=kinds.find(x=>x.toLowerCase()===t);if(!k)fail(400,'Tipo inválido');where.tipo=k;}}
    return {ok:true,promociones:(await this.store.db.promocion.findMany({where,orderBy:{creadoEn:'desc'}})).map(promoShape)};
  }
  async create(b:PromoBody,r:FastifyRequest){const a=await this.access.actor(r,managementRoles);if(a.rol!=='TECNICO'&&!clean(b.complejoId)&&!clean(b.canchaId))fail(403,'Solo la plataforma gestiona promociones globales.');const tipo=kinds.find(x=>x.toLowerCase()===b.tipo?.toLowerCase());if(!tipo)fail(400,'Tipo inválido (PORCENTAJE, MONTO_FIJO, PRECIO_ESPECIAL)');
    const bands=[b.precioDia,b.precioTarde,b.precioNoche];if(!bands.some(v=>Number(v??0)>0)&&(b.valor==null||Number(b.valor)<=0))fail(400,'Valor inválido');if(b.valor!=null&&tipo==='PORCENTAJE'&&Number(b.valor)>100)fail(400,'El porcentaje no puede superar 100');if(bands.some(v=>Number(v??0)<0))fail(400,'Precios de franja inválidos');
    const inicioTarde=parseClock(b.inicioTarde),inicioNoche=parseClock(b.inicioNoche);if(b.inicioTarde!=null&&inicioTarde===null)fail(400,'inicioTarde inválido (HH:MM)');if(b.inicioNoche!=null&&inicioNoche===null)fail(400,'inicioNoche inválido (HH:MM)');if(inicioTarde!==null&&inicioNoche!==null&&inicioNoche<=inicioTarde)fail(400,'inicioNoche debe ser posterior a inicioTarde');
    const rawFrom=clean(b.fechaInicio)?b.fechaInicio:b.desde,rawTo=clean(b.fechaFin)?b.fechaFin:b.hasta,fechaInicio=parseDay(rawFrom),fechaFin=parseDay(rawTo);if((rawFrom!=null&&!fechaInicio)||(rawTo!=null&&!fechaFin))fail(400,'Fechas inválidas (yyyy-MM-dd)');if(fechaInicio&&fechaFin&&fechaFin<fechaInicio)fail(400,'La fecha Hasta no puede ser anterior a Desde');
    const codigo=clean(b.codigo)?.toUpperCase()??null,nombre=clean(b.nombre)||codigo;if(!nombre)fail(400,'Nombre o código requerido');
    if(clean(b.complejoId)){if(!await this.store.db.complejo.findUnique({where:{id:b.complejoId!}}))fail(400,'Complejo no encontrado');if(!await this.access.owner(a,b.complejoId!))fail(403,'Sin permisos');}
    if(clean(b.canchaId)){const c=await this.store.db.cancha.findUnique({where:{id:b.canchaId!}});if(!c)fail(400,'Cancha no encontrada');if(!c!.complejoId&&a.rol!=='TECNICO')fail(403,'Solo la plataforma gestiona promociones de canchas sin complejo.');if(c!.complejoId&&!await this.access.owner(a,c!.complejoId))fail(403,'Sin permisos');}
    if(b.horaDesde!=null&&(b.horaDesde<0||b.horaDesde>=1440))fail(400,'horaDesde inválida');if(b.horaHasta!=null&&(b.horaHasta<1||b.horaHasta>1440))fail(400,'horaHasta inválida');if(b.horaDesde!=null&&b.horaHasta!=null&&b.horaHasta<=b.horaDesde)fail(400,'horaHasta debe ser posterior a horaDesde');
    if(codigo&&await this.store.db.promocion.findUnique({where:{codigo}}))fail(409,'El código ya está en uso');
    try{const p=await this.store.db.promocion.create({data:{id:newId(),complejoId:clean(b.complejoId)?b.complejoId:null,canchaId:clean(b.canchaId)?b.canchaId:null,nombre:nombre!,codigo,tipo:tipo!,valor:b.valor??0,descripcion:clean(b.descripcion),horaDesde:b.horaDesde??null,horaHasta:b.horaHasta??null,fechaInicio,fechaFin,precioDia:b.precioDia??null,precioTarde:b.precioTarde??null,precioNoche:b.precioNoche??null,inicioTarde,inicioNoche,repetirAnual:b.repetirAnual??false,usosMax:b.usosMax??null,usosActuales:0,activa:b.activa??true,creadoEn:new Date()}});return {ok:true,promocion:promoShape(p)};}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')fail(409,'El código ya está en uso');throw e;}
  }
  async update(id:string,b:PromoBody,r:FastifyRequest){const a=await this.access.actor(r,managementRoles),p=await this.store.db.promocion.findUnique({where:{id}});if(!p)fail(404,'No encontrada');await this.owner(a,p!);const data:Prisma.PromocionUncheckedUpdateInput={};
    if(clean(b.nombre))data.nombre=b.nombre!.trim();if(b.descripcion!=null)data.descripcion=clean(b.descripcion);
    if(b.valor!=null){if(Number(b.valor)<=0)fail(400,'Valor inválido');if(p!.tipo==='PORCENTAJE'&&Number(b.valor)>100)fail(400,'El porcentaje no puede superar 100');data.valor=b.valor;}
    for(const k of ['usosMax','activa','horaDesde','horaHasta','repetirAnual'] as const)if(b[k]!=null)Object.assign(data,{[k]:b[k]});
    for(const k of ['precioDia','precioTarde','precioNoche'] as const)if(b[k]!=null){if(Number(b[k])<0)fail(400,'Precios de franja inválidos');data[k]=b[k];}
    for(const k of ['inicioTarde','inicioNoche'] as const)if(b[k]!=null){const v=parseClock(b[k]);if(v===null)fail(400,`${k} inválido (HH:MM)`);data[k]=v;p![k]=v;}
    if(p!.inicioTarde!==null&&p!.inicioNoche!==null&&p!.inicioNoche<=p!.inicioTarde)fail(400,'inicioNoche debe ser posterior a inicioTarde');
    const raws={fechaInicio:clean(b.fechaInicio)?b.fechaInicio:b.desde,fechaFin:clean(b.fechaFin)?b.fechaFin:b.hasta};for(const k of ['fechaInicio','fechaFin'] as const)if(raws[k]!=null){const d=parseDay(raws[k]);if(!d)fail(400,'Fechas inválidas (yyyy-MM-dd)');data[k]=d;p![k]=d;}
    if(p!.fechaInicio&&p!.fechaFin&&p!.fechaFin<p!.fechaInicio)fail(400,'La fecha Hasta no puede ser anterior a Desde');return {ok:true,promocion:promoShape(await this.store.db.promocion.update({where:{id},data}))};
  }
  async delete(id:string,r:FastifyRequest){const a=await this.access.actor(r,managementRoles),p=await this.store.db.promocion.findUnique({where:{id}});if(!p)return {ok:true};await this.owner(a,p);try{await this.store.db.promocion.delete({where:{id}});}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2003')fail(409,'No se puede eliminar: la promoción tiene reservas asociadas');throw e;}return {ok:true};}
}
