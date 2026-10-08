import {afterEach,describe,expect,it,vi} from 'vitest';
import {Logger} from '@nestjs/common';
import {Prisma} from '@reservaya/db';
import type {FastifyRequest} from 'fastify';
import {MailProvider} from '../auth/providers';
import type {Access} from '../management/access';
import type {DbService} from '../public/db.service';
import {CorreosReserva} from './correos';
import {Recordatorios, debeRecordar} from './recordatorios';
import {Reservas} from './reservas';
// Fictitious data only; fetch is stubbed so no test ever reaches Resend.
const owner={nombre:'Dueña Ficticia',email:'dueno@example.test'};
const complejo={nombre:'Complejo Ficticio',duenoId:'owner',usuarioByDuenoId:owner,latitud:-16.4,longitud:-71.53};
const row=(over:Record<string,unknown>={})=>({id:'r1',codigo:'RF-AB12',usuarioId:'player',estado:'PENDIENTE',fecha:new Date('2026-11-01T00:00:00Z'),horaInicio:600,horaFin:660,total:new Prisma.Decimal(80),usuarioByUsuarioId:{nombre:'Jugador Ficticio',email:'jugador@example.test'},complejoByComplejoId:null,canchaByCanchaId:{nombre:'Cancha 1',complejoByComplejoId:complejo},...over});
const flush=()=>new Promise(r=>setTimeout(r,0));
function setup(rows:unknown[]=[row()]){
 const queued:{to:string;subject:string;text:string;html:string}[]=[];
 const mail={queueReserva:vi.fn((m:{to:string;subject:string;text:string;html:string})=>{queued.push(m);return true;}),transportConfigured:()=>true};
 const db={reserva:{findMany:vi.fn(async()=>rows)},$executeRaw:vi.fn(async()=>1)};
 const store={db} as unknown as DbService;
 return {queued,mail,db,store,correos:new CorreosReserva(store,mail as unknown as MailProvider)};
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Booking mails (spec 66)',()=>{
 it('sends the player the creation mail and the owner a new-booking notice',async()=>{
  const f=setup();await f.correos.avisar(['r1'],'creada',{dueno:true});
  expect(f.queued.map(m=>[m.to,m.subject])).toEqual([['jugador@example.test','Reserva recibida — RF-AB12'],['dueno@example.test','Nueva reserva — RF-AB12']]);
  const [player,own]=f.queued;
  for(const line of ['Complejo: Complejo Ficticio','Cancha: Cancha 1','Fecha y hora: domingo 01/11/2026, de 10:00 a 11:00 (hora de Perú)','Total: S/ 80.00','Código: RF-AB12','Estado: Pendiente de confirmación','https://reservaya.site/dashboard/reservas','Cómo llegar: https://www.google.com/maps/dir/?api=1&destination=-16.4,-71.53'])expect(player.text).toContain(line);
  expect(own.text).toContain('Jugador: Jugador Ficticio');expect(own.text).toContain('https://reservaya.site/admin/reservas');
 });
 it('skips the owner notice when the owner booked and the map link without coordinates',async()=>{
  const f=setup([row({usuarioId:'owner',canchaByCanchaId:{nombre:'Cancha 1',complejoByComplejoId:{...complejo,latitud:null,longitud:null}}})]);
  await f.correos.avisar(['r1'],'creada',{dueno:true});
  expect(f.queued).toHaveLength(1);expect(f.queued[0].text).not.toContain('Cómo llegar');
 });
 it('mails only the player on confirmation, cancellation and reminder',async()=>{
  for(const [tipo,subject,estado] of [['confirmada','Reserva confirmada — RF-AB12','CONFIRMADA'],['cancelada','Reserva cancelada — RF-AB12','CANCELADA'],['recordatorio','Recordatorio: juegas a las 10:00 — RF-AB12','CONFIRMADA']] as const){
   const f=setup([row({estado})]);await f.correos.avisar(['r1'],tipo);
   expect(f.queued.map(m=>[m.to,m.subject])).toEqual([['jugador@example.test',subject]]);
  }
 });
 it('never throws nor logs personal data when queueing fails',async()=>{
  const f=setup(),log=vi.spyOn(Logger.prototype,'error').mockImplementation(()=>{});f.mail.queueReserva.mockImplementation(()=>{throw new Error('jugador@example.test');});
  await expect(f.correos.avisar(['r1'],'creada',{dueno:true})).resolves.toBeUndefined();
  f.db.reserva.findMany.mockRejectedValueOnce(new Error('db down'));await expect(f.correos.avisar(['r1'],'creada')).resolves.toBeUndefined();
  const logged=log.mock.calls.flat().join(' ');expect(logged).toContain('RF-AB12');expect(logged).not.toMatch(/@|Ficticio/);
 });
 it('keeps the reservation response when Resend fails',async()=>{
  vi.stubEnv('EMAIL_PROVIDER','resend');vi.stubEnv('RESEND_API_KEY','re_test_dummy');vi.stubEnv('EMAIL_FROM','ReservaYa <no-reply@example.test>');
  const fetch=vi.fn(async(..._args:unknown[])=>{void _args;return new Response('{}',{status:500});});vi.stubGlobal('fetch',fetch);const log=vi.spyOn(Logger.prototype,'error').mockImplementation(()=>{});
  const court={id:'court',complejoId:'a',activa:true,nombre:'Cancha 1',precioPorHora:new Prisma.Decimal(80),creadoEn:new Date('2026-01-01Z')};
  const created={...row(),notas:null,canchaId:'court',complejoId:null,creadoEn:new Date('2026-01-01Z'),canchaByCanchaId:court,usuarioByUsuarioId:null};
  const tx={$queryRaw:async()=>[],cancha:{findUnique:async()=>court},complejo:{findFirst:async()=>({id:'a'})},sancion:{findFirst:async()=>null},promocion:{findMany:async()=>[]},horarioOperativo:{findMany:async()=>[],findFirst:async()=>({id:'h'})},reserva:{findFirst:async()=>null,create:async()=>created}};
  const db={$transaction:async(fn:(t:unknown)=>unknown)=>fn(tx),reserva:{findMany:async()=>[row()]}};
  const store={db} as unknown as DbService,mail=new MailProvider();
  const service=new Reservas(store,{actor:async()=>({id:'player',rol:'USUARIO'}),enabled:async()=>['a']} as unknown as Access,new CorreosReserva(store,mail));
  const result=await service.create({canchaId:'court',fecha:'2026-11-01',horaInicio:600,horaFin:660},{} as FastifyRequest);
  expect(result).toMatchObject({ok:true,reserva:{codigo:'RF-AB12',estado:'PENDIENTE',total:'80.00'}});
  await vi.waitFor(()=>expect(log).toHaveBeenCalledTimes(2));
  expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[0][0]).toBe('https://api.resend.com/emails');
  expect(log.mock.calls.flat().join(' ')).not.toMatch(/@/);
 });
});
describe('Booking reminder (spec 66)',()=>{
 const fecha=new Date('2026-11-01T00:00:00Z');// 10:00 Peru = 15:00 UTC
 it('reminds only before the start and within 2 h',()=>{
  expect(debeRecordar(fecha,600,new Date('2026-11-01T13:00:00Z'))).toBe(true);
  expect(debeRecordar(fecha,600,new Date('2026-11-01T12:59:00Z'))).toBe(false);
  expect(debeRecordar(fecha,600,new Date('2026-11-01T14:59:00Z'))).toBe(true);
  expect(debeRecordar(fecha,600,new Date('2026-11-01T15:00:00Z'))).toBe(false);
  expect(debeRecordar(new Date('2026-11-02T00:00:00Z'),30,new Date('2026-11-02T04:00:00Z'))).toBe(true);// 00:30 Peru, checked at 23:00 the day before
 });
 it('claims each booking once and sends nothing for started ones',async()=>{
  const due=row({id:'due',estado:'CONFIRMADA'}),started=row({id:'started',estado:'CONFIRMADA',horaInicio:480});
  const f=setup([due]);f.db.reserva.findMany.mockResolvedValueOnce([{id:'due',fecha,horaInicio:600},{id:'started',fecha,horaInicio:started.horaInicio}]);
  const avisar=vi.spyOn(f.correos,'avisar');const job=new Recordatorios(f.store,f.mail as unknown as MailProvider,f.correos);
  const now=new Date('2026-11-01T13:30:00Z');
  expect(await job.revisar(now)).toEqual(['due']);
  expect(f.db.$executeRaw).toHaveBeenCalledTimes(1);
  const sql=(f.db.$executeRaw.mock.calls[0] as unknown[])[0] as string[];expect(sql.join('?')).toContain('"recordatorioEnviadoEn" IS NULL');
  expect(f.db.reserva.findMany.mock.calls[0]).toEqual([expect.objectContaining({where:expect.objectContaining({estado:'CONFIRMADA'})})]);
  expect(f.queued.map(m=>m.subject)).toEqual(['Recordatorio: juegas a las 10:00 — RF-AB12']);
  f.db.$executeRaw.mockResolvedValue(0);f.db.reserva.findMany.mockResolvedValueOnce([{id:'due',fecha,horaInicio:600}]);
  expect(await job.revisar(new Date('2026-11-01T13:35:00Z'))).toEqual([]);
  expect(avisar).toHaveBeenLastCalledWith([],'recordatorio');expect(f.queued).toHaveLength(1);
  await flush();
 });
 it('does not start the timer without a mail transport',()=>{
  const f=setup(),spy=vi.spyOn(globalThis,'setInterval');const job=new Recordatorios(f.store,{transportConfigured:()=>false} as unknown as MailProvider,f.correos);
  job.onApplicationBootstrap();expect(spy).not.toHaveBeenCalled();job.onModuleDestroy();
 });
});
