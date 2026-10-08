import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { Prisma } from '@reservaya/db';
import { createApp } from '../app';
import { BindingError } from '../public/binding';
import { Logger } from '@nestjs/common';
import { MailProvider } from '../auth/providers';
import { RateLimiter } from '../auth/rate';
import { DbService } from '../public/db.service';
import type { Access } from '../management/access';
import { Num, decimal, int, round2 } from './money';
import { CajaService, startOfPeruDay } from './caja';
import { exactDay } from '../metas/metas';
import { bindReclamo, ReclamosService } from '../reclamos/reclamos';
import { reservaShape } from '../reportes/reportes';
const problem=(fn:()=>unknown)=>{try{fn();}catch(e){if(e instanceof BindingError)return (e.getResponse() as {errors:Record<string,string[]>}).errors;throw e;}throw Error('expected ProblemDetails');};
const valid={nombre:'Persona de Prueba',email:'reclamo@example.test',documentoTipo:'DNI',documento:'00000000',domicilio:'Dirección ficticia',telefono:'900000000',bienTipo:'Servicio',bienDescripcion:'Reserva ficticia',tipo:'QUEJA',detalle:'Detalle sintético largo',pedido:'Pedido sintético',medioRespuesta:'Carta al domicilio'};
describe('Exact money binding',()=>{
  it('keeps JSON literals and .NET string formats without floating point',()=>{
    expect(decimal({monto:new Num(0.1,'0.1000000000000000000001')},'monto')!.toString()).toBe('0.1000000000000000000001');
    expect(decimal({MONTO:' 1,250.50 '},'monto')!.toFixed(2)).toBe('1250.50');expect(decimal({monto:'1e2'},'monto')!.toFixed(2)).toBe('100.00');
    expect(decimal({monto:null},'monto')).toBeNull();expect(decimal({},'monto')).toBeNull();
    expect(problem(()=>decimal({monto:'abc'},'monto'))).toEqual({request:['The request field is required.'],'$.monto':['Valor numérico inválido']});
    expect(problem(()=>decimal({Monto:true},'monto','dto'))).toEqual({dto:['The dto field is required.'],'$.Monto':['Se esperaba un número']});
    expect(problem(()=>int({stock:new Num(1.5,'1.5')},'stock'))).toHaveProperty('$.stock');expect(int({qty:new Num(3,'3')},'qty')).toBe(3);
  });
  it('rounds half away from zero like Math.Round(..., AwayFromZero)',()=>{
    for(const [v,r] of [['10.005','10.01'],['-10.005','-10.01'],['2.675','2.68'],['45.555','45.56'],['0.004','0.00']])expect(round2(new Prisma.Decimal(v)).toFixed(2)).toBe(r);
  });
  it('computes the Lima day start and exact yyyy-MM-dd dates',()=>{
    expect(startOfPeruDay(new Date('2026-10-07T04:59:59Z')).toISOString()).toBe('2026-10-06T05:00:00.000Z');
    expect(startOfPeruDay(new Date('2026-10-07T05:00:00Z')).toISOString()).toBe('2026-10-07T05:00:00.000Z');
    expect(exactDay(' 2026-02-28 ')?.toISOString()).toBe('2026-02-28T00:00:00.000Z');for(const bad of ['2026-02-30','2026-4-1','01/02/2026','0000-01-01','',null])expect(exactDay(bad)).toBeNull();
  });
});
describe('Cash desk transactions',()=>{
  function fakeTx(stock:number|null){
    const created:unknown[]=[],updates:unknown[]=[],sessions:unknown[]=[];
    const tx={
      $queryRaw:vi.fn(async(strings:TemplateStringsArray)=>strings.join('?').includes('"Producto"')?[{id:'p-agua'}]:[]),
      cajaSesion:{findFirst:vi.fn(async()=>null),create:vi.fn(async({data}:{data:unknown})=>{sessions.push(data);return data;})},
      producto:{findUnique:vi.fn(async()=>({id:'p-agua',complejoId:'a',nombre:'Agua',categoria:'SNACK',precio:new Prisma.Decimal('2.50'),stock,activo:true})),update:vi.fn(async(x:unknown)=>{updates.push(x);return x;})},
      movimientoCaja:{createMany:vi.fn(async({data}:{data:unknown[]})=>{created.push(...data);return {count:data.length};})},
    };
    const db={complejo:{findFirst:vi.fn(async()=>({id:'a'}))},complejoMiembro:{findFirst:vi.fn(async()=>null)},$transaction:vi.fn(async(fn:(t:typeof tx)=>unknown)=>fn(tx))};
    const access={actor:vi.fn(async()=>({id:'owner',rol:'SUPERADMIN'}))} as unknown as Access;
    return {service:new CajaService({db} as unknown as DbService,access),tx,created,updates,sessions};
  }
  const req=(payload:unknown)=>({body:payload,headers:{}} as unknown as FastifyRequest);
  it('checks repeated products against the stock already sold in the same ticket and writes nothing on rejection',async()=>{
    const f=fakeTx(2);
    await expect(f.service.movimientos(req({items:[{productoId:'p-agua',qty:1},{productoId:'p-agua',cantidad:2}]}))).rejects.toMatchObject({response:{error:'Stock insuficiente de Agua'},status:400});
    expect(f.created).toEqual([]);expect(f.updates).toEqual([]);
    // Like legacy, the cash session opened for the ticket remains.
    expect(f.sessions).toHaveLength(1);
  });
  it('locks the complex and the product rows, then writes movements and the final stock in one transaction',async()=>{
    const f=fakeTx(2),result=await f.service.movimientos(req({items:[{productoId:'p-agua'},{productoId:'p-agua'}],metodoPago:'yape'}));
    expect(result).toMatchObject({ok:true,total:'5.00',movimientos:[{monto:'2.50',metodoPago:'YAPE',tipo:'SNACK',descripcion:'Venta: Agua x1'},{monto:'2.50'}]});
    expect(f.updates).toEqual([{where:{id:'p-agua'},data:{stock:0}}]);
    const locks=f.tx.$queryRaw.mock.calls.map(c=>(c[0] as TemplateStringsArray).join('?'));
    expect(locks[0]).toContain('FOR NO KEY UPDATE');expect(locks.filter(s=>s.includes('FOR UPDATE')&&s.includes('"Producto"'))).toHaveLength(1);
  });
});
describe('Complaints book',()=>{
  it('reproduces DataAnnotations messages in declaration order',()=>{
    const errors=problem(()=>bindReclamo({}));
    expect(Object.keys(errors).slice(0,3)).toEqual(['Nombre','Email','DocumentoTipo']);
    expect(errors.Nombre).toContain('The Nombre field is required.');expect(errors.Email).toContain('The Email field is not a valid e-mail address.');
    expect(problem(()=>bindReclamo({...valid,documentoTipo:'RUC',monto:-1}))).toEqual({DocumentoTipo:["The field DocumentoTipo must match the regular expression '^(DNI|CE)$'."],Monto:['The field Monto must be between 0 and 9999999999.99.']});
    expect(bindReclamo(valid).Menor).toBe(false);
  });
  function service(fail:(attempt:number)=>unknown){
    let attempt=0;const sql:string[]=[];
    const db={$transaction:vi.fn(async(fn:(tx:unknown)=>unknown,options:unknown)=>{
      expect(options).toMatchObject({isolationLevel:'Serializable'});const error=fail(attempt++);if(error)throw error;
      return fn({$queryRaw:async()=>[{max:41}],$executeRaw:async(strings:TemplateStringsArray)=>{sql.push(strings.join('?'));return 1;}});
    })};
    return {svc:new ReclamosService({db} as unknown as DbService,new RateLimiter(),{queueReclamo:()=>true} as unknown as MailProvider),db,sql};
  }
  const req=(payload:unknown)=>({body:payload,headers:{'x-forwarded-for':'203.0.113.9'},ip:'127.0.0.1'} as unknown as FastifyRequest);
  it('assigns the next yearly number and retries serialization or numbering conflicts',async()=>{
    const log=vi.spyOn(console,'log'),err=vi.spyOn(console,'error');
    const {svc,db,sql}=service(a=>a===0?Object.assign(Error('serialize'),{code:'P2034'}):a===1?Object.assign(Error('duplicate key value violates unique constraint "Reclamo_anio_correlativo_key"'),{code:'P2010',meta:{code:'23505'}}):null);
    const result=await svc.crear(req(valid));
    expect(result).toMatchObject({ok:true,numero:`${new Date().getUTCFullYear()}-000042`,plazoRespuestaDiasHabiles:15});expect(result.fecha).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}0000Z$/);
    expect(db.$transaction).toHaveBeenCalledTimes(3);expect(sql[0]).toContain('INSERT INTO "Reclamo"');
    expect(log).not.toHaveBeenCalled();expect(err).not.toHaveBeenCalled();log.mockRestore();err.mockRestore();
  });
  it('answers 503 after five conflicts and never retries unrelated errors',async()=>{
    const busy=service(()=>Object.assign(Error('write conflict'),{code:'P2034'}));
    await expect(busy.svc.crear(req(valid))).rejects.toMatchObject({status:503});expect(busy.db.$transaction).toHaveBeenCalledTimes(5);
    const other=service(()=>Object.assign(Error('duplicate key value violates unique constraint "Reclamo_pkey"'),{code:'P2010'}));
    await expect(other.svc.crear(req(valid))).rejects.toThrow('Reclamo_pkey');expect(other.db.$transaction).toHaveBeenCalledTimes(1);
  });
});
describe('Report shapes',()=>{
  it('serializes reservations like ReservaDto with optional user',()=>{
    const cancha={id:'c',nombre:'Cancha',tipo:'FUTBOL',descripcion:null,precioPorHora:new Prisma.Decimal('80.5'),capacidad:10,techada:false,superficie:null,activa:true,imagen:null,complejoId:'a',creadoEn:new Date('2026-01-01Z')};
    const r={id:'r',codigo:'X',usuarioId:'u',canchaId:'c',fecha:new Date('2026-01-10Z'),horaInicio:600,horaFin:660,estado:'CONFIRMADA',total:new Prisma.Decimal('80.5'),notas:null,creadoEn:new Date('2026-01-01T00:00:00.120Z'),canchaByCanchaId:cancha,usuarioByUsuarioId:{id:'u',nombre:'U',email:'u@example.test',rol:'USUARIO',activo:true,creadoEn:new Date('2026-01-01Z')}};
    const shape=reservaShape(r as never,true);
    expect(shape).toMatchObject({fecha:'2026-01-10T00:00:00Z',total:'80.50',creadoEn:'2026-01-01T00:00:00.12Z',cancha:{precioPorHora:'80.50',complejo:null,dueno:null},usuario:{rol:'USUARIO'}});
    expect(reservaShape(r as never,false).usuario).toBeNull();
  });
});
describe('Raw JSON body wiring',()=>{
  let app:NestFastifyApplication;
  beforeAll(async()=>{process.env.JWT_SECRET='x'.repeat(32);app=await createApp();await app.init();await app.getHttpAdapter().getInstance().ready();});
  afterAll(async()=>{await app.close();});
  it('rejects amounts whose extra decimals would vanish as doubles, before touching the database',async()=>{
    const payload=JSON.stringify(valid).replace(/}$/,',"monto":10.0000000000000000001}');
    const r=await app.inject({method:'POST',url:'/api/reclamos',headers:{'content-type':'application/json'},payload});
    expect(r.statusCode).toBe(400);expect(r.json()).toEqual({error:'El monto admite hasta dos decimales.'});
  });
});

describe('Complaint receipt after commit',()=>{
  const request={body:valid,headers:{},ip:'192.0.2.1'} as unknown as FastifyRequest;
  function setup(mail:MailProvider,transaction?: (fn:(tx:unknown)=>unknown)=>Promise<unknown>){
    const tx={$queryRaw:async()=>[{max:0}],$executeRaw:vi.fn(async()=>1)};
    const db={$transaction:vi.fn(transaction??(async(fn)=>fn(tx)))};
    return {service:new ReclamosService({db} as unknown as DbService,new RateLimiter(),mail),db,tx};
  }
  it('queues nothing before commit and queues two independently after commit',async()=>{
    const queue=vi.fn(()=>true);let commit!:()=>void;
    const {service,tx}=setup({queueReclamo:queue} as unknown as MailProvider,async fn=>{
      const result=await fn(tx);await new Promise<void>(resolve=>{commit=resolve;});return result;
    });
    vi.stubEnv('RECLAMOS_EMAIL','office@example.test');
    try{
      const pending=service.crear(request);await vi.waitFor(()=>expect(commit).toBeTypeOf('function'));
      expect(queue).not.toHaveBeenCalled();commit();const result=await pending;
      expect(queue).toHaveBeenCalledTimes(2);expect(queue.mock.calls.map(args=>(args as unknown as [{to:string}])[0].to)).toEqual(['reclamo@example.test','office@example.test']);
      const messages=queue.mock.calls as unknown as [{text:string;html:string},string][];
      expect(messages[0][0].text).toBe(messages[1][0].text);expect(messages[0][0].text).toContain(result.numero);
      expect(messages[0][0].text).toContain('Medio de respuesta: Carta al domicilio');expect(messages[0][0].text).toMatch(/Fecha: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} \(hora de Perú\)/);expect(result.fecha).toMatch(/Z$/);
    }finally{vi.unstubAllEnvs();}
  });
  it.each(['','bad address'])('omits invalid internal destination %s and preserves consumer delivery',async(value)=>{
    vi.stubEnv('RECLAMOS_EMAIL',value);const queue=vi.fn(()=>true);
    try{await setup({queueReclamo:queue} as unknown as MailProvider).service.crear(request);expect(queue).toHaveBeenCalledTimes(1);}finally{vi.unstubAllEnvs();}
  });
  it('never queues on rollback and queues only once per recipient after a retry',async()=>{
    const queue=vi.fn(()=>true),mail={queueReclamo:queue} as unknown as MailProvider;
    const rollback=setup(mail,async()=>{throw Error('rollback');});await expect(rollback.service.crear(request)).rejects.toThrow('rollback');expect(queue).not.toHaveBeenCalled();
    let attempt=0;const retry=setup(mail,async fn=>{if(attempt++===0)throw Object.assign(Error('serialization'),{code:'P2034'});return fn(retry.tx);});
    vi.stubEnv('RECLAMOS_EMAIL','office@example.test');
    try{await retry.service.crear(request);expect(retry.db.$transaction).toHaveBeenCalledTimes(2);expect(queue).toHaveBeenCalledTimes(2);}finally{vi.unstubAllEnvs();}
  });
  it.each(['throw','full'])('keeps confirmed result and second delivery when first enqueue is %s',async(kind)=>{
    vi.stubEnv('RECLAMOS_EMAIL','office@example.test');const log=vi.spyOn(console,'error').mockImplementation(()=>undefined);
    const queue=vi.fn().mockImplementationOnce(()=>{if(kind==='throw')throw Error('private data');return false;}).mockReturnValue(true);
    try{const {service,tx}=setup({queueReclamo:queue} as unknown as MailProvider);expect(await service.crear(request)).toMatchObject({ok:true});expect(tx.$executeRaw).toHaveBeenCalledTimes(1);expect(queue).toHaveBeenCalledTimes(2);}finally{log.mockRestore();vi.unstubAllEnvs();}
  });
});

describe('Complaint mail failure keeps HTTP 201',()=>{
  it.each(['full','throw'])('keeps the inserted row when enqueue is %s',async(kind)=>{
    const app=await createApp();await app.init();await app.getHttpAdapter().getInstance().ready();
    const inserted=vi.fn(async()=>1),tx={$queryRaw:async()=>[{max:0}],$executeRaw:inserted};
    const db=vi.spyOn(app.get(DbService),'db','get').mockReturnValue({$transaction:async(fn:(value:unknown)=>unknown)=>fn(tx)} as never);
    const mail=vi.spyOn(app.get(MailProvider),'queueReclamo').mockImplementation(()=>{if(kind==='throw')throw Error('private recipient');return false;});
    const log=vi.spyOn(Logger.prototype,'error').mockImplementation(()=>undefined);
    try{
      const response=await app.inject({method:'POST',url:'/api/reclamos',payload:valid});
      expect(response.statusCode).toBe(201);expect(response.json()).toMatchObject({ok:true});expect(inserted).toHaveBeenCalledTimes(1);
      expect(log.mock.calls.flat().join(' ')).not.toContain(valid.email);
    }finally{db.mockRestore();mail.mockRestore();log.mockRestore();await app.close();}
  });
});
