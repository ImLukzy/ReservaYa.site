import { Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { day, fail, money } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles, type Actor } from '../management/access';
import { parseEnum } from '../management/legacy';
import { blank, body, decimal, firstComplex, round2, str } from '../caja/money';
type Meta=Prisma.MetaGetPayload<object>;
const kinds=['INGRESOS','OCUPACION','RESERVAS'] as const,badKind='Tipo inválido: usa INGRESOS, OCUPACION o RESERVAS',badEnd='La fecha de fin debe ser posterior a la de inicio';
const metaShape=(m:Meta)=>({id:m.id,titulo:m.titulo,tipo:m.tipo,objetivo:money(m.objetivo),actual:money(m.actual),periodoInicio:day(m.periodoInicio),periodoFin:day(m.periodoFin)});
/** DateTime.TryParseExact(value.Trim(), "yyyy-MM-dd", InvariantCulture). */
export function exactDay(value:string|null):Date|null{
  const text=value?.trim();if(!text||!/^\d{4}-\d{2}-\d{2}$/.test(text)||text.startsWith('0000'))return null;
  const d=new Date(text+'T00:00:00Z');return Number.isFinite(d.getTime())&&day(d)===text?d:null;
}
@Injectable()
export class MetasService {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  private async find(a:Actor,id:string){const own=await firstComplex(this.db,a);if(a.rol!=='TECNICO'&&!own)return null;return this.db.meta.findFirst({where:{id,...(a.rol==='TECNICO'?{}:{complejoId:own!})}});}
  async list(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),id=await firstComplex(this.db,a);if(!id)return {metas:[]};
    return {metas:(await this.db.meta.findMany({where:{complejoId:id},orderBy:{periodoFin:'asc'}})).map(metaShape)};
  }
  async create(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),b=body(r),titulo=str(b,'titulo'),tipo=str(b,'tipo'),objetivo=decimal(b,'objetivo');decimal(b,'actual');
    const periodoInicio=str(b,'periodoInicio'),periodoFin=str(b,'periodoFin'),id=await firstComplex(this.db,a);
    if(!id)fail(400,'Primero crea tu complejo para definir metas');
    if(blank(titulo))fail(400,'El título es obligatorio');
    const kind=parseEnum(kinds,tipo??'');if(!kind)fail(400,badKind);
    if(objetivo===null||objetivo.lte(0))fail(400,'El objetivo debe ser mayor que cero');
    const inicio=exactDay(periodoInicio),fin=exactDay(periodoFin);if(!inicio||!fin)fail(400,'Indica el periodo con fechas válidas (aaaa-mm-dd)');
    if(fin!<inicio!)fail(400,badEnd);
    const meta=await this.db.meta.create({data:{id:newId(),complejoId:id!,titulo:titulo!.trim(),tipo:kind!,objetivo:round2(objetivo!),actual:0,periodoInicio:inicio!,periodoFin:fin!}});
    return {ok:true,meta:metaShape(meta)};
  }
  async patch(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),b=body(r),titulo=str(b,'titulo'),tipo=str(b,'tipo'),objetivo=decimal(b,'objetivo'),actual=decimal(b,'actual');
    const periodoInicio=str(b,'periodoInicio'),periodoFin=str(b,'periodoFin'),meta=await this.find(a,id);if(!meta)fail(404,'Meta no encontrada');
    const next={...meta!};
    if(!blank(titulo))next.titulo=titulo!.trim();
    if(tipo!==null){const kind=parseEnum(kinds,tipo);if(!kind)fail(400,badKind);next.tipo=kind!;}
    if(objetivo!==null){if(objetivo.lte(0))fail(400,'El objetivo debe ser mayor que cero');next.objetivo=round2(objetivo);}
    if(actual!==null){if(actual.lt(0))fail(400,'El avance no puede ser negativo');next.actual=round2(actual);}
    if(periodoInicio!==null){const d=exactDay(periodoInicio);if(!d)fail(400,'Fecha de inicio inválida (aaaa-mm-dd)');next.periodoInicio=d!;}
    if(periodoFin!==null){const d=exactDay(periodoFin);if(!d)fail(400,'Fecha de fin inválida (aaaa-mm-dd)');next.periodoFin=d!;}
    if(next.periodoFin<next.periodoInicio)fail(400,badEnd);
    const {titulo:t,tipo:k,objetivo:o,actual:x,periodoInicio:pi,periodoFin:pf}=next;
    return {ok:true,meta:metaShape(await this.db.meta.update({where:{id:meta!.id},data:{titulo:t,tipo:k,objetivo:o,actual:x,periodoInicio:pi,periodoFin:pf}}))};
  }
  async remove(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),meta=await this.find(a,id);
    if(meta)await this.db.meta.deleteMany({where:{id:meta.id}});return {ok:true};
  }
}
@Controller('api/metas')
export class MetasController {
  constructor(@Inject(MetasService)private service:MetasService){}
  @Get() list(@Req()r:FastifyRequest){return this.service.list(r);}
  @Post() @HttpCode(201) create(@Req()r:FastifyRequest){return this.service.create(r);}
  @Patch(':id') patch(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.patch(id,r);}
  @Delete(':id') remove(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.remove(id,r);}
}
