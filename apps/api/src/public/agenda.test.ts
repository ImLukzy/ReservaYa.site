import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@reservaya/db';
import { agendaFranjas } from './agenda';
import { createApp } from '../app';
import { Clock, DbService } from './db.service';
const fecha=new Date('2026-10-08T00:00:00Z'),base=new Prisma.Decimal(80);
afterEach(()=>{vi.unstubAllEnvs();});
describe('Public court agenda',()=>{
 it('uses Peru time, strict overlaps and minimum anticipation without player data',()=>{
  const franjas=agendaFranjas({fecha,apertura:480,cierre:660,reservas:[{horaInicio:600,horaFin:630}],ahora:new Date('2026-10-08T13:15:00Z'),anticipacion:60,base,promos:[]});
  expect(franjas.map(f=>f.estado)).toEqual(['PASADA','ANTICIPACION','ANTICIPACION','LIBRE','OCUPADA','LIBRE']);
  expect(franjas[0].precio).toBe('40.00');
  expect(Object.keys(franjas[0]).sort()).toEqual(['estado','fin','inicio','precio']);
 });
 it('rounds opening to complete half-hour slots and never crosses closing',()=>{
  const franjas=agendaFranjas({fecha,apertura:487,cierre:589,reservas:[],ahora:new Date('2026-10-01Z'),base,promos:[]});expect(franjas.map(f=>[f.inicio,f.fin])).toEqual([[510,540],[540,570]]);
 });
 it('handles Peru day boundary independently of the UTC day',()=>{
  const franjas=agendaFranjas({fecha,apertura:1380,cierre:1440,reservas:[],ahora:new Date('2026-10-09T04:15:00Z'),base,promos:[]});expect(franjas.map(f=>f.estado)).toEqual(['PASADA','LIBRE']);
 });
 async function fixture(options:{activo?:boolean;cerrado?:boolean;sinHorarios?:boolean;oculto?:boolean}={}){
  vi.stubEnv('ORIGIN_SECRET',undefined);
  const horario={diaSemana:4,activo:!options.cerrado,aperturaMin:600,cierreMin:720};
  const db={cancha:{findUnique:vi.fn(async()=>({id:'court',activa:options.activo??true,complejoId:'center',precioPorHora:base,complejoByComplejoId:{}}))},complejo:{findMany:vi.fn(async()=>options.oculto?[]:[{id:'center',publicado:true}])},horarioOperativo:{findMany:vi.fn(async()=>options.sinHorarios?[]:[horario])},reserva:{findMany:vi.fn(async()=>[{horaInicio:600,horaFin:630,...{usuarioId:'private-player',codigo:'private-code'}}])},promocion:{findMany:vi.fn(async()=>[])}};
  const app=await createApp();vi.spyOn(app.get(DbService),'db','get').mockReturnValue(db as never);vi.spyOn(app.get(Clock),'now').mockReturnValue(new Date('2026-10-08T12:00:00Z'));await app.init();await app.getHttpAdapter().getInstance().ready();return {app,db};
 }
 it('returns anonymous agenda through the actual controller and selects only interval fields',async()=>{
  const {app,db}=await fixture();try{const response=await app.inject({url:'/api/canchas/court/agenda?fecha=2026-10-08'});expect(response.statusCode).toBe(200);expect(response.json().franjas).toHaveLength(4);expect(response.json().franjas[0].estado).toBe('OCUPADA');expect(response.body).not.toMatch(/private-player|private-code/);expect(db.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({estado:'CONFIRMADA'}),select:{horaInicio:true,horaFin:true}}));}finally{await app.close();}
 });
 it('returns no slots for a closed day',async()=>{const {app,db}=await fixture({cerrado:true});try{expect((await app.inject({url:'/api/canchas/court/agenda?fecha=2026-10-08'})).json().franjas).toEqual([]);expect(db.reserva.findMany).not.toHaveBeenCalled();}finally{await app.close();}});
 it('uses the default 08:00–21:00 window without saved schedules',async()=>{const {app}=await fixture({sinHorarios:true});try{const franjas=(await app.inject({url:'/api/canchas/court/agenda?fecha=2026-10-08'})).json().franjas;expect(franjas).toHaveLength(26);expect(franjas[0].inicio).toBe(480);expect(franjas.at(-1).fin).toBe(1260);}finally{await app.close();}});
 it.each([{activo:false},{oculto:true}])('hides inactive/unpublished courts: %o',async options=>{const {app}=await fixture(options);try{expect((await app.inject({url:'/api/canchas/court/agenda?fecha=2026-10-08'})).statusCode).toBe(404);}finally{await app.close();}});
 it.each(['2026-02-30','tomorrow','2026-10-08T00:00:00Z'])('rejects invalid dates %s',async date=>{const {app}=await fixture();try{expect((await app.inject({url:`/api/canchas/court/agenda?fecha=${date}`})).statusCode).toBe(400);}finally{await app.close();}});
});
