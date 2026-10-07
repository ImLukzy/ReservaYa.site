import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const root=process.cwd(),dbRequire=createRequire(resolve(root,'packages/db/package.json')),apiRequire=createRequire(resolve(root,'apps/api/package.json'));
/** @type {typeof import('../packages/db/dist/index.js').PrismaClient} */
const PrismaClient=dbRequire('@prisma/client').PrismaClient;
const bcrypt=apiRequire('bcryptjs'),crypto=apiRequire('./dist/auth/crypto.js');
const smoke=process.argv[2]==='--smoke-sigterm';
const settings={};for(const line of (smoke?'TEST_DATABASE_URL_UNPOOLED=postgresql://fixture:fixture@localhost/fixture':readFileSync(resolve(root,'hive/qa.env'),'utf8')).split('\n')){const m=line.match(/^(TEST_DATABASE_URL(?:_UNPOOLED)?)=(.*)$/);if(m)settings[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
if((!smoke&&process.argv[2]!=='--confirm-qa-migracion-ts')||!settings.TEST_DATABASE_URL_UNPOOLED)throw Error('QA confirmation and test connection required');
const safe=s=>String(s).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[QA connection]').replace(/ep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?/g,'[QA endpoint]');
const admin=smoke?{async $executeRawUnsafe(sql){console.log('Smoke SQL '+sql.split(' ')[0]);return 0;},async $disconnect(){}}:new PrismaClient({datasources:{db:{url:settings.TEST_DATABASE_URL_UNPOOLED}}}),dbName='f4_fixture_'+randomBytes(6).toString('hex'),scratch=mkdtempSync(resolve(tmpdir(),'rys-f4-'));
const secret=randomBytes(32).toString('hex'),password='Ficticia123!',newPassword='Nueva123!',hash=await bcrypt.hash(password,10),fixed=new Date('2026-01-01T00:00:00Z');
const origin='http://127.0.0.1:15120',mediaOrigin='https://media.example.test',now=new Date(),today=new Date(now.toISOString().slice(0,10)+'T00:00:00Z');
/** @type {InstanceType<typeof PrismaClient>} */
let db;
/** @type {any} */
let app;
/** @type {import('node:child_process').ChildProcess|undefined} */
let host;
/** @type {Promise<number>|undefined} */
let creating;
let attempted=false;const f0=JSON.parse(readFileSync(resolve(root,'docs/specs/56/fixtures/endpoint-cases.json'),'utf8')).cases;
const rows=[];const originalFetch=globalThis.fetch;
const stop=new AbortController();
const signalHandlers=new Map(['SIGINT','SIGTERM'].map(signal=>{const fn=()=>{if(!stop.signal.aborted)stop.abort(new Error('F4 interrupted: '+signal));};process.on(signal,fn);return [signal,fn];}));
const globalTimer=setTimeout(()=>stop.abort(new Error('F4 global timeout (15 minutes)')),900000);
const fetchLocal=(path,options)=>originalFetch(origin+path,{redirect:'manual',signal:AbortSignal.any([stop.signal,AbortSignal.timeout(15000)]),...options});
async function bounded(promise,label,ms=15000,useStop=true){
 let timer,handler;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timeout')),ms);if(useStop){handler=()=>reject(stop.signal.reason);if(stop.signal.aborted)handler();else stop.signal.addEventListener('abort',handler,{once:true});}})]);}
 finally{clearTimeout(timer);if(handler)stop.signal.removeEventListener('abort',handler);}
}
/** @type {Record<string,import('../packages/db/dist/index.js').Prisma.UsuarioCreateInput['rol']>} */
const roles={owner:'SUPERADMIN',other:'SUPERADMIN',admin:'ADMIN',tech:'TECNICO',player:'USUARIO',client:'USUARIO',unused:'USUARIO',expired:'SUPERADMIN'};
const token=a=>crypto.sign({id:a,email:a+'@example.test',nombre:'Prueba '+a,rol:roles[a],tv:0},604800);
let env;
async function restore(){
 stop.signal.throwIfAborted();
 /** @type {{usuario:import('../packages/db/dist/index.js').Prisma.UsuarioCreateManyInput[],complejo:import('../packages/db/dist/index.js').Prisma.ComplejoCreateManyInput[],suscripcion:import('../packages/db/dist/index.js').Prisma.SuscripcionCreateManyInput[],complejoMiembro:import('../packages/db/dist/index.js').Prisma.ComplejoMiembroCreateManyInput[],cancha:import('../packages/db/dist/index.js').Prisma.CanchaCreateManyInput[],horarioOperativo:import('../packages/db/dist/index.js').Prisma.HorarioOperativoCreateManyInput[],promocion:import('../packages/db/dist/index.js').Prisma.PromocionCreateManyInput[],reserva:import('../packages/db/dist/index.js').Prisma.ReservaCreateManyInput[],sancion:import('../packages/db/dist/index.js').Prisma.SancionCreateManyInput[]}} */
 const seed={usuario:[],complejo:[],suscripcion:[],complejoMiembro:[],cancha:[],horarioOperativo:[],promocion:[],reserva:[],sancion:[]};
 /** @type {import('../packages/db/dist/index.js').Prisma.PrismaPromise<unknown>[]} */
 const tasks=[db.$executeRawUnsafe('TRUNCATE TABLE "Reserva", "Sancion", "Horario", "Promocion", "ComplejoMiembro", "Suscripcion", "Cancha", "Complejo", "Usuario" CASCADE')];
 for(const [id,rol]of Object.entries(roles))seed.usuario.push({id,nombre:'Prueba '+id,email:id+'@example.test',password:hash,rol,activo:true,tokenVersion:0,creadoEn:fixed,fechaNacimiento:id==='player'?null:new Date('2000-01-01Z'),username:id+'_name',usernameCambiadoEn:new Date('2024-01-01Z'),fotoUrl:id==='player'?mediaOrigin+'/uploads/perfil/player/old.png':null});
 const complexes=/** @type {Array<[string,string,boolean,boolean]>} */ ([['a','owner',true,false],['b','other',true,false],['trial','owner',false,true],['expired-complex','expired',false,false]]);
 for(const [id,owner,subscription,recent]of complexes){
  seed.complejo.push({id,nombre:'Complejo '+id,duenoId:owner,direccion:'Ficticia',distrito:'Cayma',slug:id,publicado:true,creadoEn:recent?now:fixed,actualizadoEn:fixed});
  if(subscription)seed.suscripcion.push({id:'sub-'+id,complejoId:id,plan:'MENSUAL',estado:'ACTIVA',fechaInicio:today,fechaFin:new Date(today.getTime()+30*86400000)});
 }
 seed.complejoMiembro.push({id:'member',complejoId:'a',usuarioId:'admin',activo:true,rolSede:'ADMIN',creadoEn:fixed});
 for(const [id,complex]of [['court-a','a'],['court-b','b'],['court-trial','trial'],['court-legacy',null]])seed.cancha.push({id,complejoId:complex,nombre:'Cancha '+id,tipo:'FUTBOL',precioPorHora:80,capacidad:10,activa:true,creadoEn:fixed,imagen:id==='court-a'?mediaOrigin+'/uploads/cancha/owner/old.png':null});
 seed.horarioOperativo.push({id:'hours-a',complejoId:'a',diaSemana:1,aperturaMin:480,cierreMin:1260,activo:true,creadoEn:fixed});
 for(const [id,complex,code]of [['promo-a','a','AHORRO'],['promo-b','b','OTRO'],['promo-global',null,null]])seed.promocion.push({id,complejoId:complex,nombre:'Promo '+id,codigo:code,tipo:'PORCENTAJE',valor:10,activa:true,creadoEn:fixed});
 seed.reserva.push({id:'reservation-a',codigo:'FIXTURE-A',usuarioId:'client',canchaId:'court-a',complejoId:'a',fecha:today,horaInicio:600,horaFin:660,estado:'CONFIRMADA',total:80,creadoEn:fixed});
 seed.reserva.push({id:'reservation-b',codigo:'FIXTURE-B',usuarioId:'other',canchaId:'court-b',complejoId:'b',fecha:today,horaInicio:600,horaFin:660,estado:'CONFIRMADA',total:80,creadoEn:fixed});
 seed.sancion.push({id:'sanction-a',creadoPorId:'owner',usuarioId:'client',complejoId:'a',nivel:'ADVERTENCIA',motivo:'Ficticio',activa:true,creadoEn:fixed});
 tasks.push(db.usuario.createMany({data:seed.usuario}));
 tasks.push(db.complejo.createMany({data:seed.complejo}));
 tasks.push(db.suscripcion.createMany({data:seed.suscripcion}));
 tasks.push(db.complejoMiembro.createMany({data:seed.complejoMiembro}));
 tasks.push(db.cancha.createMany({data:seed.cancha}));
 tasks.push(db.horarioOperativo.createMany({data:seed.horarioOperativo}));
 tasks.push(db.promocion.createMany({data:seed.promocion}));
 tasks.push(db.reserva.createMany({data:seed.reserva}));
 tasks.push(db.sancion.createMany({data:seed.sancion}));
 await db.$transaction(tasks);
}
async function effect(){
 // One database round trip; every column of all four effect tables remains checked.
 const snapshot=await db.$queryRaw`SELECT json_build_object(
 'usuario', COALESCE((SELECT json_agg(u ORDER BY u."id") FROM "Usuario" u), '[]'::json),
 'cancha', COALESCE((SELECT json_agg(c ORDER BY c."id") FROM "Cancha" c), '[]'::json),
 'horarioOperativo', COALESCE((SELECT json_agg(h ORDER BY h."id") FROM "Horario" h), '[]'::json),
 'promocion', COALESCE((SELECT json_agg(p ORDER BY p."id") FROM "Promocion" p), '[]'::json)
 ) AS effects`;
 const result=snapshot[0].effects;
 for(const u of result.usuario)if(u.password!==hash){if(!await bcrypt.compare(newPassword,u.password))throw Error('Unexpected password write');u.password='[verified changed bcrypt]';}
 for(const name of Object.keys(result))result[name]=result[name].map(normalize).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return result;
}
function normalize(v){
 if(v instanceof Date)return normalize(v.toISOString());
 if(Array.isArray(v))return v.map(normalize);
 if(v&&typeof v==='object'){if(typeof v.toFixed==='function')return v.toFixed(2);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)]));}
 if(typeof v==='string'){
  if(/^[a-f0-9]{32}$/.test(v))return '[new GUID N]';
  if(/^\/uploads\/(?:perfiles|canchas)\/[a-z-]+-\d{10}\.(jpg|png|webp|gif)$/.test(v))return v.replace(/-\d{10}\./,'-[unix seconds].');
  if(/^\d{4}-\d\d-\d\dT/.test(v)){
   const time=Date.parse(v);if(Number.isFinite(time)&&Math.abs(time-Date.now())<120000)return '[request time]'+(v.endsWith('Z')?'Z':'');
   if(Number.isFinite(time)&&Math.abs(time-new Date(new Date().setUTCFullYear(new Date().getUTCFullYear()+1)).getTime())<120000)return '[next annual change]'+(v.endsWith('Z')?'Z':'');
   return v.replace(/\.000Z$/,'Z').replace(/(\.\d*?[1-9])0+Z$/,'$1Z');
  }
 }
 return v;
}
function multipart(file){const boundary='fixture-boundary';return {type:'multipart/form-data; boundary='+boundary,bytes:Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="archivo"; filename="fixture.png"\r\nContent-Type: image/png\r\n\r\n'),file,Buffer.from('\r\n--'+boundary+'--\r\n')])};}
/** @param {string} backend @param {string} path @param {{method?:string,body?:unknown,actor?:string|null,file?:Buffer,headers?:Record<string,string>}} [options] */
async function request(backend,path,{method='GET',body,actor='owner',file,headers={}}={}){
 const h={...headers,'x-forwarded-for':headers['x-forwarded-for']||'192.0.2.'+(seq++),...(actor?{cookie:'token='+token(actor)}:{})};let data;
 if(file!==undefined){const form=multipart(file);h['content-type']=form.type;data=form.bytes;}
 else if(body!==undefined){h['content-type']='application/json';data=JSON.stringify(body);}
 if(backend==='legacy'){const r=await fetchLocal(path,{method,headers:h,body:data});const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,deprecation:r.headers.get('deprecation'),type:(r.headers.get('content-type')||'').split(';')[0]};}
 const r=await bounded(app.inject({method,url:path,headers:h,...(data!==undefined?{payload:data}:{})}),'Nest '+method+' '+path);return {status:r.statusCode,body:r.body?JSON.parse(r.body):null,deprecation:r.headers.deprecation||null,type:String(r.headers['content-type']||'').split(';')[0]};
}
let seq=1,dirty=true,baseline;
const securityRoutes=new Set(['E026','E027','E028','E032','E033','E059','E060','E061','E062','E099','E100','E101','E102','E106']);
async function compare(id,endpointId,path,options,prepare){const results=[];let nestBefore;const security=id.endsWith('-tv-revocado')&&securityRoutes.has(endpointId);
 for(const backend of ['legacy','nest']){console.log('F4 '+id+' '+backend);if(dirty){await bounded(restore(),'Fixture '+id,45000);if(!baseline)baseline=normalize(await effect());dirty=false;}if(prepare){dirty=true;await prepare(backend);}if(security&&backend==='nest')nestBefore=normalize(await effect());const before=(await (await fetchLocal('/_test/deleted')).json()).length;const response=await request(backend,path,options);const deletions=(await (await fetchLocal('/_test/deleted')).json()).slice(before);const effects=normalize(await effect());dirty=dirty||!isDeepStrictEqual(effects,baseline);results.push(normalize({response,effects,deletions}));}
 if(security){const rejected=results[1].response.status===403&&isDeepStrictEqual(results[1].response.body,{error:'Sin permisos'})&&results[1].deletions.length===0&&isDeepStrictEqual(results[1].effects,nestBefore);rows.push({id,endpointId,path,result:rejected?'SECURITY_DIVERGENCE':'FAIL',classification:'divergencia intencional de seguridad autorizada por god: Nest rechaza sesión revocada; legado omite ValidSession con Roles',legacyStatus:results[0].response.status,nestStatus:results[1].response.status,...(!rejected?{legacy:results[0],nest:results[1]}:{})});return;}
 const expected=f0.find(c=>c.id===id)?.expected.status,requiresDelete=['E032-nominal','E033-nominal','E104-nominal','E105-nominal','E027-replaced-r2-after-commit'].includes(id),pass=isDeepStrictEqual(results[0],results[1])&&(expected===undefined||results[0].response.status===expected)&&(!requiresDelete||results.every(x=>x.deletions.length===1));rows.push({id,endpointId,path,result:pass?'PASS':'FAIL',...(pass?{status:results[0].response.status}:{legacy:results[0],nest:results[1]})});
}
async function run(){
 if(smoke){attempted=true;creating=admin.$executeRawUnsafe('CREATE DATABASE fixture');await creating;host=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(JSON.stringify({smokeReady:true,pid:host.pid,scratch}));await bounded(new Promise(()=>{}),'Signal smoke',30000);return;}
 attempted=true;creating=admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);await bounded(creating,'QA create');stop.signal.throwIfAborted();const url=new URL(settings.TEST_DATABASE_URL_UNPOOLED);url.pathname='/'+dbName;url.searchParams.set('connection_limit','6');
 env={PATH:process.env.PATH,HOME:process.env.HOME,DOTNET_ROOT:process.env.DOTNET_ROOT||'/home/lukzy/.dotnet',TZ:'UTC',JWT_SECRET:secret,DATABASE_URL:url.toString(),DATABASE_URL_UNPOOLED:url.toString(),F3_QA_FIXTURE:'true',F4_QA_FIXTURE:'true',ASPNETCORE_ENVIRONMENT:'Production',COOKIE_SECURE:'false',MEDIA_PUBLIC_URL:mediaOrigin,R2_ENDPOINT:origin+'/_s3',R2_ACCESS_KEY_ID:'fixture-key',R2_SECRET_ACCESS_KEY:'fixture-secret',R2_BUCKET_NAME:'fixture-bucket',LEGACY_WEB_ROOT:resolve(scratch,'nest-webroot')};
 const migrate=spawnSync(process.execPath,[dbRequire.resolve('prisma/build/index.js'),'migrate','deploy','--schema',resolve(root,'packages/db/prisma/schema.prisma')],{env,encoding:'utf8',timeout:60000});if(migrate.status!==0)throw Error(safe(migrate.stderr||migrate.stdout));
 db=new PrismaClient({datasources:{db:{url:url.toString()}}});Object.assign(process.env,env);
 const content=resolve(scratch,'content');mkdirSync(content,{recursive:true});host=spawn('/home/lukzy/.dotnet/dotnet',[resolve(root,'tests/legacy-auth-host/bin/Release/net10.0/LegacyAuthHost.dll'),'--contentRoot',content,'--urls',origin],{env,cwd:content,stdio:['ignore','pipe','pipe']});let logs='';host.stdout.on('data',b=>logs+=safe(b));host.stderr.on('data',b=>logs+=safe(b));
 for(let i=0;i<150;i++){stop.signal.throwIfAborted();try{if((await fetchLocal('/_test/health')).ok)break;}catch{}if(host.exitCode!==null)throw Error('Fixture startup failed: '+logs);await new Promise(r=>setTimeout(r,200));if(i===149)throw Error('Fixture startup timeout');}
 app=await bounded(apiRequire('./dist/app.js').createApp(),'Nest create');await bounded(app.init(),'Nest init');await bounded(app.getHttpAdapter().getInstance().ready(),'Fastify ready');
 // All R2 configuration above is fictional and points only to the local fake S3 server.
 console.log('F4 disposable fixture initialized');
 if(process.argv.includes('--diagnose-fk')){
  await bounded(restore(),'Diagnostic fixture',45000);
  for(const [model,id]of [['cancha','court-a'],['usuario','client']]){
   try{await db[model].delete({where:{id}});throw Error('Expected fixture constraint was absent');}
   catch(error){if(error.message==='Expected fixture constraint was absent')throw error;
    const sqlState=String(error.message).match(/\b(?:code|sqlstate)\s*[:=]\s*["']?(23503|23001)\b/i)?.[1]||null;
    console.log('F4 FK diagnostic '+JSON.stringify({model,name:error.name,code:error.code||null,sqlState,meta:error.meta?{code:error.meta.code||null,modelName:error.meta.modelName||null,field_name:error.meta.field_name||null}:null}));
   }
  }
  return;
 }
 const court={nombre:'Cancha Nueva',tipo:'FUTBOL',precioPorHora:'90.50',capacidad:12,complejoId:'a'},promo={nombre:'Oferta',tipo:'PORCENTAJE',valor:'15',codigo:'NUEVO',complejoId:'a'},hours={complejoId:'a',dias:[{dia:1,apertura:480,cierre:1260},{dia:2,activo:false}]};
 const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 /** @type {Array<[string,string,string,unknown,string|null,Buffer?]>} */
 const nominal=[
 ['E026','POST','/api/canchas',court,'owner'],['E027','PUT','/api/canchas/court-a',{nombre:'Cancha editada',precioPorHora:99},'owner'],['E028','DELETE','/api/canchas/court-trial',undefined,'owner'],
 ['E032','POST','/api/canchas/court-a/imagen',undefined,'owner',png],['E033','PUT','/api/canchas/court-a/imagen',{url:mediaOrigin+'/uploads/cancha/owner/new.png'},'owner'],
 ['E043','GET','/api/horarios?complejoId=a',undefined,'owner'],['E044','PUT','/api/horarios',hours,'owner'],
 ['E059','GET','/api/promociones?complejoId=a',undefined,'owner'],['E060','POST','/api/promociones',promo,'owner'],['E061','PUT','/api/promociones/promo-a',{valor:20,activa:false},'owner'],['E062','DELETE','/api/promociones/promo-a',undefined,'owner'],
 ['E098','GET','/api/usuarios/buscar?q=Prueba',undefined,null],['E099','GET','/api/usuarios',undefined,'tech'],['E100','GET','/api/usuarios/clientes',undefined,'owner'],['E101','GET','/api/usuarios/client/historial',undefined,'owner'],
 ['E102','PATCH','/api/usuarios/unused',{nombre:'Nuevo Nombre',rol:'ADMIN'},'tech'],['E103','PATCH','/api/usuarios/me',{telefono:'+51 999 111 222'},'player'],
 ['E104','POST','/api/usuarios/me/foto',undefined,'player',png],['E105','PUT','/api/usuarios/me/foto',{url:mediaOrigin+'/uploads/perfil/player/new.png'},'player'],['E106','DELETE','/api/usuarios/unused',undefined,'tech'],
 ];
 for(const [e,method,path,body,actor,file]of nominal){await compare(e+'-nominal',e,path,{method,body,actor,file});if(e!=='E098')await compare(e+'-sin-sesion',e,path,{method,body,actor:null,file});}
 for(const [e,method,path,body,actor,file]of nominal){
  if(e==='E098')continue;
  await compare(e+'-tv-revocado',e,path,{method,body,actor,file},()=>db.usuario.update({where:{id:actor},data:{tokenVersion:1}}));
  if(!['E043','E103','E104','E105'].includes(e))await compare(e+'-rol-no-permitido',e,path,{method,body,actor:'player',file});
 }
 /** @type {Array<[string,string,string,string,unknown,string|null]>} */
 const negatives=[
 ['E026','invalid','POST','/api/canchas',{},'owner'],['E026','cross-owner','POST','/api/canchas',{...court,complejoId:'b'},'owner'],['E026','trial-quota','POST','/api/canchas',{...court,complejoId:'trial'},'owner'],['E026','missing-complex','POST','/api/canchas',{...court,complejoId:''},'owner'],['E026','negative-price','POST','/api/canchas',{...court,precioPorHora:0},'owner'],
 ['E027','cross-owner','PUT','/api/canchas/court-b',{nombre:'No autorizado'},'owner'],['E027','missing','PUT','/api/canchas/absent',{},'owner'],['E027','move-cross','PUT','/api/canchas/court-a',{complejoId:'b'},'owner'],['E027','unassign','PUT','/api/canchas/court-a',{complejoId:''},'owner'],['E027','move-trial','PUT','/api/canchas/court-a',{complejoId:'trial'},'owner'],
 ['E028','reserved','DELETE','/api/canchas/court-a',undefined,'owner'],['E028','cross-owner','DELETE','/api/canchas/court-b',undefined,'owner'],['E028','missing','DELETE','/api/canchas/absent',undefined,'owner'],['E028','admin-role','DELETE','/api/canchas/court-a',undefined,'admin'],
 ['E033','cross-owner','PUT','/api/canchas/court-b/imagen',{url:mediaOrigin+'/uploads/cancha/owner/new.png'},'owner'],['E033','foreign-prefix','PUT','/api/canchas/court-a/imagen',{url:mediaOrigin+'/uploads/cancha/other/new.png'},'owner'],['E033','traversal','PUT','/api/canchas/court-a/imagen',{url:mediaOrigin+'/uploads/cancha/owner/../other/new.png'},'owner'],['E033','external','PUT','/api/canchas/court-a/imagen',{url:'https://external.example.test/new.png'},'owner'],
 ['E043','member','GET','/api/horarios?complejoId=a',undefined,'admin'],['E043','cross-owner','GET','/api/horarios?complejoId=b',undefined,'owner'],['E043','invalid','GET','/api/horarios',undefined,'owner'],['E044','member-denied','PUT','/api/horarios',hours,'admin'],['E044','cross-owner','PUT','/api/horarios',{...hours,complejoId:'b'},'owner'],['E044','duplicate-day','PUT','/api/horarios',{...hours,dias:[{dia:1},{dia:1}]},'owner'],['E044','invalid-hours','PUT','/api/horarios',{...hours,dias:[{dia:1,apertura:700,cierre:600}]},'owner'],
 ['E059','strict-scope','GET','/api/promociones',undefined,'owner'],['E059','member','GET','/api/promociones?complejoId=a',undefined,'admin'],['E059','cross-owner','GET','/api/promociones?complejoId=b',undefined,'owner'],['E059','invalid-type','GET','/api/promociones?tipo=wrong',undefined,'owner'],['E060','global-denied','POST','/api/promociones',{...promo,complejoId:''},'owner'],['E060','cross-owner','POST','/api/promociones',{...promo,complejoId:'b'},'owner'],['E060','duplicate-code','POST','/api/promociones',{...promo,codigo:'AHORRO'},'owner'],['E060','invalid-value','POST','/api/promociones',{...promo,valor:101},'owner'],['E060','bands','POST','/api/promociones',{nombre:'Bandas',tipo:'PRECIO_ESPECIAL',complejoId:'a',precioDia:40,precioTarde:60,inicioTarde:'16:00'},'owner'],
 ['E061','cross-owner','PUT','/api/promociones/promo-b',{valor:20},'owner'],['E061','invalid','PUT','/api/promociones/promo-a',{valor:0},'owner'],['E062','cross-owner','DELETE','/api/promociones/promo-b',undefined,'owner'],['E062','missing','DELETE','/api/promociones/absent',undefined,'owner'],
 ['E098','short','GET','/api/usuarios/buscar?q=a',undefined,null],['E099','role-denied','GET','/api/usuarios',undefined,'owner'],['E100','platform','GET','/api/usuarios/clientes',undefined,'tech'],['E101','cross-owner-hidden','GET','/api/usuarios/other/historial',undefined,'owner'],['E101','platform','GET','/api/usuarios/client/historial',undefined,'tech'],
 ['E102','self-denied','PATCH','/api/usuarios/tech',{nombre:'Cambio'},'tech'],['E102','password-revokes','PATCH','/api/usuarios/unused',{password:newPassword},'tech'],['E102','email-conflict','PATCH','/api/usuarios/unused',{email:'player@example.test'},'tech'],['E103','name-immutable','PATCH','/api/usuarios/me',{nombre:'Otro'},'player'],['E103','email-immutable','PATCH','/api/usuarios/me',{email:'other@example.test'},'player'],['E103','invalid-phone','PATCH','/api/usuarios/me',{telefono:'12'},'player'],['E103','password-wrong','PATCH','/api/usuarios/me',{password:newPassword,currentPassword:'wrong'},'player'],['E103','password-revokes','PATCH','/api/usuarios/me',{password:newPassword,currentPassword:password},'player'],['E103','username','PATCH','/api/usuarios/me',{username:'nuevo_usuario'},'player'],['E103','birth-five-legacy','PATCH','/api/usuarios/me',{fechaNacimiento:'2018-01-01'},'player'],
 ['E033','control-del','PUT','/api/canchas/court-a/imagen',{url:mediaOrigin+'/uploads/cancha/owner/a\x7f.png'},'owner'],['E033','control-c1','PUT','/api/canchas/court-a/imagen',{url:mediaOrigin+'/uploads/cancha/owner/a\u0085.png'},'owner'],
 ['E105','foreign-prefix','PUT','/api/usuarios/me/foto',{url:mediaOrigin+'/uploads/perfil/other/new.png'},'player'],['E106','self-denied','DELETE','/api/usuarios/tech',undefined,'tech'],['E106','reserved','DELETE','/api/usuarios/client',undefined,'tech'],['E106','missing','DELETE','/api/usuarios/absent',undefined,'tech'],
 ];
 for(const [e,name,method,path,body,actor]of negatives)await compare(e+'-'+name,e,path,{method,body,actor});
 for(const [e,path,a]of [['E032','/api/canchas/court-a/imagen','owner'],['E104','/api/usuarios/me/foto','player']]){
  await compare(e+'-invalid-bytes',e,path,{method:'POST',actor:a,file:Buffer.from('not-image')});
  await compare(e+'-oversize',e,path,{method:'POST',actor:a,file:Buffer.alloc(3*1024*1024+1,1)});
 }
 await compare('E032-cross-owner','E032','/api/canchas/court-b/imagen',{method:'POST',actor:'owner',file:png});
 await compare('E027-replaced-r2-after-commit','E027','/api/canchas/court-a',{method:'PUT',body:{imagen:mediaOrigin+'/uploads/cancha/owner/new.png'}});
 await compare('E103-annual-username','E103','/api/usuarios/me',{method:'PATCH',body:{username:'nuevo_usuario'},actor:'player'},()=>db.usuario.update({where:{id:'player'},data:{usernameCambiadoEn:now}}));
 await compare('E044-expired','E044','/api/horarios',{method:'PUT',body:{...hours,complejoId:'expired-complex'},actor:'expired'});
 for(const backend of ['legacy','nest']){await restore();const states=[];for(let i=0;i<31;i++)states.push((await request(backend,'/api/usuarios/buscar?q=a',{actor:null,headers:{'x-forwarded-for':'198.51.100.222'}})).status);rows.push({id:'E098-rate-'+backend,endpointId:'E098',result:states.slice(0,30).every(x=>x===200)&&states[30]===429?'PASS':'FAIL'});}
 writeFileSync(resolve(root,'docs/specs/56/f4/parity-results.json'),JSON.stringify({runtime:process.version,basis:'Actual legacy controllers, disposable empty QA database and local fake S3 with fictitious credentials',normalization:['New IDs validated GUID N and mapped','Request timestamps and annual username timestamp mapped after range validation','Legacy multipart version Unix seconds mapped, prefix and extension retained','Effects sorted after random generated IDs mapped; no fixture IDs omitted'],rows},null,2)+'\n');
 console.log(`F4 strict parity ${rows.filter(r=>r.result==='PASS').length}/${rows.length}; intentional security divergences ${rows.filter(r=>r.result==='SECURITY_DIVERGENCE').length}; failures ${rows.filter(r=>r.result==='FAIL').length}`);if(rows.some(r=>r.result==='FAIL'))process.exitCode=1;
}
try{await run();}catch(e){console.error(safe(e?.stack||String(e)));process.exitCode=1;}
finally{
 clearTimeout(globalTimer);
 if(host){host.kill('SIGTERM');await new Promise(r=>{if(host.exitCode!==null)return r();host.once('exit',r);const timer=setTimeout(()=>{host.kill('SIGKILL');r();},3000);timer.unref();});}
 // Force-drop first: pending Nest/database requests must not prevent cleanup.
 if(attempted){try{if(creating)await bounded(creating.catch(()=>undefined),'Finish QA create',15000,false);await bounded(admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`),'QA drop',15000,false);console.log('Disposable F4 QA database removed');}catch(e){console.error(safe(e));process.exitCode=1;}}
 await Promise.allSettled([bounded(app?.close(),'Nest close',5000,false),bounded(db?.$disconnect(),'Fixture disconnect',5000,false),bounded(admin.$disconnect(),'Admin disconnect',5000,false)]);
 rmSync(scratch,{recursive:true,force:true});console.log('F4 scratch directory removed');for(const [signal,handler]of signalHandlers)process.removeListener(signal,handler);
}
