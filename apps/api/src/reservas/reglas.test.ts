import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { Reservas } from './reservas';
import type { DbService, Clock } from '../public/db.service';
import type { Access } from '../management/access';
import type { CorreosReserva } from './correos';
import { cumplePlazo } from './reglas';
const fecha=new Date('2026-10-08T00:00:00Z'),req={} as FastifyRequest;
function fixture({rol='USUARIO',anticipacion=180,cancelacion=1440,ahora='2026-10-08T12:00:00Z'}={}){
 const court={id:'court',complejoId:'center',activa:true,nombre:'Fixture',precioPorHora:new Prisma.Decimal(80),creadoEn:fecha};
 const row={id:'reservation',codigo:'FIXTURE',usuarioId:'player',canchaId:'court',complejoId:null,fecha,horaInicio:600,horaFin:660,estado:'CONFIRMADA',total:new Prisma.Decimal(80),creadoEn:fecha,canchaByCanchaId:court,usuarioByUsuarioId:null};
 const tx={$queryRaw:vi.fn(async()=>[]),cancha:{findUnique:async()=>court},complejo:{findFirst:async()=>({id:'center',anticipacionMinMin:anticipacion}),findUnique:async()=>({id:'center',anticipacionMinMin:anticipacion,cancelacionMinMin:cancelacion})},sancion:{findFirst:async()=>null},promocion:{findMany:async()=>[]},horarioOperativo:{findMany:async()=>[],findFirst:async()=>({id:'hours'})},reserva:{findUnique:async()=>row,findFirst:async()=>null,findMany:async()=>[],updateMany:async()=>({count:0}),create:vi.fn(async({data}:{data:Record<string,unknown>})=>({...row,...data,total:new Prisma.Decimal(String(data.total))})),update:vi.fn(async({data}:{data:Record<string,unknown>})=>({...row,...data}))}};
 const db={$transaction:async(fn:(tx:unknown)=>Promise<unknown>)=>fn(tx)};
 const access={actor:async()=>({id:rol==='USUARIO'?'player':'owner',rol}),enabled:async()=>['center']};
 const correos={avisar:vi.fn(async()=>{})};
 return {service:new Reservas({db} as unknown as DbService,access as unknown as Access,correos as unknown as CorreosReserva,{now:()=>new Date(ahora)} as Clock),tx,correos};
}
describe('Rules of the complex (spec69)',()=>{
 it('uses Peru time and permits the exact minute boundary',()=>{expect(cumplePlazo(fecha,600,180,new Date('2026-10-08T12:00Z'))).toBe(true);expect(cumplePlazo(fecha,600,180,new Date('2026-10-08T12:00:00.001Z'))).toBe(false);});
 it('does not confuse Peru day with UTC at midnight',()=>{expect(cumplePlazo(fecha,30,60,new Date('2026-10-08T04:30Z'))).toBe(true);expect(cumplePlazo(fecha,30,60,new Date('2026-10-08T04:31Z'))).toBe(false);});
 it('rejects a player inside minimum anticipation before creating or mailing',async()=>{const f=fixture({ahora:'2026-10-08T12:01Z'});await expect(f.service.create({canchaId:'court',fecha:'2026-10-08',horaInicio:600,horaFin:660},req)).rejects.toMatchObject({status:409,response:{error:expect.stringContaining('3 h')}});expect(f.tx.reserva.create).not.toHaveBeenCalled();expect(f.correos.avisar).not.toHaveBeenCalled();});
 it('permits a player at the exact anticipation boundary',async()=>{const f=fixture();expect((await f.service.create({canchaId:'court',fecha:'2026-10-08',horaInicio:600,horaFin:660},req)).reserva.estado).toBe('PENDIENTE');});
 it('rejects cancellation inside the player deadline before writing or mailing',async()=>{const f=fixture({ahora:'2026-10-07T15:01Z'});await expect(f.service.patch('reservation',{estado:'CANCELADA'},req)).rejects.toMatchObject({status:409,response:{error:expect.stringContaining('24 h')}});expect(f.tx.reserva.update).not.toHaveBeenCalled();expect(f.correos.avisar).not.toHaveBeenCalled();});
 it('permits player cancellation at the exact deadline',async()=>{const f=fixture({ahora:'2026-10-07T15:00Z'});expect((await f.service.patch('reservation',{estado:'CANCELADA'},req)).reserva.estado).toBe('CANCELADA');});
 it.each(['ADMIN','SUPERADMIN','TECNICO'])('authorized %s bypasses timing rules for creation and cancellation',async rol=>{const f=fixture({rol,ahora:'2026-10-08T15:01Z'});expect((await f.service.create({canchaId:'court',fecha:'2026-10-08',horaInicio:600,horaFin:660},req)).ok).toBe(true);expect((await f.service.patch('reservation',{estado:'CANCELADA'},req)).ok).toBe(true);});
 it('zero defaults preserve the previous behavior',async()=>{const f=fixture({anticipacion:0,cancelacion:0,ahora:'2026-10-09T15:01Z'});expect((await f.service.create({canchaId:'court',fecha:'2026-10-08',horaInicio:600,horaFin:660},req)).ok).toBe(true);expect((await f.service.patch('reservation',{estado:'CANCELADA'},req)).ok).toBe(true);});
});
