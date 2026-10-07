import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { validation } from '../public/binding';
import type { Actor } from '../management/access';
// Money never goes through binary floating point: JSON numbers keep their source literal.
export class Num { constructor(readonly n:number,readonly s:string){} }
export type Json=Record<string,unknown>;
const lossless=(text:string)=>JSON.parse(text,(_k,v:unknown,c?:{source?:string})=>typeof v==='number'?new Num(v,c?.source??String(v)):v) as unknown;
/** Request body as the legacy System.Text.Json binder sees it: numbers keep their literal text. */
export function body(r:FastifyRequest):Json{
  const raw=(r as FastifyRequest&{rawBody?:Buffer}).rawBody;let value:unknown=r.body;
  if(raw&&/json/i.test(String(r.headers['content-type']??'')))try{value=lossless(raw.toString('utf8'));}catch{value=r.body;}
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Json:{};
}
// JsonSerializerDefaults.Web: case-insensitive property names, the last duplicate wins.
export function field(o:unknown,name:string):{key:string;value:unknown}|undefined{
  let hit:{key:string;value:unknown}|undefined;if(!o||typeof o!=='object'||Array.isArray(o))return hit;
  for(const [key,value]of Object.entries(o))if(key.toLowerCase()===name.toLowerCase())hit={key,value};return hit;
}
// FlexibleDecimalConverter: JSON number, or string parsed with NumberStyles.Float|AllowThousands (invariant).
const netNumber=/^[ \t\n\v\f\r]*[+-]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[ \t\n\v\f\r]*$/;
// A body that fails JSON conversion leaves the action parameter unbound: MVC reports both.
const unbound=(param:string,key:string,message:string,path='$')=>validation({[param]:[`The ${param} field is required.`],[path+'.'+key]:[message]});
export function decimal(o:unknown,name:string,param='request',path='$'):Prisma.Decimal|null{
  const hit=field(o,name);if(!hit||hit.value===null)return null;const v=hit.value;
  let text:string|undefined;if(v instanceof Num)text=v.s;else if(typeof v==='number')text=String(v);else if(typeof v==='string'&&netNumber.test(v)&&/\d/.test(v.split(/[eE]/)[0]))text=v.trim().replace(/,/g,'');
  if(text!==undefined)try{const d=new Prisma.Decimal(text);if(d.isFinite()&&d.abs().lt('79228162514264337593543950336'))return d;}catch{/* invalid literal */}
  // FlexibleDecimalConverter: strings that do not parse vs. tokens that are neither number nor string.
  return unbound(param,hit.key,typeof v==='string'||v instanceof Num||typeof v==='number'?'Valor numérico inválido':'Se esperaba un número',path);
}
// int? properties only accept integral JSON numbers within Int32.
export function int(o:unknown,name:string,param='request',path='$'):number|null{
  const hit=field(o,name);if(!hit||hit.value===null)return null;const v=typeof hit.value==='number'?new Num(hit.value,String(hit.value)):hit.value;
  if(v instanceof Num&&/^-?\d+$/.test(v.s)&&Number.isSafeInteger(v.n)&&v.n>=-2147483648&&v.n<=2147483647)return v.n;
  return unbound(param,hit.key,'The JSON value could not be converted to System.Nullable`1[System.Int32]. Path: '+path+'.'+hit.key+'.',path);
}
export function str(o:unknown,name:string,param='request',path='$'):string|null{
  const hit=field(o,name);if(!hit||hit.value===null)return null;if(typeof hit.value==='string')return hit.value;
  return unbound(param,hit.key,'The JSON value could not be converted to System.String. Path: '+path+'.'+hit.key+'.',path);
}
export { unbound };
export const blank=(s:string|null|undefined)=>!s?.trim();
/** Math.Round(value, 2, MidpointRounding.AwayFromZero). */
export const round2=(d:Prisma.Decimal)=>d.toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
export const zero=()=>new Prisma.Decimal(0);
/** ComplejoAccess.PrimeroAsync: oldest owned complex, then oldest active membership, then the oldest complex for the platform. */
export async function firstComplex(db:Prisma.TransactionClient,a:Actor):Promise<string|null>{
  const own=await db.complejo.findFirst({where:{duenoId:a.id},orderBy:{creadoEn:'asc'},select:{id:true}});if(own)return own.id;
  const member=await db.complejoMiembro.findFirst({where:{usuarioId:a.id,activo:true},orderBy:{creadoEn:'asc'},select:{complejoId:true}});if(member)return member.complejoId;
  return a.rol==='TECNICO'?(await db.complejo.findFirst({orderBy:{creadoEn:'asc'},select:{id:true}}))?.id??null:null;
}
// Hardening over legacy: cash operations of one complex are serialized (FOR NO KEY UPDATE keeps FK inserts unblocked).
export async function lockComplex(tx:Prisma.TransactionClient,id:string){await tx.$queryRaw`SELECT id FROM "Complejo" WHERE id=${id} FOR NO KEY UPDATE`;}
// Waiting on a complex lock counts against the interactive transaction timeout.
export const txOptions={maxWait:10000,timeout:20000};
