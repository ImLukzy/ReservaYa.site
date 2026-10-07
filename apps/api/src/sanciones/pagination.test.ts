import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { Sanciones } from '../sanciones/sanciones';
import { Torneos } from '../torneos/torneos';
import { Access } from '../management/access';
import { DbService } from '../public/db.service';
const req={} as FastifyRequest;
function fixture(kind:'sancion'|'torneo'){
 const rows=Array.from({length:202},(_,i)=>({id:'row-'+String(i).padStart(3,'0'),complejoId:'own',creadoEn:new Date('2026-01-01Z'),nombre:'Ficticio',deporte:'FUTBOL5',fechaInicio:new Date('2026-01-01Z'),fechaFin:null,costoInscripcion:0,cupoMax:16,premio:null,reglamento:null,estado:'BORRADOR',usuarioId:'fake',nivel:'ADVERTENCIA',motivo:'Ficticio',activa:i!==201,_count:{inscripcionTorneoByTorneoId:0,partidoTorneoByTorneoId:0}}));
 const foreign={...rows[0]!,id:'foreign',complejoId:'other'};
 type Where={id?:string;complejoId?:string|{in:string[]};activa?:boolean};
 const matches=(row:typeof foreign,w:Where)=> (!w.id||w.id===row.id)&&(!w.complejoId||(typeof w.complejoId==='string'?w.complejoId===row.complejoId:w.complejoId.in.includes(row.complejoId)))&&(w.activa===undefined||row.activa===w.activa);
 const model={findFirst:async({where}:{where:Where})=>[...rows,foreign].find(row=>matches(row,where))||null,findMany:async({where,cursor,skip=0,take}:{where:Where;cursor?:{id:string};skip?:number;take?:number})=>{const scoped=[...rows,foreign].filter(row=>matches(row,where));const offset=(cursor?scoped.findIndex(row=>row.id===cursor.id):0)+skip;return scoped.slice(offset,take===undefined?undefined:offset+take);}};
 const store={db:{[kind]:model}} as unknown as DbService,access={actor:async()=>({id:'owner',rol:'SUPERADMIN'}),ids:async()=>['own'],member:async(_:unknown,id:string)=>id==='own'} as unknown as Access;
 const service=kind==='sancion'?new Sanciones(store,access):new Torneos(store,access);
 const list=(query:{cursor?:string;take?:string;soloActivas?:string}={})=>service instanceof Sanciones?service.list(query,req):service.list(undefined,req,query);
 return {list};
}
for(const kind of ['sancion','torneo'] as const)describe(kind+' pagination',()=>{
 it('reaches rows beyond 200 and ends without overlap',async()=>{
  const {list}=fixture(kind),first=await list({take:'200'}),second=await list({take:'200',cursor:first.nextCursor!});
  const key=kind==='sancion'?'sanciones':'torneos';
  expect(first[key as keyof typeof first]).toHaveLength(200);expect(first.nextCursor).toBe('row-199');
  expect(second[key as keyof typeof second]).toHaveLength(2);expect(second.nextCursor).toBeNull();
 });
 it('preserves unpaged legacy bounds and shape',async()=>{
  const result=await fixture(kind).list();expect(result).not.toHaveProperty('nextCursor');
  expect(kind==='sancion'?(result as {sanciones:unknown[]}).sanciones:(result as {torneos:unknown[]}).torneos).toHaveLength(kind==='sancion'?200:202);
 });
 it('rejects foreign cursors and invalid limits',async()=>{
  const {list}=fixture(kind);await expect(list({cursor:'foreign'})).rejects.toMatchObject({status:400});
  for(const take of ['0','201','-1','1.5','bad'])await expect(list({take})).rejects.toMatchObject({status:400});
 });
});
it('validates sanction cursors against the active filter as well as the owner scope',async()=>{
 await expect(fixture('sancion').list({soloActivas:'true',cursor:'row-201'})).rejects.toMatchObject({status:400});
});
