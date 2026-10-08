import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { Complejos } from './complejos';
import type { DbService, Clock } from '../public/db.service';
import type { Access } from '../management/access';
const own='https://media.example.test/uploads/complejo/owner/foto.webp';
const request={} as FastifyRequest;
beforeEach(()=>vi.stubEnv('MEDIA_PUBLIC_URL','https://media.example.test'));
afterEach(()=>vi.unstubAllEnvs());
function fixture(rol='ADMIN',owner='owner'){
  const row={id:'complex',nombre:'Centro',slug:'centro',direccion:'Fixture',distrito:'Cayma',ciudad:'Arequipa',fotos:[],latitud:null,longitud:null,duenoId:owner,usuarioByDuenoId:{rol:'ADMIN'},creadoEn:new Date()};
  const db={complejo:{findUnique:vi.fn(async()=>row),update:vi.fn(async({data}:{data:object})=>({...row,...data}))},cancha:{count:vi.fn(async()=>1)}};
  const access={actor:vi.fn(async()=>({id:'owner',rol}))};
  return {db,service:new Complejos({db} as unknown as DbService,access as unknown as Access,{} as Clock)};
}
describe('Complejo photos and coordinates (spec62)',()=>{
  it.each([
    {fotos:['https://external.example/foto.webp']},
    {fotos:['https://media.example.test.evil.test/uploads/complejo/foto.webp']},
    {fotos:['https://media.example.test/uploads/complejo/%2e%2e/foto.webp']},
    {fotos:['https://media.example.test/uploads/complejo/foto.gif']},
    {fotos:Array(7).fill(own)},
    {fotos:'not-an-array'},
    {fotos:[42]},
    {latitud:-12.04,longitud:-77.03},
    {latitud:0,longitud:0},
    {latitud:'-16.4',longitud:-71.53},
    {latitud:-16.4,longitud:null},
    {latitud:NaN,longitud:-71.53},
  ])('rejects invalid payload %o without writing',async body=>{
    const {db,service}=fixture();await expect(service.update('complex',body as never,request)).rejects.toMatchObject({status:400});expect(db.complejo.update).not.toHaveBeenCalled();
  });
  it('preserves ordering and nullable location; photos remain optional for publication',async()=>{
    const {db,service}=fixture();const photos=[own.replace('foto','portada'),own];
    const result=await service.update('complex',{fotos:photos,latitud:-16.4,longitud:-71.53},request);
    expect(result.complejo).toMatchObject({fotos:photos,latitud:-16.4,longitud:-71.53});
    await service.update('complex',{fotos:[],latitud:null,longitud:null,publicado:true},request);
    expect(db.complejo.update.mock.calls[1][0]).toMatchObject({data:{fotos:[],latitud:null,longitud:null,publicado:true}});
  });
  it('does not grant media writes across owners',async()=>{const {db,service}=fixture('ADMIN','other');await expect(service.update('complex',{fotos:[own]},request)).rejects.toMatchObject({status:403});expect(db.complejo.update).not.toHaveBeenCalled();});
  it('allows the technician to update a complex',async()=>{const {service}=fixture('TECNICO','other');expect((await service.update('complex',{fotos:[own]},request)).complejo.fotos).toEqual([own]);});
});
