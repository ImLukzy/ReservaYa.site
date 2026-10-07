import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { createApp } from './app';
import { parseEnum, parseNetDateTime, parseTimeOfDay, roundEven, netRoles, district } from './management/legacy';
import { slugify } from './complejos/complejos';
import { Equipo, noticeEmail, signupEmail } from './equipo/equipo';
import { Partidos } from './partidos/partidos';
import { Solicitudes } from './solicitudes/solicitudes';
import { RateLimiter } from './auth/rate';
import type { DbService, Clock } from './public/db.service';
import type { Access } from './management/access';
import type { MailProvider } from './auth/providers';
import type { Media } from './management/media';
describe('Legacy .NET parsing contracts',()=>{
  it('parses enums like Enum.TryParse(ignoreCase)',()=>{
    expect(parseEnum(netRoles,'admin')).toBe('ADMIN');expect(parseEnum(netRoles,' 2 ')).toBe('ADMIN');
    expect(parseEnum(netRoles,'USUARIO, ADMIN')).toBe('ADMIN');expect(parseEnum(netRoles,'gerente')).toBeNull();expect(parseEnum(netRoles,'9')).toBeNull();expect(parseEnum(netRoles,' ')).toBeNull();
  });
  it('keeps DateTime kinds when echoing tournament match dates',()=>{
    expect(parseNetDateTime('2026-10-10T18:30:00Z')).toEqual({date:new Date('2026-10-10T18:30:00Z'),json:'2026-10-10T18:30:00Z'});
    expect(parseNetDateTime('2026-10-10T18:30')?.json).toBe('2026-10-10T18:30:00');expect(parseNetDateTime('2026-10-10')?.json).toBe('2026-10-10T00:00:00');
    expect(parseNetDateTime('10/12/2026 07:05')?.json).toBe('2026-10-12T07:05:00');expect(parseNetDateTime('2026-02-30')).toBeNull();expect(parseNetDateTime('mañana')).toBeNull();
  });
  it('parses TimeSpan values within one day and truncates seconds',()=>{
    expect(parseTimeOfDay('18:30')).toBe(1110);expect(parseTimeOfDay('7:5')).toBe(425);expect(parseTimeOfDay('18:30:59')).toBe(1110);
    expect(parseTimeOfDay('24:00')).toBeNull();expect(parseTimeOfDay('18')).toBeNull();expect(parseTimeOfDay('1.02:00')).toBeNull();expect(parseTimeOfDay('-01:00')).toBeNull();
  });
  it('rounds occupancy with banker rounding, slugifies and normalizes districts',()=>{
    expect(roundEven(12.25,1)).toBe(12.2);expect(roundEven(12.35,1)).toBe(12.4);expect(roundEven(1/3*100,1)).toBe(33.3);
    expect(slugify('  Complejo Ñandú  & Sport ')).toBe('complejo-nandu-sport');expect(slugify('¡¡!!')).toBe('complejo');
    expect(district('cayma')).toBe('Cayma');expect(district('Lima')).toBeNull();
  });
  it('encodes user names in invitation mails',()=>{
    const mail=noticeEmail('a@example.test','Ana <b>','Dueño & Co','Sede "1"','https://web.example.test');
    expect(mail.subject).toBe('Dueño & Co te invitó a su equipo en Sede "1"');expect(mail.html).toContain('Ana &lt;b&gt;');expect(mail.html).toContain('Due&#241;o &amp; Co');expect(mail.text).toContain('https://web.example.test/login');
    expect(signupEmail('b@example.test','X','Y','https://web.example.test').text).toContain('https://web.example.test/register');
  });
});
const request={} as FastifyRequest;
describe('Postcommit side effects and concurrency guards',()=>{
  it('queues the invitation notice only after the membership is stored',async()=>{
    const events:string[]=[];const user={id:'player',email:'p@example.test',nombre:'P',rol:'USUARIO',activo:true};
    const db={complejo:{findUnique:async()=>({id:'a',nombre:'A'}),findFirst:async()=>null},usuario:{findUnique:async({where}:{where:{id?:string}})=>where.id?{nombre:'Owner'}:user},complejoMiembro:{findUnique:async()=>null,create:async({data}:{data:Record<string,unknown>})=>{events.push('create');return {...data};}}};
    const access={actor:async()=>({id:'owner',rol:'SUPERADMIN'}),owner:async()=>true} as unknown as Access;
    const mail={queue:()=>{events.push('mail');return true;}} as unknown as MailProvider;
    const result=await new Equipo({db} as unknown as DbService,access,new RateLimiter(),mail).invite({complejoId:'a',email:'P@example.test '},request);
    expect(events).toEqual(['create','mail']);expect(result).toMatchObject({ok:true,existente:false,correoEnviado:true});
    db.complejoMiembro.create=async()=>{throw Object.assign(new Error('unique'),{code:'P2002'});};events.length=0;
    await expect(new Equipo({db} as unknown as DbService,access,new RateLimiter(),mail).invite({complejoId:'a',email:'p@example.test'},request)).rejects.toMatchObject({status:409});expect(events).toEqual([]);
  });
  it('locks the match row inside the transaction before counting places',async()=>{
    const calls:string[]=[];const leaked=()=>{throw new Error('query outside transaction');};
    const tx={$queryRaw:async(sql:TemplateStringsArray)=>{calls.push(sql.join('?'));return [];},partidoAbierto:{findUnique:async()=>({id:'m',fecha:new Date('2999-01-01Z'),cuposTotales:1,desdeMin:600,hastaMin:660,precio:{toNumber:()=>0},creadoEn:new Date('2026-01-01Z')})},anotacionPartido:{findFirst:async()=>null,count:async()=>{calls.push('count');return 1;},create:leaked}};
    const store={db:{partidoAbierto:{findUnique:leaked},anotacionPartido:{count:leaked},$transaction:async(fn:(t:unknown)=>Promise<unknown>)=>fn(tx)}} as unknown as DbService;
    const service=new Partidos(store,{actor:async()=>({id:'p',rol:'USUARIO'})} as unknown as Access,new RateLimiter(),{} as Media,{now:()=>new Date('2026-01-01T12:00:00Z')} as Clock);
    await expect(service.join('m',request)).rejects.toMatchObject({status:409});expect(calls[0]).toContain('FOR UPDATE');expect(calls[1]).toBe('count');
  });
  it('sends the rejection notice only after commit and reports provider failures',async()=>{
    const events:string[]=[];const pending={id:'c',publicado:false,usuarioByDuenoId:{rol:'USUARIO',email:'p@example.test'},canchaByComplejoId:[{activa:false}]};
    const tx={complejo:{findUnique:async()=>pending,delete:async()=>{events.push('delete');}},cancha:{deleteMany:async()=>{events.push('courts');}}};
    const store={db:{$transaction:async(fn:(t:unknown)=>Promise<unknown>)=>{const v=await fn(tx);events.push('commit');return v;}}} as unknown as DbService;
    const mail={configured:()=>true,deliver:vi.fn(async()=>{events.push('mail');})};
    const service=new Solicitudes(store,{actor:async()=>({id:'t',rol:'TECNICO'})} as unknown as Access,mail as unknown as MailProvider);
    expect(await service.reject('c',{motivo:' Datos <incompletos> '},request)).toEqual({ok:true,estado:'RECHAZADA',emailEnviado:true});expect(events).toEqual(['courts','delete','commit','mail']);
    expect(mail.deliver.mock.calls[0]).toMatchObject([{to:'p@example.test',html:expect.stringContaining('Datos &lt;incompletos&gt;')}]);
    mail.deliver.mockRejectedValueOnce(new Error('down'));expect((await service.reject('c',{motivo:'x'},request)).emailEnviado).toBe(false);
  });
});
describe('F5 route registration',()=>{
  let app:NestFastifyApplication;
  beforeAll(async()=>{app=await createApp();await app.init();await app.getHttpAdapter().getInstance().ready();});
  afterAll(async()=>{await app.close();});
  it.each([['GET','/api/complejos'],['POST','/api/equipo'],['GET','/api/invitaciones/mias'],['GET','/api/partidos/mios'],['POST','/api/resenas'],['GET','/api/sanciones'],['GET','/api/solicitudes/mias'],['GET','/api/suscripciones/estado'],['PUT','/api/torneos/partidos/x']])('%s %s requires a session',async(method,url)=>{
    const r=await app.inject({method:method as 'GET',url});expect(r.statusCode).toBe(401);expect(r.json()).toEqual({error:'No autenticado'});
  });
});
