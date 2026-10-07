import {parityEnvironment} from './parity-environment.mjs';
import {dropFixture} from './f6-cleanup.mjs';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
// Both backends share the host calendar.
process.env.TZ='UTC';
const root=process.cwd(),dbRequire=createRequire(resolve(root,'packages/db/package.json')),apiRequire=createRequire(resolve(root,'apps/api/package.json'));
/** @type {typeof import('../packages/db/dist/index.js').PrismaClient} */
const PrismaClient=dbRequire('@prisma/client').PrismaClient;
const bcrypt=apiRequire('bcryptjs'),crypto=apiRequire('./dist/auth/crypto.js');
const smoke=process.argv[2]==='--smoke-sigterm';
const ci=process.argv[2]==='--ci',dotnet=ci?'dotnet':'/home/lukzy/.dotnet/dotnet';
const settings=parityEnvironment({root,ci,smoke});
if((!ci&&!smoke&&process.argv[2]!=='--confirm-qa-migracion-ts')||!settings.TEST_DATABASE_URL_UNPOOLED)throw Error('QA confirmation and test connection required');
const safe=s=>String(s).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[QA connection]').replace(/ep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/g,'[QA endpoint]');
const admin=smoke?{async $executeRawUnsafe(sql){console.log('Smoke SQL '+sql.split(' ')[0]);return 0;},async $disconnect(){}}:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),dbName='f6_fixture_'+randomBytes(6).toString('hex'),scratch=mkdtempSync(resolve(tmpdir(),'rys-f6-'));
const secret=randomBytes(32).toString('hex'),password='Ficticia123!',hash=await bcrypt.hash(password,10),fixed=new Date('2026-01-01T00:00:00Z');
const origin='http://127.0.0.1:15140',now=new Date(),hour=3600000,minute=60000;
// Start of the Lima calendar day (UTC-5, no DST), same rule as both backends.
const peru=new Date(now.getTime()-5*hour),peruStart=new Date(Date.UTC(peru.getUTCFullYear(),peru.getUTCMonth(),peru.getUTCDate())+5*hour);
const at=(base,offset)=>new Date(base.getTime()+offset);
/** @type {InstanceType<typeof PrismaClient>} */
let db;
/** @type {any} */
let app;
/** @type {import('node:child_process').ChildProcess|undefined} */
let host;
/** @type {Promise<number>|undefined} */
let creating;
let attempted=false;const f0=JSON.parse(readFileSync(resolve(root,'docs/specs/56/fixtures/endpoint-cases.json'),'utf8')).cases;
const manifest=JSON.parse(readFileSync(resolve(root,'docs/specs/56/manifest.json'),'utf8')).actions;
const rows=[];const originalFetch=globalThis.fetch;
const stop=new AbortController();
const signalHandlers=new Map(['SIGINT','SIGTERM'].map(signal=>{const fn=()=>{if(!stop.signal.aborted)stop.abort(new Error('F6 interrupted: '+signal));};process.on(signal,fn);return [signal,fn];}));
const globalTimer=setTimeout(()=>stop.abort(new Error('F6 global timeout (45 minutes)')),2700000);
const fetchLocal=(path,options)=>originalFetch(origin+path,{redirect:'manual',signal:AbortSignal.any([stop.signal,AbortSignal.timeout(30000)]),...options});
async function bounded(promise,label,ms=30000,useStop=true){
 let timer,handler;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timeout')),ms);if(useStop){handler=()=>reject(stop.signal.reason);if(stop.signal.aborted)handler();else stop.signal.addEventListener('abort',handler,{once:true});}})]);}
 finally{clearTimeout(timer);if(handler)stop.signal.removeEventListener('abort',handler);}
}
/** @type {Record<string,import('../packages/db/dist/index.js').Prisma.UsuarioCreateInput['rol']>} */
const roles={owner:'SUPERADMIN',other:'SUPERADMIN',third:'SUPERADMIN',fresh:'SUPERADMIN',expired:'SUPERADMIN',admin:'ADMIN',adminb:'ADMIN',tech:'TECNICO',player:'USUARIO',client:'USUARIO',unused:'USUARIO'};
const token=a=>crypto.sign({id:a,email:a+'@example.test',nombre:'Prueba '+a,rol:roles[a],tv:0},604800);
// Seeded rows never tie on ordering columns: legacy lists define no tie-breaker.
const tables=['Usuario','Complejo','ComplejoMiembro','Suscripcion','Cancha','Reserva','CajaSesion','MovimientoCaja','Producto','Meta','Reclamo'];
let seeded=false;
async function restore(){
 stop.signal.throwIfAborted();
 if(seeded){await db.$executeRawUnsafe('SELECT f6_seed.restore()');return;}
 /** @type {import('../packages/db/dist/index.js').Prisma.PrismaPromise<unknown>[]} */
 const tasks=[db.$executeRawUnsafe('TRUNCATE TABLE '+tables.map(t=>`"${t}"`).join(', ')+' CASCADE')];
 tasks.push(db.usuario.createMany({data:Object.entries(roles).map(([id,rol],i)=>({id,nombre:'Prueba '+id,email:id+'@example.test',password:hash,rol,activo:true,tokenVersion:0,creadoEn:at(fixed,i*minute)}))}));
 /** @type {Array<[string,string,number,boolean]>} id, owner, created hour offset, subscribed */
 const complexes=[['a','owner',0,true],['b','other',1,true],['c','third',2,true],['a2','owner',3,false],['expired-complex','expired',4,false]];
 tasks.push(db.complejo.createMany({data:complexes.map(([id,duenoId,h])=>({id,nombre:'Complejo '+id,duenoId,direccion:'Ficticia',distrito:'Cayma',ciudad:'Arequipa',slug:id,publicado:true,creadoEn:at(fixed,h*hour),actualizadoEn:fixed}))}));
 const today=new Date(now.toISOString().slice(0,10)+'T00:00:00Z'),end=new Date(today.getTime()+30*86400000);
 tasks.push(db.suscripcion.createMany({data:complexes.filter(c=>c[3]).map(([id],i)=>({id:'sub-'+id,complejoId:id,plan:'MENSUAL',estado:'ACTIVA',fechaInicio:today,fechaFin:end,creadoEn:at(fixed,i*minute)}))}));
 tasks.push(db.complejoMiembro.createMany({data:[{id:'member-a',complejoId:'a',usuarioId:'admin',activo:true,rolSede:'ADMIN',creadoEn:fixed},{id:'member-b',complejoId:'b',usuarioId:'adminb',activo:true,rolSede:'ADMIN',creadoEn:fixed},{id:'member-b-off',complejoId:'b',usuarioId:'client',activo:false,rolSede:'ADMIN',creadoEn:at(fixed,minute)}]}));
 tasks.push(db.cancha.createMany({data:[['court-a','a',true,'Cancha Alfa'],['court-a-off','a',false,'Cancha Beta'],['court-a2','a2',true,'Cancha Gamma'],['court-b','b',true,'Cancha Delta'],['court-free',null,true,'Cancha Libre']].map(([id,complejoId,activa,nombre],i)=>({id:String(id),complejoId:complejoId&&String(complejoId),nombre:String(nombre),tipo:i%2?'FUTBOL5':'FUTBOL',precioPorHora:'80.50',capacidad:10,activa:Boolean(activa),creadoEn:fixed}))}));
 /** @type {Array<[string,string,string,string|null,string,string,string]>} id, user, court, complex, state, total, paid */
 const reservas=[['r1','player','court-a','a','CONFIRMADA','80.50','20.00'],['r2','client','court-a',null,'PENDIENTE','45.25','0.00'],['r3','client','court-a-off','a','CANCELADA','30.00','0.00'],['r4','player','court-b','b','CONFIRMADA','100.00','100.00'],['r5','client','court-a2','a2','CONFIRMADA','60.10','0.00'],['r6','player','court-free',null,'COMPLETADA','33.33','0.00'],['r7','client','court-a','a','CONFIRMADA','19.99','25.00'],['r8','unused','court-a','a','CONFIRMADA','10.01','0.00']];
 tasks.push(db.reserva.createMany({data:reservas.map(([id,usuarioId,canchaId,complejoId,estado,total,montoPagado],i)=>({id,codigo:'F6-'+id.toUpperCase(),usuarioId,canchaId,complejoId,fecha:new Date(Date.UTC(2026,0,10+i)),horaInicio:600,horaFin:660,estado:/** @type {any} */(estado),total,montoPagado,creadoEn:at(fixed,i*hour)}))}));
 tasks.push(db.cajaSesion.createMany({data:[{id:'caja-a',complejoId:'a',abiertaPorId:'owner',montoInicial:'100.00',estado:'ABIERTA',abiertaEn:at(peruStart,-2*hour)},{id:'caja-a-old',complejoId:'a',abiertaPorId:'owner',cerradaPorId:'owner',montoInicial:'20.00',montoFinal:'35.00',estado:'CERRADA',abiertaEn:at(fixed,hour),cerradaEn:at(fixed,2*hour)},{id:'caja-b',complejoId:'b',abiertaPorId:'other',montoInicial:'50.00',estado:'ABIERTA',abiertaEn:at(peruStart,-hour)}]}));
 /** @type {Array<[string,string,string,string,string,string,Date]>} id, complex, cash, type, method, amount, created */
 const movs=[['m1','a','caja-a','SNACK','EFECTIVO','12.50',at(peruStart,minute)],['m2','a','caja-a','EGRESO','YAPE','5.25',at(peruStart,2*minute)],['m3','a','caja-a','ABONO','TRANSFERENCIA','40.00',at(peruStart,3*minute)],['m4','a','caja-a','SNACK','EFECTIVO','9.99',at(peruStart,-hour)],['m5','a','caja-a-old','ABONO','EFECTIVO','15.00',at(fixed,90*minute)],['m6','b','caja-b','ABONO','EFECTIVO','70.00',at(peruStart,4*minute)],['m7','a','caja-a','AJUSTE','EFECTIVO','1.10',at(peruStart,5*minute)]];
 tasks.push(db.producto.createMany({data:[['p-agua','a','Agua','SNACK','2.00',2,true],['p-cola','a','Cola','SNACK','3.50',10,true],['p-pelota','a','Pelota','ALQUILER','15.00',null,true],['p-off','a','Retirado','SNACK','1.00',5,false],['p-b','b','Bebida B','SNACK','4.00',5,true]].map(([id,complejoId,nombre,categoria,precio,stock,activo])=>({id:String(id),complejoId:String(complejoId),nombre:String(nombre),categoria:String(categoria),precio:String(precio),stock:/** @type {number|null} */(stock),activo:Boolean(activo)}))}));
 tasks.push(db.movimientoCaja.createMany({data:movs.map(([id,complejoId,cajaId,tipo,metodoPago,monto,creadoEn])=>({id,complejoId,cajaId,tipo:/** @type {any} */(tipo),metodoPago:/** @type {any} */(metodoPago),monto,descripcion:'Movimiento '+id,creadoPorId:'owner',creadoEn}))}));
 tasks.push(db.meta.createMany({data:[{id:'meta-a1',complejoId:'a',titulo:'Ingresos Q1',tipo:'INGRESOS',objetivo:'1000.00',actual:'250.50',periodoInicio:new Date('2026-01-01Z'),periodoFin:new Date('2026-03-31Z')},{id:'meta-a2',complejoId:'a',titulo:'Reservas S1',tipo:'RESERVAS',objetivo:'50.00',actual:'0.00',periodoInicio:new Date('2026-01-01Z'),periodoFin:new Date('2026-06-30Z')},{id:'meta-b',complejoId:'b',titulo:'Meta B',tipo:'OCUPACION',objetivo:'80.00',actual:'10.00',periodoInicio:new Date('2026-02-01Z'),periodoFin:new Date('2026-02-28Z')}]}));
 await db.$transaction(tasks);
 // Snapshot inside the disposable database only: later restores are a single round trip.
 await db.$executeRawUnsafe('CREATE SCHEMA f6_seed');
 for(const t of tables)await db.$executeRawUnsafe(`CREATE TABLE f6_seed."${t}" AS TABLE public."${t}"`);
 await db.$executeRawUnsafe(`CREATE FUNCTION f6_seed.restore() RETURNS void LANGUAGE plpgsql AS $$ BEGIN TRUNCATE TABLE ${tables.map(t=>`public."${t}"`).join(', ')} CASCADE; ${tables.map(t=>`INSERT INTO public."${t}" SELECT * FROM f6_seed."${t}";`).join(' ')} END $$`);
 seeded=true;
}
async function effect(){
 // One round trip; every column of every F6 table is compared. Money columns come back as exact text.
 const snapshot=await db.$queryRawUnsafe(`SELECT json_build_object(${tables.map(t=>`'${t}', COALESCE((SELECT json_agg(x ORDER BY x."id") FROM "${t}" x), '[]'::json)`).join(', ')})::text AS effects`);
 const result=JSON.parse(snapshot[0].effects.replace(/("(?:monto|montoInicial|montoFinal|precio|precioPorHora|total|montoPagado|objetivo|actual)":)(-?\d+(?:\.\d+)?)/g,'$1"$2"'));
 for(const u of result.Usuario)if(u.password!==hash)throw Error('Unexpected password write');
 for(const name of Object.keys(result))result[name]=result[name].map(normalize).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return result;
}
function normalize(v,key){
 if(v instanceof Date)return normalize(v.toISOString());
 if(Array.isArray(v))return v.map(x=>normalize(x));
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x,k)]));
 if(typeof v==='string'){
  if(key==='traceId'&&/^(00-[a-f0-9]{32}-[a-f0-9]{16}-0[01]|[0-9A-Z]{13}:[0-9A-F]{8})$/.test(v))return '[traceId]';
  v=v.replace(/[a-f0-9]{32}/g,'[new GUID N]').replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,'[new GUID D]');
  if(/^\d{4}-\d\d-\d\dT/.test(v)){
   const time=Date.parse(v.replace(/(\.\d{3})\d+/,'$1'));if(Number.isFinite(time)&&Math.abs(time-Date.now())<120000&&Math.abs(time-now.getTime())>1000)return '[request time]'+(v.endsWith('Z')?'Z':'');
   return v.replace(/\.000Z$/,'Z').replace(/(\.\d*?[1-9])0+Z$/,'$1Z');
  }
 }
 return v;
}
let seq=1;
/** @param {string} backend @param {string} path @param {{method?:string,body?:unknown,raw?:string,actor?:string|null,ip?:string}} [options] */
async function request(backend,path,{method='GET',body,raw,actor='owner',ip}={}){
 const h={'x-forwarded-for':ip??'192.0.2.'+(seq++%250),...(actor?{cookie:'token='+token(actor)}:{})};let data;
 if(raw!==undefined){h['content-type']='application/json';data=raw;}else if(body!==undefined){h['content-type']='application/json';data=JSON.stringify(body);}
 const parse=text=>{try{return text?JSON.parse(text):null;}catch{return {text};}};
 if(backend==='legacy'){const r=await fetchLocal(path,{method,headers:h,body:data});const text=await r.text();return {status:r.status,body:parse(text),type:(r.headers.get('content-type')||'').split(';')[0]};}
 const r=await bounded(app.inject({method,url:path,headers:h,...(data!==undefined?{payload:data}:{})}),'Nest '+method+' '+path);return {status:r.statusCode,body:parse(r.body),type:String(r.headers['content-type']||'').split(';')[0]};
}
let dirty=true,baseline;
const securityRoutes=new Set(manifest.filter(a=>a.authorization.allowedRoles.length).map(a=>a.id));
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
/** @param {string} id @param {string} endpointId @param {string} path @param {any} options @param {((backend:string)=>Promise<unknown>)|undefined} [prepare] @param {string} [classification] */
async function compare(id,endpointId,path,options,prepare,classification){if(only&&!only.includes(endpointId))return;const results=[];let nestBefore;const security=id.endsWith('-tv-revocado')&&securityRoutes.has(endpointId);
 for(const backend of ['legacy','nest']){console.log('F6 '+id+' '+backend);if(dirty){await bounded(restore(),'Fixture '+id,45000);if(!baseline)baseline=normalize(await effect());dirty=false;}if(prepare){dirty=true;await prepare(backend);}if(security&&backend==='nest')nestBefore=normalize(await effect());
  const response=await request(backend,path,options);
  const effects=normalize(await effect());dirty=dirty||!isDeepStrictEqual(effects,baseline);results.push(normalize({response,effects}));}
 if(security){const rejected=results[1].response.status===403&&isDeepStrictEqual(results[1].response.body,{error:'Sin permisos'})&&isDeepStrictEqual(results[1].effects,nestBefore);rows.push({id,endpointId,path,result:rejected?'SECURITY_DIVERGENCE':'FAIL',classification:'divergencia intencional de seguridad aceptada: Nest rechaza sesión revocada; legado omite ValidSession con Roles',legacyStatus:results[0].response.status,nestStatus:results[1].response.status,...(!rejected?{legacy:results[0],nest:results[1]}:{})});return;}
 if(classification){rows.push({id,endpointId,path,result:'BLOCKED',classification,legacyStatus:results[0].response.status,nestStatus:results[1].response.status,legacyBody:results[0].response.body,nestBody:results[1].response.body,effectsEqual:isDeepStrictEqual(results[0].effects,results[1].effects)});return;}
 const expected=f0.find(c=>c.id===id)?.expected.status,pass=isDeepStrictEqual(results[0],results[1])&&(expected===undefined||results[0].response.status===expected);
 rows.push({id,endpointId,path,result:pass?'PASS':'FAIL',...(pass?{status:results[0].response.status}:{expected,legacy:results[0],nest:results[1]})});
}
/** Sequential requests sharing one client IP (rate limits): statuses, bodies and effects must match. */
async function sequence(id,endpointId,make){
 if(only&&!only.includes(endpointId))return;const results=[];
 for(const backend of ['legacy','nest']){await bounded(restore(),'Fixture '+id,45000);dirty=true;const out=[];for(const [path,options]of make())out.push(await request(backend,path,options));results.push(normalize({responses:out,effects:await effect()}));}
 const pass=isDeepStrictEqual(results[0],results[1]);rows.push({id,endpointId,result:pass?'PASS':'FAIL',...(pass?{statuses:results[0].responses.map(r=>r.status)}:{legacy:results[0],nest:results[1]})});
}
/** Concurrent money operations: Nest must keep the invariant; the legacy outcome is informative. */
async function race(id,endpointId,prepare,makeRequests,check){
 if(only&&!only.includes(endpointId))return;
 for(const backend of ['legacy','nest']){
  await bounded(restore(),'Fixture '+id,45000);dirty=true;await prepare();
  const statuses=(await Promise.all(makeRequests(backend))).map(r=>r.status).sort(),outcome=await check(statuses);
  rows.push({id:id+'-'+backend,endpointId,result:backend==='nest'?(outcome.ok?'PASS':'FAIL'):'INFO',invariantHeld:outcome.ok,statuses,...outcome.details});
 }
}
async function run(){
 if(smoke){attempted=true;creating=admin.$executeRawUnsafe('CREATE DATABASE fixture');await creating;host=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(JSON.stringify({smokeReady:true,pid:host.pid,scratch}));await bounded(new Promise(()=>{}),'Signal smoke',30000);return;}
 attempted=true;creating=admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);await bounded(creating,'QA create');stop.signal.throwIfAborted();const url=new URL(settings.TEST_DATABASE_URL_UNPOOLED);url.pathname='/'+dbName;url.searchParams.set('connection_limit','12');
 const env={PARITY_CI:ci?'true':undefined,PATH:process.env.PATH,HOME:process.env.HOME,DOTNET_ROOT:process.env.DOTNET_ROOT||(ci?'/usr/share/dotnet':'/home/lukzy/.dotnet'),TZ:'UTC',JWT_SECRET:secret,DATABASE_URL:url.toString(),DATABASE_URL_UNPOOLED:url.toString(),F3_QA_FIXTURE:'true',F6_QA_FIXTURE:'true',ASPNETCORE_ENVIRONMENT:'Production',COOKIE_SECURE:'false',MEDIA_PUBLIC_URL:'https://media.example.test',R2_ENDPOINT:origin+'/_s3',R2_ACCESS_KEY_ID:'fixture-key',R2_SECRET_ACCESS_KEY:'fixture-secret',R2_BUCKET_NAME:'fixture-bucket',LEGACY_WEB_ROOT:resolve(scratch,'nest-webroot')};
 const migrate=spawnSync(process.execPath,[dbRequire.resolve('prisma/build/index.js'),'migrate','deploy','--schema',resolve(root,'packages/db/prisma/schema.prisma')],{env,encoding:'utf8',timeout:60000});if(migrate.status!==0)throw Error(safe(migrate.stderr||migrate.stdout));
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});Object.assign(process.env,env);
 // Migration 1_libro_reclamaciones (approved for QA) must be present in the disposable database.
 if((await db.$queryRawUnsafe(`SELECT to_regclass('public."Reclamo"')::text AS t`))[0].t===null)throw Error('Reclamo table missing from the disposable database');
 const content=resolve(scratch,'content');mkdirSync(content,{recursive:true});host=spawn(dotnet,[resolve(root,'tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll'),'--contentRoot',content,'--urls',origin],{env,cwd:content,stdio:['ignore','pipe','pipe']});let logs='';host.stdout.on('data',b=>logs+=safe(b));host.stderr.on('data',b=>logs+=safe(b));
 for(let i=0;i<150;i++){stop.signal.throwIfAborted();try{if((await fetchLocal('/_test/health')).ok)break;}catch{}if(host.exitCode!==null)throw Error('Fixture startup failed: '+logs);await new Promise(r=>setTimeout(r,200));if(i===149)throw Error('Fixture startup timeout');}
 app=await bounded(apiRequire('./dist/app.js').createApp(),'Nest create');await bounded(app.init(),'Nest init');await bounded(app.getHttpAdapter().getInstance().ready(),'Fastify ready');
 console.log('F6 disposable fixture initialized');
 const reclamo={nombre:'Persona de Prueba',email:'reclamo@example.test',documentoTipo:'DNI',documento:'00000000',domicilio:'Dirección ficticia 123',telefono:'900000000',menor:false,bienTipo:'Servicio',bienDescripcion:'Reserva de cancha ficticia',monto:'50.00',tipo:'RECLAMO',detalle:'Detalle sintético del reclamo de prueba',pedido:'Pedido sintético',medioRespuesta:'Correo electrónico'};
 /** @type {Array<[string,string,string,unknown,string|null]>} */
 const nominal=[
  ['E001','GET','/api/abonos?complejoId=a',undefined,'owner'],['E002','POST','/api/abonos/abonar',{complejoId:'a',monto:'25.505',descripcion:' Abono parcial ',metodoPago:'yape'},'owner'],['E003','GET','/api/abonos/cuenta?complejoId=a',undefined,'player'],['E004','POST','/api/abonos/cuenta',{},'player'],
  ['E015','GET','/api/caja/hoy',undefined,'owner'],['E016','GET','/api/caja/sesion',undefined,'owner'],['E017','POST','/api/caja/apertura',{montoInicial:150.555},'third'],['E018','POST','/api/caja/cierre',{montoFinal:'180.10'},'owner'],
  ['E019','POST','/api/caja/movimientos',{items:[{productoId:'p-cola',cantidad:2},{nombre:' Alquiler cancha ',precio:'45.555',qty:1}],metodoPago:'yape'},'owner'],['E020','GET','/api/caja/productos',undefined,'owner'],
  ['E021','POST','/api/caja/productos',{nombre:' Gaseosa ',categoria:'snack',precio:'4.255',stock:12},'owner'],['E022','PUT','/api/caja/productos/p-cola',{precio:3.755,stock:7},'owner'],['E023','DELETE','/api/caja/productos/p-cola',undefined,'owner'],
  ['E048','GET','/api/metas',undefined,'owner'],['E049','POST','/api/metas',{titulo:' Meta trimestral ',tipo:'ingresos',objetivo:'1500.005',periodoInicio:'2026-04-01',periodoFin:'2026-06-30'},'owner'],['E050','PATCH','/api/metas/meta-a1',{actual:'300.125',periodoFin:'2026-04-30'},'owner'],['E051','DELETE','/api/metas/meta-a1',undefined,'owner'],
  ['E064','GET','/api/reportes/dashboard',undefined,'player'],['E065','GET','/api/reportes/global',undefined,'owner'],
 ];
 const scoped=new Set(['E001','E002','E003','E004','E015','E016','E017','E018','E019','E020','E021','E022','E023','E048','E049','E050','E051','E063','E064','E065']);
 if(manifest.filter(a=>scoped.has(a.id)).length!==20)throw Error('F6 scope must contain 20 endpoints');
 for(const [e,method,path,body,actor]of nominal){await compare(e+'-nominal',e,path,{method,body,actor});await compare(e+'-sin-sesion',e,path,{method,body,actor:null});}
 for(const [e,method,path,body,actor]of nominal){
  await compare(e+'-tv-revocado',e,path,{method,body,actor},()=>db.usuario.update({where:{id:actor},data:{tokenVersion:1}}));
  const allowed=manifest.find(a=>a.id===e).authorization.allowedRoles;
  if(allowed.length&&!allowed.includes('USUARIO'))await compare(e+'-rol-no-permitido',e,path,{method,body,actor:'player'});
 }
 /** @type {Array<[string,string,string,string,unknown,string|null]>} */
 const negatives=[
  ['E001','todas','GET','/api/abonos',undefined,'owner'],['E001','platform','GET','/api/abonos',undefined,'tech'],['E001','member','GET','/api/abonos',undefined,'admin'],['E001','otra-sede','GET','/api/abonos?complejoId=b',undefined,'owner'],['E001','bloqueado-propio','GET','/api/abonos?complejoId=a2',undefined,'owner'],['E001','missing','GET','/api/abonos?complejoId=absent',undefined,'owner'],['E001','sin-complejos','GET','/api/abonos',undefined,'fresh'],['E001','expired','GET','/api/abonos',undefined,'expired'],['E001','blank-query','GET','/api/abonos?complejoId=%20',undefined,'other'],
  ['E002','sin-complejo','POST','/api/abonos/abonar',{monto:5},'owner'],['E002','monto-cero','POST','/api/abonos/abonar',{complejoId:'a',monto:0},'owner'],['E002','monto-negativo','POST','/api/abonos/abonar',{complejoId:'a',monto:'-3'},'owner'],['E002','monto-texto','POST','/api/abonos/abonar',{complejoId:'a',monto:'abc'},'owner'],['E002','monto-bool','POST','/api/abonos/abonar',{complejoId:'a',monto:true},'owner'],
  ['E002','otra-sede','POST','/api/abonos/abonar',{complejoId:'b',monto:5},'owner'],['E002','metodo','POST','/api/abonos/abonar',{complejoId:'a',monto:5,metodoPago:'BITCOIN'},'owner'],['E002','metodo-vacio','POST','/api/abonos/abonar',{complejoId:'a',monto:5,metodoPago:' '},'owner'],['E002','bloqueado-sin-caja','POST','/api/abonos/abonar',{complejoId:'a2',monto:'10.005'},'owner'],
  ['E002','platform','POST','/api/abonos/abonar',{complejoId:'b',monto:'1e2',metodoPago:'4'},'tech'],['E002','member','POST','/api/abonos/abonar',{complejoId:'a',monto:'1,250.50'},'admin'],['E002','numero-redondeo','POST','/api/abonos/abonar',{complejoId:'a',monto:10.005},'owner'],['E002','mayusculas','POST','/api/abonos/abonar',{ComplejoId:'a',MONTO:'7.5',Descripcion:'Caso'},'owner'],
  ['E015','platform','GET','/api/caja/hoy',undefined,'tech'],['E015','member','GET','/api/caja/hoy',undefined,'admin'],['E015','sin-complejo','GET','/api/caja/hoy',undefined,'fresh'],['E015','expired','GET','/api/caja/hoy',undefined,'expired'],['E015','sin-caja','GET','/api/caja/hoy',undefined,'third'],
  ['E016','sin-complejo','GET','/api/caja/sesion',undefined,'fresh'],['E016','otra','GET','/api/caja/sesion',undefined,'other'],['E016','sin-caja','GET','/api/caja/sesion',undefined,'third'],
  ['E017','caja-ya-abierta','POST','/api/caja/apertura',{montoInicial:100},'owner'],['E017','negativo','POST','/api/caja/apertura',{montoInicial:-1},'third'],['E017','sin-monto','POST','/api/caja/apertura',{},'third'],['E017','sin-complejo','POST','/api/caja/apertura',{montoInicial:1},'fresh'],['E017','texto','POST','/api/caja/apertura',{montoInicial:'x1'},'third'],['E017','cero','POST','/api/caja/apertura',{montoInicial:'0'},'third'],['E017','abierta-y-negativo','POST','/api/caja/apertura',{montoInicial:-1},'owner'],
  ['E018','sin-caja','POST','/api/caja/cierre',{montoFinal:10},'third'],['E018','negativo','POST','/api/caja/cierre',{montoFinal:-0.01},'owner'],['E018','sin-monto','POST','/api/caja/cierre',{},'owner'],['E018','sin-complejo','POST','/api/caja/cierre',{montoFinal:1},'fresh'],['E018','member','POST','/api/caja/cierre',{montoFinal:120.005},'admin'],['E018','platform','POST','/api/caja/cierre',{montoFinal:0},'tech'],
  ['E019','simple','POST','/api/caja/movimientos',{descripcion:' Compra hielo ',monto:'8.555',tipo:'egreso'},'owner'],['E019','simple-default','POST','/api/caja/movimientos',{descripcion:'Venta suelta',monto:3},'owner'],['E019','tipo','POST','/api/caja/movimientos',{descripcion:'X',monto:3,tipo:'REGALO'},'owner'],['E019','metodo','POST','/api/caja/movimientos',{descripcion:'X',monto:3,metodoPago:'oro'},'owner'],['E019','metodo-numero','POST','/api/caja/movimientos',{descripcion:'X',monto:3,metodoPago:'1'},'owner'],
  ['E019','cantidad-cero','POST','/api/caja/movimientos',{items:[{productoId:'p-cola',cantidad:0}]},'owner'],['E019','producto-ajeno','POST','/api/caja/movimientos',{items:[{productoId:'p-b'}]},'owner'],['E019','producto-inactivo','POST','/api/caja/movimientos',{items:[{productoId:'p-off'}]},'owner'],['E019','stock','POST','/api/caja/movimientos',{items:[{productoId:'p-agua',cantidad:3}]},'owner'],
  ['E019','stock-acumulado','POST','/api/caja/movimientos',{items:[{productoId:'p-agua',qty:1},{productoId:'p-agua',cantidad:2}]},'owner'],['E019','stock-justo','POST','/api/caja/movimientos',{items:[{productoId:'p-agua'},{productoId:'p-agua',qty:1},{productoId:'p-pelota',cantidad:3}],metodoPago:'tarjeta'},'owner'],['E019','directo-sin-precio','POST','/api/caja/movimientos',{items:[{nombre:'Alquiler'}]},'owner'],['E019','directo-cero','POST','/api/caja/movimientos',{items:[{nombre:'Alquiler',precio:0}]},'owner'],
  ['E019','items-vacios','POST','/api/caja/movimientos',{items:[],descripcion:'Vacío',monto:'2.50',tipo:'ajuste'},'owner'],['E019','auto-apertura-rechazada','POST','/api/caja/movimientos',{items:[{productoId:'p-cola',cantidad:-1}]},'third'],['E019','auto-apertura','POST','/api/caja/movimientos',{descripcion:'Primera venta',monto:9.99},'third'],
  ['E019','sin-descripcion','POST','/api/caja/movimientos',{monto:3},'owner'],['E019','monto-cero','POST','/api/caja/movimientos',{descripcion:'X',monto:0},'owner'],['E019','sin-complejo','POST','/api/caja/movimientos',{descripcion:'X',monto:1},'fresh'],['E019','precio-texto','POST','/api/caja/movimientos',{items:[{nombre:'X',precio:'diez'}]},'owner'],['E019','member','POST','/api/caja/movimientos',{items:[{productoId:'p-cola',qty:3}]},'admin'],['E019','platform','POST','/api/caja/movimientos',{descripcion:'Plataforma',monto:1},'tech'],
  ['E020','platform','GET','/api/caja/productos',undefined,'tech'],['E020','sin-complejo','GET','/api/caja/productos',undefined,'fresh'],['E020','otra','GET','/api/caja/productos',undefined,'other'],
  ['E021','sin-nombre','POST','/api/caja/productos',{nombre:' ',categoria:'SNACK',precio:1},'owner'],['E021','categoria','POST','/api/caja/productos',{nombre:'X',categoria:'COMIDA',precio:1},'owner'],['E021','sin-categoria','POST','/api/caja/productos',{nombre:'X',precio:1},'owner'],['E021','precio','POST','/api/caja/productos',{nombre:'X',categoria:'SNACK',precio:0},'owner'],['E021','stock','POST','/api/caja/productos',{nombre:'X',categoria:'SNACK',precio:1,stock:-1},'owner'],['E021','sin-complejo','POST','/api/caja/productos',{nombre:'X',categoria:'SNACK',precio:1},'fresh'],['E021','servicio-sin-stock','POST','/api/caja/productos',{nombre:'Masaje',categoria:'servicio',precio:'20'},'owner'],
  ['E022','otra-sede','PUT','/api/caja/productos/p-b',{nombre:'Ajeno'},'owner'],['E022','platform','PUT','/api/caja/productos/p-b',{categoria:'alquiler',stock:0},'tech'],['E022','categoria','PUT','/api/caja/productos/p-cola',{nombre:'Nuevo',categoria:'X'},'owner'],['E022','precio','PUT','/api/caja/productos/p-cola',{precio:0},'owner'],['E022','stock','PUT','/api/caja/productos/p-cola',{stock:-2},'owner'],['E022','nombre-blanco','PUT','/api/caja/productos/p-cola',{nombre:'  ',categoria:'servicio'},'owner'],['E022','missing','PUT','/api/caja/productos/absent',{},'owner'],['E022','member','PUT','/api/caja/productos/p-agua',{nombre:' Agua mineral '},'admin'],['E022','inactivo','PUT','/api/caja/productos/p-off',{stock:9},'owner'],
  ['E023','otra-sede','DELETE','/api/caja/productos/p-b',undefined,'owner'],['E023','missing','DELETE','/api/caja/productos/absent',undefined,'owner'],['E023','platform','DELETE','/api/caja/productos/p-b',undefined,'tech'],['E023','sin-complejo','DELETE','/api/caja/productos/p-cola',undefined,'fresh'],
  ['E048','platform','GET','/api/metas',undefined,'tech'],['E048','sin-complejo','GET','/api/metas',undefined,'fresh'],['E048','otra','GET','/api/metas',undefined,'other'],
  ['E049','sin-titulo','POST','/api/metas',{tipo:'INGRESOS',objetivo:1,periodoInicio:'2026-01-01',periodoFin:'2026-01-02'},'owner'],['E049','tipo','POST','/api/metas',{titulo:'X',tipo:'VENTAS',objetivo:1,periodoInicio:'2026-01-01',periodoFin:'2026-01-02'},'owner'],['E049','tipo-numero','POST','/api/metas',{titulo:'X',tipo:'1',objetivo:1,periodoInicio:'2026-01-01',periodoFin:'2026-01-02'},'owner'],
  ['E049','objetivo','POST','/api/metas',{titulo:'X',tipo:'RESERVAS',objetivo:0,periodoInicio:'2026-01-01',periodoFin:'2026-01-02'},'owner'],['E049','fecha','POST','/api/metas',{titulo:'X',tipo:'RESERVAS',objetivo:1,periodoInicio:'2026-13-01',periodoFin:'2026-01-02'},'owner'],['E049','fecha-corta','POST','/api/metas',{titulo:'X',tipo:'RESERVAS',objetivo:1,periodoInicio:'2026-4-1',periodoFin:'2026-05-01'},'owner'],
  ['E049','fin-anterior','POST','/api/metas',{titulo:'X',tipo:'RESERVAS',objetivo:1,periodoInicio:'2026-05-01',periodoFin:'2026-04-30'},'owner'],['E049','mismo-dia','POST','/api/metas',{titulo:'Un día',tipo:'ocupacion',objetivo:'0.004',periodoInicio:' 2026-05-01 ',periodoFin:'2026-05-01'},'owner'],['E049','sin-complejo','POST','/api/metas',{titulo:'X',tipo:'RESERVAS',objetivo:1,periodoInicio:'2026-01-01',periodoFin:'2026-01-02'},'fresh'],
  ['E050','otra-sede','PATCH','/api/metas/meta-b',{titulo:'Ajena'},'owner'],['E050','platform','PATCH','/api/metas/meta-b',{tipo:'reservas',objetivo:'99.999'},'tech'],['E050','tipo','PATCH','/api/metas/meta-a1',{titulo:'Nuevo',tipo:'X'},'owner'],['E050','objetivo','PATCH','/api/metas/meta-a1',{objetivo:0},'owner'],['E050','actual','PATCH','/api/metas/meta-a1',{actual:-1},'owner'],
  ['E050','fecha-inicio','PATCH','/api/metas/meta-a1',{periodoInicio:'01/02/2026'},'owner'],['E050','fecha-fin','PATCH','/api/metas/meta-a1',{periodoFin:''},'owner'],['E050','fin-anterior','PATCH','/api/metas/meta-a1',{periodoInicio:'2026-04-01'},'owner'],['E050','missing','PATCH','/api/metas/absent',{},'owner'],['E050','member','PATCH','/api/metas/meta-a2',{actual:'12'},'admin'],
  ['E051','otra-sede','DELETE','/api/metas/meta-b',undefined,'owner'],['E051','missing','DELETE','/api/metas/absent',undefined,'owner'],['E051','platform','DELETE','/api/metas/meta-b',undefined,'tech'],
  ['E063','payload-invalido','POST','/api/reclamos',{},null],['E063','email','POST','/api/reclamos',{...reclamo,email:'sin-arroba'},null],['E063','documento-tipo','POST','/api/reclamos',{...reclamo,documentoTipo:'RUC'},null],['E063','longitudes','POST','/api/reclamos',{...reclamo,documento:'123',telefono:'1',detalle:'corto'},null],
  ['E063','nombre-recortado','POST','/api/reclamos',{...reclamo,nombre:'  ab  '},null],['E063','menor-sin-apoderado','POST','/api/reclamos',{...reclamo,menor:true,apoderado:'Tutor'},null],['E063','monto-decimales','POST','/api/reclamos',{...reclamo,monto:'10.555'},null],['E063','monto-negativo','POST','/api/reclamos',{...reclamo,monto:-1},null],['E063','medio','POST','/api/reclamos',{...reclamo,medioRespuesta:'WhatsApp'},null],['E063','nulos','POST','/api/reclamos',{...reclamo,nombre:null,email:null},null],
  ['E064','owner','GET','/api/reportes/dashboard',undefined,'owner'],['E064','admin','GET','/api/reportes/dashboard',undefined,'admin'],['E064','admin-b','GET','/api/reportes/dashboard',undefined,'adminb'],['E064','platform','GET','/api/reportes/dashboard',undefined,'tech'],['E064','sin-complejos','GET','/api/reportes/dashboard',undefined,'fresh'],['E064','client','GET','/api/reportes/dashboard',undefined,'client'],['E064','expired','GET','/api/reportes/dashboard',undefined,'expired'],
  ['E065','platform','GET','/api/reportes/global',undefined,'tech'],['E065','admin','GET','/api/reportes/global',undefined,'admin'],['E065','otra','GET','/api/reportes/global',undefined,'other'],['E065','sin-complejos','GET','/api/reportes/global',undefined,'fresh'],['E065','tercero','GET','/api/reportes/global',undefined,'third'],
 ];
 for(const [e,name,method,path,body,actor]of negatives)await compare(e+'-'+name,e,path,{method,body,actor});
 // Exact decimal literals beyond double precision must survive binding.
 await compare('E002-literal-exacto','E002','/api/abonos/abonar',{method:'POST',raw:'{"complejoId":"a","monto":12345678.125000000000000001}',actor:'owner'});
 await compare('E017-literal-exacto','E017','/api/caja/apertura',{method:'POST',raw:'{"montoInicial":0.1250000000000000000001}',actor:'third'});
 // Owner isolation in reports after a foreign complex changes: owner totals must not move.
 await compare('E065-aislamiento','E065','/api/reportes/global',{method:'GET',actor:'owner'},()=>db.reserva.update({where:{id:'r4'},data:{total:'999.99',estado:'CONFIRMADA'}}));
 await compare('E064-cache-canchas','E064','/api/reportes/dashboard',{method:'GET',actor:'player'});
 await compare('E063-nominal','E063','/api/reclamos',{method:'POST',body:reclamo,actor:null});
 await compare('E063-menor','E063','/api/reclamos',{method:'POST',body:{...reclamo,menor:true,apoderado:' Tutor ',apoderadoDocumento:'11111111',apoderadoDomicilio:'Domicilio tutor',apoderadoTelefono:'911111111',monto:null,tipo:'QUEJA',bienTipo:'Producto'},actor:null});
 await compare('E063-segundo-del-anio','E063','/api/reclamos',{method:'POST',body:{...reclamo,email:' otra@example.test '},actor:null},()=>db.$executeRawUnsafe(`INSERT INTO "Reclamo" (id,numero,anio,correlativo,tipo,nombre,"documentoTipo",documento,domicilio,telefono,email,menor,"bienTipo","bienDescripcion",detalle,pedido,"medioRespuesta","creadoEn") VALUES ('seed-reclamo','${now.getUTCFullYear()}-000007',${now.getUTCFullYear()},7,'RECLAMO','Ficticio','DNI','00000000','Ficticio','900000000','f@example.test',false,'Servicio','Ficticio','Detalle ficticio','Pedido','Correo electrónico','2026-01-01T00:00:00')`));
 await sequence('E063-rate-limit','E063',()=>Array.from({length:11},()=>['/api/reclamos',{method:'POST',body:{...reclamo,nombre:'  ab  '},actor:null,ip:'198.51.100.7'}]));
 // Concurrency: five simultaneous requests per scenario.
 const five=f=>Array.from({length:5},(_,i)=>f(i));
 await race('E019-stock-concurrente','E019',async()=>{},backend=>five(()=>request(backend,'/api/caja/movimientos',{method:'POST',body:{items:[{productoId:'p-agua'}]},actor:'owner'})),async statuses=>{
  const p=await db.producto.findUnique({where:{id:'p-agua'}}),sold=await db.movimientoCaja.count({where:{productoId:'p-agua'}});
  return {ok:p?.stock===0&&sold===2&&statuses.filter(s=>s===201).length===2&&statuses.filter(s=>s===400).length===3,details:{stockFinal:p?.stock,ventas:sold,stockInicial:2}};});
 await race('E017-apertura-concurrente','E017',async()=>{},backend=>five(i=>request(backend,'/api/caja/apertura',{method:'POST',body:{montoInicial:10+i},actor:'third'})),async statuses=>{
  const open=await db.cajaSesion.count({where:{complejoId:'c',estado:'ABIERTA'}});
  return {ok:open===1&&statuses.filter(s=>s===201).length===1&&statuses.filter(s=>s===409).length===4,details:{cajasAbiertas:open}};});
 await race('E018-cierre-concurrente','E018',async()=>{},backend=>five(i=>request(backend,'/api/caja/cierre',{method:'POST',body:{montoFinal:100+i},actor:'owner'})),async statuses=>{
  const closed=await db.cajaSesion.findUnique({where:{id:'caja-a'}});
  return {ok:closed?.estado==='CERRADA'&&statuses.filter(s=>s===200).length===1&&statuses.filter(s=>s===400).length===4,details:{estado:closed?.estado,montoFinal:closed?.montoFinal?.toFixed(2)}};});
 await race('E019-auto-apertura-concurrente','E019',async()=>{},backend=>five(i=>request(backend,'/api/caja/movimientos',{method:'POST',body:{descripcion:'Venta '+i,monto:1},actor:'third'})),async statuses=>{
  const cajas=await db.cajaSesion.findMany({where:{complejoId:'c'}}),movs=await db.movimientoCaja.count({where:{complejoId:'c'}});
  return {ok:cajas.length===1&&movs===5&&statuses.every(s=>s===201),details:{cajasCreadas:cajas.length,movimientos:movs}};});
 await race('E002-abono-concurrente','E002',async()=>{},backend=>[...five(i=>request(backend,'/api/abonos/abonar',{method:'POST',body:{complejoId:'c',monto:5+i},actor:'third'}))],async statuses=>{
  const cajas=await db.cajaSesion.count({where:{complejoId:'c',estado:'ABIERTA'}}),total=await db.movimientoCaja.aggregate({where:{complejoId:'c'},_sum:{monto:true}});
  return {ok:cajas===1&&total._sum.monto?.toFixed(2)==='35.00'&&statuses.every(s=>s===201),details:{cajasAbiertas:cajas,totalAbonado:total._sum.monto?.toFixed(2)}};});
 // Yearly complaint numbers must stay unique and gapless under concurrency (both backends use SERIALIZABLE + retries).
 await race('E063-correlativo-concurrente','E063',async()=>{},backend=>five(i=>request(backend,'/api/reclamos',{method:'POST',body:{...reclamo,email:`r${i}@example.test`},actor:null,ip:'203.0.113.'+(10+i)})),async statuses=>{
  const stored=await db.$queryRawUnsafe('SELECT correlativo, numero FROM "Reclamo" ORDER BY correlativo'),nums=stored.map(x=>x.correlativo);
  return {ok:statuses.every(s=>s===201)&&isDeepStrictEqual(nums,[1,2,3,4,5])&&new Set(stored.map(x=>x.numero)).size===5,details:{correlativos:nums}};});
 writeResults(true);
}
let written=false;
function writeResults(complete){
 if(!rows.length||written)return;written=complete;
 writeFileSync(resolve(root,only?'docs/specs/56/f6/parity-partial.json':'docs/specs/56/f6/parity-results.json'),JSON.stringify({runtime:process.version,basis:'Actual legacy controllers, disposable empty QA database with fictitious data only',normalization:['New IDs validated GUID N/D and mapped','Request timestamps mapped after a 120 s range check','ProblemDetails traceId mapped after W3C or Kestrel request-id format check','Effects sorted after normalization; money columns compared as exact text'],complete,rows},null,1)+'\n');
 const counts=Object.fromEntries(['PASS','SECURITY_DIVERGENCE','FAIL','INFO','BLOCKED'].map(k=>[k,rows.filter(r=>r.result===k).length]));
 console.log(`F6 strict parity ${counts.PASS}/${counts.PASS+counts.FAIL}; intentional security divergences ${counts.SECURITY_DIVERGENCE}; informative ${counts.INFO}; blocked ${counts.BLOCKED}; failures ${counts.FAIL}`);if(counts.FAIL)process.exitCode=1;
}
try{await run();}catch(e){console.error(safe(e?.stack||String(e)));process.exitCode=1;}
finally{
 clearTimeout(globalTimer);
 if(!written)try{writeResults(false);}catch{/* best effort */}
 if(host){host.kill('SIGTERM');await new Promise(r=>{if(host.exitCode!==null)return r();host.once('exit',r);const timer=setTimeout(()=>{host.kill('SIGKILL');r();},3000);timer.unref();});}
 // Force-drop first: pending Nest/database requests must not prevent cleanup.
 if(attempted){try{if(creating)await bounded(creating.catch(()=>undefined),'Finish QA create',15000,false);await dropFixture({name:dbName,createClient:()=>smoke?admin:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),bounded,log:console.error});console.log('Disposable F6 QA database removed');}catch(e){console.error(safe(e));process.exitCode=1;}}
 await Promise.allSettled([bounded(app?.close(),'Nest close',5000,false),bounded(db?.$disconnect(),'Fixture disconnect',5000,false),bounded(admin.$disconnect(),'Admin disconnect',5000,false)]);
 rmSync(scratch,{recursive:true,force:true});console.log('F6 scratch directory removed');for(const [signal,handler]of signalHandlers)process.removeListener(signal,handler);
}
