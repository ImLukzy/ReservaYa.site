import { Controller, HttpCode, Inject, Injectable, Post, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { DbService } from '../public/db.service';
import { fail } from '../public/format';
import { validation } from '../public/binding';
import { RateLimiter } from '../auth/rate';
import { ip } from '../management/access';
import { body, decimal, field, unbound } from '../caja/money';
// CrearReclamoDto DataAnnotations, in declaration order. PII never reaches logs or error bodies.
type Rule={name:string;required?:boolean;min?:number;max?:number;email?:boolean;pattern?:string};
const rules:Rule[]=[
  {name:'Nombre',required:true,min:3,max:200},{name:'Email',required:true,email:true,max:254},{name:'DocumentoTipo',required:true,pattern:'^(DNI|CE)$'},
  {name:'Documento',required:true,min:6,max:20},{name:'Domicilio',required:true,max:500},{name:'Telefono',required:true,min:6,max:30},
  {name:'Apoderado',max:200},{name:'ApoderadoDocumento',min:6,max:20},{name:'ApoderadoDomicilio',max:500},{name:'ApoderadoTelefono',min:6,max:30},
  {name:'BienTipo',required:true,pattern:'^(Servicio|Producto)$'},{name:'BienDescripcion',required:true,max:2000},
  {name:'Tipo',required:true,pattern:'^(RECLAMO|QUEJA)$'},{name:'Detalle',required:true,min:10,max:10000},{name:'Pedido',required:true,min:5,max:10000},
  {name:'MedioRespuesta',required:true,pattern:'^(Correo electrónico|Carta al domicilio)$'},
];
const order=['Nombre','Email','DocumentoTipo','Documento','Domicilio','Telefono','Menor','Apoderado','ApoderadoDocumento','ApoderadoDomicilio','ApoderadoTelefono','BienTipo','BienDescripcion','Monto','Tipo','Detalle','Pedido','MedioRespuesta'];
const maxMonto=new Prisma.Decimal('9999999999.99');
export type Reclamo={[k:string]:string|boolean|Prisma.Decimal|null};
/** Model binding + validation of the legacy DTO; values stay untrimmed like the .NET model. */
export function bindReclamo(b:unknown):Reclamo{
  const errors:Record<string,string[]>={},values:Reclamo={};
  const wrong=(key:string,type:string)=>unbound('dto',key,`The JSON value could not be converted to ${type}. Path: $.${key}.`);
  for(const name of order){
    const hit=field(b,name);
    if(name==='Menor'){if(hit&&typeof hit.value!=='boolean')wrong(hit.key,'System.Boolean');values.Menor=hit?.value===true;continue;}
    if(name==='Monto'){values.Monto=decimal(b,'monto','dto');continue;}
    if(hit&&hit.value!==null&&typeof hit.value!=='string')wrong(hit.key,'System.String');
    const rule=rules.find(r=>r.name===name)!,optional=!rule.required;
    values[name]=hit?(hit.value as string|null):(optional?null:'');
  }
  for(const name of order){
    const add=(m:string)=>(errors[name]??=[]).push(m),v=values[name];
    if(name==='Monto'){const m=v as Prisma.Decimal|null;if(m&&(m.lt(0)||m.gt(maxMonto)))add('The field Monto must be between 0 and 9999999999.99.');continue;}
    if(name==='Menor')continue;
    const rule=rules.find(r=>r.name===name)!,s=v as string|null;
    if(rule.required&&!s?.trim())add(`The ${name} field is required.`);
    if(s!==null){
      if(rule.max!==undefined&&(s.length>rule.max||(rule.min!==undefined&&s.length<rule.min)))add(rule.min!==undefined?`The field ${name} must be a string with a minimum length of ${rule.min} and a maximum length of ${rule.max}.`:`The field ${name} must be a string with a maximum length of ${rule.max}.`);
      if(rule.email){const at=s.indexOf('@');if(/[\r\n]/.test(s)||at<=0||at===s.length-1||at!==s.lastIndexOf('@'))add(`The ${name} field is not a valid e-mail address.`);}
      if(rule.pattern&&s!==''&&!new RegExp(rule.pattern).test(s))add(`The field ${name} must match the regular expression '${rule.pattern}'.`);
    }
  }
  if(Object.keys(errors).length)validation(errors);
  return values;
}
const conflict=(e:unknown)=>{if(typeof e!=='object'||e===null)return false;const x=e as {code?:unknown;message?:unknown;meta?:unknown},text=`${String(x.code)} ${String(x.message)} ${JSON.stringify(x.meta??null)}`;
  return /P2034|40001/.test(text)||(/23505|P2002/.test(text)&&/Reclamo_numero_key|Reclamo_anio_correlativo_key/.test(text));};
const pad=(n:number)=>String(n).padStart(6,'0');
@Injectable()
export class ReclamosService {
  constructor(@Inject(DbService)private store:DbService,@Inject(RateLimiter)private rate:RateLimiter){}
  async crear(r:FastifyRequest){
    const d=bindReclamo(body(r)),t=(k:string)=>(d[k] as string|null)?.trim()??null;
    if(this.rate.limited(`reclamos:${ip(r)}`,10,3600000))fail(429,'Demasiados envíos. Inténtalo dentro de una hora.');
    if(t('Nombre')!.length<3||t('Detalle')!.length<10||t('Pedido')!.length<5)fail(400,'Revisa nombre, detalle y pedido.');
    const menor=d.Menor===true;
    if(menor&&['Apoderado','ApoderadoDocumento','ApoderadoDomicilio','ApoderadoTelefono'].some(k=>!t(k)))fail(400,'Completa los datos del representante del menor.');
    const monto=d.Monto as Prisma.Decimal|null;if(monto&&!monto.toDecimalPlaces(2).eq(monto))fail(400,'El monto admite hasta dos decimales.');
    // MAX+1 is only confirmed with the row; a rollback consumes no number. Conflicts on the first number of a year retry.
    for(let attempt=0;attempt<5;attempt++){
      try{
        return await this.store.db.$transaction(async tx=>{
          const fecha=new Date(),anio=fecha.getUTCFullYear();
          const [{max}]=await tx.$queryRaw<{max:number|null}[]>`SELECT MAX(correlativo)::int AS max FROM "Reclamo" WHERE anio=${anio}`;
          const correlativo=(max??0)+1,numero=`${anio}-${pad(correlativo)}`;
          await tx.$executeRaw`INSERT INTO "Reclamo" (id,numero,anio,correlativo,tipo,nombre,"documentoTipo",documento,domicilio,telefono,email,menor,apoderado,"apoderadoDocumento","apoderadoDomicilio","apoderadoTelefono","bienTipo","bienDescripcion",monto,detalle,pedido,"medioRespuesta","creadoEn",estado)
            VALUES (${randomUUID()},${numero},${anio},${correlativo},${d.Tipo},${t('Nombre')},${d.DocumentoTipo},${t('Documento')},${t('Domicilio')},${t('Telefono')},${t('Email')},${menor},${menor?t('Apoderado'):null},${menor?t('ApoderadoDocumento'):null},${menor?t('ApoderadoDomicilio'):null},${menor?t('ApoderadoTelefono'):null},${d.BienTipo},${t('BienDescripcion')},${monto},${t('Detalle')},${t('Pedido')},${d.MedioRespuesta},${fecha},'RECIBIDO')`;
          return {ok:true,numero,fecha:fecha.toISOString().replace('Z','0000Z'),plazoRespuestaDiasHabiles:15};
        },{isolationLevel:'Serializable',maxWait:10000,timeout:20000});
      }catch(e){if(!conflict(e))throw e;if(attempt<4)await new Promise(res=>setTimeout(res,25*(attempt+1)));}
    }
    return fail(503,'No se pudo confirmar el registro. Inténtalo nuevamente.');
  }
}
@Controller('api/reclamos')
export class ReclamosController {
  constructor(@Inject(ReclamosService)private service:ReclamosService){}
  @Post() @HttpCode(201) crear(@Req()r:FastifyRequest){return this.service.crear(r);}
}
