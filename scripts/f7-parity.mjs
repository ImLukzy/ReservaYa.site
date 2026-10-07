import {parityEnvironment} from './parity-environment.mjs';
import assert from 'node:assert/strict';
import {dropFixture} from './f7-cleanup.mjs';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
// Both backends share the host calendar; legacy DateTime.Today runs with TZ=UTC as well.
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
const admin=smoke?{async $executeRawUnsafe(sql){console.log('Smoke SQL '+sql.split(' ')[0]);return 0;},async $disconnect(){}}:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),dbName='f7_fixture_'+randomBytes(6).toString('hex'),scratch=mkdtempSync(resolve(tmpdir(),'rys-f7-'));
const secret=randomBytes(32).toString('hex'),password='Ficticia123!',hash=await bcrypt.hash(password,10),fixed=new Date('2026-01-01T00:00:00Z');
const origin='http://127.0.0.1:15150',mediaOrigin='https://media.example.test',now=new Date(),today=new Date(now.toISOString().slice(0,10)+'T00:00:00Z'),dayMs=86400000;
const iso=d=>d.toISOString().slice(0,10),futureDay=iso(new Date(today.getTime()+5*dayMs)),futureInstant=futureDay+'T18:00:00Z';
/** @type {InstanceType<typeof PrismaClient>} */
let db;
/** @type {any} */
let app;
/** @type {any} */
let mail;
/** @type {import('node:child_process').ChildProcess|undefined} */
let host;
/** @type {Promise<number>|undefined} */
let creating;
let attempted=false;const f0=JSON.parse(readFileSync(resolve(root,'docs/specs/56/fixtures/endpoint-cases.json'),'utf8')).cases;
const manifest=JSON.parse(readFileSync(resolve(root,'docs/specs/56/manifest.json'),'utf8')).actions;
const rows=[],nestMails=[];const originalFetch=globalThis.fetch;
const stop=new AbortController();
const signalHandlers=new Map(['SIGINT','SIGTERM'].map(signal=>{const fn=()=>{if(!stop.signal.aborted)stop.abort(new Error('F7 interrupted: '+signal));};process.on(signal,fn);return [signal,fn];}));
const globalTimer=setTimeout(()=>stop.abort(new Error('F7 global timeout (45 minutes)')),2700000);
const fetchLocal=(path,options)=>originalFetch(origin+path,{redirect:'manual',signal:AbortSignal.any([stop.signal,AbortSignal.timeout(15000)]),...options});
async function bounded(promise,label,ms=15000,useStop=true){
 let timer,handler;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timeout')),ms);if(useStop){handler=()=>reject(stop.signal.reason);if(stop.signal.aborted)handler();else stop.signal.addEventListener('abort',handler,{once:true});}})]);}
 finally{clearTimeout(timer);if(handler)stop.signal.removeEventListener('abort',handler);}
}
/** @type {Record<string,import('../packages/db/dist/index.js').Prisma.UsuarioCreateInput['rol']>} */
const roles={owner:'SUPERADMIN',other:'SUPERADMIN',fresh:'SUPERADMIN',trialowner:'SUPERADMIN',expired:'SUPERADMIN',admin:'ADMIN',tech:'TECNICO',player:'USUARIO',client:'USUARIO',invitee:'USUARIO',applicant:'USUARIO',unused:'USUARIO'};
const token=a=>crypto.sign({id:a,email:a+'@example.test',nombre:'Prueba '+a,rol:roles[a],tv:0},604800);
// Seeded rows never tie on ordering columns: legacy lists define no tie-breaker.
const tables=['Horario','Promocion','Usuario','Complejo','ComplejoMiembro','Suscripcion','Cancha','Reserva','Resena','Sancion','Torneo','InscripcionTorneo','PartidoTorneo','PartidoAbierto','AnotacionPartido'];
let env;
let seeded=false;
async function restore(){
 stop.signal.throwIfAborted();
 if(seeded){await db.$executeRawUnsafe('SELECT f7_seed.restore()');return;}
 /** @type {import('../packages/db/dist/index.js').Prisma.PrismaPromise<unknown>[]} */
 const tasks=[db.$executeRawUnsafe('TRUNCATE TABLE '+tables.map(t=>`"${t}"`).join(', ')+' CASCADE')];
 tasks.push(db.usuario.createMany({data:Object.entries(roles).map(([id,rol])=>({id,nombre:'Prueba '+id,email:id+'@example.test',password:hash,rol,activo:true,tokenVersion:0,creadoEn:fixed}))}));
 /** @type {Array<[string,string,boolean,boolean,boolean]>} id, owner, publicado, recent, subscription */
 const complexes=[['a','owner',true,false,true],['b','other',true,false,true],['trial','owner',true,true,false],['trial2','trialowner',true,true,false],['pending','applicant',false,false,false],['expired-complex','expired',true,false,false]];
 tasks.push(db.complejo.createMany({data:complexes.map(([id,duenoId,publicado,recent])=>({id,nombre:'Complejo '+id,duenoId,direccion:'Ficticia',distrito:'Cayma',ciudad:'Arequipa',slug:id,publicado,creadoEn:recent?new Date(now.getTime()-5*dayMs):fixed,actualizadoEn:fixed}))}));
 const end=new Date(today.getTime()+30*dayMs);
 tasks.push(db.suscripcion.createMany({data:[{id:'sub-a',complejoId:'a',plan:'MENSUAL',estado:'ACTIVA',fechaInicio:today,fechaFin:end,creadoEn:fixed},{id:'sub-b',complejoId:'b',plan:'MENSUAL',estado:'ACTIVA',fechaInicio:today,fechaFin:end,creadoEn:new Date('2026-01-01T12:00:00Z')},
  {id:'sub-req-a',complejoId:'a',plan:'TRIMESTRAL',estado:'PENDIENTE',fechaInicio:today,fechaFin:end,creadoEn:new Date('2026-01-02Z')},{id:'sub-req-b',complejoId:'b',plan:'ANUAL',estado:'PENDIENTE',fechaInicio:today,fechaFin:end,creadoEn:new Date('2026-01-03Z')},{id:'sub-req-pending',complejoId:'pending',plan:'MENSUAL',estado:'PENDIENTE',fechaInicio:today,fechaFin:end,creadoEn:new Date('2026-01-04Z')}]}));
 tasks.push(db.complejoMiembro.createMany({data:[{id:'member-a',complejoId:'a',usuarioId:'admin',activo:true,rolSede:'ADMIN',creadoEn:fixed},{id:'inv-a',complejoId:'a',usuarioId:'invitee',activo:false,rolSede:'ADMIN',creadoEn:new Date('2026-01-02Z')},{id:'inv-b',complejoId:'b',usuarioId:'client',activo:false,rolSede:'ADMIN',creadoEn:new Date('2026-01-03Z')}]}));
 tasks.push(db.cancha.createMany({data:[['court-a','a',true],['court-a2','a',true],['court-b','b',true],['court-pending','pending',false]].map(([id,complejoId,activa])=>({id:String(id),complejoId:String(complejoId),nombre:'Cancha '+id,tipo:'FUTBOL',precioPorHora:80,capacidad:10,activa:Boolean(activa),creadoEn:fixed}))}));
 tasks.push(db.reserva.createMany({data:[{id:'res-player',codigo:'F7-PLAYER',usuarioId:'player',canchaId:'court-a',complejoId:'a',fecha:new Date('2026-01-10Z'),horaInicio:600,horaFin:660,estado:'COMPLETADA',total:80,creadoEn:fixed},{id:'res-client',codigo:'F7-CLIENT',usuarioId:'client',canchaId:'court-a',complejoId:null,fecha:new Date('2026-01-11Z'),horaInicio:600,horaFin:660,estado:'COMPLETADA',total:80,creadoEn:fixed},
  {id:'res-upcoming',codigo:'F7-UPCOMING',usuarioId:'client',canchaId:'court-a',complejoId:'a',fecha:new Date(today.getTime()+dayMs),horaInicio:600,horaFin:735,estado:'CONFIRMADA',total:80,creadoEn:fixed},{id:'res-cancelled',codigo:'F7-CANCELLED',usuarioId:'client',canchaId:'court-a2',complejoId:null,fecha:new Date(today.getTime()+2*dayMs),horaInicio:600,horaFin:660,estado:'CANCELADA',total:80,creadoEn:fixed}]}));
 tasks.push(db.resena.createMany({data:[{id:'resena-a',complejoId:'a',usuarioId:'client',puntuacion:4,comentario:'Ficticia',creadoEn:fixed},{id:'resena-b',complejoId:'b',usuarioId:'client',puntuacion:3,creadoEn:new Date('2026-01-02Z')}]}));
 tasks.push(db.sancion.createMany({data:[{id:'sanction-a',complejoId:'a',usuarioId:'client',nivel:'ADVERTENCIA',motivo:'Ficticio',activa:true,creadoPorId:'owner',creadoEn:fixed},{id:'sanction-a-off',complejoId:'a',usuarioId:'player',nivel:'BLOQUEO',motivo:'Ficticio',activa:false,creadoPorId:'owner',creadoEn:new Date('2026-01-02Z')},{id:'sanction-b',complejoId:'b',usuarioId:'client',nivel:'BLOQUEO',motivo:'Ficticio',activa:true,creadoPorId:'other',creadoEn:new Date('2026-01-03Z')}]}));
 tasks.push(db.torneo.createMany({data:[{id:'torneo-a',complejoId:'a',nombre:'Torneo A',deporte:'FUTBOL5',fechaInicio:new Date(futureDay+'T00:00:00Z'),costoInscripcion:20,cupoMax:16,estado:'BORRADOR',creadoEn:fixed},{id:'torneo-small',complejoId:'a',nombre:'Torneo corto',fechaInicio:new Date(futureDay+'T00:00:00Z'),fechaFin:new Date(futureDay+'T00:00:00Z'),cupoMax:1,estado:'INSCRIPCIONES_ABIERTAS',creadoEn:new Date('2026-01-02Z')},{id:'torneo-b',complejoId:'b',nombre:'Torneo B',fechaInicio:new Date(futureDay+'T00:00:00Z'),creadoEn:new Date('2026-01-03Z')}]}));
 tasks.push(db.inscripcionTorneo.createMany({data:[{id:'insc-a',torneoId:'torneo-a',equipo:'Equipo Uno',capitanId:'client',creadoEn:fixed},{id:'insc-small',torneoId:'torneo-small',equipo:'Equipo Solo',capitanId:'client',creadoEn:fixed}]}));
 tasks.push(db.partidoTorneo.createMany({data:[{id:'pt-a',torneoId:'torneo-a',fase:'Grupos',equipoA:'Equipo Uno',equipoB:'Equipo Dos',fecha:new Date('2026-11-01T15:30:00Z')},{id:'pt-a2',torneoId:'torneo-a',fase:'Grupos',equipoA:'Equipo Tres',equipoB:'Equipo Uno',golesA:1,golesB:1,ganador:'EMPATE'},{id:'pt-b',torneoId:'torneo-b',fase:'Grupos',equipoA:'X',equipoB:'Y'}]}));
 const match=(id,organizadorId,days,cupos,fotoUrl=null)=>({id,organizadorId,titulo:'Partido '+id,formato:'Fútbol 5',nivel:'Intermedio',cuposTotales:cupos,distrito:'Cayma',cancha:'Cancha libre',precio:'12.50',fecha:new Date(today.getTime()+days*dayMs),desdeMin:1080,hastaMin:1140,fotoUrl,creadoEn:fixed});
 tasks.push(db.partidoAbierto.createMany({data:[match('match-a','player',3,10,mediaOrigin+'/uploads/partido/player/old.png'),match('match-full','client',1,2),match('match-past','client',-2,10),match('match-today','client',0,5),match('match-race','client',4,2),match('match-tomorrow','player',1,4)]}));
 tasks.push(db.anotacionPartido.createMany({data:[{id:'join-a',partidoId:'match-a',usuarioId:'client',creadoEn:fixed},{id:'join-full-1',partidoId:'match-full',usuarioId:'admin',creadoEn:fixed},{id:'join-full-2',partidoId:'match-full',usuarioId:'invitee',creadoEn:fixed},{id:'join-tomorrow',partidoId:'match-tomorrow',usuarioId:'invitee',creadoEn:fixed}]}));
 await db.$transaction(tasks);
 // Snapshot inside the disposable database only: later restores are a single round trip.
 await db.reserva.createMany({data:[
  {id:'f7-confirmed',codigo:'FIX-CONFIRMED',usuarioId:'player',canchaId:'court-a',fecha:new Date(futureDay+'T00:00:00Z'),horaInicio:600,horaFin:660,estado:'CONFIRMADA',total:80,creadoEn:new Date('2026-01-02Z')},
  {id:'f7-pending',codigo:'FIX-PENDING',usuarioId:'player',canchaId:'court-a',fecha:new Date(futureDay+'T00:00:00Z'),horaInicio:720,horaFin:780,estado:'PENDIENTE',total:80,creadoEn:new Date('2026-01-03Z')},
  {id:'f7-other',codigo:'FIX-OTHER',usuarioId:'other',canchaId:'court-b',fecha:new Date(futureDay+'T00:00:00Z'),horaInicio:600,horaFin:660,estado:'CONFIRMADA',total:80,creadoEn:new Date('2026-01-04Z')}
 ]});
 await db.$executeRawUnsafe('CREATE SCHEMA f7_seed');
 for(const t of tables)await db.$executeRawUnsafe(`CREATE TABLE f7_seed."${t}" AS TABLE public."${t}"`);
 await db.$executeRawUnsafe(`CREATE FUNCTION f7_seed.restore() RETURNS void LANGUAGE plpgsql AS $$ BEGIN TRUNCATE TABLE ${tables.map(t=>`public."${t}"`).join(', ')} CASCADE; ${tables.map(t=>`INSERT INTO public."${t}" SELECT * FROM f7_seed."${t}";`).join(' ')} END $$`);
 seeded=true;
}
async function effect(){
 // One round trip; every column of every F7 table is compared.
 const snapshot=await db.$queryRawUnsafe(`SELECT json_build_object(${tables.map(t=>`'${t}', COALESCE((SELECT json_agg(x ORDER BY x."id") FROM "${t}" x), '[]'::json)`).join(', ')}) AS effects`);
 const result=snapshot[0].effects;
 for(const u of result.Usuario)if(u.password!==hash)throw Error('Unexpected password write');
 for(const name of Object.keys(result))result[name]=result[name].map(normalize).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return result;
}
function normalize(v,key){
 if(v instanceof Date)return normalize(v.toISOString());
 if(Array.isArray(v))return v.map(x=>normalize(x));
 if(v&&typeof v==='object'){if(typeof v.toFixed==='function')return v.toFixed(2);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x,k)]));}
 if(typeof v==='string'){
  if(key==='traceId'&&/^(00-[a-f0-9]{32}-[a-f0-9]{16}-0[01]|[0-9A-Z]{13}:[0-9A-F]{8})$/.test(v))return '[traceId]';
  if(/^RF-[A-F0-9]{4}$/.test(v))return '[new QR RF-4hex]';
  v=v.replace(/[a-f0-9]{32}/g,'[new GUID N]');
  if(/^\/uploads\/partidos\/\[new GUID N\]-\d{10}\.(jpg|png|webp|gif)$/.test(v))return v.replace(/-\d{10}\./,'-[unix seconds].');
  if(/^\d{4}-\d\d-\d\dT/.test(v)){
   const time=Date.parse(v);if(Number.isFinite(time)&&Math.abs(time-Date.now())<120000)return '[request time]'+(v.endsWith('Z')?'Z':'');
   return v.replace(/\.000Z$/,'Z').replace(/(\.\d*?[1-9])0+Z$/,'$1Z');
  }
 }
 return v;
}
const boundary='fixture-boundary';
function multipart(fields,file){const parts=Object.entries(fields).map(([k,v])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));if(file)parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="foto"; filename="fixture.png"\r\nContent-Type: image/png\r\n\r\n`),file,Buffer.from('\r\n'));parts.push(Buffer.from(`--${boundary}--\r\n`));return Buffer.concat(parts);}
let seq=1;
/** @param {string} backend @param {string} path @param {{method?:string,body?:unknown,actor?:string|null,form?:Record<string,string>,file?:Buffer,urlencoded?:Record<string,string>}} [options] */
async function request(backend,path,{method='GET',body,actor='owner',form,file,urlencoded}={}){
 const h={'x-forwarded-for':'192.0.2.'+(seq++%250),...(actor?{cookie:'token='+token(actor)}:{})};let data;
 if(form){h['content-type']='multipart/form-data; boundary='+boundary;data=multipart(form,file);}
 else if(urlencoded){h['content-type']='application/x-www-form-urlencoded';data=new URLSearchParams(urlencoded).toString();}
 else if(body!==undefined){h['content-type']='application/json';data=JSON.stringify(body);}
 if(backend==='legacy'){const r=await fetchLocal(path,{method,headers:h,body:data});const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,deprecation:r.headers.get('deprecation'),type:(r.headers.get('content-type')||'').split(';')[0]};}
 const r=await bounded(app.inject({method,url:path,headers:h,...(data!==undefined?{payload:data}:{})}),'Nest '+method+' '+path);return {status:r.statusCode,body:r.body?JSON.parse(r.body):null,deprecation:r.headers.deprecation||null,type:String(r.headers['content-type']||'').split(';')[0]};
}
const legacyMails=async()=>(await (await fetchLocal('/_test/emails')).json());
const deletedObjects=async()=>(await (await fetchLocal('/_test/deleted')).json());
const settle=()=>new Promise(r=>setTimeout(r,250));
let dirty=true,baseline;
const securityRoutes=new Set(manifest.filter(a=>a.authorization.allowedRoles.length).map(a=>a.id));
const mailRoutes=new Set();
const deleteRequired=new Set();
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
async function compare(id,endpointId,path,options,prepare){if(only&&!only.includes(endpointId))return;const results=[];let nestBefore;const scopeSecurity=id==='E075-otra-sede',security=scopeSecurity||(id.endsWith('-tv-revocado')&&securityRoutes.has(endpointId));
 for(const backend of ['legacy','nest']){console.log('F7 '+id+' '+backend);if(dirty){await bounded(restore(),'Fixture '+id,45000);if(!baseline)baseline=normalize(await effect());dirty=false;}if(prepare){dirty=true;await prepare(backend);}if(security&&backend==='nest')nestBefore=normalize(await effect());
  const before=(await deletedObjects()).length,mailsBefore=backend==='legacy'?(await legacyMails()).length:nestMails.length;
  const response=await request(backend,path,options);if(mailRoutes.has(endpointId))await settle();
  const deletions=(await deletedObjects()).slice(before),emails=backend==='legacy'?(await legacyMails()).slice(mailsBefore):nestMails.slice(mailsBefore);
  const effects=normalize(await effect());dirty=dirty||!isDeepStrictEqual(effects,baseline);results.push(normalize({response,effects,deletions,emails}));}
 if(security){const rejected=results[1].response.status===403&&isDeepStrictEqual(results[1].response.body,{error:'Sin permisos'})&&results[1].deletions.length===0&&results[1].emails.length===0&&isDeepStrictEqual(results[1].effects,nestBefore);rows.push({id,endpointId,path,result:rejected?'SECURITY_DIVERGENCE':'FAIL',classification:scopeSecurity?'divergencia intencional de seguridad autorizada: DELETE legado carga reserva sin Cancha y con complejoId null, interpreta sede ajena como sin dueño; Nest resuelve la cancha y rechaza':'divergencia intencional de seguridad aceptada: Nest rechaza sesión revocada; legado omite ValidSession con Roles',legacyStatus:results[0].response.status,nestStatus:results[1].response.status,...(!rejected?{legacy:results[0],nest:results[1]}:{})});return;}
 const expected=f0.find(c=>c.id===id)?.expected.status,pass=isDeepStrictEqual(results[0],results[1])&&(expected===undefined||results[0].response.status===expected)&&(!deleteRequired.has(id)||results.every(x=>x.deletions.length===1));
 rows.push({id,endpointId,path,result:pass?'PASS':'FAIL',...(pass?{status:results[0].response.status,...(results[0].emails.length?{emails:results[0].emails.length}:{})}:{expected,legacy:results[0],nest:results[1]})});
}
async function run(){
 if(smoke){attempted=true;creating=admin.$executeRawUnsafe('CREATE DATABASE fixture');await creating;host=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(JSON.stringify({smokeReady:true,pid:host.pid,scratch}));await bounded(new Promise(()=>{}),'Signal smoke',30000);return;}
 attempted=true;creating=admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);await bounded(creating,'QA create');stop.signal.throwIfAborted();const url=new URL(settings.TEST_DATABASE_URL_UNPOOLED);url.pathname='/'+dbName;url.searchParams.set('connection_limit','8');
 env={PARITY_CI:ci?'true':undefined,PATH:process.env.PATH,HOME:process.env.HOME,DOTNET_ROOT:process.env.DOTNET_ROOT||(ci?'/usr/share/dotnet':'/home/lukzy/.dotnet'),TZ:'UTC',JWT_SECRET:secret,DATABASE_URL:url.toString(),DATABASE_URL_UNPOOLED:url.toString(),F3_QA_FIXTURE:'true',F7_QA_FIXTURE:'true',ASPNETCORE_ENVIRONMENT:'Production',COOKIE_SECURE:'false',MEDIA_PUBLIC_URL:mediaOrigin,PASSWORD_RESET_URL:'https://web.example.test/restablecer',R2_ENDPOINT:origin+'/_s3',R2_ACCESS_KEY_ID:'fixture-key',R2_SECRET_ACCESS_KEY:'fixture-secret',R2_BUCKET_NAME:'fixture-bucket',LEGACY_WEB_ROOT:resolve(scratch,'nest-webroot')};
 const migrate=spawnSync(process.execPath,[dbRequire.resolve('prisma/build/index.js'),'migrate','deploy','--schema',resolve(root,'packages/db/prisma/schema.prisma')],{env,encoding:'utf8',timeout:60000});if(migrate.status!==0)throw Error(safe(migrate.stderr||migrate.stdout));
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});Object.assign(process.env,env);
 const content=resolve(scratch,'content');mkdirSync(content,{recursive:true});host=spawn(dotnet,[resolve(root,'tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll'),'--contentRoot',content,'--urls',origin],{env,cwd:content,stdio:['ignore','pipe','pipe']});let logs='';host.stdout.on('data',b=>logs+=safe(b));host.stderr.on('data',b=>logs+=safe(b));
 for(let i=0;i<150;i++){stop.signal.throwIfAborted();try{if((await fetchLocal('/_test/health')).ok)break;}catch{}if(host.exitCode!==null)throw Error('Fixture startup failed: '+logs);await new Promise(r=>setTimeout(r,200));if(i===149)throw Error('Fixture startup timeout');}
 app=await bounded(apiRequire('./dist/app.js').createApp(),'Nest create');await bounded(app.init(),'Nest init');await bounded(app.getHttpAdapter().getInstance().ready(),'Fastify ready');
 // Mail is captured in memory on both sides; nothing reaches Resend.
 mail=app.get(apiRequire('./dist/auth/providers.js').MailProvider);mail.configured=()=>true;mail.deliver=async m=>{nestMails.push(m);};
 console.log('F7 disposable fixture initialized');
 const create={canchaId:'court-a',fecha:futureDay,horaInicio:800,horaFin:860,notas:' Ficticia '};
 /** @type {Array<[string,string,string,unknown,string]>} */
 const nominal=[['E070','GET','/api/reservas',undefined,'player'],['E071','GET','/api/reservas/f7-pending',undefined,'player'],['E072','POST','/api/reservas/validar',{codigo:' fix-confirmed '},'owner'],['E073','POST','/api/reservas',create,'player'],['E074','PATCH','/api/reservas/f7-pending',{estado:'CANCELADA'},'player'],['E075','DELETE','/api/reservas/f7-pending',undefined,'owner']];
 for(const [e,method,path,body,actor]of nominal){await compare(e+'-nominal',e,path,{method,body,actor});await compare(e+'-sin-sesion',e,path,{method,body,actor:null});await compare(e+'-tv-revocado',e,path,{method,body,actor},()=>db.usuario.update({where:{id:actor},data:{tokenVersion:1}}));}
 /** @type {Array<[string,string,string,string,unknown,string]>} */
 const cases=[
 ['E070','staff','GET','/api/reservas',undefined,'owner'],['E070','platform','GET','/api/reservas',undefined,'tech'],['E070','no-scope','GET','/api/reservas',undefined,'fresh'],
 ['E071','missing','GET','/api/reservas/absent',undefined,'owner'],['E071','otra-sede','GET','/api/reservas/f7-other',undefined,'owner'],['E071','wrong-user','GET','/api/reservas/f7-pending',undefined,'client'],
 ['E072','pending','POST','/api/reservas/validar',{codigo:'FIX-PENDING'},'owner'],['E072','invalid','POST','/api/reservas/validar',{codigo:'x'},'owner'],['E072','missing','POST','/api/reservas/validar',{codigo:'ABSENT'},'owner'],['E072','otra-sede','POST','/api/reservas/validar',{codigo:'FIX-OTHER'},'owner'],['E072','rol-no-permitido','POST','/api/reservas/validar',{codigo:'FIX-CONFIRMED'},'player'],
 ['E073','missing-fields','POST','/api/reservas',{},'player'],['E073','wrong-date','POST','/api/reservas',{...create,fecha:'wrong'},'player'],['E073','wrong-hours','POST','/api/reservas',{...create,horaFin:700},'player'],['E073','missing-court','POST','/api/reservas',{...create,canchaId:'absent'},'player'],['E073','otra-sede','POST','/api/reservas',{...create,canchaId:'court-b'},'owner'],['E073','conflict','POST','/api/reservas',{...create,horaInicio:630,horaFin:690},'player'],['E073','adjacent','POST','/api/reservas',{...create,horaInicio:660,horaFin:720},'player'],
 ['E074','confirm','PATCH','/api/reservas/f7-pending',{estado:'CONFIRMADA'},'owner'],['E074','jugador-confirma','PATCH','/api/reservas/f7-pending',{estado:'CONFIRMADA'},'player'],['E074','otra-sede','PATCH','/api/reservas/f7-other',{estado:'CANCELADA'},'owner'],['E074','wrong-user','PATCH','/api/reservas/f7-pending',{notas:'x'},'client'],['E074','invalid-state','PATCH','/api/reservas/f7-pending',{estado:'WRONG'},'owner'],['E074','missing','PATCH','/api/reservas/absent',{},'owner'],['E074','notes','PATCH','/api/reservas/f7-pending',{notas:'   '},'player'],
 ['E075','otra-sede','DELETE','/api/reservas/f7-other',undefined,'owner'],['E075','missing','DELETE','/api/reservas/absent',undefined,'owner'],['E075','rol-no-permitido','DELETE','/api/reservas/f7-pending',undefined,'player']
 ];
 for(const [e,name,method,path,body,actor]of cases)await compare(e+'-'+name,e,path,{method,body,actor});
 await compare('E073-blocked','E073','/api/reservas',{method:'POST',body:create,actor:'client'},()=>db.sancion.update({where:{id:'sanction-a'},data:{nivel:'BLOQUEO'}}));
 await compare('E073-closed','E073','/api/reservas',{method:'POST',body:create,actor:'player'},()=>db.horarioOperativo.create({data:{id:'closed',complejoId:'a',diaSemana:new Date(futureDay+'Z').getUTCDay(),aperturaMin:480,cierreMin:1260,activo:false,creadoEn:fixed}}));
 await compare('E073-price','E073','/api/reservas',{method:'POST',body:create,actor:'player'},()=>db.promocion.create({data:{id:'price',complejoId:'a',nombre:'Precio especial',tipo:'PRECIO_ESPECIAL',valor:42.25,activa:true,creadoEn:fixed}}));
 await compare('E074-overlap','E074','/api/reservas/f7-pending',{method:'PATCH',body:{estado:'CONFIRMADA'}},()=>db.reserva.update({where:{id:'f7-pending'},data:{horaInicio:630,horaFin:690}}));
 await compare('E074-cancels-other-pending','E074','/api/reservas/f7-pending',{method:'PATCH',body:{estado:'CONFIRMADA'}},()=>db.reserva.create({data:{id:'contender',codigo:'FIX-CONTENDER',usuarioId:'client',canchaId:'court-a',fecha:new Date(futureDay+'Z'),horaInicio:730,horaFin:790,estado:'PENDIENTE',total:80,creadoEn:fixed}}));
 await mixedRace();writeResults(true);
}
async function mixedRace(){
 if(only&&!only.includes('E074'))return;
 for(let round=0;round<3;round++){
  await bounded(restore(),'Mixed fixture',45000);dirty=true;await db.reserva.deleteMany();
  await db.horarioOperativo.createMany({data:Array.from({length:7},(_,diaSemana)=>({id:'race-hours-'+diaSemana,complejoId:'a',diaSemana,aperturaMin:480,cierreMin:1260,activo:true,creadoEn:fixed}))});
  const responses=await Promise.all(['nest','legacy','nest','legacy'].map((backend,i)=>request(backend,'/api/reservas',{method:'POST',body:{canchaId:'court-a',fecha:futureDay,horaInicio:900,horaFin:960},actor:i%2?'client':'player'})));
  let candidates=await db.reserva.findMany({where:{estado:'PENDIENTE'}});
  // Serializable creation may reject competitors legitimately. Supplement setup
  // sequentially through both real APIs before racing overlapping confirmations.
  const supplemental=[];for(let attempt=0;candidates.length<2&&attempt<4;attempt++){const response=await request(attempt%2?'legacy':'nest','/api/reservas',{method:'POST',body:{canchaId:'court-a',fecha:futureDay,horaInicio:900,horaFin:960},actor:'player'});supplemental.push(response);candidates=await db.reserva.findMany({where:{estado:'PENDIENTE'}});}
  assert.ok(candidates.length>=2,'Mixed fixture did not create enough candidates: '+JSON.stringify({responses:responses.map(r=>({status:r.status,body:r.body})),supplemental:supplemental.map(r=>({status:r.status,body:r.body}))}));
  const confirmations=await Promise.all(candidates.map((row,i)=>request(i%2?'legacy':'nest','/api/reservas/'+row.id,{method:'PATCH',body:{estado:'CONFIRMADA'}})));
  const stored=await db.reserva.findMany({where:{estado:'CONFIRMADA'}}),ok=stored.length===1&&confirmations.filter(r=>r.status===200).length===1&&confirmations.filter((_,i)=>i%2===0).every(r=>[200,409].includes(r.status));
  rows.push({id:'E074-mixed-race-'+round,endpointId:'E074',result:ok?'PASS':'FAIL',classification:'mixed concurrent Nest and legacy fixture: confirmed reservations must not overlap; pending requests may coexist by contract',createdStatuses:responses.map(r=>r.status),supplementalStatuses:supplemental.map(r=>r.status),confirmationStatuses:confirmations.map(r=>r.status),confirmed:stored.length});
 }
}
let written=false;
function writeResults(complete){written=true;writeFileSync(resolve(root,'docs/specs/56/f7/parity-results.json'),JSON.stringify({runtime:process.version,complete,basis:'Real legacy controllers; disposable empty QA database; fictional fixture only',normalization:['Generated GUID N and RF-4hex QR codes mapped after format checks','Request timestamps mapped with trailing Z retained','Every column of fixture tables compared'],rows},null,2)+'\n');const counts=Object.fromEntries(['PASS','SECURITY_DIVERGENCE','FAIL'].map(k=>[k,rows.filter(r=>r.result===k).length]));console.log('F7 results '+JSON.stringify(counts));if(counts.FAIL)process.exitCode=1;}
try{await run();}catch(e){console.error(safe(e?.stack||String(e)));process.exitCode=1;}
finally{
 clearTimeout(globalTimer);
 if(!written&&!smoke)try{writeResults(false);}catch{/* best effort */}
 if(host){host.kill('SIGTERM');await new Promise(r=>{if(host.exitCode!==null)return r();host.once('exit',r);const timer=setTimeout(()=>{host.kill('SIGKILL');r();},3000);timer.unref();});}
 // Force-drop first: pending Nest/database requests must not prevent cleanup.
 if(attempted){try{if(creating)await bounded(creating.catch(()=>undefined),'Finish QA create',15000,false);await dropFixture({name:dbName,createClient:()=>smoke?admin:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),bounded,log:console.error});console.log('Disposable F7 QA database removed');}catch(e){console.error(safe(e));process.exitCode=1;}}
 await Promise.allSettled([bounded(app?.close(),'Nest close',5000,false),bounded(db?.$disconnect(),'Fixture disconnect',5000,false),bounded(admin.$disconnect(),'Admin disconnect',5000,false)]);
 rmSync(scratch,{recursive:true,force:true});console.log('F7 scratch directory removed');for(const [signal,handler]of signalHandlers)process.removeListener(signal,handler);
}
