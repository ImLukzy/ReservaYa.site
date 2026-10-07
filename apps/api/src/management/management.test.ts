import { foreignKeyError } from './errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaUrl, mediaKey, ownPrefix, legacyImage, imageExtension, Media } from './media';
import { addYears, Usuarios } from './usuarios';
import { parseClock } from './promociones';
import { Canchas } from './canchas';
import { DbService } from '../public/db.service';
import { Access } from './access';
import { AuthService } from '../auth/auth.service';
import { Clock } from '../public/db.service';
import type { FastifyRequest } from 'fastify';
vi.mock('@aws-sdk/client-s3',()=>({S3Client:class{send=vi.fn()},DeleteObjectCommand:class{constructor(public input:unknown){}}}));
beforeEach(()=>{vi.stubEnv('MEDIA_PUBLIC_URL','https://media.example.test/base');});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('Public media ownership contracts',()=>{
 it('keeps exact bucket origin, base path, owner prefix and image extension',()=>{
  const u='https://media.example.test/base/uploads/cancha/owner/a.PNG';
  expect(mediaUrl(u,'uploads/cancha/owner/')).toBe(u);expect(mediaKey(u)).toBe('uploads/cancha/owner/a.PNG');
  expect(mediaUrl(u,'uploads/cancha/other/')).toBeNull();
  expect(ownPrefix('cancha',{id:'owner',rol:'TECNICO'})).toBe('uploads/cancha/');
  expect(ownPrefix('perfil',{id:'a!b',rol:'TECNICO'},false)).toBe('uploads/perfil/ab/');
 });
 it.each(['../other/a.png','%2e%2e/other/a.png','%2fother/a.png','a.png?x=1','a.png#x','a.svg','a\\b.png','a%252f.png','a//b.png'])('rejects unsafe key %s',key=>{
  expect(mediaUrl('https://media.example.test/base/uploads/cancha/owner/'+key)).toBeNull();
 });
 it('rejects other origins and credentials while preserving legacy external images',()=>{
  expect(mediaUrl('https://other.example.test/base/uploads/cancha/owner/a.png')).toBeNull();
  expect(mediaUrl('https://user:pass@media.example.test/base/uploads/cancha/owner/a.png')).toBeNull();
  expect(legacyImage('https://outside.example.test/a.png','uploads/cancha/owner/')).toBe('https://outside.example.test/a.png');
  expect(legacyImage('https://media.example.test/base/uploads/cancha/other/a.png','uploads/cancha/owner/')).toBeNull();
 });
 it('detects file type from bytes, independently of declared content type',()=>{
  expect(imageExtension(Buffer.from([137,80,78,71]))).toBe('.png');
  expect(imageExtension(Buffer.from([255,216,255]))).toBe('.jpg');
  expect(imageExtension(Buffer.from('GIF'))).toBe('.gif');
  expect(imageExtension(Buffer.from('RIFFxxxxWEBP'))).toBe('.webp');
  expect(imageExtension(Buffer.from('not an image'))).toBeNull();
 });
});
describe('Mutation safety',()=>{
 it('deletes the replaced object only after the database save succeeds',async()=>{
  const events:string[]=[];const before={id:'court',imagen:'https://media.example.test/base/uploads/cancha/owner/old.png',complejoId:'a'};
  const db={cancha:{findUnique:async()=>before,update:async()=>{events.push('save');return {...before,imagen:'https://media.example.test/base/uploads/cancha/owner/new.png',precioPorHora:{toFixed:()=> '80.00'},creadoEn:new Date('2026-01-01Z')};}}};
  const access={actor:async()=>({id:'owner',rol:'SUPERADMIN'}),owner:async()=>true};const media={remove:async()=>{events.push('delete');}};
  const service=new Canchas({db} as unknown as DbService,access as unknown as Access,media as unknown as Media);
  await service.image('court',{url:'https://media.example.test/base/uploads/cancha/owner/new.png'},{} as FastifyRequest);expect(events).toEqual(['save','delete']);
  db.cancha.update=async()=>{throw new Error('database unavailable');};events.length=0;
  await expect(service.image('court',{url:'https://media.example.test/base/uploads/cancha/owner/new.png'},{} as FastifyRequest)).rejects.toThrow('database unavailable');expect(events).toEqual([]);
 });
 it('uses the transaction connection for ownership and subscription checks',async()=>{
  const leaked=()=>{throw new Error('Attempted second pool connection inside transaction');};
  const tx={complejo:{findUnique:async()=>({id:'a'}),findMany:async()=>[{id:'a'}],findFirst:async()=>({id:'a'})},suscripcion:{findFirst:async()=>({id:'sub'})},cancha:{create:async({data}:{data:Record<string,unknown>})=>({...data,precioPorHora:{toFixed:()=> '90.00'},creadoEn:new Date('2026-01-01Z')})}};
  const store={db:{complejo:{findUnique:leaked,findFirst:leaked,findMany:leaked},suscripcion:{findFirst:leaked},$transaction:async(fn:(client:unknown)=>Promise<unknown>)=>fn(tx)}} as unknown as DbService;
  const access=new Access(store,{} as AuthService,{now:()=>new Date('2026-01-01Z')} as Clock);access.actor=async()=>({id:'owner',rol:'SUPERADMIN'});
  const result=await new Canchas(store,access,{} as Media).create({nombre:'Nueva',tipo:'FUTBOL',precioPorHora:90,capacidad:10,complejoId:'a'},{} as FastifyRequest);
  expect(result.ok).toBe(true);
 });
 it('clamps leap years and accepts legacy clock boundary 24:00',()=>{
  expect(addYears(new Date('2024-02-29Z'),1).toISOString().slice(0,10)).toBe('2025-02-28');
  expect(parseClock('24:00')).toBe(1440);expect(parseClock('24:01')).toBeNull();expect(parseClock('16:30')).toBe(990);
 });
});

describe('Foreign key conflict responses',()=>{
 it.each(['cancha','usuario'])('maps a %s FK error from another Prisma client to 409',async kind=>{
  const db={reserva:{count:async()=>0},[kind]:{findUnique:async()=>({id:'target',complejoId:'a'}),delete:async()=>{throw {code:'P2003',clientVersion:'external-client'};}}};
  const access={actor:async()=>({id:'tech',rol:'TECNICO'}),owner:async()=>true};
  const store={db} as unknown as DbService;
  const service=kind==='cancha'?new Canchas(store,access as unknown as Access,{} as Media):new Usuarios(store,access as unknown as Access,{} as Media,{} as never);
  await expect(service.delete('target',{} as FastifyRequest)).rejects.toMatchObject({status:409,response:{error:kind==='cancha'?'No se puede eliminar: la cancha tiene reservas asociadas. Desactívala en su lugar.':'No se puede eliminar: el usuario tiene reservas asociadas. Desactívalo en su lugar.'}});
 });
});

describe('PostgreSQL constraint errors',()=>{
 it.each(['23503','23001'])('recognizes NoAction SQLSTATE %s in Prisma unknown errors',code=>{
  expect(foreignKeyError(new Error('ConnectorError: PostgresError { code: "'+code+'", message: "fixture constraint" }'))).toBe(true);
 });
 it('keeps other database failures as server errors',()=>{
  expect(foreignKeyError(new Error('PostgresError { code: "23505" }'))).toBe(false);
  expect(foreignKeyError(new Error('Connection unavailable'))).toBe(false);
 });
});

describe('Reserved entities remain intact',()=>{
 it.each(['cancha','usuario'])('rejects deletion of reserved %s before any delete or image cleanup',async kind=>{
  const remove=vi.fn(),erase=vi.fn();
  const db={reserva:{count:async()=>1},[kind]:{findUnique:async()=>({id:'target',complejoId:'a'}),delete:erase}};
  const access={actor:async()=>({id:'tech',rol:'TECNICO'}),owner:async()=>true};
  const service=kind==='cancha'?new Canchas({db} as unknown as DbService,access as unknown as Access,{remove} as unknown as Media):new Usuarios({db} as unknown as DbService,access as unknown as Access,{remove} as unknown as Media,{} as never);
  await expect(service.delete('target',{} as FastifyRequest)).rejects.toMatchObject({status:409});
  expect(erase).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
 });
});
