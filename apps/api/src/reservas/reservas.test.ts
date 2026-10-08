import {describe,it,expect,vi} from 'vitest';
import {Prisma} from '@reservaya/db';
import type {FastifyRequest} from 'fastify';
import {Reservas, overlaps} from './reservas';
import {Access} from '../management/access';
import {DbService} from '../public/db.service';
import type {CorreosReserva} from './correos';
const req={} as FastifyRequest;
function fixture(){
 const court={id:'court',complejoId:'a',activa:true,nombre:'Ficticia',precioPorHora:new Prisma.Decimal(80),creadoEn:new Date('2026-01-01Z')};
 const row={id:'reservation',codigo:'FIXTURE',usuarioId:'player',canchaId:'court',complejoId:null,fecha:new Date('2026-11-01Z'),horaInicio:600,horaFin:660,estado:'PENDIENTE',total:new Prisma.Decimal(80),notas:null,creadoEn:new Date('2026-01-01Z'),canchaByCanchaId:court,usuarioByUsuarioId:null};
 const events:string[]=[];
 const tx={$queryRaw:vi.fn(async()=>events.push('lock')),cancha:{findUnique:async()=>court},complejo:{findFirst:async()=>({id:'a'}),findUnique:async()=>({id:'a'})},sancion:{findFirst:async()=>null},promocion:{findMany:async()=>[]},horarioOperativo:{findMany:async()=>[],findFirst:async()=>({id:'hours'})},reserva:{findMany:vi.fn(async()=>[] as {id:string}[]),findUnique:async()=>row,findFirst:vi.fn(async()=>null as null|{id:string}),updateMany:vi.fn(async()=>events.push('cancel')),update:vi.fn(async({data}:{data:Record<string,unknown>})=>{events.push('save');return {...row,...data};}),create:vi.fn(async({data}:{data:Record<string,unknown>})=>({...row,...data,total:new Prisma.Decimal(String(data.total)),canchaByCanchaId:court}))}};
 const transaction=vi.fn(async(fn:(tx:unknown)=>Promise<unknown>,_options?:unknown)=>{void _options;return fn(tx);});const store={db:{$transaction:transaction}} as unknown as DbService;
 const access={actor:vi.fn(async()=>({id:'owner',rol:'SUPERADMIN'})),enabled:async()=>['a']} as unknown as Access;
 const correos={avisar:vi.fn(async()=>{})};
 return {service:new Reservas(store,access,correos as unknown as CorreosReserva),tx,access,transaction,events,row,correos};
}
describe('Reservation transactions',()=>{
 it('checks strict overlap bounds so adjoining slots remain valid',()=>{expect(overlaps(600,660)).toEqual({horaInicio:{lt:660},horaFin:{gt:600}});});
 it('quotes using legacy started-hour charging and ignores a caller-supplied total',async()=>{
  const f=fixture();const result=await f.service.create({canchaId:'court',fecha:'2026-11-01',horaInicio:600,horaFin:690,notas:'  Ficticio  ',...{total:1}},req);
  expect(result.reserva.total).toBe('160.00');expect(result.reserva.notas).toBe('Ficticio');expect(result.reserva.estado).toBe('PENDIENTE');expect(result.reserva.usuario).toBeNull();
  expect(f.transaction.mock.calls[0]?.[1]).toEqual({isolationLevel:'Serializable',timeout:15000});expect(f.tx.$queryRaw).toHaveBeenCalled();
 });
 it('rejects confirmed overlap before creating a reservation',async()=>{const f=fixture();f.tx.reserva.findFirst.mockResolvedValue({id:'confirmed'});await expect(f.service.create({canchaId:'court',fecha:'2026-11-01',horaInicio:600,horaFin:660},req)).rejects.toMatchObject({status:409});expect(f.tx.reserva.create).not.toHaveBeenCalled();});
 it('cancels competing pending reservations before confirming atomically',async()=>{const f=fixture();await f.service.patch('reservation',{estado:'CONFIRMADA'},req);expect(f.events).toEqual(['lock','cancel','save']);expect(f.tx.reserva.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({estado:'PENDIENTE'})}));});
 it('does not mutate competitors when an overlapping confirmed reservation exists',async()=>{const f=fixture();f.tx.reserva.findFirst.mockResolvedValue({id:'confirmed'});await expect(f.service.patch('reservation',{estado:'CONFIRMADA'},req)).rejects.toMatchObject({status:409});expect(f.tx.reserva.updateMany).not.toHaveBeenCalled();expect(f.tx.reserva.update).not.toHaveBeenCalled();});
 it('prevents a player from confirming even their own pending reservation',async()=>{const f=fixture();vi.mocked(f.access.actor).mockResolvedValue({id:'player',rol:'USUARIO'});await expect(f.service.patch('reservation',{estado:'CONFIRMADA'},req)).rejects.toMatchObject({status:403});expect(f.tx.reserva.update).not.toHaveBeenCalled();});
 it('maps serialization failure to a retryable conflict',async()=>{const f=fixture();f.transaction.mockRejectedValue({code:'P2034'});await expect(f.service.patch('reservation',{estado:'CONFIRMADA'},req)).rejects.toMatchObject({status:409});});
 it('queues the creation mail for player and owner after the commit',async()=>{const f=fixture();const result=await f.service.create({canchaId:'court',fecha:'2026-11-01',horaInicio:600,horaFin:660},req);expect(result.ok).toBe(true);expect(f.correos.avisar).toHaveBeenCalledExactlyOnceWith([result.reserva.id],'creada',{dueno:true});});
 it('queues no mail when the creation fails',async()=>{const f=fixture();f.tx.reserva.findFirst.mockResolvedValue({id:'confirmed'});await expect(f.service.create({canchaId:'court',fecha:'2026-11-01',horaInicio:600,horaFin:660},req)).rejects.toMatchObject({status:409});expect(f.correos.avisar).not.toHaveBeenCalled();});
 it('mails the confirmation and the competitors it cancels',async()=>{const f=fixture();f.tx.reserva.findMany.mockResolvedValue([{id:'rival'}]);await f.service.patch('reservation',{estado:'CONFIRMADA'},req);expect(f.correos.avisar).toHaveBeenCalledWith(['reservation'],'confirmada');expect(f.correos.avisar).toHaveBeenCalledWith(['rival'],'cancelada');});
 it('mails the player when their reservation is cancelled',async()=>{const f=fixture();vi.mocked(f.access.actor).mockResolvedValue({id:'player',rol:'USUARIO'});await f.service.patch('reservation',{estado:'CANCELADA'},req);expect(f.correos.avisar).toHaveBeenCalledWith(['reservation'],'cancelada');expect(f.correos.avisar).not.toHaveBeenCalledWith(['reservation'],'confirmada');});
 it('sends nothing when the state does not change or the update fails',async()=>{const f=fixture();await f.service.patch('reservation',{estado:'PENDIENTE',notas:'x'},req);expect(f.correos.avisar).not.toHaveBeenCalledWith(['reservation'],expect.anything());
  const g=fixture();g.transaction.mockRejectedValue({code:'P2034'});await expect(g.service.patch('reservation',{estado:'CONFIRMADA'},req)).rejects.toMatchObject({status:409});expect(g.correos.avisar).not.toHaveBeenCalled();});
});
