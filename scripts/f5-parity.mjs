import {dropFixture} from './f5-cleanup.mjs';
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
const settings={};for(const line of (smoke?'TEST_DATABASE_URL_UNPOOLED=postgresql://fixture:fixture@localhost/fixture':readFileSync(resolve(root,'hive/qa.env'),'utf8')).split('\n')){const m=line.match(/^(TEST_DATABASE_URL(?:_UNPOOLED)?)=(.*)$/);if(m)settings[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
if((!smoke&&process.argv[2]!=='--confirm-qa-migracion-ts')||!settings.TEST_DATABASE_URL_UNPOOLED)throw Error('QA confirmation and test connection required');
const safe=s=>String(s).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[QA connection]').replace(/ep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/g,'[QA endpoint]');
const admin=smoke?{async $executeRawUnsafe(sql){console.log('Smoke SQL '+sql.split(' ')[0]);return 0;},async $disconnect(){}}:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),dbName='f5_fixture_'+randomBytes(6).toString('hex'),scratch=mkdtempSync(resolve(tmpdir(),'rys-f5-'));
const secret=randomBytes(32).toString('hex'),password='Ficticia123!',hash=await bcrypt.hash(password,10),fixed=new Date('2026-01-01T00:00:00Z');
const origin='http://127.0.0.1:15130',mediaOrigin='https://media.example.test',now=new Date(),today=new Date(now.toISOString().slice(0,10)+'T00:00:00Z'),dayMs=86400000;
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
const signalHandlers=new Map(['SIGINT','SIGTERM'].map(signal=>{const fn=()=>{if(!stop.signal.aborted)stop.abort(new Error('F5 interrupted: '+signal));};process.on(signal,fn);return [signal,fn];}));
const globalTimer=setTimeout(()=>stop.abort(new Error('F5 global timeout (45 minutes)')),2700000);
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
const tables=['Usuario','Complejo','ComplejoMiembro','Suscripcion','Cancha','Reserva','Resena','Sancion','Torneo','InscripcionTorneo','PartidoTorneo','PartidoAbierto','AnotacionPartido'];
let env;
let seeded=false;
async function restore(){
 stop.signal.throwIfAborted();
 if(seeded){await db.$executeRawUnsafe('SELECT f5_seed.restore()');return;}
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
 tasks.push(db.reserva.createMany({data:[{id:'res-player',codigo:'F5-PLAYER',usuarioId:'player',canchaId:'court-a',complejoId:'a',fecha:new Date('2026-01-10Z'),horaInicio:600,horaFin:660,estado:'COMPLETADA',total:80,creadoEn:fixed},{id:'res-client',codigo:'F5-CLIENT',usuarioId:'client',canchaId:'court-a',complejoId:null,fecha:new Date('2026-01-11Z'),horaInicio:600,horaFin:660,estado:'COMPLETADA',total:80,creadoEn:fixed},
  {id:'res-upcoming',codigo:'F5-UPCOMING',usuarioId:'client',canchaId:'court-a',complejoId:'a',fecha:new Date(today.getTime()+dayMs),horaInicio:600,horaFin:735,estado:'CONFIRMADA',total:80,creadoEn:fixed},{id:'res-cancelled',codigo:'F5-CANCELLED',usuarioId:'client',canchaId:'court-a2',complejoId:null,fecha:new Date(today.getTime()+2*dayMs),horaInicio:600,horaFin:660,estado:'CANCELADA',total:80,creadoEn:fixed}]}));
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
 await db.$executeRawUnsafe('CREATE SCHEMA f5_seed');
 for(const t of tables)await db.$executeRawUnsafe(`CREATE TABLE f5_seed."${t}" AS TABLE public."${t}"`);
 await db.$executeRawUnsafe(`CREATE FUNCTION f5_seed.restore() RETURNS void LANGUAGE plpgsql AS $$ BEGIN TRUNCATE TABLE ${tables.map(t=>`public."${t}"`).join(', ')} CASCADE; ${tables.map(t=>`INSERT INTO public."${t}" SELECT * FROM f5_seed."${t}";`).join(' ')} END $$`);
 seeded=true;
}
async function effect(){
 // One round trip; every column of every F5 table is compared.
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
const mailRoutes=new Set(['E040','E083']);
const deleteRequired=new Set(['E057-nominal','E058-nominal']);
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
async function compare(id,endpointId,path,options,prepare){if(only&&!only.includes(endpointId))return;const results=[];let nestBefore;const security=id.endsWith('-tv-revocado')&&securityRoutes.has(endpointId);
 for(const backend of ['legacy','nest']){console.log('F5 '+id+' '+backend);if(dirty){await bounded(restore(),'Fixture '+id,45000);if(!baseline)baseline=normalize(await effect());dirty=false;}if(prepare){dirty=true;await prepare(backend);}if(security&&backend==='nest')nestBefore=normalize(await effect());
  const before=(await deletedObjects()).length,mailsBefore=backend==='legacy'?(await legacyMails()).length:nestMails.length;
  const response=await request(backend,path,options);if(mailRoutes.has(endpointId))await settle();
  const deletions=(await deletedObjects()).slice(before),emails=backend==='legacy'?(await legacyMails()).slice(mailsBefore):nestMails.slice(mailsBefore);
  const effects=normalize(await effect());dirty=dirty||!isDeepStrictEqual(effects,baseline);results.push(normalize({response,effects,deletions,emails}));}
 if(security){const rejected=results[1].response.status===403&&isDeepStrictEqual(results[1].response.body,{error:'Sin permisos'})&&results[1].deletions.length===0&&results[1].emails.length===0&&isDeepStrictEqual(results[1].effects,nestBefore);rows.push({id,endpointId,path,result:rejected?'SECURITY_DIVERGENCE':'FAIL',classification:'divergencia intencional de seguridad aceptada: Nest rechaza sesión revocada; legado omite ValidSession con Roles',legacyStatus:results[0].response.status,nestStatus:results[1].response.status,...(!rejected?{legacy:results[0],nest:results[1]}:{})});return;}
 const expected=f0.find(c=>c.id===id)?.expected.status,pass=isDeepStrictEqual(results[0],results[1])&&(expected===undefined||results[0].response.status===expected)&&(!deleteRequired.has(id)||results.every(x=>x.deletions.length===1));
 rows.push({id,endpointId,path,result:pass?'PASS':'FAIL',...(pass?{status:results[0].response.status,...(results[0].emails.length?{emails:results[0].emails.length}:{})}:{expected,legacy:results[0],nest:results[1]})});
}
/** Concurrent joins/enrollments with capacity two: Nest must never exceed it; the legacy outcome is informative. */
async function race(id,endpointId,prepare,makeRequests,count){
 if(only&&!only.includes(endpointId))return;
 for(const backend of ['legacy','nest']){
  await bounded(restore(),'Fixture '+id,45000);dirty=true;await prepare();
  const statuses=(await Promise.all(makeRequests(backend))).map(r=>r.status).sort(),stored=await count();
  const ok=stored===2&&statuses.filter(s=>s<300).length===2&&statuses.filter(s=>s===409).length===statuses.length-2;
  rows.push({id:id+'-'+backend,endpointId,result:backend==='nest'?(ok?'PASS':'FAIL'):'INFO',withinCapacity:ok,statuses,stored,capacity:2});
 }
}
async function run(){
 if(smoke){attempted=true;creating=admin.$executeRawUnsafe('CREATE DATABASE fixture');await creating;host=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(JSON.stringify({smokeReady:true,pid:host.pid,scratch}));await bounded(new Promise(()=>{}),'Signal smoke',30000);return;}
 attempted=true;creating=admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);await bounded(creating,'QA create');stop.signal.throwIfAborted();const url=new URL(settings.TEST_DATABASE_URL_UNPOOLED);url.pathname='/'+dbName;url.searchParams.set('connection_limit','8');
 env={PATH:process.env.PATH,HOME:process.env.HOME,DOTNET_ROOT:process.env.DOTNET_ROOT||'/home/lukzy/.dotnet',TZ:'UTC',JWT_SECRET:secret,DATABASE_URL:url.toString(),DATABASE_URL_UNPOOLED:url.toString(),F3_QA_FIXTURE:'true',F5_QA_FIXTURE:'true',ASPNETCORE_ENVIRONMENT:'Production',COOKIE_SECURE:'false',MEDIA_PUBLIC_URL:mediaOrigin,PASSWORD_RESET_URL:'https://web.example.test/restablecer',R2_ENDPOINT:origin+'/_s3',R2_ACCESS_KEY_ID:'fixture-key',R2_SECRET_ACCESS_KEY:'fixture-secret',R2_BUCKET_NAME:'fixture-bucket',LEGACY_WEB_ROOT:resolve(scratch,'nest-webroot')};
 const migrate=spawnSync(process.execPath,[dbRequire.resolve('prisma/build/index.js'),'migrate','deploy','--schema',resolve(root,'packages/db/prisma/schema.prisma')],{env,encoding:'utf8',timeout:60000});if(migrate.status!==0)throw Error(safe(migrate.stderr||migrate.stdout));
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});Object.assign(process.env,env);
 const content=resolve(scratch,'content');mkdirSync(content,{recursive:true});host=spawn('/home/lukzy/.dotnet/dotnet',[resolve(root,'tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll'),'--contentRoot',content,'--urls',origin],{env,cwd:content,stdio:['ignore','pipe','pipe']});let logs='';host.stdout.on('data',b=>logs+=safe(b));host.stderr.on('data',b=>logs+=safe(b));
 for(let i=0;i<150;i++){stop.signal.throwIfAborted();try{if((await fetchLocal('/_test/health')).ok)break;}catch{}if(host.exitCode!==null)throw Error('Fixture startup failed: '+logs);await new Promise(r=>setTimeout(r,200));if(i===149)throw Error('Fixture startup timeout');}
 app=await bounded(apiRequire('./dist/app.js').createApp(),'Nest create');await bounded(app.init(),'Nest init');await bounded(app.getHttpAdapter().getInstance().ready(),'Fastify ready');
 // Mail is captured in memory on both sides; nothing reaches Resend.
 mail=app.get(apiRequire('./dist/auth/providers.js').MailProvider);mail.configured=()=>true;mail.deliver=async m=>{nestMails.push(m);};
 console.log('F5 disposable fixture initialized');
 const center={nombre:'Centro de prueba',direccion:'Dirección sintética 100',distrito:'cayma',ciudad:'Lima',telefono:' 900000001 ',email:'centro@example.test',descripcion:'Ficticio'};
 const court={nombre:'Cancha solicitada',tipo:'FUTBOL5',precioPorHora:'45.50',capacidad:10,techada:true,superficie:' Grass sintético '};
 const matchForm={titulo:'Partido de prueba',formato:'Fútbol 5',nivel:'Intermedio',cuposTotales:'10',fecha:futureDay,desde:'18:00',hasta:'19:30',distrito:'yanahuara',cancha:'Cancha libre',superficie:'Losa',precio:'15.50',descripcion:'Ficticio'};
 const tournament={complejoId:'a',nombre:'Torneo de prueba',deporte:'futbol5',fechaInicio:futureDay,costoInscripcion:20,cupoMax:8,premio:' Copa ',reglamento:''};
 const ownUrl=mediaOrigin+'/uploads/partido/player/new.png',png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 /** @type {Array<[string,string,string,unknown,string|null,Record<string,string>?]>} */
 const nominal=[
 ['E034','GET','/api/complejos',undefined,'owner'],['E035','GET','/api/complejos/a',undefined,'owner'],['E036','POST','/api/complejos',center,'fresh'],['E037','PUT','/api/complejos/a',{...center,publicado:false},'owner'],['E038','DELETE','/api/complejos/trial',undefined,'owner'],
 ['E039','GET','/api/equipo?complejoId=a',undefined,'owner'],['E040','POST','/api/equipo',{complejoId:'a',email:' CLIENT@example.test ',rolSede:'admin'},'owner'],['E041','PUT','/api/equipo/member-a',{rolSede:'ADMIN'},'owner'],['E042','DELETE','/api/equipo/member-a',undefined,'owner'],
 ['E045','GET','/api/invitaciones/mias',undefined,'client'],['E046','POST','/api/invitaciones/inv-a/aceptar',undefined,'invitee'],['E047','POST','/api/invitaciones/inv-a/rechazar',undefined,'invitee'],
 ['E053','GET','/api/partidos/mios',undefined,'player'],['E054','POST','/api/partidos',undefined,'player',matchForm],['E055','POST','/api/partidos/match-a/anotarse',undefined,'player'],['E056','DELETE','/api/partidos/match-a/anotarse',undefined,'client'],['E057','PUT','/api/partidos/match-a/foto',{url:ownUrl},'player'],['E058','DELETE','/api/partidos/match-a',undefined,'player'],
 ['E067','POST','/api/resenas',{complejoId:'a',puntuacion:5,comentario:' Comentario sintético '},'player'],['E068','GET','/api/resenas',undefined,'owner'],['E069','POST','/api/resenas/resena-a/responder',{respuesta:' Gracias '},'owner'],
 ['E076','GET','/api/sanciones',undefined,'owner'],['E077','POST','/api/sanciones',{complejoId:'a',usuarioId:'player',nivel:'advertencia',motivo:' Motivo de prueba '},'owner'],['E078','PATCH','/api/sanciones/sanction-a/desactivar',undefined,'owner'],
 ['E079','GET','/api/solicitudes',undefined,'tech'],['E080','GET','/api/solicitudes/mias',undefined,'applicant'],['E081','POST','/api/solicitudes',{complejo:center,cancha:court,aceptaConvenio:true},'player'],['E082','PATCH','/api/solicitudes/pending/aprobar',undefined,'tech'],['E083','PATCH','/api/solicitudes/pending/rechazar',{motivo:' Datos <incompletos> '},'tech'],
 ['E084','GET','/api/suscripciones/estado',undefined,'owner'],['E085','GET','/api/suscripciones',undefined,'owner'],['E086','POST','/api/suscripciones',{complejoId:'a',plan:'mensual'},'owner'],['E087','PATCH','/api/suscripciones/sub-req-a/aprobar',undefined,'tech'],['E088','PATCH','/api/suscripciones/sub-req-a/rechazar',undefined,'tech'],['E089','PATCH','/api/suscripciones/sub-req-a/cancelar',undefined,'owner'],
 ['E090','GET','/api/torneos',undefined,'owner'],['E091','GET','/api/torneos/torneo-a',undefined,'owner'],['E092','POST','/api/torneos',tournament,'owner'],['E093','PUT','/api/torneos/torneo-a',{...tournament,estado:'en_curso',fechaFin:futureDay},'owner'],['E094','DELETE','/api/torneos/torneo-a',undefined,'owner'],
 ['E095','POST','/api/torneos/torneo-a/inscripciones',{equipo:' Equipo de prueba ',capitanId:'player',telefono:'900000003',pagado:false},'owner'],['E096','POST','/api/torneos/torneo-a/partidos',{fase:'SEMIFINAL',equipoA:'Equipo A',equipoB:'Equipo B',fecha:futureInstant,canchaId:'court-a',golesA:2,golesB:1},'owner'],['E097','PUT','/api/torneos/partidos/pt-a',{fase:'SEMIFINAL',equipoA:'Equipo A',equipoB:'Equipo B',fecha:futureInstant,canchaId:'court-a'},'owner'],
 ];
 const ids=new Set(nominal.map(n=>n[0]));const scoped=manifest.filter(a=>ids.has(a.id));if(scoped.length!==43)throw Error('F5 scope must contain 43 endpoints');
 const options=(method,body,actor,form)=>({method,body,actor,...(form?{form}:{})});
 for(const [e,method,path,body,actor,form]of nominal){await compare(e+'-nominal',e,path,options(method,body,actor,form));await compare(e+'-sin-sesion',e,path,options(method,body,null,form));}
 for(const [e,method,path,body,actor,form]of nominal){
  await compare(e+'-tv-revocado',e,path,options(method,body,actor,form),()=>db.usuario.update({where:{id:actor},data:{tokenVersion:1}}));
  const allowed=manifest.find(a=>a.id===e).authorization.allowedRoles;
  if(allowed.length){const denied=!allowed.includes('USUARIO')?'player':!allowed.includes('ADMIN')&&allowed.includes('SUPERADMIN')?'admin':'owner';await compare(e+'-rol-no-permitido',e,path,options(method,body,denied,form));}
 }
 /** @type {Array<[string,string,string,string,unknown,string|null,Record<string,unknown>?]>} */
 const negatives=[
 ['E034','platform','GET','/api/complejos',undefined,'tech'],['E034','player-empty','GET','/api/complejos',undefined,'player'],['E034','member','GET','/api/complejos',undefined,'admin'],['E034','expired','GET','/api/complejos',undefined,'expired'],
 ['E035','otra-sede','GET','/api/complejos/b',undefined,'owner'],['E035','member','GET','/api/complejos/a',undefined,'admin'],['E035','missing','GET','/api/complejos/absent',undefined,'owner'],['E035','platform-pending','GET','/api/complejos/pending',undefined,'tech'],
 ['E036','invalid','POST','/api/complejos',{nombre:'X'},'fresh'],['E036','district','POST','/api/complejos',{...center,distrito:'Lima'},'fresh'],['E036','slug-collision','POST','/api/complejos',{...center,nombre:'A'},'owner'],['E036','trial-only','POST','/api/complejos',center,'trialowner'],['E036','member-admin','POST','/api/complejos',center,'admin'],
 ['E037','otra-sede','PUT','/api/complejos/b',{nombre:'Ajeno'},'owner'],['E037','publish-pending','PUT','/api/complejos/pending',{publicado:true},'tech'],['E037','district','PUT','/api/complejos/a',{distrito:'Lima'},'owner'],['E037','clear-optional','PUT','/api/complejos/a',{telefono:' ',email:''},'owner'],['E037','member-denied','PUT','/api/complejos/a',{nombre:'Admin'},'admin'],
 ['E038','reservas','DELETE','/api/complejos/a',undefined,'owner'],['E038','registros','DELETE','/api/complejos/b',undefined,'other'],['E038','otra-sede','DELETE','/api/complejos/b',undefined,'owner'],['E038','missing','DELETE','/api/complejos/absent',undefined,'owner'],
 ['E039','missing-complex','GET','/api/equipo',undefined,'owner'],['E039','absent','GET','/api/equipo?complejoId=absent',undefined,'owner'],['E039','member','GET','/api/equipo?complejoId=a',undefined,'admin'],['E039','otra-sede','GET','/api/equipo?complejoId=b',undefined,'owner'],
 ['E040','auto-invitacion','POST','/api/equipo',{complejoId:'a',email:'owner@example.test',rolSede:'ADMIN'},'owner'],['E040','sin-cuenta','POST','/api/equipo',{complejoId:'a',email:'Nadie@Example.test'},'owner'],['E040','existente','POST','/api/equipo',{complejoId:'a',email:'invitee@example.test'},'owner'],['E040','activo','POST','/api/equipo',{complejoId:'a',email:'admin@example.test'},'owner'],['E040','rol-sede','POST','/api/equipo',{complejoId:'a',email:'client@example.test',rolSede:'SUPERADMIN'},'owner'],['E040','dueno-centro','POST','/api/equipo',{complejoId:'a',email:'applicant@example.test'},'owner'],['E040','plataforma','POST','/api/equipo',{complejoId:'a',email:'tech@example.test'},'owner'],['E040','member-denied','POST','/api/equipo',{complejoId:'a',email:'client@example.test'},'admin'],['E040','missing-email','POST','/api/equipo',{complejoId:'a'},'owner'],
 ['E041','activo-no-editable','PUT','/api/equipo/member-a',{rolSede:'ADMIN',activo:false},'owner'],['E041','otra-sede','PUT','/api/equipo/inv-b',{rolSede:'ADMIN'},'owner'],['E041','rol-invalido','PUT','/api/equipo/member-a',{rolSede:'TECNICO'},'owner'],['E041','missing','PUT','/api/equipo/absent',{},'owner'],
 ['E042','pending','DELETE','/api/equipo/inv-a',undefined,'owner'],['E042','otra-sede','DELETE','/api/equipo/inv-b',undefined,'owner'],['E042','missing','DELETE','/api/equipo/absent',undefined,'owner'],
 ['E045','invitee','GET','/api/invitaciones/mias',undefined,'invitee'],['E045','expired','GET','/api/invitaciones/mias',undefined,'expired'],
 ['E046','otra-sede','POST','/api/invitaciones/inv-b/aceptar',undefined,'invitee'],['E046','admin-keeps-role','POST','/api/invitaciones/inv-b/aceptar',undefined,'client'],['E047','otra-sede','POST','/api/invitaciones/inv-b/rechazar',undefined,'invitee'],
 ['E053','client','GET','/api/partidos/mios',undefined,'client'],['E053','empty','GET','/api/partidos/mios',undefined,'unused'],
 ['E055','cupo-lleno','POST','/api/partidos/match-full/anotarse',undefined,'player'],['E055','duplicado','POST','/api/partidos/match-a/anotarse',undefined,'client'],['E055','pasado','POST','/api/partidos/match-past/anotarse',undefined,'player'],['E055','hoy','POST','/api/partidos/match-today/anotarse',undefined,'player'],['E055','missing','POST','/api/partidos/absent/anotarse',undefined,'player'],
 ['E056','no-anotado','DELETE','/api/partidos/match-a/anotarse',undefined,'player'],
 ['E057','otra-sede','PUT','/api/partidos/match-full/foto',{url:ownUrl},'player'],['E057','foreign-prefix','PUT','/api/partidos/match-a/foto',{url:mediaOrigin+'/uploads/partido/client/x.png'},'player'],['E057','same-url','PUT','/api/partidos/match-a/foto',{url:mediaOrigin+'/uploads/partido/player/old.png'},'player'],['E057','platform','PUT','/api/partidos/match-full/foto',{url:mediaOrigin+'/uploads/partido/any/x.png'},'tech'],['E057','missing','PUT','/api/partidos/absent/foto',{url:ownUrl},'player'],
 ['E058','otra-sede','DELETE','/api/partidos/match-full',undefined,'player'],['E058','platform','DELETE','/api/partidos/match-full',undefined,'tech'],['E058','missing','DELETE','/api/partidos/absent',undefined,'player'],
 ['E067','no-jugo-local','POST','/api/resenas',{complejoId:'a',puntuacion:5,comentario:'Comentario sintético'},'invitee'],['E067','update-existing','POST','/api/resenas',{complejoId:'a',puntuacion:2,comentario:''},'client'],['E067','invalid-score','POST','/api/resenas',{complejoId:'a',puntuacion:6},'player'],['E067','missing-complex','POST','/api/resenas',{complejoId:'absent',puntuacion:4},'player'],
 ['E068','player-empty','GET','/api/resenas',undefined,'player'],['E068','platform','GET','/api/resenas',undefined,'tech'],['E068','otra-sede','GET','/api/resenas?complejoId=b',undefined,'owner'],['E068','member','GET','/api/resenas?complejoId=a',undefined,'admin'],
 ['E069','otra-sede','POST','/api/resenas/resena-b/responder',{respuesta:'No'},'owner'],['E069','member-denied','POST','/api/resenas/resena-a/responder',{respuesta:'No'},'admin'],['E069','empty','POST','/api/resenas/resena-a/responder',{respuesta:' '},'owner'],['E069','missing','POST','/api/resenas/absent/responder',{respuesta:'Hola'},'owner'],
 ['E076','solo-activas','GET','/api/sanciones?soloActivas=true',undefined,'owner'],['E076','binding','GET','/api/sanciones?soloActivas=quizas',undefined,'owner'],['E076','otra-sede','GET','/api/sanciones?complejoId=b',undefined,'owner'],['E076','platform','GET','/api/sanciones',undefined,'tech'],
 ['E077','duplicada','POST','/api/sanciones',{complejoId:'a',usuarioId:'client',nivel:'ADVERTENCIA',motivo:'Repetida'},'owner'],['E077','nivel','POST','/api/sanciones',{complejoId:'a',usuarioId:'client',nivel:'MULTA',motivo:'Motivo'},'owner'],['E077','motivo-corto','POST','/api/sanciones',{complejoId:'a',usuarioId:'client',nivel:'BLOQUEO',motivo:' ab '},'owner'],['E077','usuario','POST','/api/sanciones',{complejoId:'a',usuarioId:'absent',nivel:'BLOQUEO',motivo:'Motivo'},'owner'],['E077','otra-sede','POST','/api/sanciones',{complejoId:'b',usuarioId:'client',nivel:'BLOQUEO',motivo:'Motivo'},'owner'],
 ['E078','otra-sede','PATCH','/api/sanciones/sanction-b/desactivar',undefined,'owner'],['E078','missing','PATCH','/api/sanciones/absent/desactivar',undefined,'owner'],
 ['E080','empty','GET','/api/solicitudes/mias',undefined,'player'],['E080','owner','GET','/api/solicitudes/mias',undefined,'owner'],
 ['E081','convenio-falso','POST','/api/solicitudes',{complejo:center,cancha:court,aceptaConvenio:false},'player'],['E081','incompleta','POST','/api/solicitudes',{complejo:center,cancha:{...court,capacidad:0},aceptaConvenio:true},'player'],['E081','duplicada','POST','/api/solicitudes',{complejo:center,cancha:court,aceptaConvenio:true},'applicant'],['E081','distrito','POST','/api/solicitudes',{complejo:{...center,distrito:'Lima'},cancha:court,aceptaConvenio:true},'player'],['E081','imagen-ajena','POST','/api/solicitudes',{complejo:center,cancha:{...court,imagen:mediaOrigin+'/uploads/cancha/other/x.png'},aceptaConvenio:true},'player'],['E081','tipo-numerico','POST','/api/solicitudes',{complejo:center,cancha:{...court,tipo:3},aceptaConvenio:true},'player'],
 ['E082','ya-revisada','PATCH','/api/solicitudes/a/aprobar',undefined,'tech'],['E082','missing','PATCH','/api/solicitudes/absent/aprobar',undefined,'tech'],['E083','ya-revisada','PATCH','/api/solicitudes/a/rechazar',{motivo:'No'},'tech'],['E083','sin-motivo','PATCH','/api/solicitudes/pending/rechazar',{motivo:' '},'tech'],
 ['E084','expired','GET','/api/suscripciones/estado',undefined,'expired'],['E084','platform','GET','/api/suscripciones/estado',undefined,'tech'],['E084','trial','GET','/api/suscripciones/estado',undefined,'trialowner'],['E084','applicant','GET','/api/suscripciones/estado',undefined,'applicant'],
 ['E085','expired','GET','/api/suscripciones',undefined,'expired'],['E085','estado','GET','/api/suscripciones?estado=pendiente',undefined,'tech'],['E085','estado-invalido','GET','/api/suscripciones?estado=otro',undefined,'owner'],['E085','otra-sede','GET','/api/suscripciones?complejoId=b',undefined,'owner'],['E085','member','GET','/api/suscripciones?complejoId=a',undefined,'admin'],
 ['E086','expired','POST','/api/suscripciones',{complejoId:'expired-complex',plan:'ANUAL'},'expired'],['E086','plan','POST','/api/suscripciones',{complejoId:'a',plan:'SEMANAL'},'owner'],['E086','solicitud-pendiente','POST','/api/suscripciones',{complejoId:'pending',plan:'MENSUAL'},'tech'],['E086','otra-sede','POST','/api/suscripciones',{complejoId:'b',plan:'MENSUAL'},'owner'],['E086','missing','POST','/api/suscripciones',{complejoId:'absent',plan:'MENSUAL'},'owner'],
 ['E087','solicitud-centro-pendiente','PATCH','/api/suscripciones/sub-req-pending/aprobar',undefined,'tech'],['E087','no-pendiente','PATCH','/api/suscripciones/sub-a/aprobar',undefined,'tech'],['E088','no-pendiente','PATCH','/api/suscripciones/sub-a/rechazar',undefined,'tech'],['E089','otra-sede','PATCH','/api/suscripciones/sub-req-b/cancelar',undefined,'owner'],['E089','missing','PATCH','/api/suscripciones/absent/cancelar',undefined,'owner'],
 ['E090','platform','GET','/api/torneos',undefined,'tech'],['E090','member','GET','/api/torneos?complejoId=a',undefined,'admin'],['E090','otra-sede','GET','/api/torneos?complejoId=b',undefined,'owner'],
 ['E091','otra-sede','GET','/api/torneos/torneo-b',undefined,'owner'],['E091','missing','GET','/api/torneos/absent',undefined,'owner'],
 ['E092','fecha','POST','/api/torneos',{...tournament,fechaInicio:'07/10/2026'},'owner'],['E092','fin-anterior','POST','/api/torneos',{...tournament,fechaFin:'2020-01-01'},'owner'],['E092','deporte','POST','/api/torneos',{...tournament,deporte:'AJEDREZ'},'owner'],['E092','member-denied','POST','/api/torneos',tournament,'admin'],['E092','missing-complex','POST','/api/torneos',{...tournament,complejoId:'absent'},'owner'],
 ['E093','otra-sede','PUT','/api/torneos/torneo-b',{nombre:'X'},'owner'],['E093','clear-end','PUT','/api/torneos/torneo-small',{fechaFin:'',premio:'  '},'owner'],['E093','estado','PUT','/api/torneos/torneo-a',{estado:'PAUSADO'},'owner'],
 ['E094','otra-sede','DELETE','/api/torneos/torneo-b',undefined,'owner'],['E094','missing','DELETE','/api/torneos/absent',undefined,'owner'],
 ['E095','cupo','POST','/api/torneos/torneo-small/inscripciones',{equipo:'Otro'},'owner'],['E095','duplicado','POST','/api/torneos/torneo-a/inscripciones',{equipo:'Equipo Uno'},'owner'],['E095','member','POST','/api/torneos/torneo-a/inscripciones',{equipo:'Recepción'},'admin'],['E095','capitan','POST','/api/torneos/torneo-a/inscripciones',{equipo:'Nuevo',capitanId:'absent'},'owner'],['E095','otra-sede','POST','/api/torneos/torneo-b/inscripciones',{equipo:'Nuevo'},'owner'],
 ['E096','sin-zona','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:'B',fecha:futureDay+'T09:15:00'},'owner'],['E096','offset','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:'B',fecha:futureDay+'T09:15:00-05:00'},'owner'],['E096','iguales','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:' A '},'owner'],['E096','fecha','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:'B',fecha:'pronto'},'owner'],['E096','cancha','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:'B',canchaId:'absent'},'owner'],['E096','goles','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:'B',golesA:-1},'owner'],['E096','empate','POST','/api/torneos/torneo-a/partidos',{equipoA:'A',equipoB:'B',golesA:0,golesB:0},'owner'],
 ['E097','goles','PUT','/api/torneos/partidos/pt-a',{golesA:3,golesB:1},'owner'],['E097','sin-fecha','PUT','/api/torneos/partidos/pt-a',{fecha:''},'owner'],['E097','stored-date','PUT','/api/torneos/partidos/pt-a',{fase:'Final'},'owner'],['E097','keep-winner','PUT','/api/torneos/partidos/pt-a2',{equipoA:'Nuevo'},'owner'],['E097','otra-sede','PUT','/api/torneos/partidos/pt-b',{fase:'X'},'owner'],['E097','missing','PUT','/api/torneos/partidos/absent',{},'owner'],
 ];
 for(const [e,name,method,path,body,actor]of negatives)await compare(e+'-'+name,e,path,{method,body,actor});
 // Legacy [FromForm] contracts for match publication.
 await compare('E054-cupos-invalido','E054','/api/partidos',{method:'POST',actor:'player',form:{...matchForm,cuposTotales:'1'}});
 await compare('E054-binding','E054','/api/partidos',{method:'POST',actor:'player',form:{...matchForm,cuposTotales:'diez',precio:'barato'}});
 await compare('E054-json-body','E054','/api/partidos',{method:'POST',actor:'player',body:matchForm});
 await compare('E054-urlencoded','E054','/api/partidos',{method:'POST',actor:'player',urlencoded:{...matchForm,TITULO:'Mayúsculas ok',titulo:'ignored'}});
 await compare('E054-foto-url','E054','/api/partidos',{method:'POST',actor:'player',form:{...matchForm,fotoUrl:ownUrl}});
 await compare('E054-foto-ajena','E054','/api/partidos',{method:'POST',actor:'player',form:{...matchForm,fotoUrl:mediaOrigin+'/uploads/partido/client/x.png'}});
 await compare('E054-foto-legacy','E054','/api/partidos',{method:'POST',actor:'player',form:matchForm,file:png});
 await compare('E054-foto-invalida','E054','/api/partidos',{method:'POST',actor:'player',form:matchForm,file:Buffer.from('not-image')});
 /** @type {Array<[string,Record<string,string>]>} */
 const formCases=[['fecha-pasada',{fecha:'2020-01-01'}],['horario',{desde:'20:00',hasta:'19:00'}],['hora-24',{hasta:'24:00'}],['distrito',{distrito:'Lima'}],['superficie',{superficie:'Arena'}],['precio',{precio:'10000'}],['titulo',{titulo:'ab'}],['formato',{formato:'Fútbol 4'}],['nivel',{nivel:'Pro'}],['cancha',{cancha:' x '}]];
 for(const [name,patch]of formCases)await compare('E054-'+name,'E054','/api/partidos',{method:'POST',actor:'player',form:{...matchForm,...patch}});
 await compare('E040-sin-cuenta-tope','E040','/api/equipo',{method:'POST',body:{complejoId:'a',email:'nadie@example.test'},actor:'owner'});
 await compare('E040-sin-cuenta-tope-2','E040','/api/equipo',{method:'POST',body:{complejoId:'a',email:'nadie@example.test'},actor:'owner'});
 await compare('E040-sin-cuenta-tope-3','E040','/api/equipo',{method:'POST',body:{complejoId:'a',email:'nadie@example.test'},actor:'owner'});
 await compare('E067-expired','E067','/api/resenas',{method:'POST',body:{complejoId:'a',puntuacion:5},actor:'expired'});
 await compare('E090-expired','E090','/api/torneos',{method:'GET',actor:'expired'});
 // Concurrency: two places, five simultaneous joins; two teams of capacity in a tournament.
 const racers=['player','invitee','applicant','admin','unused'];
 await race('E055-concurrencia','E055',async()=>{},backend=>racers.map(actor=>request(backend,'/api/partidos/match-race/anotarse',{method:'POST',actor})),()=>db.anotacionPartido.count({where:{partidoId:'match-race'}}));
 await race('E095-concurrencia','E095',async()=>{await db.inscripcionTorneo.deleteMany({where:{torneoId:'torneo-a'}});await db.torneo.update({where:{id:'torneo-a'},data:{cupoMax:2}});},backend=>racers.map((_,i)=>request(backend,'/api/torneos/torneo-a/inscripciones',{method:'POST',body:{equipo:'Carrera '+i},actor:'owner'})),()=>db.inscripcionTorneo.count({where:{torneoId:'torneo-a'}}));
 writeResults(true);
}
let written=false;
function writeResults(complete){
 if(!rows.length||written)return;written=complete;
 writeFileSync(resolve(root,only?'docs/specs/56/f5/parity-partial.json':'docs/specs/56/f5/parity-results.json'),JSON.stringify({runtime:process.version,basis:'Actual legacy controllers, disposable empty QA database, local fake S3 and captured mail with fictitious data only',normalization:['New IDs validated GUID N and mapped, also inside generated slugs and upload paths','Request timestamps mapped after a 120 s range check','ProblemDetails traceId mapped after W3C or Kestrel request-id format check','Legacy multipart version Unix seconds mapped, prefix and extension retained','Effects sorted after random generated IDs mapped; every column of thirteen tables compared'],complete,...(only?{only}:{}),rows},null,2)+'\n');
 const counts=Object.fromEntries(['PASS','SECURITY_DIVERGENCE','FAIL','INFO'].map(k=>[k,rows.filter(r=>r.result===k).length]));
 console.log(`F5 strict parity ${counts.PASS}/${counts.PASS+counts.FAIL}; intentional security divergences ${counts.SECURITY_DIVERGENCE}; informative ${counts.INFO}; failures ${counts.FAIL}`);if(counts.FAIL)process.exitCode=1;
}
try{await run();}catch(e){console.error(safe(e?.stack||String(e)));process.exitCode=1;}
finally{
 clearTimeout(globalTimer);
 if(!written)try{writeResults(false);}catch{/* best effort */}
 if(host){host.kill('SIGTERM');await new Promise(r=>{if(host.exitCode!==null)return r();host.once('exit',r);const timer=setTimeout(()=>{host.kill('SIGKILL');r();},3000);timer.unref();});}
 // Force-drop first: pending Nest/database requests must not prevent cleanup.
 if(attempted){try{if(creating)await bounded(creating.catch(()=>undefined),'Finish QA create',15000,false);await dropFixture({name:dbName,createClient:()=>smoke?admin:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),bounded,log:console.error});console.log('Disposable F5 QA database removed');}catch(e){console.error(safe(e));process.exitCode=1;}}
 await Promise.allSettled([bounded(app?.close(),'Nest close',5000,false),bounded(db?.$disconnect(),'Fixture disconnect',5000,false),bounded(admin.$disconnect(),'Admin disconnect',5000,false)]);
 rmSync(scratch,{recursive:true,force:true});console.log('F5 scratch directory removed');for(const [signal,handler]of signalHandlers)process.removeListener(signal,handler);
}
